package com.proctoring.backend.controller;

import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.repository.IncidentRepository;

import java.util.List;

@RestController
@RequestMapping("/api/proctor")
public class ProctorController {

    private final ExamSessionRepository sessionRepository;
    private final ExamAssignmentRepository assignmentRepository;
    private final IncidentRepository incidentRepository;

    public ProctorController(
        ExamSessionRepository sessionRepository,
        ExamAssignmentRepository assignmentRepository,
        IncidentRepository incidentRepository
) {
    this.sessionRepository = sessionRepository;
    this.assignmentRepository = assignmentRepository;
    this.incidentRepository = incidentRepository;
}

    @GetMapping("/exams/{examId}/access")
    public String access(
            @PathVariable String examId,
            Authentication authentication
    ) {
        String email = authentication.getName();

        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(examId, email)
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (assignment.getRole() == ExamRole.PROCTOR || assignment.getRole() == ExamRole.ADMIN) {
            return "ACCESS_GRANTED";
        }

        throw new RuntimeException("FORBIDDEN");
    }

    @GetMapping("/exams/{examId}/students")
    public List<ExamSession> students(
            @PathVariable String examId,
            Authentication authentication
    ) {
        String email = authentication.getName();

        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(examId, email)
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (assignment.getRole() != ExamRole.PROCTOR && assignment.getRole() != ExamRole.ADMIN) {
            throw new RuntimeException("Forbidden");
        }

        return sessionRepository.findAll()
                .stream()
                .filter(s -> examId.equals(s.getExamId()))
                .toList();
    }

    @PostMapping("/exams/{examId}/students/{sessionId}/suspend")
    public String suspend(
            @PathVariable String examId,
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        authorize(examId, authentication);

        ExamSession session = sessionRepository.findById(sessionId);
        session.setStatus(SessionStatus.SUSPENDED);
        sessionRepository.save(session);

        return "SUSPENDED";
    }

    @PostMapping("/exams/{examId}/students/{sessionId}/resume")
    public String resume(
            @PathVariable String examId,
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        authorize(examId, authentication);

        ExamSession session = sessionRepository.findById(sessionId);
        session.setStatus(SessionStatus.ACTIVE);
        sessionRepository.save(session);

        return "RESUMED";
    }

    @DeleteMapping("/exams/{examId}/students/{sessionId}")
    public String remove(
            @PathVariable String examId,
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        authorize(examId, authentication);
        sessionRepository.deleteById(sessionId);
        return "REMOVED";
    }

    private void authorize(String examId, Authentication authentication) {
        String email = authentication.getName();

        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(examId, email)
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (assignment.getRole() != ExamRole.PROCTOR && assignment.getRole() != ExamRole.ADMIN) {
            throw new RuntimeException("Forbidden");
        }
    }
    @GetMapping("/sessions/{sessionId}/incidents")
public List<Incident> getIncidents(
        @PathVariable String sessionId,
        Authentication authentication
) {
    ExamSession session = sessionRepository.findById(sessionId);
    if (session == null) {
        throw new RuntimeException("Session not found");
    }

    String examId = session.getExamId();

    ExamAssignment assignment = assignmentRepository
            .findByExamIdAndEmail(examId, authentication.getName())
            .orElseThrow(() -> new RuntimeException("Not assigned"));

    if (assignment.getRole() != ExamRole.PROCTOR &&
        assignment.getRole() != ExamRole.ADMIN) {
        throw new RuntimeException("Forbidden");
    }

    return incidentRepository.findBySessionId(sessionId);
}
 @PostMapping("/exams/{examId}/students/{sessionId}/submit")
public String forceSubmit(
        @PathVariable String examId,
        @PathVariable String sessionId,
        Authentication authentication
) {
    authorize(examId, authentication);

    ExamSession session = sessionRepository.findById(sessionId);
    if (session == null) {
        throw new RuntimeException("Session not found");
    }

    session.setStatus(SessionStatus.SUBMITTED);
    session.setEndedAt(java.time.Instant.now());
    session.setUpdatedAt(java.time.Instant.now());

    sessionRepository.save(session);
    return "SUBMITTED";
} 

}

