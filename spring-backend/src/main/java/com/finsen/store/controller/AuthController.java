package com.finsen.store.controller;

import com.finsen.store.dto.AuthRequest;
import com.finsen.store.dto.AuthResponse;
import com.finsen.store.entity.User;
import com.finsen.store.entity.Location;
import com.finsen.store.entity.Role;
import com.finsen.store.repository.UserRepository;
import com.finsen.store.security.JwtTokenProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest authRequest) {
        String userId = authRequest.userId() != null ? authRequest.userId().trim() : "";
        String password = authRequest.password() != null ? authRequest.password().trim() : "";

        if (userId.isEmpty() || password.isEmpty()) {
            return ResponseEntity.status(400).body(Map.of("message", "User ID and Password are required."));
        }

        // Exact database lookup by userId (case-insensitive)
        User user = userRepository.findByUserId(userId)
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> u.getUserId().equalsIgnoreCase(userId))
                        .findFirst()
                        .orElse(null));

        if (user == null || !user.isActive()) {
            return ResponseEntity.status(400).body(Map.of("message", "Login failed. Invalid User ID or Password."));
        }

        // Strict password check (BCrypt or exact match)
        boolean passwordMatches = false;
        if (user.getPassword() != null && !user.getPassword().isEmpty()) {
            try {
                passwordMatches = passwordEncoder.matches(password, user.getPassword());
            } catch (Exception ignored) {}
            if (!passwordMatches) {
                passwordMatches = password.equals(user.getPassword());
            }
        }
        if (!passwordMatches && user.getVisiblePassword() != null && !user.getVisiblePassword().isEmpty()) {
            passwordMatches = password.equals(user.getVisiblePassword());
        }

        if (!passwordMatches) {
            return ResponseEntity.status(400).body(Map.of("message", "Login failed. Invalid User ID or Password."));
        }

        // Strict multi-field verification for Store Incharge and Viewer (User)
        if (user.getRole() != Role.SUPER_ADMIN) {
            Location loc = user.getLocation();
            String assignedState = loc != null && loc.getStateName() != null ? loc.getStateName() : (loc != null ? loc.getName() : "");
            String assignedSite = loc != null && loc.getSiteName() != null ? loc.getSiteName() : "Main Site";

            // 1. Verify State
            String reqState = authRequest.stateName() != null ? authRequest.stateName().trim() : "";
            if (!reqState.isEmpty() && !reqState.equalsIgnoreCase(assignedState.trim())) {
                return ResponseEntity.status(400).body(Map.of("message", 
                    "State mismatch! Your account is assigned to '" + assignedState + "'. Please select '" + assignedState + "' in State (Location)."));
            }

            // 2. Verify Site Name
            String reqSite = authRequest.siteName() != null ? authRequest.siteName().trim() : "";
            if (reqSite.isEmpty()) {
                return ResponseEntity.status(400).body(Map.of("message", 
                    "Site Name is required! Please enter your assigned Site Name (as received in your email)."));
            }
            if (!reqSite.equalsIgnoreCase(assignedSite.trim())) {
                return ResponseEntity.status(400).body(Map.of("message", 
                    "Site Name mismatch! Spelling mistake or wrong site entered. Your assigned Site is '" + assignedSite + "'. Please enter the exact Site Name."));
            }

            // 3. Verify Login Type
            String reqLoginType = authRequest.loginType() != null ? authRequest.loginType().trim() : "";
            if (!reqLoginType.isEmpty()) {
                if (user.getRole() == Role.STORE_INCHARGE && !reqLoginType.equalsIgnoreCase("Store Incharge Login")) {
                    return ResponseEntity.status(400).body(Map.of("message", 
                        "Login Type mismatch! This account is for Store Incharge. Please select 'Store Incharge Login' in Login Type."));
                }
                if (user.getRole() == Role.USER && !reqLoginType.equalsIgnoreCase("User Login (View Only)") && !reqLoginType.equalsIgnoreCase("User Login")) {
                    return ResponseEntity.status(400).body(Map.of("message", 
                        "Login Type mismatch! This account is for Viewer (View Only). Please select 'User Login (View Only)' in Login Type."));
                }
            }
        } else {
            // Super Admin validation: if admin selects Store Incharge Login or User Login, notify them
            String reqLoginType = authRequest.loginType() != null ? authRequest.loginType().trim() : "";
            if (!reqLoginType.isEmpty() && !reqLoginType.equalsIgnoreCase("Admin Login")) {
                return ResponseEntity.status(400).body(Map.of("message", 
                    "Login Type mismatch! This is a Super Admin account. Please select 'Admin Login' in Login Type."));
            }
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        Location loc = user.getLocation();
        return ResponseEntity.ok(new AuthResponse(
                jwt,
                user.getUserId(),
                user.getFullName(),
                user.getRole().name(),
                loc != null ? loc.getId() : null,
                loc != null ? loc.getName() : null,
                loc != null ? loc.getStateName() : null,
                loc != null ? loc.getSiteName() : null
        ));
    }
}
