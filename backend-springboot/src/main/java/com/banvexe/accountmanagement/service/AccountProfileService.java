package com.banvexe.accountmanagement.service;

import com.banvexe.accountmanagement.dto.ChangePasswordRequest;
import com.banvexe.accountmanagement.dto.CustomerProfileResponse;
import com.banvexe.accountmanagement.dto.UpdateProfileRequest;
import com.banvexe.accountmanagement.entity.UserAccount;
import com.banvexe.accountmanagement.repository.UserAccountRepository;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountProfileService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordService passwordService;

    public AccountProfileService(UserAccountRepository userAccountRepository, PasswordService passwordService) {
        this.userAccountRepository = userAccountRepository;
        this.passwordService = passwordService;
    }

    public CustomerProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        String phone = normalizePhone(request.phone());
        if (StringUtils.hasText(phone)
            && userAccountRepository.existsByPhoneAndIdNot(phone, user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại đã được sử dụng");
        }

        user.setFullName(request.fullName().trim());
        user.setPhone(phone);

        userAccountRepository.save(user);
        return toProfileResponse(user);
    }

    public void changePassword(String email, ChangePasswordRequest request) {
        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu mới và xác nhận không khớp");
        }

        UserAccount user = userAccountRepository.findByEmail(normalizeEmail(email))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài khoản"));

        if (!passwordService.matches(request.oldPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu cũ không đúng");
        }

        user.setPasswordHash(passwordService.encode(request.newPassword()));
        userAccountRepository.save(user);
    }

    private CustomerProfileResponse toProfileResponse(UserAccount u) {
        return new CustomerProfileResponse(
            u.getId(),
            u.getEmail(),
            u.getFullName(),
            u.getPhone(),
            u.getRole().name(),
            u.getStatus().name()
        );
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePhone(String phone) {
        if (!StringUtils.hasText(phone)) {
            return null;
        }
        return phone.trim();
    }
}
