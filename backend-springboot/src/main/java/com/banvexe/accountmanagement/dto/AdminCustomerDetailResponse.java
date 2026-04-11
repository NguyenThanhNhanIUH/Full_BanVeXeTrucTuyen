package com.banvexe.accountmanagement.dto;

import java.util.List;

public record AdminCustomerDetailResponse(
    CustomerProfileResponse profile,
    List<TicketSummaryResponse> tickets
) {
}
