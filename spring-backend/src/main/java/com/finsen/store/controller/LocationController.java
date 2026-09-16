package com.finsen.store.controller;

import com.finsen.store.entity.Location;
import com.finsen.store.repository.LocationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/locations")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LocationController {

    private final LocationRepository locationRepository;

    @Autowired
    public LocationController(LocationRepository locationRepository) {
        this.locationRepository = locationRepository;
    }

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        return ResponseEntity.ok(locationRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        if (location.getCode() == null || location.getCode().isEmpty()) {
            location.setCode(location.getName().substring(0, Math.min(3, location.getName().length())).toUpperCase());
        }
        location.setActive(true);
        Location savedLocation = locationRepository.save(location);
        return ResponseEntity.ok(savedLocation);
    }
}
