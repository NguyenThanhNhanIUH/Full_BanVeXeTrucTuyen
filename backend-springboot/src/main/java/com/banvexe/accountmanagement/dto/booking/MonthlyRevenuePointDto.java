package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;

public record MonthlyRevenuePointDto(
    int year,
    int month,
    String yearMonth,
    String label,
    long ticketCount,
    BigDecimal revenue
) {
}
