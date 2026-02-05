package com.proctoring.backend.model.user;

import java.time.Instant;
import java.util.UUID;

public class User {

    private String id;

    private String email;
    private String passwordHash;
    private Role role;

    private Instant createdAt;
    private Instant updatedAt;

    public User() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public User(String email, String passwordHash, Role role) {
        this.id = UUID.randomUUID().toString();
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }
}
