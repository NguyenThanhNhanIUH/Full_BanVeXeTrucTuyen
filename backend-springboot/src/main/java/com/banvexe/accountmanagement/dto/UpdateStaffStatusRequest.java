package com.banvexe.accountmanagement.dto;

import com.banvexe.accountmanagement.entity.AccountStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateStaffStatusRequest(
    @NotNull AccountStatus status
) {
}
