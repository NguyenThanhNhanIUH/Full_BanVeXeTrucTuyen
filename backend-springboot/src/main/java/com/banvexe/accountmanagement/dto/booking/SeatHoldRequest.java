package com.banvexe.accountmanagement.dto.booking;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SeatHoldRequest(
    @NotBlank @Size(min = 8, max = 64) String holdToken,
    @NotNull @Size(min = 1, max = 10) String maGhe
) {
}
