package com.banvexe.accountmanagement.dto.booking;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record BookTicketRequest(
    @NotNull Integer chuyenXeId,
    @NotEmpty @Size(max = 20) List<@Size(min = 1, max = 10) String> maGhe,
    @Size(max = 500) String ghiChu
) {
}
