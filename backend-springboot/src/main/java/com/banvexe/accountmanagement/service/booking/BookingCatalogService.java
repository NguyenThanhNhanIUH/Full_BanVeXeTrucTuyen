package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.SeatMapDto;
import com.banvexe.accountmanagement.dto.booking.SeatStatusDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.RouteStatus;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
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

    public BookingCatalogService(
        TuyenXeRepository tuyenXeRepository,
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository
    ) {
        this.tuyenXeRepository = tuyenXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
    }

    public List<RouteSummaryDto> searchRoutes(String diemDi, String diemDen) {
        String di = blankToPercent(diemDi);
        String den = blankToPercent(diemDen);
        return tuyenXeRepository.searchRoutes(RouteStatus.ACTIVE, di, den).stream()
            .map(t -> new RouteSummaryDto(
                t.getId(),
                t.getTenTuyen(),
                t.getDiemDi(),
                t.getDiemDen(),
                t.getKhoangCach(),
                t.getThoiGianDuKien(),
                t.getGiaVeCoBan(),
                t.getTrangThai().name()
            ))
            .toList();
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

    public SeatMapDto getSeatMap(Integer chuyenId) {
        ChuyenXe c = chuyenXeRepository.findByIdWithDetails(chuyenId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));
        int soGhe = c.getXe().getSoGhe();
        Set<String> occupied = new HashSet<>(chiTietVeRepository.findOccupiedSeatCodes(c.getId(), STATUSES_BLOCKING_SEAT));
        List<String> labels = generateSeatLabels(soGhe);
        List<SeatStatusDto> seats = labels.stream()
            .map(l -> new SeatStatusDto(l, occupied.contains(l)))
            .toList();
        return new SeatMapDto(soGhe, seats);
    }

    public int countAvailableSeats(ChuyenXe c) {
        int total = c.getXe().getSoGhe();
        long occ = chiTietVeRepository.findOccupiedSeatCodes(c.getId(), STATUSES_BLOCKING_SEAT).size();
        return (int) (total - occ);
    }

    private boolean isTripStillBookableByTime(ChuyenXe c) {
        LocalDateTime departure = LocalDateTime.of(c.getNgayDi(), c.getGioDi());
        return departure.isAfter(LocalDateTime.now());
    }

    private TripSummaryDto toTripSummary(ChuyenXe c, int soGheTrong) {
        var t = c.getTuyenXe();
        var x = c.getXe();
        return new TripSummaryDto(
            c.getId(),
            t.getTenTuyen(),
            t.getDiemDi(),
            t.getDiemDen(),
            c.getNgayDi(),
            c.getGioDi(),
            c.getGiaVe(),
            x.getLoaiXe(),
            x.getBienSo(),
            x.getSoGhe(),
            soGheTrong,
            c.getTrangThai().name()
        );
    }

    private TripDetailDto toTripDetail(ChuyenXe c, int soGheTrong) {
        var t = c.getTuyenXe();
        var x = c.getXe();
        return new TripDetailDto(
            c.getId(),
            t.getId(),
            t.getTenTuyen(),
            t.getDiemDi(),
            t.getDiemDen(),
            c.getNgayDi(),
            c.getGioDi(),
            c.getGiaVe(),
            x.getId(),
            x.getLoaiXe(),
            x.getBienSo(),
            x.getSoGhe(),
            soGheTrong,
            c.getTrangThai().name()
        );
    }

    private String blankToPercent(String s) {
        if (s == null || s.isBlank()) {
            return "%";
        }
        return s.trim();
    }

    /**
     * Sinh nhãn ghế (A01, A02, …) để hiển thị sơ đồ; dữ liệu thật trong DB có thể dùng cùng quy ước khi đặt vé.
     */
    public static List<String> generateSeatLabels(int soGhe) {
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
}
