package com.finsen.store.dto;

public record AuthRequest(
    String userId, 
    String password,
    String stateName,
    String siteName,
    String loginType
) {
    public AuthRequest(String userId, String password) {
        this(userId, password, null, null, null);
    }
}
