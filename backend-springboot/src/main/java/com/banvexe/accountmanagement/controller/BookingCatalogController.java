package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.SeatHoldReleaseRequest;
import com.banvexe.accountmanagement.dto.booking.SeatHoldRequest;
import com.banvexe.accountmanagement.dto.booking.SeatMapDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.TripSummaryDto;
import com.banvexe.accountmanagement.service.booking.BookingCatalogService;
import com.banvexe.accountmanagement.service.booking.SeatMapStreamService;
import com.banvexe.accountmanagement.service.booking.SeatSelectionHoldService;
import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/catalog")
@Validated
public class BookingCatalogController {

    private final BookingCatalogService bookingCatalogService;
    private final SeatSelectionHoldService seatSelectionHoldService;
    private final SeatMapStreamService seatMapStreamService;

    public BookingCatalogController(
        BookingCatalogService bookingCatalogService,
        SeatSelectionHoldService seatSelectionHoldService,
        SeatMapStreamService seatMapStreamService
    ) {
        this.bookingCatalogService = bookingCatalogService;
        this.seatSelectionHoldService = seatSelectionHoldService;
        this.seatMapStreamService = seatMapStreamService;
    }

    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<List<RouteSummaryDto>>> searchRoutes(
        @RequestParam(required = false) String diemDi,
        @RequestParam(required = false) String diemDen
    ) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.searchRoutes(diemDi, diemDen)));
    }

    @GetMapping("/origins")
    public ResponseEntity<ApiResponse<List<String>>> suggestOrigins(@RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.suggestOrigins(keyword)));
    }

    @GetMapping("/destinations")
    public ResponseEntity<ApiResponse<List<String>>> suggestDestinations(
        @RequestParam(required = false) String keyword
    ) {
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.suggestDestinations(keyword)));
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

    @GetMapping(value = "/trips/{id}/seats/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSeatMap(@PathVariable Integer id) {
        SseEmitter emitter = seatMapStreamService.subscribe(id);
        SeatMapDto seatMap = bookingCatalogService.getSeatMap(id);
        seatMapStreamService.sendSnapshot(emitter, seatMap);
        return emitter;
    }

    @PostMapping("/trips/{id}/seats/hold")
    public ResponseEntity<ApiResponse<SeatMapDto>> holdSeat(
        @PathVariable Integer id,
        @Validated @RequestBody SeatHoldRequest request
    ) {
        seatSelectionHoldService.holdSeat(id, request.holdToken(), request.maGhe());
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.getSeatMap(id)));
    }

    @PostMapping("/trips/{id}/seats/release")
    public ResponseEntity<ApiResponse<SeatMapDto>> releaseSeat(
        @PathVariable Integer id,
        @Validated @RequestBody SeatHoldReleaseRequest request
    ) {
        if (request.maGhe() != null && !request.maGhe().isBlank()) {
            seatSelectionHoldService.releaseSeat(id, request.holdToken(), request.maGhe());
        } else {
            seatSelectionHoldService.releaseAll(id, request.holdToken());
        }
        return ResponseEntity.ok(ApiResponse.success(bookingCatalogService.getSeatMap(id)));
    }
}
