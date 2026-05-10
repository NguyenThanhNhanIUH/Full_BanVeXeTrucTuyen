package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;
import java.util.List;

public record RevenueReportDto(
    List<MonthlyRevenuePointDto> months,
    long totalTicketsSold,
    BigDecimal totalRevenue
) {
}
