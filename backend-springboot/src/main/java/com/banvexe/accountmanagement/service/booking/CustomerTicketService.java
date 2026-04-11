package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.BookTicketRequest;
import com.banvexe.accountmanagement.dto.booking.CustomerTicketDto;
import com.banvexe.accountmanagement.dto.booking.PayTicketRequest;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.PaymentMethod;
import com.banvexe.accountmanagement.entity.PaymentTxnStatus;
import com.banvexe.accountmanagement.entity.ThanhToan;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.ThanhToanRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CustomerTicketService {

    private final VeXeRepository veXeRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final ChiTietVeRepository chiTietVeRepository;
    private final ThanhToanRepository thanhToanRepository;
    private final UserAccountRepository userAccountRepository;
    private final BookingCatalogService bookingCatalogService;

    public CustomerTicketService(
        VeXeRepository veXeRepository,
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        ThanhToanRepository thanhToanRepository,
        UserAccountRepository userAccountRepository,
        BookingCatalogService bookingCatalogService
    ) {
        this.veXeRepository = veXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.userAccountRepository = userAccountRepository;
        this.bookingCatalogService = bookingCatalogService;
    }

    @Transactional
    public CustomerTicketDto book(String email, BookTicketRequest req) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        ChuyenXe chuyen = chuyenXeRepository.findByIdWithDetails(req.chuyenXeId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));

        if (chuyen.getTrangThai() != TripRunStatus.CHUA_KHOI_HANH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến không mở bán vé");
        }
        LocalDateTime dep = LocalDateTime.of(chuyen.getNgayDi(), chuyen.getGioDi());
        if (!dep.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến đã khởi hành hoặc hết hạn đặt");
        }

        List<String> seats = req.maGhe().stream().map(s -> s.trim().toUpperCase(Locale.ROOT)).distinct().toList();
        if (seats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn ít nhất một ghế");
        }

        Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(chuyen.getXe().getSoGhe()));
        for (String s : seats) {
            if (!allowed.contains(s)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã ghế không hợp lệ: " + s);
            }
        }

        List<String> occupied = chiTietVeRepository.findOccupiedSeatCodes(chuyen.getId(), BookingCatalogService.STATUSES_BLOCKING_SEAT);
        for (String s : seats) {
            if (occupied.contains(s)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ghế đã được đặt: " + s);
            }
        }

        BigDecimal tong = chuyen.getGiaVe().multiply(BigDecimal.valueOf(seats.size()));
        VeXe ve = new VeXe();
        ve.setMaVe(generateMaVe());
        ve.setKhachHangId(user.getId());
        ve.setChuyenXe(chuyen);
        ve.setNgayDat(Instant.now());
        ve.setSoLuongGhe(seats.size());
        ve.setTongTien(tong);
        ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
        ve.setGhiChu(req.ghiChu());
        veXeRepository.save(ve);

        for (String seat : seats) {
            ChiTietVe ct = new ChiTietVe();
            ct.setVeXe(ve);
            ct.setSoGhe(seat);
            chiTietVeRepository.save(ct);
        }

        return toCustomerDto(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
    }

    @Transactional
    public void pay(String email, Integer ticketId, PayTicketRequest req) {
        if (!Boolean.TRUE.equals(req.dongYDieuKhoan())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phải đồng ý điều khoản để thanh toán");
        }
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        VeXe ve = veXeRepository.findByIdWithDetails(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));

        if (!ve.getKhachHangId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không phải vé của bạn");
        }
        if (ve.getTrangThai() != TicketStatus.CHO_THANH_TOAN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không ở trạng thái chờ thanh toán");
        }

        ThanhToan tt = new ThanhToan();
        tt.setVeXe(ve);
        tt.setSoTien(ve.getTongTien());
        tt.setPhuongThuc(req.phuongThuc());
        tt.setMaGiaoDich("MOCK-" + UUID.randomUUID().toString().substring(0, 12));
        tt.setTrangThai(PaymentTxnStatus.THANH_CONG);
        tt.setNgayThanhToan(Instant.now());
        thanhToanRepository.save(tt);

        ve.setTrangThai(TicketStatus.DA_THANH_TOAN);
        veXeRepository.save(ve);
    }

    public List<CustomerTicketDto> myTickets(String email) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        return veXeRepository.findAllByKhachHangIdWithRoute(user.getId()).stream()
            .map(this::toCustomerDto)
            .toList();
    }

    public CustomerTicketDto getMyTicket(String email, Integer ticketId) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        VeXe ve = veXeRepository.findByIdAndKhachHangId(ticketId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        return toCustomerDto(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
    }

    @Transactional
    public void cancelOrRequestCancel(String email, Integer ticketId) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        VeXe ve = veXeRepository.findByIdAndKhachHangId(ticketId, user.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));

        if (ve.getTrangThai() == TicketStatus.CHO_THANH_TOAN) {
            Duration since = Duration.between(ve.getNgayDat(), Instant.now());
            if (since.toHours() > 2) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Quá 2 giờ kể từ đặt vé, không thể tự hủy vé chờ thanh toán");
            }
            ve.setTrangThai(TicketStatus.DA_HUY);
            veXeRepository.save(ve);
            return;
        }
        if (ve.getTrangThai() == TicketStatus.DA_THANH_TOAN) {
            ve.setTrangThai(TicketStatus.DANG_XU_LY);
            ve.setGhiChu(trimNote(ve.getGhiChu()) + " [Yêu cầu hủy vé chờ nhân viên duyệt]");
            veXeRepository.save(ve);
            return;
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không thể hủy ở trạng thái hiện tại");
    }

    private String trimNote(String g) {
        return g == null ? "" : g;
    }

    private String generateMaVe() {
        return "VX" + System.currentTimeMillis() % 1_000_000_000L + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
    }

    private CustomerTicketDto toCustomerDto(VeXe ve) {
        ChuyenXe c = ve.getChuyenXe();
        var t = c.getTuyenXe();
        var x = c.getXe();
        int trong = bookingCatalogService.countAvailableSeats(c);
        TripSummaryDto trip = new TripSummaryDto(
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
            trong,
            c.getTrangThai().name()
        );
        List<String> seats = chiTietVeRepository.findByVeXeId(ve.getId()).stream()
            .map(ChiTietVe::getSoGhe)
            .toList();
        return new CustomerTicketDto(
            ve.getId(),
            ve.getMaVe(),
            ve.getTrangThai(),
            ve.getTongTien(),
            ve.getNgayDat(),
            ve.getGhiChu(),
            seats,
            trip
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
