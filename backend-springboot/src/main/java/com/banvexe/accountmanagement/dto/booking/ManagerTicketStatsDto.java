package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;

public record ManagerTicketStatsDto(
    long total,
    long choThanhToan,
    long daThanhToan,
    long dangXuLy,
    long daHuy,
    long hoanThanh,
    /** Tổng tiền vé đã thanh toán + hoàn thành chuyến (đã thu). */
    BigDecimal revenueDaThu,
    /** Tổng tiền vé chờ thanh toán (chưa thu). */
    BigDecimal revenueChoThanhToan
) {
}
