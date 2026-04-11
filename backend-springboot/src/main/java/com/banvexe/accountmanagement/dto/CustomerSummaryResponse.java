package com.banvexe.accountmanagement.dto;

public record CustomerSummaryResponse(
    Integer id,
    String email,
    String fullName,
    String phone,
    String status
) {
}
