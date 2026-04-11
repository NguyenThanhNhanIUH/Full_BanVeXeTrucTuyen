package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.SeatMapDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.service.booking.BookingCatalogService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/catalog")
@Validated
public class BookingCatalogController {

    private final BookingCatalogService bookingCatalogService;

    public BookingCatalogController(BookingCatalogService bookingCatalogService) {
        this.bookingCatalogService = bookingCatalogService;
    }

    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<List<RouteSummaryDto>>> searchRoutes(
        @RequestParam(required = false) String diemDi,
        @RequestParam(required = false) String diemDen
    ) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.searchRoutes(diemDi, diemDen)));
    }

    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<TripSummaryDto>>> searchTrips(
        @RequestParam(required = false) String diemDi,
        @RequestParam(required = false) String diemDen,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate ngayDi,
        @RequestParam(defaultValue = "1") int soLuongVeToiThieu
    ) {
        return ResponseEntity.ok(
            ApiResponse.success(bookingCatalogService.searchTrips(diemDi, diemDen, ngayDi, soLuongVeToiThieu))
        );
    }

    @GetMapping("/trips/{id}")
    public ResponseEntity<ApiResponse<TripDetailDto>> tripDetail(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.getTripDetail(id)));
    }

    @GetMapping("/trips/{id}/seats")
    public ResponseEntity<ApiResponse<SeatMapDto>> seatMap(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.getSeatMap(id)));
    }
}
