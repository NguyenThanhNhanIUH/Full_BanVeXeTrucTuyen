package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

public record PayTicketRequest(
    @NotNull PaymentMethod phuongThuc,
    @NotNull Boolean dongYDieuKhoan
) {
}
