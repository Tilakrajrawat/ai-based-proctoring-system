package com.proctoring.backend.service;

import org.springframework.stereotype.Component;
import com.proctoring.backend.model.incident.Incident;

@Component
public class IncidentSeverityResolver {

    public double resolveSeverity(Incident incident) {
        switch (incident.getType()) {
            case MULTIPLE_FACES_DETECTED:
                return 1.2 * incident.getConfidence();
            case PHONE_DETECTED:
                return 1.5 * incident.getConfidence();
            case LOOKING_AWAY:
                return 0.6 * incident.getConfidence();
            case EYES_CLOSED:
                return 0.5 * incident.getConfidence();
            case SPEAKING_DETECTED:
                return 0.7 * incident.getConfidence();
            default:
                return 0.3 * incident.getConfidence();
        }
    }
}
