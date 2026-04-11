package com.proctoring.backend.service;

import com.proctoring.backend.dto.exam.AttendanceSummaryDto;
import com.proctoring.backend.dto.exam.LiveAnalyticsDto;
import com.proctoring.backend.dto.exam.StudentProgressDto;
import com.proctoring.backend.model.result.StudentResponse;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.repository.IncidentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ExamMonitoringService {

    private final ExamAssignmentRepository assignmentRepository;
    private final ExamSessionRepository sessionRepository;
    private final StudentResponseService responseService;
    private final McqService mcqService;
    private final IncidentRepository incidentRepository;

    public ExamMonitoringService(
            ExamAssignmentRepository assignmentRepository,
            ExamSessionRepository sessionRepository,
            StudentResponseService responseService,
            McqService mcqService,
            IncidentRepository incidentRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.sessionRepository = sessionRepository;
        this.responseService = responseService;
        this.mcqService = mcqService;
        this.incidentRepository = incidentRepository;
    }

    public AttendanceSummaryDto attendanceSummary(String examId) {
        List<ExamAssignment> students = assignmentRepository.findByExamId(examId).stream()
                .filter(a -> a.getRole() == ExamRole.STUDENT)
                .toList();
        List<ExamSession> sessions = sessionRepository.findAll().stream().filter(s -> examId.equals(s.getExamId())).toList();

        int present = 0;
        int suspended = 0;
        int ended = 0;
        int inactive = 0;

        for (ExamAssignment student : students) {
            ExamSession session = latestSessionForStudent(sessions, student.getEmail());
            if (session == null) {
                continue;
            }
            present++;
            if (session.getStatus() == SessionStatus.SUSPENDED) suspended++;
            if (session.getStatus() == SessionStatus.ENDED || session.getStatus() == SessionStatus.SUBMITTED) ended++;
            if (session.getStatus() != SessionStatus.ACTIVE) inactive++;
        }

        return new AttendanceSummaryDto(students.size(), present, students.size() - present, suspended, ended, inactive);
    }

    public List<StudentProgressDto> progress(String examId) {
        int totalQuestions = mcqService.rawQuestions(examId).size();
        List<ExamSession> sessions = sessionRepository.findAll().stream().filter(s -> examId.equals(s.getExamId())).toList();
        Map<String, List<ExamSession>> sessionsByStudent = sessions.stream().collect(Collectors.groupingBy(ExamSession::getStudentId));

        return assignmentRepository.findByExamId(examId).stream()
                .filter(a -> a.getRole() == ExamRole.STUDENT)
                .map(a -> {
                    ExamSession session = latestSessionForStudent(sessionsByStudent.getOrDefault(a.getEmail(), List.of()), a.getEmail());
                    StudentResponse response = responseService.getByExamAndStudent(examId, a.getEmail());
                    int incidentCount = session == null ? 0 : incidentRepository.findBySessionId(session.getId()).size();
                    return new StudentProgressDto(
                            a.getEmail(),
                            session == null ? null : session.getId(),
                            session == null ? "NOT_STARTED" : session.getStatus().name(),
                            response == null ? 0 : response.getAttemptedCount(),
                            totalQuestions,
                            response != null && (response.getStatus().name().contains("SUBMITTED")),
                            session == null ? 0 : session.getTotalSeverity(),
                            incidentCount
                    );
                }).toList();
    }

    public LiveAnalyticsDto liveAnalytics(String examId) {
        List<ExamSession> sessions = sessionRepository.findAll().stream().filter(s -> examId.equals(s.getExamId())).toList();
        int totalStudents = (int) assignmentRepository.findByExamId(examId).stream().filter(a -> a.getRole() == ExamRole.STUDENT).count();
        int active = (int) sessions.stream().filter(s -> s.getStatus() == SessionStatus.ACTIVE).count();
        int suspended = (int) sessions.stream().filter(s -> s.getStatus() == SessionStatus.SUSPENDED).count();
        int highRisk = (int) sessions.stream().filter(s -> s.getTotalSeverity() >= 2.0).count();
        double avgRisk = sessions.isEmpty() ? 0.0 : sessions.stream().mapToDouble(ExamSession::getTotalSeverity).average().orElse(0.0);
        int incidents = sessions.stream().mapToInt(s -> incidentRepository.findBySessionId(s.getId()).size()).sum();
        return new LiveAnalyticsDto(totalStudents, active, suspended, highRisk, avgRisk, incidents);
    }

    private ExamSession latestSessionForStudent(List<ExamSession> sessions, String studentEmail) {
        return sessions.stream()
                .filter(s -> studentEmail.equals(s.getStudentId()))
                .sorted((a, b) -> b.getStartedAt().compareTo(a.getStartedAt()))
                .findFirst().orElse(null);
    }
}
