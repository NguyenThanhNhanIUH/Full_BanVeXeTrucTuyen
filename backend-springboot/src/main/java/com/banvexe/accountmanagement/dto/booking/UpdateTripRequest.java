package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.TripRunStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record UpdateTripRequest(
    @NotNull Integer tuyenXeId,
    @NotNull Integer xeId,
    @NotNull LocalDate ngayDi,
    @NotNull LocalTime gioDi,
    @NotNull @DecimalMin("0.01") BigDecimal giaVe,
    @NotNull TripRunStatus trangThai
) {
}
