package com.proctoring.backend.service;

import org.springframework.stereotype.Component;
import com.proctoring.backend.model.incident.Incident;

@Component
public class IncidentSeverityResolver {

    public double resolveSeverity(Incident incident) {

        double confidence = Math.max(incident.getConfidence(), 0.3);

        switch (incident.getType()) {

            case MULTIPLE_FACES_DETECTED:
                return 1.5 * confidence;

            case PHONE_DETECTED:
                return 2.0 * confidence;

            case LOOKING_AWAY:
                return 0.8 * confidence;

            case EYES_CLOSED:
                return 0.7 * confidence;

            case SPEAKING_DETECTED:
                return 0.9 * confidence;

            default:
                return 0.5 * confidence;
        }
    }
}