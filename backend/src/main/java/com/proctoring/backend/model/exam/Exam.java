package com.proctoring.backend.model.exam;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "exams")
public class Exam {

    @Id
    private String id;

    private String createdBy;
    private Instant createdAt;
    private boolean active;

    public Exam() {
        this.id = UUID.randomUUID().toString();
        this.createdAt = Instant.now();
        this.active = true;
    }

    public Exam(String createdBy) {
        this();
        this.createdBy = createdBy;
    }

    public String getId() {
        return id;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}