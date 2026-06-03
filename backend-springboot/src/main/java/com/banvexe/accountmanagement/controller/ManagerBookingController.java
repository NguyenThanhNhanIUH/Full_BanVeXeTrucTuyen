package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.PageResponse;
import com.banvexe.accountmanagement.dto.booking.CreateRouteRequest;
import com.banvexe.accountmanagement.dto.booking.CreateTripRequest;
import com.banvexe.accountmanagement.dto.booking.CreateVehicleRequest;
import com.banvexe.accountmanagement.dto.booking.ManagerFullTicketRequest;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketListItemDto;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketStatsDto;
import com.banvexe.accountmanagement.dto.booking.MonthlyRevenuePointDto;
import com.banvexe.accountmanagement.dto.booking.RevenueByRouteReportDto;
import com.banvexe.accountmanagement.dto.booking.RevenueDailyReportDto;
import com.banvexe.accountmanagement.dto.booking.ManagerTicketStatusRequest;
import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.StaffTicketDetailDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.UpdateRouteRequest;
import com.banvexe.accountmanagement.dto.booking.UpdateTripRequest;
import com.banvexe.accountmanagement.dto.booking.UpdateVehicleRequest;
import com.banvexe.accountmanagement.dto.booking.VehicleSummaryDto;
import com.banvexe.accountmanagement.entity.TicketStatus;
import com.banvexe.accountmanagement.service.booking.ManagerRouteService;
import com.banvexe.accountmanagement.service.booking.ManagerTicketService;
import com.banvexe.accountmanagement.service.booking.RevenueReportService;
import com.banvexe.accountmanagement.service.booking.ManagerTripService;
import com.banvexe.accountmanagement.service.booking.ManagerVehicleService;
import jakarta.validation.Valid;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/manager")
public class ManagerBookingController {

    private final ManagerRouteService managerRouteService;
    private final ManagerTripService managerTripService;
    private final ManagerTicketService managerTicketService;
    private final ManagerVehicleService managerVehicleService;
    private final RevenueReportService revenueReportService;

    public ManagerBookingController(
        ManagerRouteService managerRouteService,
        ManagerTripService managerTripService,
        ManagerTicketService managerTicketService,
        ManagerVehicleService managerVehicleService,
        RevenueReportService revenueReportService
    ) {
        this.managerRouteService = managerRouteService;
        this.managerTripService = managerTripService;
        this.managerTicketService = managerTicketService;
        this.managerVehicleService = managerVehicleService;
        this.revenueReportService = revenueReportService;
    }

    @GetMapping("/vehicles")
    public ResponseEntity<ApiResponse<List<VehicleSummaryDto>>> listVehicles() {
        return ResponseEntity.ok(ApiResponse.success(managerVehicleService.listVehicles()));
    }

    @PostMapping("/vehicles")
    public ResponseEntity<ApiResponse<VehicleSummaryDto>> createVehicle(@Valid @RequestBody CreateVehicleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Thêm xe thành công", managerVehicleService.create(request)));
    }

    @PutMapping("/vehicles/{id}")
    public ResponseEntity<ApiResponse<VehicleSummaryDto>> updateVehicle(
        @PathVariable Integer id,
        @Valid @RequestBody UpdateVehicleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật xe thành công", managerVehicleService.update(id, request)));
    }

    @DeleteMapping("/vehicles/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable Integer id) {
        managerVehicleService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa xe", null));
    }

    @GetMapping("/tickets/stats")
    public ResponseEntity<ApiResponse<ManagerTicketStatsDto>> getTicketStats() {
        return ResponseEntity.ok(ApiResponse.success(managerTicketService.getTicketStats()));
    }

    @GetMapping("/revenue/months")
    public ResponseEntity<ApiResponse<List<MonthlyRevenuePointDto>>> listRevenueMonths() {
        return ResponseEntity.ok(ApiResponse.success(revenueReportService.listMonthsWithRevenue()));
    }

    @GetMapping("/revenue/daily")
    public ResponseEntity<ApiResponse<RevenueDailyReportDto>> getRevenueDaily(
        @RequestParam("yearMonth") String yearMonthRaw
    ) {
        if (yearMonthRaw == null || yearMonthRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu tham số yearMonth (định dạng yyyy-MM)");
        }
        YearMonth ym;
        try {
            ym = YearMonth.parse(yearMonthRaw.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "yearMonth không hợp lệ: " + yearMonthRaw);
        }
        return ResponseEntity.ok(ApiResponse.success(revenueReportService.buildDailyReport(ym)));
    }

