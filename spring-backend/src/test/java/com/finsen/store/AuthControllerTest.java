package com.finsen.store;

import com.finsen.store.controller.AuthController;
import com.finsen.store.dto.AuthRequest;
import com.finsen.store.entity.User;
import com.finsen.store.entity.Role;
import com.finsen.store.repository.UserRepository;
import com.finsen.store.security.JwtTokenProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class AuthControllerTest {

    @Autowired
    private AuthController authController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    public void testInvalidPasswordReturns400() {
        // Test 1: Invalid User ID
        AuthRequest req1 = new AuthRequest("@finsen-adm", "wrongpassword");
        ResponseEntity<?> res1 = authController.authenticateUser(req1);
        assertEquals(400, res1.getStatusCode().value(), "Invalid User ID must return 400 Bad Request");

        // Test 2: Valid User ID but Wrong Password
        AuthRequest req2 = new AuthRequest("@finsen-admin", "wrongpassword123");
        ResponseEntity<?> res2 = authController.authenticateUser(req2);
        assertEquals(400, res2.getStatusCode().value(), "Wrong Password must return 400 Bad Request");

        // Test 3: Valid User ID and Correct Password
        AuthRequest req3 = new AuthRequest("@finsen-admin", "7Finsenxyz#");
        ResponseEntity<?> res3 = authController.authenticateUser(req3);
        assertEquals(200, res3.getStatusCode().value(), "Correct credentials must return 200 OK");
    }
}
