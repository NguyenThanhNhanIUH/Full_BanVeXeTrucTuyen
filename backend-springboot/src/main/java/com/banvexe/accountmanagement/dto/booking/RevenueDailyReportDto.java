package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;
import java.util.List;

public record RevenueDailyReportDto(
    String yearMonth,
    String monthLabel,
    List<DailyRevenuePointDto> days,
    long totalTicketsSold,
    BigDecimal totalRevenue
) {
}
