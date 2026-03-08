package com.proctoring.backend.service;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.session.ExamSession;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class IncidentNotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    public IncidentNotificationService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void notifyIncident(Incident incident) {
        String destination = "/topic/incidents";
        messagingTemplate.convertAndSend(destination, incident);
        System.out.println("ALERT SENT: " + destination);
    }

    public void notifySessionUpdate(ExamSession session) {
        String destination = "/topic/sessions";
        messagingTemplate.convertAndSend(destination, session);
        System.out.println("SESSION UPDATE SENT: " + destination);
    }
}
