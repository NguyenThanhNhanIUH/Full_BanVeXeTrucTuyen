package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.AdminCustomerDetailResponse;
import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.CustomerSummaryResponse;
import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.service.AdminAccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/customers")
@PreAuthorize("hasRole('QUAN_TRI')")
public class AdminCustomerController {

    private final AdminAccountService adminAccountService;

    public AdminCustomerController(AdminAccountService adminAccountService) {
        this.adminAccountService = adminAccountService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<CustomerSummaryResponse>>> listCustomers(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(required = false) String search
    ) {
        PageResponse<CustomerSummaryResponse> data =
            adminAccountService.listCustomers(search, page, size);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/{customerId}")
    public ResponseEntity<ApiResponse<AdminCustomerDetailResponse>> getCustomer(
        @PathVariable Integer customerId
    ) {
        AdminCustomerDetailResponse data = adminAccountService.getCustomerDetail(customerId);
        return ResponseEntity.ok(ApiResponse.success(data));
    }
}
