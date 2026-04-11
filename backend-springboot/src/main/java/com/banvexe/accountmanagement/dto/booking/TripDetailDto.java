package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record TripDetailDto(
    Integer id,
    Integer tuyenXeId,
    String tenTuyen,
    String diemDi,
    String diemDen,
    LocalDate ngayDi,
    LocalTime gioDi,
    BigDecimal giaVe,
    Integer xeId,
    String loaiXe,
    String bienSo,
    int tongSoGhe,
    int soGheTrong,
    String trangThaiChuyen
) {
}
