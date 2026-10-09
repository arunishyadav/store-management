package com.finsen.store.dto;

import java.util.UUID;

public record UpdateUserDTO(
    String userId,
    String email,
    String password,
    String fullName,
    String role,
    UUID locationId,
    Boolean active,
    String stateName,
    String siteName
) {
    public UpdateUserDTO(String userId, String email, String password, String fullName, String role, UUID locationId, Boolean active) {
        this(userId, email, password, fullName, role, locationId, active, null, null);
    }
}
