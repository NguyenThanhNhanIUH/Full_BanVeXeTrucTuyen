package com.banvexe.accountmanagement.dto;

public record StaffSummaryResponse(
    Integer id,
    String email,
    String fullName,
    String status
) {
}
