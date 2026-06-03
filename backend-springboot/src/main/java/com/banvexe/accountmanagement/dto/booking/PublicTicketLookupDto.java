package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.TicketStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record PublicTicketLookupDto(
    Integer id,
    String maVe,
    TicketStatus trangThai,
    BigDecimal tongTien,
    Instant ngayDat,
    Instant holdExpiresAt,
    String ghiChu,
    String hoTenKhach,
    String soDienThoaiKhach,
    String emailKhach,
    List<String> maGhe,
    TripSummaryDto chuyen
) {
}