package com.proctoring.backend.repository;

import com.proctoring.backend.model.incident.Incident;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
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
    
    public void deleteById(String id) {
        incidents.remove(id);
    }
}
