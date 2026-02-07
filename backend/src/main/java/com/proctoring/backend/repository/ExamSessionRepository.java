package com.proctoring.backend.repository;

import com.proctoring.backend.model.session.ExamSession;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class ExamSessionRepository {
    private final Map<String, ExamSession> sessions = new ConcurrentHashMap<>();
    
    public ExamSession save(ExamSession session) {
        sessions.put(session.getId(), session);
        return session;
    }
    
    public ExamSession findById(String id) {
        return sessions.get(id);
    }
    
    public List<ExamSession> findAll() {
        return new ArrayList<>(sessions.values());
    }
    
    public List<ExamSession> findByStudentId(String studentId) {
        return sessions.values().stream()
                .filter(session -> session.getStudentId().equals(studentId))
                .toList();
    }
    
    public void deleteById(String id) {
        sessions.remove(id);
    }
}
