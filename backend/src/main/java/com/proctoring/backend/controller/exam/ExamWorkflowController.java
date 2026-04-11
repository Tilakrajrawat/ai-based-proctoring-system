package com.proctoring.backend.controller.exam;

import com.proctoring.backend.dto.exam.*;
import com.proctoring.backend.model.result.ExamResult;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.service.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ExamWorkflowController {

    private final ExamAuthorizationService authService;
    private final McqService mcqService;
    private final StudentResponseService responseService;
    private final ResultService resultService;
    private final ExamMonitoringService monitoringService;
    private final ResultExportService resultExportService;

    public ExamWorkflowController(
            ExamAuthorizationService authService,
            McqService mcqService,
            StudentResponseService responseService,
            ResultService resultService,
            ExamMonitoringService monitoringService,
            ResultExportService resultExportService
    ) {
        this.authService = authService;
        this.mcqService = mcqService;
        this.responseService = responseService;
        this.resultService = resultService;
        this.monitoringService = monitoringService;
        this.resultExportService = resultExportService;
    }

    @PostMapping("/exams/{examId}/questions")
    public AdminQuestionDto createQuestion(@PathVariable String examId, @RequestBody QuestionUpsertRequest request, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        return mcqService.createQuestion(examId, request);
    }

    @GetMapping("/exams/{examId}/questions/admin-view")
    public List<AdminQuestionDto> questionsAdmin(@PathVariable String examId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        return mcqService.adminView(examId);
    }

    @GetMapping("/exams/{examId}/questions/student-view")
    public List<StudentQuestionDto> questionsStudent(@PathVariable String examId, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.STUDENT) {
            throw new RuntimeException("Forbidden");
        }
        return mcqService.studentView(examId);
    }

    @PutMapping("/questions/{questionId}")
    public AdminQuestionDto updateQuestion(@PathVariable String questionId, @RequestParam String examId, @RequestBody QuestionUpsertRequest request, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        return mcqService.updateQuestion(questionId, request);
    }

    @DeleteMapping("/questions/{questionId}")
    public void deleteQuestion(@PathVariable String questionId, @RequestParam String examId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        mcqService.deleteQuestion(questionId);
    }


    @DeleteMapping("/exams/{examId}/questions/{questionId}")
    public void deleteQuestionLegacy(@PathVariable String examId, @PathVariable String questionId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        mcqService.deleteQuestion(questionId);
    }

    @PostMapping("/exams/{examId}/responses/save")
    public MyExamStatusDto saveAnswer(@PathVariable String examId, @RequestBody AnswerSaveRequest request, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.STUDENT) {
            throw new RuntimeException("Forbidden");
        }
        responseService.saveAnswer(examId, auth.getName(), request);
        return responseService.myStatus(examId, auth.getName());
    }

    @PostMapping("/exams/{examId}/submit")
    public ExamResultDto submit(@PathVariable String examId, @RequestBody SubmissionRequest request, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.STUDENT) {
            throw new RuntimeException("Forbidden");
        }
        responseService.submit(examId, auth.getName(), request.sessionId(), request.autoSubmitted());
        ExamResult result = resultService.scoreAndSave(examId, auth.getName());
        return resultService.resultByExamAndStudent(result.getExamId(), result.getStudentId());
    }

    @GetMapping("/exams/{examId}/my-status")
    public MyExamStatusDto myStatus(@PathVariable String examId, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.STUDENT) {
            throw new RuntimeException("Forbidden");
        }
        return responseService.myStatus(examId, auth.getName());
    }

    @GetMapping("/exams/{examId}/attendance/summary")
    public AttendanceSummaryDto attendanceSummary(@PathVariable String examId, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.ADMIN && role != ExamRole.PROCTOR) {
            throw new RuntimeException("Forbidden");
        }
        return monitoringService.attendanceSummary(examId);
    }

    @GetMapping("/exams/{examId}/progress")
    public List<StudentProgressDto> progress(@PathVariable String examId, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.ADMIN && role != ExamRole.PROCTOR) {
            throw new RuntimeException("Forbidden");
        }
        return monitoringService.progress(examId);
    }

    @GetMapping("/analytics/exam/{examId}/live")
    public LiveAnalyticsDto liveAnalytics(@PathVariable String examId, Authentication auth) {
        ExamRole role = authService.getRole(examId, auth.getName());
        if (role != ExamRole.ADMIN && role != ExamRole.PROCTOR) {
            throw new RuntimeException("Forbidden");
        }
        return monitoringService.liveAnalytics(examId);
    }

    @GetMapping("/exams/{examId}/results")
    public List<ExamResultDto> results(@PathVariable String examId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        return resultService.resultsByExam(examId);
    }

    @GetMapping("/exams/{examId}/results/{studentId}")
    public ExamResultDto resultByStudent(@PathVariable String examId, @PathVariable String studentId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        return resultService.resultByExamAndStudent(examId, studentId);
    }

    @GetMapping("/exams/{examId}/results/export")
    public ResponseEntity<byte[]> export(@PathVariable String examId, Authentication auth) {
        authService.requireAdmin(examId, auth.getName());
        byte[] payload = resultExportService.exportResults(resultService.resultsForExport(examId));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=exam-" + examId + "-results.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(payload);
    }
}
