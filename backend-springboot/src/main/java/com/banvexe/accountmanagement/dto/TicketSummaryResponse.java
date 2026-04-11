package com.banvexe.accountmanagement.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public record TicketSummaryResponse(
    String maVe,
    Instant ngayDat,
    String tenTuyen,
    String diemDi,
    String diemDen,
    LocalDate ngayDi,
    LocalTime gioDi,
    int soLuongGhe,
    BigDecimal tongTien,
    String trangThai,
    String ghiChu
) {
}
