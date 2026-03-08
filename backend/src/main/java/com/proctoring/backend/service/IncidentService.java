package com.proctoring.backend.service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import com.proctoring.backend.repository.IncidentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.time.Instant;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class IncidentService {

    private final Map<String, Instant> lastIncidentTime = new ConcurrentHashMap<>();
    private static final int INCIDENT_COOLDOWN_SECONDS = 10;
@Value("${proctor.auto-suspend-threshold:12}")
private double AUTO_SUSPEND_THRESHOLD;

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
<<<<<<< HEAD
<<<<<<< HEAD

        String key = incident.getSessionId() + "_" + incident.getType();

        Instant now = Instant.now();
        Instant last = lastIncidentTime.get(key);

        // cooldown check
        if (last != null && Duration.between(last, now).getSeconds() < INCIDENT_COOLDOWN_SECONDS) {
            return incident; // ignore repeated detection
        }

        lastIncidentTime.put(key, now);

        incident.setDetectedAt(now);
        incident.setCreatedAt(now);
=======
        Instant now = Instant.now();
        incident.setDetectedAt(now);
        incident.setTimestamp(now);
        incident.setCreatedAt(now);
        attachSnippetUrlIfMissing(incident);
>>>>>>> 6aff8a3cf07e45b6aa95df40b2087107f40a9b30
=======
        incident.setDetectedAt(Instant.now());
        incident.setCreatedAt(Instant.now());
>>>>>>> 64c0d5dcef616131bfcfcd04e1191f086e2a7805

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

        double severity = incident.getSeverity() > 0
                ? incident.getSeverity()
                : severityResolver.resolveSeverity(incident);

        incident.setSeverity(severity);
        incidentRepository.save(incident);

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
<<<<<<< HEAD
<<<<<<< HEAD

            autoIncident.setDetectedAt(Instant.now());
            autoIncident.setCreatedAt(Instant.now());

=======
            Instant now = Instant.now();
            autoIncident.setDetectedAt(now);
            autoIncident.setTimestamp(now);
            autoIncident.setCreatedAt(now);
            attachSnippetUrlIfMissing(autoIncident);
>>>>>>> 6aff8a3cf07e45b6aa95df40b2087107f40a9b30
=======
            autoIncident.setDetectedAt(Instant.now());
            autoIncident.setCreatedAt(Instant.now());
>>>>>>> 64c0d5dcef616131bfcfcd04e1191f086e2a7805
            incidentRepository.save(autoIncident);

            notifier.notifyIncident(autoIncident);
        }
    }
<<<<<<< HEAD

    public List<Incident> getBySession(String sessionId) {
        return incidentRepository.findBySessionId(sessionId);
    }
}
=======
    public List<Incident> getBySession(String sessionId) {
    return incidentRepository.findBySessionId(sessionId);
}
<<<<<<< HEAD
>>>>>>> 6aff8a3cf07e45b6aa95df40b2087107f40a9b30
=======

}
>>>>>>> 64c0d5dcef616131bfcfcd04e1191f086e2a7805
