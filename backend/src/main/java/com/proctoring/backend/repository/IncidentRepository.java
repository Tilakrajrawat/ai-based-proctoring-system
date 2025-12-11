package com.proctoring.backend.repository;

import com.proctoring.backend.model.incident.Incident;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface IncidentRepository extends MongoRepository<Incident, String> {

    List<Incident> findBySessionId(String sessionId);

}
