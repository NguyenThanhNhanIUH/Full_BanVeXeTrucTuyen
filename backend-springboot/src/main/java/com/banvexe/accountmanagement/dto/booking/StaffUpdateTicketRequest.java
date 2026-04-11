package com.banvexe.accountmanagement.dto.booking;

import jakarta.validation.constraints.Size;
import java.util.List;

public record StaffUpdateTicketRequest(
    @Size(max = 2000) String ghiChu,
    List<@Size(min = 1, max = 10) String> maGheMoi
) {
}
