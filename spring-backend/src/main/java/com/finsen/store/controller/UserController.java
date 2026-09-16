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

        Location location = null;
        if (dto.locationId() != null) {
            location = locationRepository.findById(dto.locationId()).orElse(null);
        }

        Role role = Role.valueOf(dto.role());
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
        user.setRole(Role.valueOf(dto.role()));
        if (dto.active() != null) {
            user.setActive(dto.active());
        }
        
        if (dto.password() != null && !dto.password().isBlank()) {
            user.setPassword(passwordEncoder.encode(dto.password()));
            user.setVisiblePassword(dto.password());
        }
        
        if (dto.locationId() != null) {
            Location location = locationRepository.findById(dto.locationId()).orElse(null);
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

    private UserDTO convertToDTO(User user) {
        return new UserDTO(
            user.getId(),
            user.getUserId(),
            user.getEmail(),
            user.getVisiblePassword(),
            user.getFullName(),
            user.getRole().name(),
            user.getLocation() != null ? user.getLocation().getId() : null,
            user.getLocation() != null ? user.getLocation().getName() : null,
            user.isActive()
        );
    }
}
