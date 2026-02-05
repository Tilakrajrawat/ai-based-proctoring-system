package com.proctoring.backend.model.incident;

import java.time.Instant;
import java.util.UUID;

public class Incident {

    private String id;

    private String sessionId;
    private IncidentType type;
    private double confidence;

    private double severity;

    private Instant detectedAt;
    private Instant createdAt;

    public Incident() {
        this.id = UUID.randomUUID().toString();
        this.detectedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public Incident(String sessionId, IncidentType type, double confidence) {
        this.id = UUID.randomUUID().toString();
        this.sessionId = sessionId.trim();
        this.type = type;
        this.confidence = confidence;
        this.detectedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public IncidentType getType() {
        return type;
    }

    public double getConfidence() {
        return confidence;
    }

    public double getSeverity() {       
        return severity;
    }

    public void setSeverity(double severity) { 
        this.severity = severity;
    }

    public Instant getDetectedAt() {
        return detectedAt;
    }

    public void setDetectedAt(Instant detectedAt) {
        this.detectedAt = detectedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
