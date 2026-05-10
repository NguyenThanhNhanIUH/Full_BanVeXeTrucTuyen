package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;

public record DailyRevenuePointDto(
    int dayOfMonth,
    String dateKey,
    String label,
    long ticketCount,
    BigDecimal revenue
) {
}
