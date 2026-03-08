package com.proctoring.backend.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proctoring.backend.controller.dto.IncidentReportRequest;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.service.IncidentService;

@RestController
@RequestMapping({"/incidents", "/api/incidents"})
public class IncidentController {

    private final IncidentService service;
    private final ExamSessionRepository sessionRepository;
    private final ExamAssignmentRepository assignmentRepository;

    public IncidentController(
            IncidentService service,
            ExamSessionRepository sessionRepository,
            ExamAssignmentRepository assignmentRepository
    ) {
        this.service = service;
        this.sessionRepository = sessionRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @PostMapping({"", "/report"})
    public Incident report(
            @RequestBody IncidentReportRequest request,
            Authentication authentication
    ) {
        Incident incident = new Incident(
                request.getSessionId(),
                request.getType(),
                request.getConfidence()
        );
        return service.reportIncident(incident, authentication.getName());
    }

    @GetMapping("/session/{sessionId}")
    public List<Incident> getBySession(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        ExamSession session = sessionRepository.findById(sessionId);
        if (session == null) {
            throw new RuntimeException("Session not found");
        }

        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(session.getExamId(), authentication.getName())
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        boolean isStudentOwner = assignment.getRole() == ExamRole.STUDENT
                && session.getStudentId().equals(authentication.getName());
        boolean isPrivileged = assignment.getRole() == ExamRole.PROCTOR
                || assignment.getRole() == ExamRole.ADMIN;

        if (!isStudentOwner && !isPrivileged) {
            throw new RuntimeException("Forbidden");
        }

        return service.getBySession(sessionId);
    }

    @GetMapping("/{incidentId}/snippet")
    public ResponseEntity<String> getSnippetUrl(@PathVariable String incidentId, Authentication authentication) {
        // Placeholder endpoint: returns a URL for external snippet storage/CDN integration.
        return ResponseEntity.ok(String.format("/snippets/%s.mp4", incidentId));
    }
}

