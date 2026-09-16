package com.finsen.store.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AiChatDTO {

    public static record ChatRequest(
            String message,
            List<Map<String, String>> history,
            UUID locationId,
            String model
    ) {}

    public static record ChatResponse(
            String reply,
            boolean clarificationNeeded,
            List<String> options,
            String source,
            String model
    ) {}

    public static record OllamaStatusResponse(
            boolean connected,
            List<String> availableModels,
            String defaultModel
    ) {}
}
