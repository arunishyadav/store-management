package com.finsen.store.dto;

import java.util.UUID;

public record CreateUserDTO(
    String userId,
    String email,
    String password,
    String fullName,
    String role,
    UUID locationId,
    String stateName,
    String siteName,
    Boolean active
) {
    public CreateUserDTO(String userId, String email, String password, String fullName, String role, UUID locationId) {
        this(userId, email, password, fullName, role, locationId, null, null, true);
    }
    public CreateUserDTO(String userId, String email, String password, String fullName, String role, UUID locationId, String stateName, String siteName) {
        this(userId, email, password, fullName, role, locationId, stateName, siteName, true);
    }
}
