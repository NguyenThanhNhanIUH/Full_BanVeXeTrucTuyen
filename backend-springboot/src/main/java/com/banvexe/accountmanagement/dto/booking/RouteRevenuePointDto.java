package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;

public record RouteRevenuePointDto(
    Integer routeId,
    String tenTuyen,
    String diemDi,
    String diemDen,
    String shortLabel,
    long ticketCount,
    BigDecimal revenue,
    double revenueSharePercent
) {
}
