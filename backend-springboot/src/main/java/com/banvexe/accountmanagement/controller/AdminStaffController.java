package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.CreateStaffRequest;
import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.dto.StaffSummaryResponse;
import com.banvexe.accountmanagement.dto.UpdateStaffStatusRequest;
import com.banvexe.accountmanagement.service.AdminAccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/staffs")
@PreAuthorize("hasRole('QUAN_TRI')")
public class AdminStaffController {

    private final AdminAccountService adminAccountService;

    public AdminStaffController(AdminAccountService adminAccountService) {
        this.adminAccountService = adminAccountService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<StaffSummaryResponse>>> listStaffs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search
    ) {
        PageResponse<StaffSummaryResponse> data =
            adminAccountService.listStaffs(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StaffSummaryResponse>> createStaff(
        @Valid @RequestBody CreateStaffRequest request
    ) {
        StaffSummaryResponse data = adminAccountService.createStaff(request);
        return ResponseEntity.ok(ApiResponse.success("Tạo tài khoản nhân viên thành công", data));
    }

    @PutMapping("/{staffId}/status")
    public ResponseEntity<ApiResponse<Void>> updateStaffStatus(
        @PathVariable Integer staffId,
        @Valid @RequestBody UpdateStaffStatusRequest request
    ) {
        adminAccountService.updateStaffStatus(staffId, request);
        return ResponseEntity.ok(ApiResponse.success("Xóa/Vô hiệu hóa thành công", null));
    }
}
