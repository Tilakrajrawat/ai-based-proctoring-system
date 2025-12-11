package com.proctoring.backend.controller.dto;

import com.proctoring.backend.model.incident.IncidentType;

public class IncidentReportRequest {

    private String sessionId;
    private IncidentType type;
    private double confidence;

    public IncidentReportRequest() {}

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public IncidentType getType() {
        return type;
    }

    public void setType(IncidentType type) {
        this.type = type;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }
}
