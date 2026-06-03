package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.SeatMapDto;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class SeatMapStreamService {

    private static final Logger log = LoggerFactory.getLogger(SeatMapStreamService.class);
    private static final long SSE_TIMEOUT_MS = 30L * 60L * 1000L;

    private final Map<Integer, CopyOnWriteArrayList<SseEmitter>> emittersByTrip = new ConcurrentHashMap<>();

    public SseEmitter subscribe(Integer chuyenXeId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MS);
        emittersByTrip.computeIfAbsent(chuyenXeId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(chuyenXeId, emitter));
        emitter.onTimeout(() -> removeEmitter(chuyenXeId, emitter));
        emitter.onError(ex -> removeEmitter(chuyenXeId, emitter));
        return emitter;
    }

    public void sendSnapshot(SseEmitter emitter, SeatMapDto seatMap) {
        try {
            emitter.send(SseEmitter.event().name("seats").data(seatMap));
        } catch (IOException ex) {
            log.debug("Skip SSE snapshot: {}", ex.getMessage());
        }
    }

    public void broadcast(Integer chuyenXeId, SeatMapDto seatMap) {
        List<SseEmitter> emitters = emittersByTrip.get(chuyenXeId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("seats").data(seatMap));
            } catch (Exception ex) {
                removeEmitter(chuyenXeId, emitter);
            }
        }
    }

    private void removeEmitter(Integer chuyenXeId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> emitters = emittersByTrip.get(chuyenXeId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByTrip.remove(chuyenXeId, emitters);
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // no-op
        }
    }
}
