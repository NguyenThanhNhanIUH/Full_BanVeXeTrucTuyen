package com.banvexe.accountmanagement.dto;

public record AuthResponse(
    String accessToken,
    String tokenType,
    String email,
    String role,
    String fullName,
    String phone
) {
}
