package com.banvexe.accountmanagement.dto.booking;

import java.util.List;

public record SeatMapDto(
    int tongSoGhe,
    List<SeatStatusDto> ghe,
    List<String> maGheCuaBan
) {
}
