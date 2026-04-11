package com.banvexe.accountmanagement.dto;

public record CustomerProfileResponse(
    Integer id,
    String email,
    String fullName,
    String phone,
    String role,
    String status
) {
}
