package com.banvexe.accountmanagement.dto.booking;

import java.math.BigDecimal;

public record RouteSummaryDto(
    Integer id,
    String tenTuyen,
    String diemDi,
    String diemDen,
    BigDecimal khoangCach,
    Integer thoiGianDuKienPhut,
    BigDecimal giaVeCoBan,
    String trangThai
) {
}
