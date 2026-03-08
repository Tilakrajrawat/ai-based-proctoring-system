package com.proctoring.backend.service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.repository.IncidentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IncidentService {

    private static final int INCIDENT_COOLDOWN_SECONDS = 10;

    private final Map<String, Instant> lastIncidentTime = new ConcurrentHashMap<>();

    @Value("${proctor.auto-suspend-threshold:12}")
    private double autoSuspendThreshold;

    private final IncidentRepository incidentRepository;
    private final ExamSessionRepository sessionRepository;
    private final IncidentNotificationService notifier;
    private final IncidentSeverityResolver severityResolver;

    public IncidentService(
            IncidentRepository incidentRepository,
            ExamSessionRepository sessionRepository,
            IncidentNotificationService notifier,
            IncidentSeverityResolver severityResolver
    ) {
        this.incidentRepository = incidentRepository;
        this.sessionRepository = sessionRepository;
        this.notifier = notifier;
        this.severityResolver = severityResolver;
    }

    public Incident reportIncident(Incident incident) {
        String key = incident.getSessionId() + "_" + incident.getType();
        Instant now = Instant.now();
        Instant last = lastIncidentTime.get(key);

        if (last != null && Duration.between(last, now).getSeconds() < INCIDENT_COOLDOWN_SECONDS) {
            return incident;
        }

        lastIncidentTime.put(key, now);

        incident.setDetectedAt(now);
        incident.setTimestamp(now);
        incident.setCreatedAt(now);

        if (incident.getVideoSnippetUrl() == null || incident.getVideoSnippetUrl().isBlank()) {
            incident.setVideoSnippetUrl("/snippets/" + incident.getSessionId() + "/" + incident.getId() + ".mp4");
        }

        Incident saved = incidentRepository.save(incident);
        applySeverityAndAutoSuspend(saved);
        notifier.notifyIncidentDetected(saved);
        notifier.notifyRiskScoreUpdated(saved.getSessionId());

        return saved;
    }

    public Incident reportIncident(Incident incident, String email) {
        ExamSession session = sessionRepository.findById(incident.getSessionId());

        if (session == null) {
            throw new RuntimeException("Session not found");
        }

        if (!email.equals(session.getStudentId())) {
            throw new RuntimeException("Forbidden");
        }

        return reportIncident(incident);
    }

    private void applySeverityAndAutoSuspend(Incident incident) {
        ExamSession session = sessionRepository.findById(incident.getSessionId());

        if (session == null) {
            return;
        }

        double severity = incident.getSeverity() > 0
                ? incident.getSeverity()
                : severityResolver.resolveSeverity(incident);

        incident.setSeverity(severity);
        incidentRepository.save(incident);

        session.setTotalSeverity(session.getTotalSeverity() + severity);
        session.setUpdatedAt(Instant.now());

        boolean autoSuspended = false;

        if (session.getStatus() == SessionStatus.ACTIVE && session.getTotalSeverity() >= autoSuspendThreshold) {
            session.setStatus(SessionStatus.SUSPENDED);
            autoSuspended = true;
        }

        sessionRepository.save(session);
        notifier.notifySessionUpdated(session);

        if (autoSuspended) {
            Incident autoIncident = new Incident(
                    session.getId(),
                    IncidentType.SESSION_AUTO_SUSPEND,
                    1.0
            );
            Instant now = Instant.now();
            autoIncident.setDetectedAt(now);
            autoIncident.setTimestamp(now);
            autoIncident.setCreatedAt(now);
            autoIncident.setVideoSnippetUrl("/snippets/" + session.getId() + "/auto-suspend-" + now.toEpochMilli() + ".mp4");
            incidentRepository.save(autoIncident);
            notifier.notifyIncidentDetected(autoIncident);
        }
    }

    public List<Incident> getBySession(String sessionId) {
        return incidentRepository.findBySessionId(sessionId)
                .stream()
                .sorted(Comparator.comparing(Incident::getTimestamp, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }
}
