package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.CustomerNotificationDto;
import com.banvexe.accountmanagement.service.booking.CustomerNotificationService;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/notifications")
public class CustomerNotificationController {

    private final CustomerNotificationService customerNotificationService;

    public CustomerNotificationController(CustomerNotificationService customerNotificationService) {
        this.customerNotificationService = customerNotificationService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerNotificationDto>>> list(Authentication authentication) {
        return ResponseEntity.ok(
            ApiResponse.success(customerNotificationService.listForEmail(authentication.getName()))
        );
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> unreadCount(Authentication authentication) {
        long count = customerNotificationService.unreadCountForEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
        Authentication authentication,
        @PathVariable Long id
    ) {
        customerNotificationService.markRead(authentication.getName(), id);
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu đã đọc", null));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllRead(Authentication authentication) {
        customerNotificationService.markAllRead(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success("Đã đánh dấu tất cả đã đọc", null));
    }
}
