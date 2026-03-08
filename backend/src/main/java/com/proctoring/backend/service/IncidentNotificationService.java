package com.proctoring.backend.service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class IncidentNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final ExamSessionRepository examSessionRepository;

    public IncidentNotificationService(
            SimpMessagingTemplate messagingTemplate,
            ExamSessionRepository examSessionRepository
    ) {
        this.messagingTemplate = messagingTemplate;
        this.examSessionRepository = examSessionRepository;
    }

    public void notifyIncidentDetected(Incident incident) {
        messagingTemplate.convertAndSend("/topic/incidentDetected", incident);
        messagingTemplate.convertAndSend("/topic/incidents", incident);
    }

    public void notifySessionUpdated(ExamSession session) {
        messagingTemplate.convertAndSend("/topic/sessionUpdated", session);
        messagingTemplate.convertAndSend("/topic/sessions", session);
    }

    public void notifyRiskScoreUpdated(String sessionId) {
        ExamSession session = examSessionRepository.findById(sessionId);
        if (session == null) {
            return;
        }

        messagingTemplate.convertAndSend("/topic/riskScoreUpdated", new RiskScorePayload(session.getId(), session.getTotalSeverity()));
    }

    public void notifyIncident(Incident incident) {
        notifyIncidentDetected(incident);
    }

    public void notifySessionUpdate(ExamSession session) {
        notifySessionUpdated(session);
    }

    public record RiskScorePayload(String sessionId, double riskScore) {
    }
}
