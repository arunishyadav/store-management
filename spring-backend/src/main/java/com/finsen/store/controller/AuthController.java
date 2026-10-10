package com.finsen.store.controller;

import com.finsen.store.dto.AuthRequest;
import com.finsen.store.dto.AuthResponse;
import com.finsen.store.entity.Role;
import com.finsen.store.entity.User;
import com.finsen.store.entity.Location;
import com.finsen.store.repository.UserRepository;
import com.finsen.store.repository.LocationRepository;
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
    private LocationRepository locationRepository;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody AuthRequest authRequest) {
        String userId = authRequest.userId() != null ? authRequest.userId().trim() : "";
        String password = authRequest.password() != null ? authRequest.password().trim() : "";
        String reqState = authRequest.stateName() != null ? authRequest.stateName().trim() : "";
        String reqSite = authRequest.siteName() != null ? authRequest.siteName().trim() : "";
        String reqLoginType = authRequest.loginType() != null ? authRequest.loginType().trim() : "";

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

        // Strict password check (BCrypt or plain match)
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

        // 1. Validate Login Type
        if (!reqLoginType.isEmpty()) {
            if (user.getRole() == Role.SUPER_ADMIN && !reqLoginType.equalsIgnoreCase("Admin Login")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Login Type mismatch: Super Admin must select 'Admin Login'."));
            } else if (user.getRole() == Role.STORE_INCHARGE && !reqLoginType.equalsIgnoreCase("Store Incharge Login")) {
                return ResponseEntity.badRequest().body(Map.of("message", "Login Type mismatch: This account is registered as Store Incharge. Please select 'Store Incharge Login'."));
            } else if (user.getRole() == Role.USER && !(reqLoginType.equalsIgnoreCase("User Login") || reqLoginType.equalsIgnoreCase("User Login (View Only)"))) {
                return ResponseEntity.badRequest().body(Map.of("message", "Login Type mismatch: This account is registered as Viewer. Please select 'User Login (View Only)'."));
            }
        }

        // 2. Validate State and Site Name for Non-Admin users (Store Incharge & Viewer)
        Location loc = user.getLocation();
        if (user.getRole() != Role.SUPER_ADMIN) {
            if (loc == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "No assigned work location found for this account. Please contact Administrator."));
            }

            String assignedState = loc.getStateName() != null ? loc.getStateName().trim() : (loc.getName() != null ? loc.getName().trim() : "");
            String assignedSite = loc.getSiteName() != null ? loc.getSiteName().trim() : "Main Site";

            // State check
            if (!reqState.isEmpty()) {
                if (!reqState.equalsIgnoreCase(assignedState)) {
                    return ResponseEntity.badRequest().body(Map.of("message", "State (Location) mismatch! Your account is assigned to '" + assignedState + "'. Please select '" + assignedState + "'."));
                }
            }

            // Site Name check - MUST MATCH (spelling check, case-insensitive, normalized whitespace)
            if (reqSite.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Site Name is required! Please enter your assigned Site Name ('" + assignedSite + "')."));
            }

            String cleanReqSite = reqSite.replaceAll("\\s+", " ").trim();
            String cleanAssignedSite = assignedSite.replaceAll("\\s+", " ").trim();

            if (!cleanReqSite.equalsIgnoreCase(cleanAssignedSite)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Site Name mismatch! You entered: '" + reqSite + "'. Your assigned Site Name is '" + assignedSite + "'. Please check the exact spelling from your credentials email."));
            }
        } else {
            // Super Admin can switch to requested state & site
            if (!reqState.isEmpty()) {
                final String st = reqState;
                final String si = reqSite.isEmpty() ? "Main Site" : reqSite;
                Location adminTarget = locationRepository.findAll().stream()
                    .filter(l -> (l.getStateName() != null && l.getStateName().equalsIgnoreCase(st) && l.getSiteName() != null && l.getSiteName().equalsIgnoreCase(si))
                              || (l.getName() != null && l.getName().equalsIgnoreCase(st) && (l.getSiteName() == null || l.getSiteName().equalsIgnoreCase(si))))
                    .findFirst()
                    .orElse(null);
                if (adminTarget != null) {
                    loc = adminTarget;
                }
            }
        }

        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

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
