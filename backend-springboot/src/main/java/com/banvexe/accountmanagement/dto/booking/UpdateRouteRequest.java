package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.RouteStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record UpdateRouteRequest(
    @NotBlank @Size(max = 255) String tenTuyen,
    @NotBlank @Size(max = 100) String diemDi,
    @NotBlank @Size(max = 100) String diemDen,
    BigDecimal khoangCach,
    Integer thoiGianDuKienPhut,
    @NotNull @DecimalMin("0.01") BigDecimal giaVeCoBan,
    @NotNull RouteStatus trangThai
) {
}
