package com.finsen.store.dto;

import java.util.List;

public record ChatResponse(
        String reply,
        boolean clarificationNeeded,
        List<String> options,
        String source,
        String model
) {}
