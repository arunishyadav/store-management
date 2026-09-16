package com.finsen.store.dto;

import java.util.UUID;

public record AuthResponse(String token, String userId, String fullName, String role, UUID locationId, String locationName) {}
