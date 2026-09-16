package com.finsen.store.dto;

import java.util.List;

public record OllamaStatusResponse(
        boolean connected,
        List<String> availableModels,
        String defaultModel
) {}
