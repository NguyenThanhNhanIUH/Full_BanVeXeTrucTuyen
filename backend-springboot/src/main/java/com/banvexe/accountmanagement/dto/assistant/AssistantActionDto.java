package com.banvexe.accountmanagement.dto.assistant;

public record AssistantActionDto(
    String type,
    String label,
    String path,
    String diemDi,
    String diemDen,
    String ngayDi
) {
}
