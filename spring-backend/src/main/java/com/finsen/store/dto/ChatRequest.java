package com.finsen.store.dto;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ChatRequest(
        String message,
        List<Map<String, String>> history,
        UUID locationId,
        String locationName,
        String model
) {}
