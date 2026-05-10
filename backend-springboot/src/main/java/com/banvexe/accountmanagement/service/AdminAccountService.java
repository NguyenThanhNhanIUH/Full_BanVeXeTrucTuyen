package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.AdminCustomerDetailResponse;
import com.banvexe.accountmanagement.dto.CreateCustomerRequest;
import com.banvexe.accountmanagement.dto.CreateStaffRequest;
import com.banvexe.accountmanagement.dto.CustomerProfileResponse;
import com.banvexe.accountmanagement.dto.CustomerSummaryResponse;
import com.banvexe.accountmanagement.dto.DashboardStatsResponse;
import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.dto.StaffSummaryResponse;
import com.banvexe.accountmanagement.dto.TicketSummaryResponse;
import com.banvexe.accountmanagement.dto.UpdateCustomerRequest;
import com.banvexe.accountmanagement.dto.UpdateCustomerStatusRequest;
import com.banvexe.accountmanagement.dto.UpdateStaffRequest;
import com.banvexe.accountmanagement.dto.UpdateStaffStatusRequest;
import com.banvexe.accountmanagement.entity.AccountStatus;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.ChuyenXeRepository;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.TuyenXeRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import com.banvexe.accountmanagement.repository.XeRepository;
import com.banvexe.accountmanagement.util.PhoneNumberUtil;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminAccountService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserAccountRepository userAccountRepository;
    private final KhachHangRepository khachHangRepository;
    private final VeXeRepository veXeRepository;
    private final TuyenXeRepository tuyenXeRepository;
    private final ChuyenXeRepository chuyenXeRepository;
    private final XeRepository xeRepository;
    private final PasswordService passwordService;

    public AdminAccountService(
        UserAccountRepository userAccountRepository,
        KhachHangRepository khachHangRepository,
        VeXeRepository veXeRepository,
        TuyenXeRepository tuyenXeRepository,
        ChuyenXeRepository chuyenXeRepository,
        XeRepository xeRepository,
        PasswordService passwordService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.khachHangRepository = khachHangRepository;
        this.veXeRepository = veXeRepository;
        this.tuyenXeRepository = tuyenXeRepository;
        this.chuyenXeRepository = chuyenXeRepository;
        this.xeRepository = xeRepository;
        this.passwordService = passwordService;
    }

    public DashboardStatsResponse getDashboardStats() {
        long customers = userAccountRepository.countUsersWithRole(UserRole.KHACH_HANG);
        long staff = userAccountRepository.countUsersWithRole(UserRole.NHAN_VIEN);
        long lockedCustomers = userAccountRepository.countUsersWithRoleAndStatus(
            UserRole.KHACH_HANG, AccountStatus.INACTIVE);
        long lockedStaff = userAccountRepository.countUsersWithRoleAndStatus(
            UserRole.NHAN_VIEN, AccountStatus.INACTIVE);
        long locked = lockedCustomers + lockedStaff;
        long routes = tuyenXeRepository.count();
        long trips = chuyenXeRepository.count();
        long tickets = veXeRepository.count();
        long vehicles = xeRepository.count();
        long totalKhachHang = khachHangRepository.count();
        BigDecimal revenueDaThu = Objects.requireNonNullElse(
            veXeRepository.sumTongTienByTrangThaiIn(List.of(TicketStatus.DA_THANH_TOAN, TicketStatus.HOAN_THANH)),
            BigDecimal.ZERO
        );
        BigDecimal revenueChoTT = Objects.requireNonNullElse(
            veXeRepository.sumTongTienByTrangThai(TicketStatus.CHO_THANH_TOAN),
            BigDecimal.ZERO
        );
        return new DashboardStatsResponse(
            customers, staff, locked, customers + staff, routes, trips, tickets, vehicles, lockedCustomers, lockedStaff,
            totalKhachHang, revenueDaThu, revenueChoTT);
    }

    public PageResponse<CustomerSummaryResponse> listCustomers(String search, int page, int size) {
        Page<KhachHang> result = khachHangRepository.searchByKeyword(
            blankToNullSearch(search),
            PageRequest.of(normalizePage(page), normalizeSize(size), Sort.by(Sort.Direction.DESC, "id"))
        );
        return toPageResponse(result, k -> toCustomerSummary(k, userAccountRepository.findByKhachHang_Id(k.getId())));
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerSummaryResponse> listCustomerTaiKhoan(String search, int page, int size) {
        Page<UserAccount> result = userAccountRepository.findAccountsByRoleWithKhachHang(
            UserRole.KHACH_HANG,
            blankToNullSearch(search),
            PageRequest.of(normalizePage(page), normalizeSize(size), Sort.by(Sort.Direction.DESC, "id"))
        );
        return toPageResponseUser(
            result,
            u -> toCustomerSummary(Objects.requireNonNull(u.getKhachHang(), "khachHang"), Optional.of(u))
        );
    }

    public AdminCustomerDetailResponse getCustomerDetail(Integer khachHangId) {
        KhachHang k = khachHangRepository.findById(khachHangId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        Optional<UserAccount> acc = userAccountRepository.findByKhachHang_Id(k.getId());
        List<TicketSummaryResponse> tickets = veXeRepository.findAllByKhachHangIdWithRoute(khachHangId).stream()
            .map(this::toTicketSummary)
            .toList();
        return new AdminCustomerDetailResponse(toCustomerProfile(k, acc.orElse(null)), tickets);
    }

    public PageResponse<StaffSummaryResponse> listStaffs(String search, int page, int size) {
        Page<UserAccount> result = userAccountRepository.findByRoleWithSearch(
            UserRole.NHAN_VIEN,
            blankToNullSearch(search),
            PageRequest.of(normalizePage(page), normalizeSize(size), Sort.by(Sort.Direction.DESC, "id"))
        );
        return toPageResponseUser(result, this::toStaffSummary);
    }

    public StaffSummaryResponse createStaff(CreateStaffRequest request) {
        String email = normalizeEmail(request.email());

        if (userAccountRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập đã tồn tại");
        }

        String phone = parseVnPhoneOrNull(request.phone());
        if (phone != null && userAccountRepository.findByPhone(phone).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }
        if (phone != null && khachHangRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng bởi hồ sơ khách hàng");
        }

        UserAccount staff = new UserAccount();
        staff.setEmail(email);
        staff.setPasswordHash(passwordService.encode(request.password()));
        staff.setFullName(request.fullName().trim());
        staff.setPhone(phone);
        staff.setRole(UserRole.NHAN_VIEN);
        staff.setStatus(AccountStatus.ACTIVE);

        userAccountRepository.save(staff);
        return toStaffSummary(staff);
    }

    public StaffSummaryResponse updateStaff(Integer staffId, UpdateStaffRequest request) {
        UserAccount staff = userAccountRepository.findById(staffId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getRole() != UserRole.NHAN_VIEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng không phải nhân viên");
        }

        String phone = parseVnPhoneOrNull(request.phone());
        if (phone != null && userAccountRepository.existsByPhoneAndIdNot(phone, staffId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }
        if (phone != null && khachHangRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại trùng với hồ sơ khách hàng");
        }

        staff.setFullName(request.fullName().trim());
        staff.setPhone(phone);
        userAccountRepository.save(staff);
        return toStaffSummary(staff);
    }

    public void updateStaffStatus(Integer staffId, UpdateStaffStatusRequest request) {
        UserAccount staff = userAccountRepository.findById(staffId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getRole() != UserRole.NHAN_VIEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng không phải nhân viên");
        }

        staff.setStatus(request.status());
        userAccountRepository.save(staff);
    }

    @Transactional
    public CustomerSummaryResponse createCustomer(CreateCustomerRequest request) {
        String email = normalizeEmail(request.email());

        if (userAccountRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập đã tồn tại");
        }
        if (khachHangRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email hồ sơ đã tồn tại");
        }

        String phone = parseVnPhoneOrNull(request.phone());
        if (phone != null && khachHangRepository.existsByPhone(phone)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }

        KhachHang k = new KhachHang();
        k.setEmail(email);
        k.setPhone(phone);
        k.setFullName(request.fullName().trim());
        k.setStatus(AccountStatus.ACTIVE);
        k = khachHangRepository.save(k);

        UserAccount customer = new UserAccount();
        customer.setKhachHang(k);
        customer.setEmail(email);
        customer.setPasswordHash(passwordService.encode(request.password()));
        customer.setRole(UserRole.KHACH_HANG);
        customer.setStatus(AccountStatus.ACTIVE);
        userAccountRepository.save(customer);
        return toCustomerSummary(k, Optional.of(customer));
    }

    @Transactional
    public CustomerSummaryResponse updateCustomer(Integer customerId, UpdateCustomerRequest request) {
        KhachHang k = khachHangRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));

        k.setFullName(request.fullName().trim());
        String phone = parseVnPhoneOrNull(request.phone());
        if (phone != null && khachHangRepository.existsByPhoneAndIdNot(phone, customerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }
        k.setPhone(phone);
        khachHangRepository.save(k);
        return toCustomerSummary(k, userAccountRepository.findByKhachHang_Id(k.getId()));
    }

    @Transactional
    public void updateCustomerStatus(Integer customerId, UpdateCustomerStatusRequest request) {
        KhachHang k = khachHangRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        k.setStatus(request.status());
        khachHangRepository.save(k);
        userAccountRepository.findByKhachHang_Id(k.getId()).ifPresent(u -> {
            u.setStatus(request.status());
            userAccountRepository.save(u);
        });
    }

    @Transactional
    public void deleteCustomer(Integer customerId) {
        KhachHang k = khachHangRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        userAccountRepository.findByKhachHang_Id(k.getId()).ifPresent(userAccountRepository::delete);
        khachHangRepository.delete(k);
    }

    public void deleteStaff(Integer staffId) {
        UserAccount staff = userAccountRepository.findById(staffId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhân viên"));

        if (staff.getRole() != UserRole.NHAN_VIEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng không phải nhân viên");
        }

        userAccountRepository.delete(staff);
    }

    private String blankToNullSearch(String search) {
        if (search == null || search.isBlank()) {
            return null;
        }
        return search.trim();
    }

    private int normalizePage(int page) {
        return Math.max(page, 0);
    }

    private int normalizeSize(int size) {
        if (size < 1) {
            return 10;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    private <T, E> PageResponse<T> toPageResponse(Page<E> page, java.util.function.Function<E, T> mapper) {
        return new PageResponse<>(
            page.getContent().stream().map(mapper).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    private <T> PageResponse<T> toPageResponseUser(Page<UserAccount> page, java.util.function.Function<UserAccount, T> mapper) {
        return toPageResponse(page, mapper);
    }

    private CustomerSummaryResponse toCustomerSummary(KhachHang k, Optional<UserAccount> acc) {
        String status = acc.isPresent() ? acc.get().getStatus().name() : k.getStatus().name();
        return new CustomerSummaryResponse(
            k.getId(),
            k.getEmail(),
            k.getFullName(),
            k.getPhone(),
            status
        );
    }

    private StaffSummaryResponse toStaffSummary(UserAccount u) {
        return new StaffSummaryResponse(
            u.getId(),
            u.getEmail(),
            u.getFullName(),
            u.getPhone(),
            u.getStatus().name()
        );
    }

    private String parseVnPhoneOrNull(String input) {
        try {
            return PhoneNumberUtil.toStoredVnMobileOrNull(input);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private CustomerProfileResponse toCustomerProfile(KhachHang k, UserAccount u) {
        String role = u != null ? u.getRole().name() : "VANG_LAI";
        String st = u != null ? u.getStatus().name() : k.getStatus().name();
        String avatar = u != null ? u.getAvatarUrl() : null;
        return new CustomerProfileResponse(
            k.getId(),
            k.getEmail(),
            k.getFullName(),
            k.getPhone(),
            role,
            st,
            avatar
        );
    }

    private TicketSummaryResponse toTicketSummary(VeXe v) {
        var chuyen = v.getChuyenXe();
        var tuyen = chuyen.getTuyenXe();
        return new TicketSummaryResponse(
            v.getMaVe(),
            v.getNgayDat(),
            tuyen.getTenTuyen(),
            tuyen.getDiemDi(),
            tuyen.getDiemDen(),
            chuyen.getNgayDi(),
            chuyen.getGioDi(),
            v.getSoLuongGhe(),
            v.getTongTien(),
            v.getTrangThai().name(),
            v.getGhiChu()
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
