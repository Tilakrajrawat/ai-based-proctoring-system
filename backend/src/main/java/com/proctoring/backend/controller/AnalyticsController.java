package com.proctoring.backend.controller;

import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.repository.IncidentRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exams/{examId}")
public class AnalyticsController {

    private final ExamAssignmentRepository assignmentRepository;
    private final ExamSessionRepository sessionRepository;
    private final IncidentRepository incidentRepository;

    public AnalyticsController(
            ExamAssignmentRepository assignmentRepository,
            ExamSessionRepository sessionRepository,
            IncidentRepository incidentRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.sessionRepository = sessionRepository;
        this.incidentRepository = incidentRepository;
    }

    @GetMapping("/analytics")
    public AnalyticsResponse getAnalytics(@PathVariable String examId, Authentication authentication) {
        authorizePrivileged(examId, authentication);

        List<ExamSession> sessions = sessionsForExam(examId);
        int totalStudents = (int) assignmentRepository.findByExamId(examId)
                .stream()
                .filter(a -> a.getRole() == ExamRole.STUDENT)
                .count();

        int suspiciousSessions = (int) sessions.stream().filter(s -> s.getTotalSeverity() > 0).count();
        double averageRiskScore = sessions.isEmpty()
                ? 0.0
                : sessions.stream().mapToDouble(ExamSession::getTotalSeverity).average().orElse(0.0);

        List<TopIncidentType> topIncidentTypes = incidentsForExam(sessions)
                .stream()
                .collect(Collectors.groupingBy(i -> i.getType().name(), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(5)
                .map(entry -> new TopIncidentType(entry.getKey(), entry.getValue().intValue()))
                .toList();

        return new AnalyticsResponse(totalStudents, suspiciousSessions, averageRiskScore, topIncidentTypes);
    }

    @GetMapping("/sessions")
    public List<SessionSummary> getSessions(@PathVariable String examId, Authentication authentication) {
        authorizePrivileged(examId, authentication);

        return sessionsForExam(examId).stream()
                .map(s -> new SessionSummary(s.getId(), s.getStudentId(), s.getTotalSeverity(), s.getStatus().name()))
                .toList();
    }

    @GetMapping("/incident-stats")
    public Map<String, Long> getIncidentStats(@PathVariable String examId, Authentication authentication) {
        authorizePrivileged(examId, authentication);

        List<ExamSession> sessions = sessionsForExam(examId);
        return incidentsForExam(sessions)
                .stream()
                .collect(Collectors.groupingBy(i -> i.getType().name(), Collectors.counting()));
    }

    private List<ExamSession> sessionsForExam(String examId) {
        return sessionRepository.findAll().stream()
                .filter(s -> examId.equals(s.getExamId()))
                .toList();
    }

    private List<Incident> incidentsForExam(List<ExamSession> sessions) {
        Map<String, ExamSession> byId = sessions.stream().collect(Collectors.toMap(ExamSession::getId, Function.identity()));
        return incidentRepository.findAll().stream()
                .filter(i -> byId.containsKey(i.getSessionId()))
                .toList();
    }

    private void authorizePrivileged(String examId, Authentication authentication) {
        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(examId, authentication.getName())
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (assignment.getRole() != ExamRole.ADMIN && assignment.getRole() != ExamRole.PROCTOR) {
            throw new RuntimeException("Forbidden");
        }
    }

    public record TopIncidentType(String type, int count) {}

    public record AnalyticsResponse(
            int totalStudents,
            int suspiciousSessions,
            double averageRiskScore,
            List<TopIncidentType> topIncidentTypes
    ) {}

    public record SessionSummary(String sessionId, String studentId, double riskScore, String status) {}
}
