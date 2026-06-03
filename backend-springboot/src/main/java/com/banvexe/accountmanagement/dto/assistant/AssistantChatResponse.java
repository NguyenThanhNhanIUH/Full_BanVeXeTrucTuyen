package com.banvexe.accountmanagement.dto.assistant;

import java.util.List;

public record AssistantChatResponse(
    String answer,
    List<String> suggestions,
    List<AssistantTripCardDto> trips,
    List<AssistantActionDto> actions
) {
    public AssistantChatResponse(String answer) {
        this(answer, List.of(), List.of(), List.of());
    }
}