    @GetMapping("/revenue/by-route")
    public ResponseEntity<ApiResponse<RevenueByRouteReportDto>> getRevenueByRoute(
        @RequestParam("yearMonth") String yearMonthRaw
    ) {
        if (yearMonthRaw == null || yearMonthRaw.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu tham số yearMonth (định dạng yyyy-MM)");
        }
        YearMonth ym;
        try {
            ym = YearMonth.parse(yearMonthRaw.trim());
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "yearMonth không hợp lệ: " + yearMonthRaw);
        }
        return ResponseEntity.ok(ApiResponse.success(revenueReportService.buildRouteReport(ym)));
    }

    @GetMapping("/tickets")
    public ResponseEntity<ApiResponse<PageResponse<ManagerTicketListItemDto>>> listTickets(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String status
    ) {
        TicketStatus st = null;
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status.trim())) {
            try {
                st = TicketStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Trạng thái vé không hợp lệ: " + status);
            }
        }
        PageResponse<ManagerTicketListItemDto> data = managerTicketService.listTickets(page, size, st);
        return ResponseEntity.ok(ApiResponse.success(data));
    }

    @GetMapping("/tickets/{ticketId}")
    public ResponseEntity<ApiResponse<StaffTicketDetailDto>> getTicket(@PathVariable Integer ticketId) {
        return ResponseEntity.ok(ApiResponse.success(managerTicketService.getTicket(ticketId)));
    }

    @PatchMapping("/tickets/{ticketId}/status")
    public ResponseEntity<ApiResponse<StaffTicketDetailDto>> updateTicketStatus(
        @PathVariable Integer ticketId,
        @Valid @RequestBody ManagerTicketStatusRequest request
    ) {
        return ResponseEntity.ok(
            ApiResponse.success("Cập nhật trạng thái vé thành công", managerTicketService.updateStatus(ticketId, request))
        );
    }

    @PutMapping("/tickets/{ticketId}")
    public ResponseEntity<ApiResponse<StaffTicketDetailDto>> updateTicketFull(
        @PathVariable Integer ticketId,
        @Valid @RequestBody ManagerFullTicketRequest request
    ) {
        return ResponseEntity.ok(
            ApiResponse.success("Cập nhật vé thành công", managerTicketService.updateFull(ticketId, request))
        );
    }

    @DeleteMapping("/tickets/{ticketId}")
    public ResponseEntity<ApiResponse<Void>> deleteTicket(@PathVariable Integer ticketId) {
        managerTicketService.deleteTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa vé", null));
    }

    @GetMapping("/routes")
    public ResponseEntity<ApiResponse<List<RouteSummaryDto>>> listRoutes() {
        return ResponseEntity.ok(ApiResponse.success(managerRouteService.listAll()));
    }

    @PostMapping("/routes")
    public ResponseEntity<ApiResponse<RouteSummaryDto>> createRoute(@Valid @RequestBody CreateRouteRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tạo tuyến thành công", managerRouteService.create(request)));
    }

    @PutMapping("/routes/{id}")
    public ResponseEntity<ApiResponse<RouteSummaryDto>> updateRoute(
        @PathVariable Integer id,
        @Valid @RequestBody UpdateRouteRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật tuyến thành công", managerRouteService.update(id, request)));
    }

    @DeleteMapping("/routes/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRoute(@PathVariable Integer id) {
        managerRouteService.deleteOrDeactivate(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa hoặc ngừng hoạt động tuyến", null));
    }

    @GetMapping("/trips")
    public ResponseEntity<ApiResponse<List<TripDetailDto>>> listTrips() {
        return ResponseEntity.ok(ApiResponse.success(managerTripService.listAll()));
    }

    @PostMapping("/trips")
    public ResponseEntity<ApiResponse<TripDetailDto>> createTrip(@Valid @RequestBody CreateTripRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Tạo chuyến thành công", managerTripService.create(request)));
    }

    @PutMapping("/trips/{id}")
    public ResponseEntity<ApiResponse<TripDetailDto>> updateTrip(
        @PathVariable Integer id,
        @Valid @RequestBody UpdateTripRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.success("Cập nhật chuyến thành công", managerTripService.update(id, request)));
    }

    @DeleteMapping("/trips/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrip(@PathVariable Integer id) {
        managerTripService.deleteTrip(id);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa chuyến xe (và vé liên quan nếu có)", null));
    }
}
