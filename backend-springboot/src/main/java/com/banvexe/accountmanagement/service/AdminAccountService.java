package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.AdminCustomerDetailResponse;
import com.banvexe.accountmanagement.dto.CreateStaffRequest;
import com.banvexe.accountmanagement.dto.CustomerProfileResponse;
import com.banvexe.accountmanagement.dto.CustomerSummaryResponse;
import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.dto.StaffSummaryResponse;
import com.banvexe.accountmanagement.dto.TicketSummaryResponse;
import com.banvexe.accountmanagement.dto.UpdateStaffStatusRequest;
import com.banvexe.accountmanagement.entity.AccountStatus;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.entity.VeXe;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.repository.VeXeRepository;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AdminAccountService {

    private static final int MAX_PAGE_SIZE = 100;

    private final UserAccountRepository userAccountRepository;
    private final VeXeRepository veXeRepository;
    private final PasswordService passwordService;

    public AdminAccountService(
        UserAccountRepository userAccountRepository,
        VeXeRepository veXeRepository,
        PasswordService passwordService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.veXeRepository = veXeRepository;
        this.passwordService = passwordService;
    }

    public PageResponse<CustomerSummaryResponse> listCustomers(String search, int page, int size) {
        Page<UserAccount> result = userAccountRepository.findByRoleWithSearch(
            UserRole.KHACH_HANG,
            blankToNullSearch(search),
            PageRequest.of(normalizePage(page), normalizeSize(size), Sort.by(Sort.Direction.DESC, "id"))
        );
        return toPageResponse(result, this::toCustomerSummary);
    }

    public AdminCustomerDetailResponse getCustomerDetail(Integer customerId) {
        UserAccount user = userAccountRepository.findById(customerId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));

        if (user.getRole() != UserRole.KHACH_HANG) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Người dùng không phải khách hàng");
        }

        List<TicketSummaryResponse> tickets = veXeRepository.findAllByKhachHangIdWithRoute(customerId).stream()
            .map(this::toTicketSummary)
            .toList();

        return new AdminCustomerDetailResponse(toCustomerProfile(user), tickets);
    }

    public PageResponse<StaffSummaryResponse> listStaffs(String search, int page, int size) {
        Page<UserAccount> result = userAccountRepository.findByRoleWithSearch(
            UserRole.NHAN_VIEN,
            blankToNullSearch(search),
            PageRequest.of(normalizePage(page), normalizeSize(size), Sort.by(Sort.Direction.DESC, "id"))
        );
        return toPageResponse(result, this::toStaffSummary);
    }

    public StaffSummaryResponse createStaff(CreateStaffRequest request) {
        String email = normalizeEmail(request.email());

        if (userAccountRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tên đăng nhập đã tồn tại");
        }

        UserAccount staff = new UserAccount();
        staff.setEmail(email);
        staff.setPasswordHash(passwordService.encode(request.password()));
        staff.setFullName(request.fullName().trim());
        staff.setRole(UserRole.NHAN_VIEN);
        staff.setStatus(AccountStatus.ACTIVE);

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

    private <T> PageResponse<T> toPageResponse(Page<UserAccount> page, java.util.function.Function<UserAccount, T> mapper) {
        return new PageResponse<>(
            page.getContent().stream().map(mapper).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }

    private CustomerSummaryResponse toCustomerSummary(UserAccount u) {
        return new CustomerSummaryResponse(
            u.getId(),
            u.getEmail(),
            u.getFullName(),
            u.getPhone(),
            u.getStatus().name()
        );
    }

    private StaffSummaryResponse toStaffSummary(UserAccount u) {
        return new StaffSummaryResponse(
            u.getId(),
            u.getEmail(),
            u.getFullName(),
            u.getStatus().name()
        );
    }

    private CustomerProfileResponse toCustomerProfile(UserAccount u) {
        return new CustomerProfileResponse(
            u.getId(),
            u.getEmail(),
            u.getFullName(),
            u.getPhone(),
            u.getRole().name(),
            u.getStatus().name()
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
