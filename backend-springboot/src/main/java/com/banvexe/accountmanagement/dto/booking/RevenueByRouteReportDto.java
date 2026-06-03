package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;
import java.util.List;

public record RevenueByRouteReportDto(
    String yearMonth,
    String monthLabel,
    List<RouteRevenuePointDto> routes,
    long totalTicketsSold,
    BigDecimal totalRevenue
) {
}
