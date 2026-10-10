package com.finsen.store.dto;

public record AuthRequest(
    String userId, 
    String password, 
    String loginType, 
    String stateName, 
    String siteName
) {
    public AuthRequest(String userId, String password) {
        this(userId, password, null, null, null);
    }
}
