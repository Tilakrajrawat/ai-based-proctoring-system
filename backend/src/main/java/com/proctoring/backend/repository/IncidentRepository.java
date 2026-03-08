package com.proctoring.backend.repository;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class IncidentRepository {
    private final Map<String, Incident> incidents = new ConcurrentHashMap<>();

    public Incident save(Incident incident) {
        incidents.put(incident.getId(), incident);
        return incident;
    }

    public Incident findById(String id) {
        return incidents.get(id);
    }

    public List<Incident> findAll() {
        return new ArrayList<>(incidents.values());
    }

    public List<Incident> findBySessionId(String sessionId) {
        return incidents.values().stream()
                .filter(incident -> incident.getSessionId().equals(sessionId))
                .toList();
    }

    public List<Incident> findBySessionIdOrderByTimestamp(String sessionId) {
        return incidents.values().stream()
                .filter(incident -> incident.getSessionId().equals(sessionId))
                .sorted(Comparator.comparing(this::getSortableTimestamp))
                .toList();
    }

    public List<Incident> findByExamId(List<String> sessionIds) {
        return incidents.values().stream()
                .filter(incident -> sessionIds.contains(incident.getSessionId()))
                .toList();
    }

    public long countDistinctSuspiciousSessions(List<String> sessionIds) {
        return incidents.values().stream()
                .filter(incident -> sessionIds.contains(incident.getSessionId()))
                .map(Incident::getSessionId)
                .distinct()
                .count();
    }

    public Map<IncidentType, Long> countByIncidentType(List<String> sessionIds) {
        return incidents.values().stream()
                .filter(incident -> sessionIds.contains(incident.getSessionId()))
                .collect(java.util.stream.Collectors.groupingBy(Incident::getType, java.util.stream.Collectors.counting()));
    }

    private Instant getSortableTimestamp(Incident incident) {
        if (incident.getTimestamp() != null) {
            return incident.getTimestamp();
        }
        if (incident.getDetectedAt() != null) {
            return incident.getDetectedAt();
        }
        if (incident.getCreatedAt() != null) {
            return incident.getCreatedAt();
        }
        return Instant.EPOCH;
    }

    public void deleteById(String id) {
        incidents.remove(id);
    }
}
