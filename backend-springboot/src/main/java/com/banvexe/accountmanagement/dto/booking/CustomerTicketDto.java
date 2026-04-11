package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.TicketStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CustomerTicketDto(
    Integer id,
    String maVe,
    TicketStatus trangThai,
    BigDecimal tongTien,
    Instant ngayDat,
    String ghiChu,
    List<String> maGhe,
    TripSummaryDto chuyen
) {
}
