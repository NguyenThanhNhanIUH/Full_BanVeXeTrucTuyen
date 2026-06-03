package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.GiuGheTam;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.GiuGheTamRepository;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SeatSelectionHoldService {

    private static final int MAX_HELD_SEATS = 5;

    private final ChuyenXeRepository chuyenXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final GiuGheTamRepository giuGheTamRepository;
    private final BookingCatalogService bookingCatalogService;
    private final SeatMapStreamService seatMapStreamService;
    private final long selectHoldSeconds;

    public SeatSelectionHoldService(
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        GiuGheTamRepository giuGheTamRepository,
        BookingCatalogService bookingCatalogService,
        SeatMapStreamService seatMapStreamService,
        @Value("${app.booking.select-hold-seconds:180}") long selectHoldSeconds
    ) {
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.giuGheTamRepository = giuGheTamRepository;
        this.bookingCatalogService = bookingCatalogService;
        this.seatMapStreamService = seatMapStreamService;
        this.selectHoldSeconds = Math.max(30, selectHoldSeconds);
    }

    @Transactional
    public void holdSeat(Integer chuyenXeId, String rawHoldToken, String rawSeatCode) {
        String holdToken = normalizeHoldToken(rawHoldToken);
        ChuyenXe chuyen = lockTrip(chuyenXeId);
        String seat = normalizeSeat(chuyen, rawSeatCode);
        assertSeatSelectable(chuyen, seat);

        Instant expiresAt = Instant.now().plus(selectHoldSeconds, ChronoUnit.SECONDS);
        var existing = giuGheTamRepository.findByChuyenXeIdAndSoGhe(chuyenXeId, seat);
        if (existing.isPresent()) {
            GiuGheTam hold = existing.get();
            if (hold.getExpiresAt().isAfter(Instant.now()) && !hold.getHoldToken().equals(holdToken)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đang được khách khác chọn: " + seat);
            }
            hold.setHoldToken(holdToken);
            hold.setExpiresAt(expiresAt);
            giuGheTamRepository.save(hold);
            broadcast(chuyenXeId);
            return;
        }

        long heldByToken = giuGheTamRepository.countByHoldTokenAndChuyenXeIdAndExpiresAtAfter(
            holdToken, chuyenXeId, Instant.now()
        );
        if (heldByToken >= MAX_HELD_SEATS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ được chọn tối đa " + MAX_HELD_SEATS + " ghế");
        }

        GiuGheTam hold = new GiuGheTam();
        hold.setChuyenXeId(chuyenXeId);
        hold.setSoGhe(seat);
        hold.setHoldToken(holdToken);
        hold.setExpiresAt(expiresAt);
        giuGheTamRepository.save(hold);
        broadcast(chuyenXeId);
    }

    @Transactional
    public void releaseSeat(Integer chuyenXeId, String rawHoldToken, String rawSeatCode) {
        if (rawSeatCode == null || rawSeatCode.isBlank()) {
            return;
        }
        String holdToken = normalizeHoldToken(rawHoldToken);
        ChuyenXe chuyen = chuyenXeRepository.findByIdWithDetails(chuyenXeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        String seat = normalizeSeat(chuyen, rawSeatCode);
        giuGheTamRepository.deleteByChuyenXeIdAndSoGheAndHoldToken(chuyenXeId, seat, holdToken);
        broadcast(chuyenXeId);
    }

    @Transactional
    public void releaseAll(Integer chuyenXeId, String rawHoldToken) {
        String holdToken = normalizeHoldToken(rawHoldToken);
        giuGheTamRepository.deleteByHoldTokenAndChuyenXeId(holdToken, chuyenXeId);
        broadcast(chuyenXeId);
    }

    @Transactional
    public void releaseSeats(Integer chuyenXeId, List<String> seatCodes) {
        if (seatCodes == null || seatCodes.isEmpty()) {
            return;
        }
        giuGheTamRepository.deleteByChuyenXeIdAndSoGheIn(chuyenXeId, seatCodes);
        broadcast(chuyenXeId);
    }

    public Set<String> activeTemporaryHolds(Integer chuyenXeId) {
        Set<String> seats = new HashSet<>();
        for (GiuGheTam hold : giuGheTamRepository.findByChuyenXeIdAndExpiresAtAfter(chuyenXeId, Instant.now())) {
            seats.add(hold.getSoGhe());
        }
        return seats;
    }

    public void assertSeatsNotHeldByOthers(Integer chuyenXeId, String rawHoldToken, List<String> seatCodes) {
        if (seatCodes == null || seatCodes.isEmpty()) {
            return;
        }
        String holdToken = rawHoldToken == null ? "" : rawHoldToken.trim();
        for (String seatCode : seatCodes) {
            var holdOpt = giuGheTamRepository.findByChuyenXeIdAndSoGhe(chuyenXeId, seatCode);
            if (holdOpt.isEmpty()) {
                continue;
            }
            GiuGheTam hold = holdOpt.get();
            if (hold.getExpiresAt().isAfter(Instant.now()) && !hold.getHoldToken().equalsIgnoreCase(holdToken)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đang được khách khác chọn: " + seatCode);
            }
        }
    }

    @Transactional
    public int purgeExpired() {
        Instant cutoff = Instant.now();
        List<Integer> tripIds = giuGheTamRepository.findDistinctChuyenXeIdByExpiresAtLessThanEqual(cutoff);
        int removed = giuGheTamRepository.deleteByExpiresAtLessThanEqual(cutoff);
        for (Integer tripId : tripIds) {
            broadcast(tripId);
        }
        return removed;
    }

    private ChuyenXe lockTrip(Integer chuyenXeId) {
        ChuyenXe chuyen = chuyenXeRepository.findByIdWithDetailsForUpdate(chuyenXeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        if (chuyen.getTrangThai() != TripRunStatus.CHUA_KHOI_HANH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến không mở chọn ghế");
        }
        LocalDateTime dep = LocalDateTime.of(chuyen.getNgayDi(), chuyen.getGioDi());
        if (!dep.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến đã khởi hành hoặc hết hạn đặt");
        }
        return chuyen;
    }

    private void assertSeatSelectable(ChuyenXe chuyen, String seat) {
        Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(chuyen));
        if (!allowed.contains(seat)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ghế không hợp lệ: " + seat);
        }
        List<String> sold = chiTietVeRepository.findOccupiedSeatCodes(
            chuyen.getId(),
            List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.DANG_XU_LY, TicketStatus.HOAN_THANH)
        );
        if (sold.contains(seat)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đã được bán: " + seat);
        }
        List<String> pendingPayment = chiTietVeRepository.findOccupiedSeatCodes(
            chuyen.getId(),
            List.of(TicketStatus.CHO_THANH_TOAN)
        );
        if (pendingPayment.contains(seat)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đang chờ thanh toán: " + seat);
        }
    }

    private String normalizeSeat(ChuyenXe chuyen, String rawSeatCode) {
        String seat = BookingCatalogService.normalizeSeatCode(chuyen, rawSeatCode);
        if (seat == null || seat.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ghế không hợp lệ");
        }
        return seat;
    }

    private String normalizeHoldToken(String rawHoldToken) {
        String token = rawHoldToken == null ? "" : rawHoldToken.trim();
        if (token.length() < 8 || token.length() > 64) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "holdToken không hợp lệ");
        }
        return token.toLowerCase(Locale.ROOT);
    }

    private void broadcast(Integer chuyenXeId) {
        seatMapStreamService.broadcast(chuyenXeId, bookingCatalogService.getSeatMap(chuyenXeId));
    }
}
