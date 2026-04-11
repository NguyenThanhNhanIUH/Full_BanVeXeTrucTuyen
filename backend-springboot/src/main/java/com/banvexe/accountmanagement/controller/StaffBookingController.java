package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.StaffTicketDetailDto;
import com.banvexe.accountmanagement.dto.booking.StaffUpdateTicketRequest;
import com.banvexe.accountmanagement.dto.booking.TripRunStatusUpdateRequest;
import com.banvexe.accountmanagement.service.booking.StaffBookingService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/staff/booking")
public class StaffBookingController {

    private final StaffBookingService staffBookingService;

    public StaffBookingController(StaffBookingService staffBookingService) {
        this.staffBookingService = staffBookingService;
    }

    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<StaffTicketDetailDto>> searchTicket(
        @RequestParam(required = false) String maVe,
        @RequestParam(required = false) String soDienThoai
    ) {
        return ResponseEntity.ok(ApiResponse.success(staffBookingService.searchTicket(maVe, soDienThoai)));
    }

    @PatchMapping("/tickets/{ticketId}")
    public ResponseEntity<ApiResponse<StaffTicketDetailDto>> updateTicket(
        @PathVariable Integer ticketId,
        @Valid @RequestBody StaffUpdateTicketRequest request
    ) {
        return ResponseEntity.ok(
            ApiResponse.success("Cập nhật vé thành công", staffBookingService.updateTicket(ticketId, request))
        );
    }

    @PostMapping("/tickets/{ticketId}/approve-cancel")
    public ResponseEntity<ApiResponse<Void>> approveCancel(@PathVariable Integer ticketId) {
        staffBookingService.approveCancelTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success("Đã duyệt hủy vé", null));
    }

    @PatchMapping("/trips/{chuyenId}/status")
    public ResponseEntity<ApiResponse<Void>> updateTripStatus(
        @PathVariable Integer chuyenId,
        @Valid @RequestBody TripRunStatusUpdateRequest request
    ) {
        staffBookingService.updateTripStatus(chuyenId, request);
        return ResponseEntity.ok(ApiResponse.success("Đã cập nhật trạng thái chuyến", null));
    }
}
