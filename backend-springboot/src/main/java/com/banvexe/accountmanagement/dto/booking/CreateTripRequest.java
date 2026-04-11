package com.banvexe.accountmanagement.dto.booking;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record CreateTripRequest(
    @NotNull Integer tuyenXeId,
    @NotNull Integer xeId,
    @NotNull LocalDate ngayDi,
    @NotNull LocalTime gioDi,
    @NotNull @DecimalMin("0.01") BigDecimal giaVe
) {
}
