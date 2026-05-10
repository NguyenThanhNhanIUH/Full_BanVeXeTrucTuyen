package com.banvexe.accountmanagement.dto;

public record DashboardStatsResponse(
    long customers,
    long staff,
    long locked,
    long total,
    long routes,
    long trips,
    long tickets,
    long vehicles,
    long lockedCustomers,
    long lockedStaff,
    /** Số bản ghi bảng KhachHang (hồ sơ), có thể khác số tài khoản KHACH_HANG. */
    long totalKhachHang
) {
}
