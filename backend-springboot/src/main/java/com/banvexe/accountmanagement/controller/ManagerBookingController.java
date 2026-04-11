package com.banvexe.accountmanagement.controller;

import com.banvexe.accountmanagement.dto.ApiResponse;
import com.banvexe.accountmanagement.dto.booking.CreateRouteRequest;
import com.banvexe.accountmanagement.dto.booking.CreateTripRequest;
import com.banvexe.accountmanagement.dto.booking.RouteSummaryDto;
import com.banvexe.accountmanagement.dto.booking.TripDetailDto;
import com.banvexe.accountmanagement.dto.booking.UpdateRouteRequest;
import com.banvexe.accountmanagement.dto.booking.UpdateTripRequest;
import com.banvexe.accountmanagement.service.booking.ManagerRouteService;
import com.banvexe.accountmanagement.service.booking.ManagerTripService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/manager")
public class ManagerBookingController {

    private final ManagerRouteService managerRouteService;
    private final ManagerTripService managerTripService;

    public ManagerBookingController(ManagerRouteService managerRouteService, ManagerTripService managerTripService) {
        this.managerRouteService = managerRouteService;
        this.managerTripService = managerTripService;
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
        return ResponseEntity.ok(ApiResponse.success("Đã hủy chuyến", null));
    }
}
