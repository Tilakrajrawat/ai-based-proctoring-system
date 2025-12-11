package com.proctoring.backend.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.repository.IncidentRepository;

@Service
public class ExamSessionService {

    private static final long HEARTBEAT_TIMEOUT_SECONDS = 30;
    private static final long PROCTOR_COOLDOWN_SECONDS = 60;
    private static final double AUTO_SUSPEND_THRESHOLD = 2.0;

    private final ExamSessionRepository sessionRepository;
    private final IncidentRepository incidentRepository;
    private final IncidentNotificationService notifier;

    public ExamSessionService(
            ExamSessionRepository sessionRepository,
            IncidentRepository incidentRepository,
            IncidentNotificationService notifier
    ) {
        this.sessionRepository = sessionRepository;
        this.incidentRepository = incidentRepository;
        this.notifier = notifier;
    }

    public ExamSession startSession(String studentId, String examId) {
        ExamSession session = new ExamSession(studentId, examId);
        return sessionRepository.save(session);
    }

    public ExamSession getSession(String sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    public List<ExamSession> getAll() {
        return sessionRepository.findAll();
    }

    public ExamSession heartbeat(String sessionId) {

        ExamSession session = getSession(sessionId);

        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalStateException("Session not active");
        }

        checkHeartbeatTimeout(session);
        enforceSeverityPolicy(session);

        session.setLastHeartbeatAt(Instant.now());
        session.setUpdatedAt(Instant.now());

        ExamSession saved = sessionRepository.save(session);
        notifier.notifySessionUpdate(saved);

        return saved;
    }

    private void checkHeartbeatTimeout(ExamSession session) {

        if (session.getLastHeartbeatAt() == null) return;

        long diff = Duration.between(
                session.getLastHeartbeatAt(),
                Instant.now()
        ).getSeconds();

        if (diff > HEARTBEAT_TIMEOUT_SECONDS) {

            session.setStatus(SessionStatus.SUSPENDED);
            session.setUpdatedAt(Instant.now());
            sessionRepository.save(session);

            Incident incident = new Incident(
                    session.getId(),
                    IncidentType.SESSION_TIMEOUT,
                    1.0
            );

            incidentRepository.save(incident);
            notifier.notifyIncident(incident);
            notifier.notifySessionUpdate(session);
        }
    }

    private void enforceSeverityPolicy(ExamSession session) {

        if (session.getLastProctorActionAt() != null) {
            long sinceProctorAction = Duration.between(
                    session.getLastProctorActionAt(),
                    Instant.now()
            ).getSeconds();

            if (sinceProctorAction < PROCTOR_COOLDOWN_SECONDS) {
                return;
            }
        }

        if (
                session.getStatus() == SessionStatus.ACTIVE &&
                session.getTotalSeverity() >= AUTO_SUSPEND_THRESHOLD
        ) {
            session.setStatus(SessionStatus.SUSPENDED);
            session.setUpdatedAt(Instant.now());

            sessionRepository.save(session);
            notifier.notifySessionUpdate(session);

            Incident autoIncident = new Incident(
                    session.getId(),
                    IncidentType.SESSION_AUTO_SUSPEND,
                    1.0
            );

            incidentRepository.save(autoIncident);
            notifier.notifyIncident(autoIncident);
        }
    }

    public ExamSession suspendByProctor(String sessionId) {

        ExamSession session = getSession(sessionId);

        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new IllegalStateException("Only active sessions can be suspended");
        }

        session.setStatus(SessionStatus.SUSPENDED);
        session.setLastProctorActionAt(Instant.now());
        session.setUpdatedAt(Instant.now());

        sessionRepository.save(session);
        notifier.notifySessionUpdate(session);

        return session;
    }

    public ExamSession resumeSession(String sessionId) {

        ExamSession session = getSession(sessionId);

        if (session.getStatus() != SessionStatus.SUSPENDED) {
            throw new IllegalStateException("Only suspended sessions can be resumed");
        }

        session.setStatus(SessionStatus.ACTIVE);
        session.setLastProctorActionAt(Instant.now());
        session.setUpdatedAt(Instant.now());

        sessionRepository.save(session);

        Incident incident = new Incident(
                sessionId,
                IncidentType.PROCTOR_RESUMED_SESSION,
                1.0
        );

        incidentRepository.save(incident);
        notifier.notifyIncident(incident);
        notifier.notifySessionUpdate(session);

        return session;
    }

    public ExamSession endSession(String sessionId) {

        ExamSession session = getSession(sessionId);

        if (session.getStatus() == SessionStatus.ENDED) {
            throw new IllegalStateException("Session already ended");
        }

        session.setStatus(SessionStatus.ENDED);
        session.setLastProctorActionAt(Instant.now());
        session.setUpdatedAt(Instant.now());

        sessionRepository.save(session);

        Incident incident = new Incident(
                sessionId,
                IncidentType.PROCTOR_ENDED_SESSION,
                1.0
        );

        incidentRepository.save(incident);
        notifier.notifyIncident(incident);
        notifier.notifySessionUpdate(session);

        return session;
    }
}
