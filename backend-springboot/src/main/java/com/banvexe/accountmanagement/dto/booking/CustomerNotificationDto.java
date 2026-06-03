package com.banvexe.accountmanagement.dto.booking;

import java.time.Instant;

public record CustomerNotificationDto(
    Long id,
    String tieuDe,
    String noiDung,
    String loai,
    Integer veXeId,
    boolean daDoc,
    Instant createdAt
) {
}
