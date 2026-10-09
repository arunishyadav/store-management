package com.finsen.store.dto;

import java.util.UUID;

public record UserDTO(
    UUID id,
    String userId,
    String email,
    String password,
    String fullName,
    String role,
    UUID locationId,
    String locationName,
    String stateName,
    String siteName,
    boolean active
) {
    public UserDTO(UUID id, String userId, String email, String password, String fullName, String role, UUID locationId, String locationName, boolean active) {
        this(id, userId, email, password, fullName, role, locationId, locationName, locationName, locationName, active);
    }
}
