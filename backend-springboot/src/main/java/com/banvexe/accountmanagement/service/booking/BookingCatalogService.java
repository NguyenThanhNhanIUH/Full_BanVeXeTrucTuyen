package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.SeatMapDto;
import com.banvexe.accountmanagement.dto.booking.SeatStatusDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.dto.booking.TripTrackingDto;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.entity.TuyenXe;
import com.banvexe.accountmanagement.entity.Xe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.GiuGheTamRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import java.text.Normalizer;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BookingCatalogService {

    public static final List<TicketStatus> STATUSES_BLOCKING_SEAT = List.of(
        TicketStatus.CHO_THANH_TOAN,
        TicketStatus.DA_THANH_TOAN,
        TicketStatus.DANG_XU_LY,
        TicketStatus.HOAN_THANH
    );

    private final TuyenXeRepository tuyenXeRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final GiuGheTamRepository giuGheTamRepository;
    private final LocationCoordinateResolver locationCoordinateResolver;

    public BookingCatalogService(
        TuyenXeRepository tuyenXeRepository,
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        GiuGheTamRepository giuGheTamRepository,
        LocationCoordinateResolver locationCoordinateResolver
    ) {
        this.tuyenXeRepository = tuyenXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.giuGheTamRepository = giuGheTamRepository;
        this.locationCoordinateResolver = locationCoordinateResolver;
    }

    public List<RouteSummaryDto> searchRoutes(String diemDi, String diemDen) {
        String di = blankToPercent(diemDi);
        String den = blankToPercent(diemDen);
        return tuyenXeRepository.searchRoutes(RouteStatus.ACTIVE, di, den).stream()
            .map(t -> new RouteSummaryDto(
                t.getId(),
                t.getTenTuyen() != null ? t.getTenTuyen() : "",
                t.getDiemDi() != null ? t.getDiemDi() : "",
                t.getDiemDen() != null ? t.getDiemDen() : "",
                t.getKhoangCach(),
                t.getThoiGianDuKien(),
                t.getGiaVeCoBan(),
                t.getTrangThai() != null ? t.getTrangThai().name() : "INACTIVE",
                0L
            ))
            .toList();
    }

    public List<String> suggestOrigins(String keyword) {
        return tuyenXeRepository.suggestOrigins(RouteStatus.ACTIVE, normalizeKeyword(keyword));
    }

    public List<String> suggestDestinations(String keyword) {
        return tuyenXeRepository.suggestDestinations(RouteStatus.ACTIVE, normalizeKeyword(keyword));
    }

    public List<TripSummaryDto> searchTrips(String diemDi, String diemDen, LocalDate ngayDi, int soLuongVeToiThieu) {
        if (ngayDi != null && ngayDi.isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ngày đi phải từ hôm nay trở đi");
        }
        String di = blankToPercent(diemDi);
        String den = blankToPercent(diemDen);
        LocalDate from = LocalDate.now();
        List<ChuyenXe> trips = chuyenXeRepository.searchTrips(
            RouteStatus.ACTIVE,
            TripRunStatus.CHUA_KHOI_HANH,
            di,
            den,
            ngayDi,
            from
        );
        return trips.stream()
            .filter(this::isTripStillBookableByTime)
            .map(c -> toTripSummary(c, countAvailableSeats(c)))
            .filter(t -> t.soGheTrong() >= soLuongVeToiThieu)
            .toList();
    }

    public TripDetailDto getTripDetail(Integer chuyenId) {
        ChuyenXe c = chuyenXeRepository.findByIdWithDetails(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        int trong = countAvailableSeats(c);
        return toTripDetail(c, trong);
    }

    public TripTrackingDto getTripTracking(Integer chuyenId) {
        return getTripTracking(chuyenId, false);
    }

    public TripTrackingDto getTripTracking(Integer chuyenId, boolean forceDemo) {
        ChuyenXe c = chuyenXeRepository.findByIdWithDetails(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        TuyenXe t = c.getTuyenXe();
        Xe x = c.getXe();
        String diemDi = t != null ? t.getDiemDi() : "";
        String diemDen = t != null ? t.getDiemDen() : "";
        LocationCoordinateResolver.GeoPoint origin = locationCoordinateResolver.resolve(diemDi);
        LocationCoordinateResolver.GeoPoint dest = locationCoordinateResolver.resolve(diemDen);

        Integer durationMinutes = t != null ? t.getThoiGianDuKien() : null;
        LocalDateTime departure = LocalDateTime.of(c.getNgayDi(), c.getGioDi());
        LocalDateTime arrival = durationMinutes != null && durationMinutes > 0
            ? departure.plusMinutes(durationMinutes)
            : departure.plusHours(6);
        LocalDateTime now = LocalDateTime.now();

        TripRunStatus runStatus = c.getTrangThai() != null ? c.getTrangThai() : TripRunStatus.CHUA_KHOI_HANH;
        double progress;
        String statusCode;
        String statusLabel;
        boolean cheDoDemo = false;

        if (forceDemo) {
            progress = demoProgressSeconds();
            statusCode = "DEMO";
            statusLabel = "Demo hành trình";
            cheDoDemo = true;
        } else if (runStatus == TripRunStatus.HUY_CHUYEN) {
            progress = 0;
            statusCode = runStatus.name();
            statusLabel = "Chuyến đã hủy";
        } else if (runStatus == TripRunStatus.HOAN_THANH || now.isAfter(arrival)) {
            progress = 1;
            statusCode = TripRunStatus.HOAN_THANH.name();
            statusLabel = "Đã đến nơi";
        } else if (runStatus == TripRunStatus.DANG_CHAY || (now.isAfter(departure) && now.isBefore(arrival))) {
            long totalSeconds = Math.max(1, java.time.Duration.between(departure, arrival).getSeconds());
            long elapsedSeconds = Math.max(0, java.time.Duration.between(departure, now).getSeconds());
            progress = Math.min(1, Math.max(0, (double) elapsedSeconds / totalSeconds));
            statusCode = TripRunStatus.DANG_CHAY.name();
            statusLabel = "Đang trên đường";
        } else {
            progress = demoProgressSeconds();
            statusCode = "DEMO";
            statusLabel = "Demo hành trình (chưa tới giờ chạy)";
            cheDoDemo = true;
        }

        double xeLat = origin.lat() + (dest.lat() - origin.lat()) * progress;
        double xeLng = origin.lng() + (dest.lng() - origin.lng()) * progress;

        return new TripTrackingDto(
            c.getId(),
            diemDi,
            diemDen,
            x != null ? x.getLoaiXe() : "",
            x != null ? x.getBienSo() : "",
            origin.lat(),
            origin.lng(),
            dest.lat(),
            dest.lng(),
            xeLat,
            xeLng,
            (int) Math.round(progress * 100),
            statusCode,
            statusLabel,
            cheDoDemo
        );
    }

    /** Vòng demo ~2 phút để thấy xe di chuyển trên map khi chưa tới giờ chạy thật. */
    private static double demoProgressSeconds() {
        long cycleSec = 120L;
        long pos = (System.currentTimeMillis() / 1000) % cycleSec;
        return pos / (double) cycleSec;
    }

    public SeatMapDto getSeatMap(Integer chuyenId) {
        return getSeatMap(chuyenId, null);
    }

    public SeatMapDto getSeatMap(Integer chuyenId, String holdToken) {
        ChuyenXe c = chuyenXeRepository.findByIdWithDetails(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        int soGhe = safeTongGhe(c);
        if (soGhe < 1) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Chuyến #" + c.getId() + ": xe không hợp lệ (thiếu hoặc số ghế = 0). Kiểm tra bảng Xe.chuyen_xe."
            );
        }
        Set<String> myTemporaryHolds = resolveMyTemporaryHolds(c.getId(), holdToken);
        Set<String> held = new HashSet<>(
            chiTietVeRepository.findOccupiedSeatCodes(c.getId(), List.of(TicketStatus.CHO_THANH_TOAN))
        );
        giuGheTamRepository.findByChuyenXeIdAndExpiresAtAfter(c.getId(), Instant.now())
            .forEach(h -> {
                if (!myTemporaryHolds.contains(h.getSoGhe())) {
                    held.add(h.getSoGhe());
                }
            });
        Set<String> sold = new HashSet<>(
            chiTietVeRepository.findOccupiedSeatCodes(
                c.getId(),
                List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.DANG_XU_LY, TicketStatus.HOAN_THANH)
            )
        );
        List<String> labels = generateSeatLabels(c);
        List<SeatStatusDto> seats = labels.stream()
            .map(l -> new SeatStatusDto(l, sold.contains(l), held.contains(l)))
            .toList();
        return new SeatMapDto(soGhe, seats, myTemporaryHolds.stream().sorted().toList());
    }

    private Set<String> resolveMyTemporaryHolds(Integer chuyenId, String holdToken) {
        String normalized = normalizeHoldToken(holdToken);
        if (normalized == null) {
            return Set.of();
        }
        Set<String> mine = new HashSet<>();
        giuGheTamRepository.findByHoldTokenAndChuyenXeIdAndExpiresAtAfter(normalized, chuyenId, Instant.now())
            .forEach(h -> mine.add(h.getSoGhe()));
        return mine;
    }

    private String normalizeHoldToken(String holdToken) {
        if (holdToken == null) {
            return null;
        }
        String token = holdToken.trim().toLowerCase(java.util.Locale.ROOT);
        if (token.length() < 8 || token.length() > 64) {
            return null;
        }
        return token;
    }

    public int countAvailableSeats(ChuyenXe c) {
        // Xe.soGhe là Integer: null → NPE nếu gán thẳng vào int (gây 500 ở GET /api/manager/trips)
        int total = safeTongGhe(c);
        long occ = chiTietVeRepository.findOccupiedSeatCodes(c.getId(), STATUSES_BLOCKING_SEAT).size();
        return (int) Math.max(0L, (long) total - occ);
    }

    /** Số ghế từ entity xe; null-safe cho DB cũ / cột nullable. */
    public static int safeTongGhe(ChuyenXe c) {
        if (c == null) {
            return 0;
        }
        Xe x = c.getXe();
        if (x == null) {
            return 0;
        }
        Integer n = x.getSoGhe();
        return n != null ? n : 0;
    }

    private boolean isTripStillBookableByTime(ChuyenXe c) {
        LocalDateTime departure = LocalDateTime.of(c.getNgayDi(), c.getGioDi());
        return departure.isAfter(LocalDateTime.now());
    }

    private TripSummaryDto toTripSummary(ChuyenXe c, int soGheTrong) {
        TuyenXe t = c.getTuyenXe();
        Xe x = c.getXe();
        int tongGhe = safeTongGhe(c);
        Integer thoiGianDuKienPhut = t != null ? t.getThoiGianDuKien() : null;
        LocalTime gioDenDuKien = null;
        if (thoiGianDuKienPhut != null && c.getGioDi() != null) {
            gioDenDuKien = c.getGioDi().plusMinutes(thoiGianDuKienPhut);
        }
        return new TripSummaryDto(
            c.getId(),
            t != null ? t.getTenTuyen() : "",
            t != null ? t.getDiemDi() : "",
            t != null ? t.getDiemDen() : "",
            c.getNgayDi(),
            c.getGioDi(),
            gioDenDuKien,
            thoiGianDuKienPhut,
            t != null ? t.getKhoangCach() : null,
            c.getGiaVe(),
            x != null ? x.getLoaiXe() : "",
            x != null ? x.getBienSo() : "",
            tongGhe,
            soGheTrong,
            c.getTrangThai() != null ? c.getTrangThai().name() : "UNKNOWN"
        );
    }

    private TripDetailDto toTripDetail(ChuyenXe c, int soGheTrong) {
        TuyenXe t = c.getTuyenXe();
        Xe x = c.getXe();
        int tongGhe = safeTongGhe(c);
        if (t == null || x == null) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Chuyến #" + c.getId() + " thiếu tuyến hoặc xe."
            );
        }
        return new TripDetailDto(
            c.getId(),
            t.getId(),
            nn(t.getTenTuyen()),
            nn(t.getDiemDi()),
            nn(t.getDiemDen()),
            c.getNgayDi(),
            c.getGioDi(),
            c.getGiaVe(),
            x.getId(),
            nn(x.getLoaiXe()),
            nn(x.getBienSo()),
            tongGhe,
            soGheTrong,
            c.getTrangThai() != null ? c.getTrangThai().name() : "UNKNOWN"
        );
    }

    private static String nn(String s) {
        return s != null ? s : "";
    }

    private String blankToPercent(String s) {
        if (s == null || s.isBlank()) {
            return "%";
        }
        return s.trim();
    }

    private String normalizeKeyword(String keyword) {
        return keyword == null ? "" : keyword.trim();
    }

    public static List<String> generateSeatLabels(ChuyenXe c) {
        int soGhe = safeTongGhe(c);
        String loaiXe = c != null && c.getXe() != null ? c.getXe().getLoaiXe() : null;
        return generateSeatLabels(soGhe, loaiXe);
    }

    /**
     * Sinh nhãn ghế theo loại xe để lưu DB và validate thống nhất với giao diện cũ:
     * - Giường nằm: A01.. (tầng dưới), B01.. (tầng trên)
     * - Loại khác: 01, 02, ... (tăng dần)
     */
    public static List<String> generateSeatLabels(int soGhe, String loaiXe) {
        List<String> labels = new ArrayList<>(soGhe);
        if (soGhe <= 0) {
            return labels;
        }
        String vt = normalizeVehicleType(loaiXe);
        if (vt.contains("giuong")) {
            int lowerCount = (soGhe + 1) / 2;
            int upperCount = soGhe - lowerCount;
            for (int i = 1; i <= lowerCount; i++) {
                labels.add(String.format("A%02d", i));
            }
            for (int i = 1; i <= upperCount; i++) {
                labels.add(String.format("B%02d", i));
            }
            return labels;
        }
        for (int i = 0; i < soGhe; i++) {
            labels.add(String.format("%02d", i + 1));
        }
        return labels;
    }

    public static List<String> generateSeatLabels(int soGhe) {
        return generateSeatLabels(soGhe, null);
    }

    /**
     * Chuẩn hóa mã ghế client gửi về mã canonical theo loại xe.
     * Hỗ trợ tương thích nhãn cũ dạng lưới A01, A02... (legacy).
     */
    public static String normalizeSeatCode(ChuyenXe c, String seatCode) {
        if (seatCode == null) return null;
        String normalizedInput = seatCode.trim().toUpperCase();
        if (normalizedInput.isEmpty()) return null;

        List<String> canonical = generateSeatLabels(c);
        if (canonical.isEmpty()) return null;
        Map<String, String> aliasToCanonical = new LinkedHashMap<>();
        for (String s : canonical) {
            aliasToCanonical.put(s, s);
        }
        List<String> legacy = generateLegacyGridLabels(canonical.size());
        for (int i = 0; i < Math.min(canonical.size(), legacy.size()); i++) {
            aliasToCanonical.putIfAbsent(legacy.get(i), canonical.get(i));
        }
        return aliasToCanonical.get(normalizedInput);
    }

    private static List<String> generateLegacyGridLabels(int soGhe) {
        int cols = soGhe <= 9 ? 3 : 4;
        List<String> labels = new ArrayList<>(soGhe);
        for (int i = 0; i < soGhe; i++) {
            int row = i / cols;
            int col = i % cols + 1;
            char rowChar = (char) ('A' + Math.min(row, 25));
            labels.add(String.format("%c%02d", rowChar, col));
        }
        return labels;
    }

    private static String normalizeVehicleType(String loaiXe) {
        if (loaiXe == null) return "";
        String s = loaiXe.trim().toLowerCase();
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
