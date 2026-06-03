package com.banvexe.accountmanagement.dto.assistant;

import java.math.BigDecimal;
import java.util.List;

public record AssistantTripCardDto(
    Integer id,
    String tenTuyen,
    String diemDi,
    String diemDen,
    String ngayDi,
    String gioDi,
    String gioDenDuKien,
    Integer thoiGianDuKienPhut,
    BigDecimal giaVe,
    String loaiXe,
    String bienSo,
    int soGheTrong,
    String subtitle,
    List<String> availableSeats
) {
}
