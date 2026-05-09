package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.ChangePasswordRequest;
import com.banvexe.accountmanagement.dto.CustomerProfileResponse;
import com.banvexe.accountmanagement.dto.UpdateProfileRequest;
import com.banvexe.accountmanagement.entity.KhachHang;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.entity.UserAccount.UserRole;
import com.banvexe.accountmanagement.repository.KhachHangRepository;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import com.banvexe.accountmanagement.util.AccountView;
import com.banvexe.accountmanagement.util.PhoneNumberUtil;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountProfileService {

    private final UserAccountRepository userAccountRepository;
    private final KhachHangRepository khachHangRepository;
    private final PasswordService passwordService;

    public AccountProfileService(
        UserAccountRepository userAccountRepository,
        KhachHangRepository khachHangRepository,
        PasswordService passwordService) {
        this.userAccountRepository = userAccountRepository;
        this.khachHangRepository = khachHangRepository;
        this.passwordService = passwordService;
    }

    public CustomerProfileResponse getProfile(String email) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        if (user.getRole() == UserRole.KHACH_HANG && user.getKhachHang() == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Tài khoản thiếu hồ sơ khách hàng");
        }
        return toProfileResponse(user);
    }

    @org.springframework.transaction.annotation.Transactional
    public CustomerProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));
        if (user.getRole() != UserRole.KHACH_HANG || user.getKhachHang() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chỉ hồ sơ khách hàng mới cập nhật tại đây");
        }
        KhachHang kh = user.getKhachHang();

        String phone;
        try {
            phone = PhoneNumberUtil.toStoredVnMobileOrNull(request.phone());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        if (StringUtils.hasText(phone)
            && khachHangRepository.existsByPhoneAndIdNot(phone, kh.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }

        kh.setFullName(request.fullName().trim());
        kh.setPhone(phone);
        khachHangRepository.save(kh);
        return toProfileResponse(user);
    }

    @org.springframework.transaction.annotation.Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới và xác nhận không khớp");
        }

        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (!passwordService.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng");
        }

        if (passwordService.matches(request.newPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPasswordHash(passwordService.encode(request.newPassword()));
        userAccountRepository.save(user);
    }

    private CustomerProfileResponse toProfileResponse(UserAccount u) {
        if (u.getRole() == UserRole.KHACH_HANG && u.getKhachHang() != null) {
            KhachHang k = u.getKhachHang();
            return new CustomerProfileResponse(
                k.getId(),
                u.getEmail(),
                k.getFullName(),
                k.getPhone(),
                u.getRole().name(),
                u.getStatus().name(),
                u.getAvatarUrl()
            );
        }
        return new CustomerProfileResponse(
            AccountView.publicId(u),
            u.getEmail(),
            AccountView.fullName(u),
            AccountView.phone(u),
            u.getRole().name(),
            u.getStatus().name(),
            u.getAvatarUrl()
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

}
