package com.proctoring.backend.service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import com.proctoring.backend.repository.IncidentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;


@Service
public class IncidentService {

    private static final double AUTO_SUSPEND_THRESHOLD = 2.0;

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
        incident.setDetectedAt(Instant.now());
        incident.setCreatedAt(Instant.now());

        Incident saved = incidentRepository.save(incident);
        applySeverityAndAutoSuspend(saved);
        notifier.notifyIncident(saved);
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

        if (session == null) return;

        double severity = severityResolver.resolveSeverity(incident);
        incident.setSeverity(severity);

        session.setTotalSeverity(session.getTotalSeverity() + severity);
        session.setUpdatedAt(Instant.now());

        boolean autoSuspended = false;

        if (session.getStatus() == SessionStatus.ACTIVE &&
                session.getTotalSeverity() >= AUTO_SUSPEND_THRESHOLD) {

            session.setStatus(SessionStatus.SUSPENDED);
            autoSuspended = true;
        }

        sessionRepository.save(session);
        notifier.notifySessionUpdate(session);

        if (autoSuspended) {
            Incident autoIncident = new Incident(
                    session.getId(),
                    IncidentType.SESSION_AUTO_SUSPEND,
                    1.0
            );
            autoIncident.setDetectedAt(Instant.now());
            autoIncident.setCreatedAt(Instant.now());
            incidentRepository.save(autoIncident);
            notifier.notifyIncident(autoIncident);
        }
    }
    public List<Incident> getBySession(String sessionId) {
    return incidentRepository.findBySessionId(sessionId);
}

}