package com.banvexe.accountmanagement.dto.booking;

import com.banvexe.accountmanagement.entity.TripRunStatus;
import jakarta.validation.constraints.NotNull;

public record TripRunStatusUpdateRequest(
    @NotNull TripRunStatus trangThai
) {
}
