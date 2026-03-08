package com.proctoring.backend.service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamSessionRepository;

@Service
public class DetectionService {

    @Value("${ai.service.base-url:http://localhost:8000}")
    private String aiServiceBaseUrl;

    private final RestTemplate restTemplate;
    private final ExamSessionRepository sessionRepository;
    private final IncidentService incidentService;

    public DetectionService(
            RestTemplate restTemplate,
            ExamSessionRepository sessionRepository,
            IncidentService incidentService
    ) {
        this.restTemplate = restTemplate;
        this.sessionRepository = sessionRepository;
        this.incidentService = incidentService;
    }

    @SuppressWarnings("unchecked")
    public List<Incident> analyzeFrame(String sessionId, String frame, Authentication authentication) {
        ExamSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            throw new IllegalArgumentException("Session not found");
        }

        if (!session.getStudentId().equals(authentication.getName())) {
            throw new RuntimeException("Forbidden");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = Map.of(
                "sessionId", sessionId,
                "frame", frame
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(
                aiServiceBaseUrl + "/analyze_frame",
                new HttpEntity<>(requestBody, headers),
                Map.class
        );

        List<Map<String, Object>> incidentsPayload = response.getBody() == null
                ? Collections.emptyList()
                : (List<Map<String, Object>>) response.getBody().getOrDefault("incidents", Collections.emptyList());

        return incidentsPayload.stream()
                .map(payload -> toIncident(sessionId, payload))
                .filter(incident -> incident != null)
                .map(incidentService::reportIncident)
                .toList();
    }

    private Incident toIncident(String sessionId, Map<String, Object> payload) {
        IncidentType type;
        try {
            type = IncidentType.valueOf(String.valueOf(payload.get("type")));
        } catch (Exception ignored) {
            return null;
        }
        double confidence = parseDouble(payload.get("confidenceScore"), 0.5);
        double severityScore = parseDouble(payload.get("severityScore"), 0.0);

        Incident incident = new Incident(sessionId, type, confidence);
        incident.setSeverity(severityScore);
        incident.setDetectedAt(Instant.now());
        incident.setCreatedAt(Instant.now());
        return incident;
    }

    private double parseDouble(Object value, double defaultValue) {
        if (value == null) return defaultValue;
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException ignored) {
            return defaultValue;
        }
    }
}
