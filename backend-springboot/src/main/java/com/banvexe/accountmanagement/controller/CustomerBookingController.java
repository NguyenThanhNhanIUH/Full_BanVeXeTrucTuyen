package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.BookTicketRequest;
import com.banvexe.accountmanagement.dto.booking.CustomerTicketDto;
import com.banvexe.accountmanagement.dto.booking.PayTicketRequest;
import com.banvexe.accountmanagement.service.booking.CustomerTicketService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/booking")
public class CustomerBookingController {

    private final CustomerTicketService customerTicketService;

    public CustomerBookingController(CustomerTicketService customerTicketService) {
        this.customerTicketService = customerTicketService;
    }

    @PostMapping("/tickets")
    public ResponseEntity<ApiResponse<CustomerTicketDto>> book(
        Authentication authentication,
        @Valid @RequestBody BookTicketRequest request
    ) {
        CustomerTicketDto data = customerTicketService.book(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.success("Đặt vé thành công", data));
    }

    @PostMapping("/tickets/{ticketId}/pay")
    public ResponseEntity<ApiResponse<Void>> pay(
        Authentication authentication,
        @PathVariable Integer ticketId,
        @Valid @RequestBody PayTicketRequest request
    ) {
        customerTicketService.pay(authentication.getName(), ticketId, request);
        return ResponseEntity.ok(ApiResponse.success("Thanh toán thành công", null));
    }

    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<List<CustomerTicketDto>>> myTickets(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(customerTicketService.myTickets(authentication.getName())));
    }

    @GetMapping("/tickets/{ticketId}")
    public ResponseEntity<ApiResponse<CustomerTicketDto>> getTicket(
        Authentication authentication,
        @PathVariable Integer ticketId
    ) {
        return ResponseEntity.ok(
            ApiResponse.success(customerTicketService.getMyTicket(authentication.getName(), ticketId))
        );
    }

    @PostMapping("/tickets/{ticketId}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
        Authentication authentication,
        @PathVariable Integer ticketId
    ) {
        customerTicketService.cancelOrRequestCancel(authentication.getName(), ticketId);
        return ResponseEntity.ok(ApiResponse.success("Đã xử lý yêu cầu hủy", null));
    }
}
