package com.finsen.store.repository;

import com.finsen.store.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

import com.finsen.store.entity.Role;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUserId(String userId);
    List<User> findByRole(Role role);
    List<User> findByLocationId(UUID locationId);
}
