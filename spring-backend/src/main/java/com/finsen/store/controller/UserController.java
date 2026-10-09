package com.finsen.store.controller;

import com.finsen.store.dto.CreateUserDTO;
import com.finsen.store.dto.PasswordUpdateDTO;
import com.finsen.store.dto.UpdateUserDTO;
import com.finsen.store.dto.UserDTO;
import com.finsen.store.entity.Location;
import com.finsen.store.entity.Role;
import com.finsen.store.entity.User;
import com.finsen.store.repository.LocationRepository;
import com.finsen.store.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LocationRepository locationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public List<UserDTO> getAllUsers(Authentication auth, @RequestParam(required = false) UUID locationId) {
        User user = (User) auth.getPrincipal();
        // If SUPER_ADMIN, they get all users. Optionally we can still filter by locationId if they explicitly request it.
        // For the global admin view, we want all users.
        if (locationId != null && user.getRole() != Role.SUPER_ADMIN) {
            return userRepository.findByLocationId(locationId).stream().map(this::convertToDTO).collect(Collectors.toList());
        }
        // Since it's SUPER_ADMIN only endpoint currently, return all users
        return userRepository.findAll().stream().map(this::convertToDTO).collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> createUser(@RequestBody CreateUserDTO dto) {
        if (userRepository.findByUserId(dto.userId()).isPresent()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", "User ID already exists. Please choose a different User ID."));
        }

        Role role = Role.valueOf(dto.role());
        Location location = null;
        if (role != Role.SUPER_ADMIN) {
            location = resolveLocation(dto.locationId(), dto.stateName(), dto.siteName());
        }

        User user = new User(null, dto.userId(), dto.email(), passwordEncoder.encode(dto.password()), dto.password(), dto.fullName(), role, location, true);
        user = userRepository.save(user);

        return ResponseEntity.ok(convertToDTO(user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> updateUser(@PathVariable UUID id, @RequestBody UpdateUserDTO dto) {
        User user = userRepository.findById(id).orElseThrow();
        
        user.setUserId(dto.userId());
        user.setEmail(dto.email());
        user.setFullName(dto.fullName());
        Role role = Role.valueOf(dto.role());
        user.setRole(role);
        if (dto.active() != null) {
            user.setActive(dto.active());
        }
        
        if (dto.password() != null && !dto.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.password()));
            user.setVisiblePassword(dto.password());
        }
        
        if (role != Role.SUPER_ADMIN) {
            Location location = resolveLocation(dto.locationId(), dto.stateName(), dto.siteName());
            user.setLocation(location);
        } else {
            user.setLocation(null);
        }
        
        user = userRepository.save(user);
        return ResponseEntity.ok(convertToDTO(user));
    }

    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> updatePassword(@PathVariable UUID id, @RequestBody PasswordUpdateDTO dto) {
        User user = userRepository.findById(id).orElseThrow();
        user.setPassword(passwordEncoder.encode(dto.newPassword()));
        user.setVisiblePassword(dto.newPassword());
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            if (userRepository.existsById(id)) {
                userRepository.deleteById(id);
                return ResponseEntity.ok(java.util.Map.of("message", "User deleted successfully."));
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            userRepository.findById(id).ifPresent(u -> {
                u.setActive(false);
                userRepository.save(u);
            });
            return ResponseEntity.ok(java.util.Map.of("message", "User account deactivated successfully."));
        }
    }

    @PutMapping("/me/password")
    public ResponseEntity<Void> updateMyPassword(Authentication auth, @RequestBody PasswordUpdateDTO dto) {
        User user = (User) auth.getPrincipal();
        user.setPassword(passwordEncoder.encode(dto.newPassword()));
        user.setVisiblePassword(dto.newPassword());
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    private Location resolveLocation(UUID locationId, String stateName, String siteName) {
        if (stateName != null && !stateName.isBlank() && siteName != null && !siteName.isBlank()) {
            final String cleanState = stateName.trim();
            final String cleanSite = siteName.trim();

            // Look for existing Location where state and site match (case-insensitive)
            Location existing = locationRepository.findAll().stream()
                .filter(l -> (l.getStateName() != null && l.getStateName().equalsIgnoreCase(cleanState))
                          && (l.getSiteName() != null && l.getSiteName().equalsIgnoreCase(cleanSite)))
                .findFirst()
                .orElse(null);

            if (existing != null) {
                return existing;
            }

            // Also check if any existing location has name matching cleanState and site is "Main Site" or cleanState
            if (cleanSite.equalsIgnoreCase("Main Site") || cleanSite.equalsIgnoreCase(cleanState) || cleanSite.equalsIgnoreCase(cleanState + " Site")) {
                Location stateLoc = locationRepository.findAll().stream()
                    .filter(l -> l.getName() != null && l.getName().equalsIgnoreCase(cleanState))
                    .findFirst()
                    .orElse(null);
                if (stateLoc != null) {
                    stateLoc.setStateName(cleanState);
                    stateLoc.setSiteName(cleanSite);
                    return locationRepository.save(stateLoc);
                }
            }

            // Create a new Location for this site under cleanState
            String combinedName = cleanSite + " (" + cleanState + ")";
            String stateCode = cleanState.length() >= 3 ? cleanState.substring(0, 3).toUpperCase() : cleanState.toUpperCase();
            String siteCode = cleanSite.replaceAll("[^a-zA-Z0-9]", "").toUpperCase();
            if (siteCode.length() > 3) siteCode = siteCode.substring(0, 3);
            String fullCode = stateCode + (siteCode.isEmpty() ? "" : "-" + siteCode);

            Location newLoc = new Location(null, combinedName, fullCode, cleanSite + ", " + cleanState, cleanState, cleanSite, true);
            return locationRepository.save(newLoc);
        }

        if (locationId != null) {
            return locationRepository.findById(locationId).orElse(null);
        }

        return null;
    }

    private UserDTO convertToDTO(User user) {
        Location loc = user.getLocation();
        return new UserDTO(
            user.getId(),
            user.getUserId(),
            user.getEmail(),
            user.getVisiblePassword(),
            user.getFullName(),
            user.getRole().name(),
            loc != null ? loc.getId() : null,
            loc != null ? loc.getName() : null,
            loc != null ? loc.getStateName() : null,
            loc != null ? loc.getSiteName() : null,
            user.isActive()
        );
    }
}
