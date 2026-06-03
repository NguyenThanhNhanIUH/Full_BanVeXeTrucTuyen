package com.banvexe.accountmanagement.service.booking;

import com.banvexe.accountmanagement.dto.booking.BookTicketRequest;
import com.banvexe.accountmanagement.dto.booking.CustomerTicketDto;
import com.banvexe.accountmanagement.dto.booking.GuestBookTicketRequest;
import com.banvexe.accountmanagement.dto.booking.GuestPayTicketRequest;
import com.banvexe.accountmanagement.dto.booking.PayTicketRequest;
import com.banvexe.accountmanagement.dto.booking.PublicTicketLookupDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.entity.AccountStatus;
import com.banvexe.accountmanagement.entity.ChiTietVe;
import com.banvexe.accountmanagement.entity.ChuyenXe;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.PaymentTxnStatus;
import com.banvexe.accountmanagement.entity.ThanhToan;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.TripRunStatus;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChiTietVeRepository;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.ThanhToanRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.banvexe.accountmanagement.util.TicketGhiChuUtil;
import java.math.BigDecimal;
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
    private final KhachHangRepository khachHangRepository;
    private final BookingCatalogService bookingCatalogService;
    private final BookingNotificationService bookingNotificationService;
    private final BookingHoldPolicy bookingHoldPolicy;
    private final SeatSelectionHoldService seatSelectionHoldService;
    private final DeferredBookingPolicy deferredBookingPolicy;
    private final CustomerNotificationService customerNotificationService;

    public CustomerTicketService(
        VeXeRepository veXeRepository,
        ChuyenXeRepository chuyenXeRepository,
        ChiTietVeRepository chiTietVeRepository,
        ThanhToanRepository thanhToanRepository,
        UserAccountRepository userAccountRepository,
        KhachHangRepository khachHangRepository,
        BookingCatalogService bookingCatalogService,
        BookingNotificationService bookingNotificationService,
        BookingHoldPolicy bookingHoldPolicy,
        SeatSelectionHoldService seatSelectionHoldService,
        DeferredBookingPolicy deferredBookingPolicy,
        CustomerNotificationService customerNotificationService
    ) {
        this.veXeRepository = veXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.chiTietVeRepository = chiTietVeRepository;
        this.thanhToanRepository = thanhToanRepository;
        this.userAccountRepository = userAccountRepository;
        this.khachHangRepository = khachHangRepository;
        this.bookingCatalogService = bookingCatalogService;
        this.bookingNotificationService = bookingNotificationService;
        this.bookingHoldPolicy = bookingHoldPolicy;
        this.seatSelectionHoldService = seatSelectionHoldService;
        this.deferredBookingPolicy = deferredBookingPolicy;
        this.customerNotificationService = customerNotificationService;
    }

    @Transactional
    public CustomerTicketDto book(String email, BookTicketRequest req) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        KhachHang kh = requireKhachForLoggedIn(user);
        return bookForKhach(kh, req.chuyenXeId(), req.maGhe(), req.ghiChu(), req.holdToken(), Boolean.TRUE.equals(req.datTruoc()));
    }

    @Transactional
    public CustomerTicketDto bookGuest(GuestBookTicketRequest req) {
        KhachHang kh = resolveOrCreateGuestProfile(req.email(), req.soDienThoai(), req.hoTen());
        return bookForKhach(kh, req.chuyenXeId(), req.maGhe(), req.ghiChu(), req.holdToken(), Boolean.TRUE.equals(req.datTruoc()));
    }

    private KhachHang requireKhachForLoggedIn(UserAccount user) {
        if (user.getRole() != UserRole.KHACH_HANG) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ tài khoản khách hàng mới đặt vé tại đây");
        }
        if (user.getKhachHang() == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tài khoản thiếu hồ sơ khách hàng");
        }
        if (user.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản đang bị khóa");
        }
        if (user.getKhachHang().getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hồ sơ khách hàng chưa kích hoạt hoặc đang bị khóa");
        }
        return user.getKhachHang();
    }

    private CustomerTicketDto bookForKhach(
        KhachHang kh, Integer chuyenXeId, List<String> rawSeats, String ghiChu, String holdToken, boolean datTruoc) {
        ChuyenXe chuyen = chuyenXeRepository.findByIdWithDetailsForUpdate(chuyenXeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy chuyến xe"));

        if (chuyen.getTrangThai() != TripRunStatus.CHUA_KHOI_HANH) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến không mở bán vé");
        }
        LocalDateTime dep = LocalDateTime.of(chuyen.getNgayDi(), chuyen.getGioDi());
        if (!dep.isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến đã khởi hành hoặc hết hạn đặt");
        }

        List<String> seats = rawSeats.stream()
            .map(s -> BookingCatalogService.normalizeSeatCode(chuyen, s))
            .filter(s -> s != null && !s.isBlank())
            .distinct()
            .toList();
        if (seats.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chọn ít nhất một ghế");
        }

        int cap = Math.max(0, BookingCatalogService.safeTongGhe(chuyen));
        if (cap < 1) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Chuyến hoặc xe thiếu số ghế; không thể đặt vé."
            );
        }
        Set<String> allowed = new HashSet<>(BookingCatalogService.generateSeatLabels(chuyen));
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
        seatSelectionHoldService.assertSeatsNotHeldByOthers(chuyen.getId(), holdToken, seats);

        if (datTruoc) {
            deferredBookingPolicy.assertEligibleForDeferred(chuyen);
        }

        BigDecimal tong = chuyen.getGiaVe().multiply(BigDecimal.valueOf(seats.size()));
        VeXe ve = new VeXe();
        ve.setMaVe(generateMaVe());
        ve.setKhachHangId(kh.getId());
        ve.setChuyenXe(chuyen);
        ve.setNgayDat(Instant.now());
        ve.setSoLuongGhe(seats.size());
        ve.setTongTien(tong);
        if (datTruoc) {
            Instant hanThanhToan = deferredBookingPolicy.computePaymentDeadline(chuyen);
            ve.setTrangThai(TicketStatus.DAT_TRUOC);
            ve.setHanThanhToan(hanThanhToan);
            ve.setGhiChu(appendGhiChu(ghiChu, "Đặt trước - hạn thanh toán " + deferredBookingPolicy.payDaysBefore() + " ngày trước ngày đi"));
        } else {
            ve.setTrangThai(TicketStatus.CHO_THANH_TOAN);
            ve.setGhiChu(ghiChu);
        }
        veXeRepository.save(ve);

        for (String seat : seats) {
            ChiTietVe ct = new ChiTietVe();
            ct.setVeXe(ve);
            ct.setSoGhe(seat);
            chiTietVeRepository.save(ct);
        }
        seatSelectionHoldService.releaseSeats(chuyen.getId(), seats);

        VeXe saved = veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve);
        if (datTruoc) {
            bookingNotificationService.sendDeferredBookingSuccess(kh, saved, saved.getHanThanhToan());
            customerNotificationService.notifyDeferredBooking(kh, saved);
        } else {
            bookingNotificationService.sendBookingSuccess(kh, saved);
        }

        return toCustomerDto(saved);
    }

    private String appendGhiChu(String base, String extra) {
        if (base == null || base.isBlank()) {
            return extra;
        }
        return base + " | " + extra;
    }

    @Transactional
    public void pay(String email, Integer ticketId, PayTicketRequest req) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        payForKhach(requireKhachForLoggedIn(user), ticketId, req.phuongThuc(), req.dongYDieuKhoan());
    }

    @Transactional
    public void payGuest(Integer ticketId, GuestPayTicketRequest req) {
        KhachHang kh = resolveGuestByEmailPhone(req.email(), req.soDienThoai());
        payForKhach(kh, ticketId, req.phuongThuc(), req.dongYDieuKhoan());
    }

    public KhachHang resolveGuestForPayment(String email, String soDienThoai, String hoTen) {
        KhachHang kh = resolveGuestByEmailPhone(email, soDienThoai);
        String normalizedName = normalizeName(hoTen);
        if (!normalizedName.isBlank() && kh.getFullName() != null && !kh.getFullName().isBlank()) {
            if (!kh.getFullName().trim().equalsIgnoreCase(normalizedName)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ tên không khớp với hồ sơ khách hàng");
            }
        }
        return kh;
    }

    private void payForKhach(
        KhachHang kh, Integer ticketId, com.banvexe.accountmanagement.entity.PaymentMethod paymentMethod, Boolean agreeTerms) {
        if (!Boolean.TRUE.equals(agreeTerms)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phải đồng ý điều khoản để thanh toán");
        }
        VeXe ve = veXeRepository.findByIdWithDetails(ticketId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));

        if (!ve.getKhachHangId().equals(kh.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Không phải vé của bạn");
        }
        if (!bookingHoldPolicy.isPendingPayment(ve)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không ở trạng thái chờ thanh toán");
        }
        bookingHoldPolicy.assertHoldActive(ve);

        ThanhToan tt = new ThanhToan();
        tt.setVeXe(ve);
        tt.setSoTien(ve.getTongTien());
        tt.setPhuongThuc(paymentMethod);
        tt.setMaGiaoDich("MOCK-" + UUID.randomUUID().toString().substring(0, 12));
        tt.setTrangThai(PaymentTxnStatus.THANH_CONG);
        tt.setNgayThanhToan(Instant.now());
        thanhToanRepository.save(tt);

        ve.setTrangThai(TicketStatus.DA_THANH_TOAN);
        veXeRepository.save(ve);
        bookingNotificationService.sendPaymentSuccess(kh, List.of(ve), tt.getMaGiaoDich());
    }

    public List<CustomerTicketDto> myTickets(String email) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        KhachHang kh = requireKhachForLoggedIn(user);
        return veXeRepository.findAllByKhachHangIdWithRoute(kh.getId()).stream()
            .map(this::toCustomerDto)
            .toList();
    }

    public CustomerTicketDto getMyTicket(String email, Integer ticketId) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        KhachHang kh = requireKhachForLoggedIn(user);
        VeXe ve = veXeRepository.findByIdAndKhachHangId(ticketId, kh.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));
        return toCustomerDto(veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve));
    }

    public PublicTicketLookupDto lookupGuestTicket(String rawPhone, String rawMaVe) {
        String phone = normalizePhone(rawPhone);
        String maVe = rawMaVe == null ? "" : rawMaVe.trim();
        if (phone.isBlank() || maVe.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập số điện thoại và mã vé");
        }

        VeXe ve = veXeRepository.findByMaVeIgnoreCase(maVe)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp"));
        Integer khachHangId = ve.getKhachHangId();
        if (khachHangId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp");
        }

        KhachHang kh = khachHangRepository.findById(khachHangId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp"));

        if (!phone.equals(normalizePhone(kh.getPhone()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp");
        }

        VeXe detailed = veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve);
        return toPublicLookupDto(detailed, kh);
    }

    @Transactional
    public String cancelGuest(String rawPhone, String rawMaVe) {
        String phone = normalizePhone(rawPhone);
        String maVe = rawMaVe == null ? "" : rawMaVe.trim();
        if (phone.isBlank() || maVe.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vui lòng nhập số điện thoại và mã vé");
        }

        VeXe ve = veXeRepository.findByMaVeIgnoreCase(maVe)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp"));
        Integer khachHangId = ve.getKhachHangId();
        if (khachHangId == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp");
        }

        KhachHang kh = khachHangRepository.findById(khachHangId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp"));

        if (!phone.equals(normalizePhone(kh.getPhone()))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé phù hợp");
        }

        return cancelOrRequestCancelForVe(ve);
    }

    /**
     * @return thông điệp thành công (hiển thị cho khách)
     */
    @Transactional
    public String cancelOrRequestCancel(String email, Integer ticketId) {
        var user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        KhachHang kh = requireKhachForLoggedIn(user);
        VeXe ve = veXeRepository.findByIdAndKhachHangId(ticketId, kh.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy vé"));

        return cancelOrRequestCancelForVe(ve);
    }

    private String cancelOrRequestCancelForVe(VeXe ve) {

        if (ve.getTrangThai() == TicketStatus.DANG_XU_LY) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Yêu cầu hủy vé đang chờ nhân viên xử lý. Vui lòng không gửi lại."
            );
        }

        if (ve.getTrangThai() == TicketStatus.CHO_THANH_TOAN || ve.getTrangThai() == TicketStatus.DAT_TRUOC) {
            TicketStatus previous = ve.getTrangThai();
            bookingHoldPolicy.assertHoldActive(ve);
            ve.setTrangThai(TicketStatus.DA_HUY);
            String reason = previous == TicketStatus.DAT_TRUOC
                ? "khách tự hủy vé đặt trước"
                : "khách tự hủy, vé chưa thanh toán";
            ve.setGhiChu(TicketGhiChuUtil.ghiChuHuyThanhCong(reason));
            veXeRepository.saveAndFlush(ve);
            return "Hủy vé thành công. Ghi chú vé đã được cập nhật.";
        }

        if (ve.getTrangThai() == TicketStatus.DA_THANH_TOAN) {
            long hoursBook = java.time.temporal.ChronoUnit.HOURS.between(ve.getNgayDat(), Instant.now());
            if (hoursBook >= 12) {
                throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Vé không thể hủy: đã quá 12 giờ kể từ lúc đặt vé"
                );
            }
            VeXe full = veXeRepository.findByIdWithDetails(ve.getId()).orElse(ve);
            com.banvexe.accountmanagement.entity.ChuyenXe c = full.getChuyenXe();
            if (c != null && c.getNgayDi() != null && c.getGioDi() != null) {
                java.time.ZoneId vi = java.time.ZoneId.of("Asia/Ho_Chi_Minh");
                java.time.ZonedDateTime nowZ = Instant.now().atZone(vi);
                java.time.ZonedDateTime depZ = java.time.ZonedDateTime.of(
                    c.getNgayDi(),
                    c.getGioDi(),
                    vi
                );
                if (depZ.isBefore(nowZ.plus(12, java.time.temporal.ChronoUnit.HOURS))
                    && !depZ.isBefore(nowZ)) {
                    throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Vé không thể hủy: chuyến khởi hành trong vòng 12 giờ tới"
                    );
                }
            }
            String yeuCau = TicketGhiChuUtil.ghiChuYeuCauHuyChoDuyet();
            int n = veXeRepository.updateGhiChuAndTrangThaiById(ve.getId(), yeuCau, TicketStatus.DANG_XU_LY);
            if (n != 1) {
                throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Không cập nhật được yêu cầu hủy vé. Thử lại."
                );
            }
            return "Gửi yêu cầu hủy vé thành công. Nhân viên sẽ xử lý trong thời gian sớm nhất";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vé không thể hủy ở trạng thái hiện tại");
    }

    private String generateMaVe() {
        return "VX" + System.currentTimeMillis() % 1_000_000_000L + UUID.randomUUID().toString().substring(0, 4).toUpperCase(Locale.ROOT);
    }

    private CustomerTicketDto toCustomerDto(VeXe ve) {
        ChuyenXe c = ve.getChuyenXe();
        if (c == null) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Vé #" + ve.getId() + " thiếu thông tin chuyến."
            );
        }
        var t = c.getTuyenXe();
        var x = c.getXe();
        int trong = bookingCatalogService.countAvailableSeats(c);
        int tongGhe = BookingCatalogService.safeTongGhe(c);
        Integer thoiGianDuKienPhut = t != null ? t.getThoiGianDuKien() : null;
        var gioDenDuKien = (thoiGianDuKienPhut != null && c.getGioDi() != null)
            ? c.getGioDi().plusMinutes(thoiGianDuKienPhut)
            : null;
        TripSummaryDto trip = new TripSummaryDto(
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
            trong,
            c.getTrangThai() != null ? c.getTrangThai().name() : "UNKNOWN"
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
            bookingHoldPolicy.holdExpiresAt(ve),
            ve.getGhiChu(),
            seats,
            trip
        );
    }

    private PublicTicketLookupDto toPublicLookupDto(VeXe ve, KhachHang kh) {
        CustomerTicketDto base = toCustomerDto(ve);
        return new PublicTicketLookupDto(
            base.id(),
            base.maVe(),
            base.trangThai(),
            base.tongTien(),
            base.ngayDat(),
            base.holdExpiresAt(),
            base.ghiChu(),
            kh.getFullName(),
            kh.getPhone(),
            kh.getEmail(),
            base.maGhe(),
            base.chuyen()
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        return phone == null ? "" : phone.trim().replace(" ", "");
    }

    private String normalizeName(String fullName) {
        return fullName == null ? "" : fullName.trim();
    }

    private KhachHang resolveOrCreateGuestProfile(String rawEmail, String rawPhone, String rawName) {
        String email = normalizeEmail(rawEmail);
        String phone = normalizePhone(rawPhone);
        String fullName = normalizeName(rawName);

        if (email.isBlank() || phone.isBlank() || fullName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin khách hàng để đặt vé");
        }

        var byEmail = khachHangRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            KhachHang kh = byEmail.get();
            var accOpt = userAccountRepository.findByEmail(email);
            if (accOpt.isPresent() && accOpt.get().getRole() != UserRole.KHACH_HANG) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email thuộc tài khoản không hợp lệ để đặt vé công khai");
            }
            if (accOpt.isPresent() && accOpt.get().getKhachHang() != null
                && !accOpt.get().getKhachHang().getId().equals(kh.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email thuộc tài khoản không hợp lệ");
            }
            if (accOpt.isPresent()) {
                if (accOpt.get().getStatus() != AccountStatus.ACTIVE) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản khách hàng đang bị khóa");
                }
            }
            if (kh.getStatus() != AccountStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hồ sơ khách hàng chưa kích hoạt hoặc đang bị khóa");
            }
            if (kh.getPhone() != null && !kh.getPhone().isBlank() && !normalizePhone(kh.getPhone()).equals(phone)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email và số điện thoại không khớp");
            }
            if (kh.getPhone() == null || kh.getPhone().isBlank()) {
                if (khachHangRepository.existsByPhone(phone)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
                }
                kh.setPhone(phone);
            }
            if (kh.getFullName() == null || kh.getFullName().isBlank()) {
                kh.setFullName(fullName);
            }
            return khachHangRepository.save(kh);
        }

        if (khachHangRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }

        KhachHang guest = new KhachHang();
        guest.setEmail(email);
        guest.setPhone(phone);
        guest.setFullName(fullName);
        guest.setStatus(AccountStatus.ACTIVE);
        return khachHangRepository.save(guest);
    }

    private KhachHang resolveGuestByEmailPhone(String rawEmail, String rawPhone) {
        String email = normalizeEmail(rawEmail);
        String phone = normalizePhone(rawPhone);
        if (email.isBlank() || phone.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu thông tin khách hàng để thanh toán");
        }
        KhachHang kh = khachHangRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        userAccountRepository.findByEmail(email).ifPresent(ua -> {
            if (ua.getRole() != UserRole.KHACH_HANG) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tài khoản không hợp lệ");
            }
            if (ua.getStatus() != AccountStatus.ACTIVE) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản khách hàng đang bị khóa");
            }
        });
        if (kh.getStatus() != AccountStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hồ sơ khách hàng chưa kích hoạt hoặc đang bị khóa");
        }
        if (kh.getPhone() == null || kh.getPhone().isBlank() || !normalizePhone(kh.getPhone()).equals(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email và số điện thoại không khớp");
        }
        return kh;
    }
}
