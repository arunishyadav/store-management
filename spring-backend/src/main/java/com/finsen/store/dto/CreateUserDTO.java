package com.finsen.store.dto;

import java.util.UUID;

public record CreateUserDTO(
    String userId,
    String email,
    String password,
    String fullName,
    String role,
    UUID locationId
) {}
