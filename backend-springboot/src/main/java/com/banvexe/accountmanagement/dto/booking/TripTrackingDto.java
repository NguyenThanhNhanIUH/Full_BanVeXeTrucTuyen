package com.banvexe.accountmanagement.dto.booking;

public record TripTrackingDto(
    Integer chuyenId,
    String diemDi,
    String diemDen,
    String loaiXe,
    String bienSo,
    double diemDiLat,
    double diemDiLng,
    double diemDenLat,
    double diemDenLng,
    double xeLat,
    double xeLng,
    int tienDoPhanTram,
    String trangThai,
    String trangThaiHienThi,
    boolean cheDoDemo
) {
}
