package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.banvexe.accountmanagement.util.TicketGhiChuUtil;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class TicketHoldTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(TicketHoldTimeoutScheduler.class);

    private final VeXeRepository veXeRepository;
    private final long holdMinutes;

    public TicketHoldTimeoutScheduler(
        VeXeRepository veXeRepository,
        @Value("${app.booking.hold-minutes:5}") long holdMinutes
    ) {
        this.veXeRepository = veXeRepository;
        this.holdMinutes = Math.max(1, holdMinutes);
    }

    @Scheduled(fixedDelayString = "${app.booking.hold-check-delay-ms:30000}")
    @Transactional
    public void cancelExpiredPendingTickets() {
        try {
            Instant cutoff = Instant.now().minus(holdMinutes, ChronoUnit.MINUTES);
            List<VeXe> expiredTickets = veXeRepository.findTop200ByTrangThaiAndNgayDatBeforeOrderByNgayDatAsc(
                TicketStatus.CHO_THANH_TOAN,
                cutoff
            );
            for (VeXe ve : expiredTickets) {
                ve.setTrangThai(TicketStatus.DA_HUY);
                ve.setGhiChu(TicketGhiChuUtil.ghiChuHuyThanhCong("quá thời gian giữ chỗ " + holdMinutes + " phút"));
            }
            if (!expiredTickets.isEmpty()) {
                veXeRepository.saveAll(expiredTickets);
            }
        } catch (Exception ex) {
            // During fresh DB bootstrap, tables may not exist yet. Don't crash scheduled execution.
            log.warn("Skip cancelExpiredPendingTickets due to DB not ready: {}", ex.getMessage());
        }
    }
}
