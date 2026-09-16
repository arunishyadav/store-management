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
    boolean active
) {}
