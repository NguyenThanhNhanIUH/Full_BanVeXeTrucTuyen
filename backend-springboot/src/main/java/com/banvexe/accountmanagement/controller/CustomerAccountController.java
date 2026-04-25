package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.ChangePasswordRequest;
import com.banvexe.accountmanagement.dto.CustomerProfileResponse;
import com.banvexe.accountmanagement.dto.UpdateProfileRequest;
import com.banvexe.accountmanagement.service.AccountProfileService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/accounts/me")
@PreAuthorize("hasRole('KHACH_HANG')")
public class CustomerAccountController {

    private final AccountProfileService accountProfileService;

    public CustomerAccountController(AccountProfileService accountProfileService) {
        this.accountProfileService = accountProfileService;
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> getProfile(Authentication authentication) {
        CustomerProfileResponse data = accountProfileService.getProfile(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> updateProfile(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        CustomerProfileResponse data =
            accountProfileService.updateProfile(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin thành công", data));
    }

    @PutMapping("/password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
        Authentication authentication,
        @Valid @RequestBody ChangePasswordRequest request
    ) {
        accountProfileService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đổi mật khẩu thành công", null));
    }
}
