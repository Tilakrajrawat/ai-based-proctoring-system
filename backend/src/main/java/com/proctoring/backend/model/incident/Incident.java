package com.proctoring.backend.model.incident;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "incidents")
public class Incident {

    @Id
    private String id;

    private String sessionId;
    private IncidentType type;
    private double confidence;

    private double severity;

    private Instant detectedAt;
    private Instant createdAt;

    public Incident() {
        this.detectedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public Incident(String sessionId, IncidentType type, double confidence) {
        this.sessionId = sessionId.trim();
        this.type = type;
        this.confidence = confidence;
        this.detectedAt = Instant.now();
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
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
