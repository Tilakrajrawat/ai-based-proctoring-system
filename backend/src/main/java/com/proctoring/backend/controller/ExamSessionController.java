package com.proctoring.backend.controller;

import com.proctoring.backend.dto.AssignUserRequest;
import com.proctoring.backend.dto.MyExamResponse;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExamSessionController {

    private final ExamSessionRepository examSessionRepository;
    private final ExamAssignmentRepository assignmentRepository;

    public ExamSessionController(
            ExamSessionRepository examSessionRepository,
            ExamAssignmentRepository assignmentRepository
    ) {
        this.examSessionRepository = examSessionRepository;
        this.assignmentRepository = assignmentRepository;
    }

    @PostMapping("/exams")
    public ExamSession createExam(
            @RequestBody ExamSession exam,
            Authentication authentication
    ) {
        String email = authentication.getName();

        ExamSession savedExam = examSessionRepository.save(exam);

        ExamAssignment assignment = new ExamAssignment();
        assignment.setExamId(savedExam.getId());
        assignment.setEmail(email);
        assignment.setRole(ExamRole.ADMIN);

        assignmentRepository.save(assignment);

        return savedExam;
    }

    @GetMapping("/my-exams")
    public List<MyExamResponse> getMyExams(Authentication authentication) {
        String email = authentication.getName();

        return assignmentRepository
                .findByEmail(email)
                .stream()
                .map(a -> new MyExamResponse(
                        a.getExamId(),
                        a.getRole()
                ))
                .collect(Collectors.toList());
    }

    @PostMapping("/exams/{examId}/assign")
    public String assignUserToExam(
            @PathVariable String examId,
            @RequestBody AssignUserRequest request,
            Authentication authentication
    ) {
        String adminEmail = authentication.getName();

        ExamAssignment adminAssignment = assignmentRepository
                .findByExamIdAndEmail(examId, adminEmail)
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (adminAssignment.getRole() != ExamRole.ADMIN) {
            throw new RuntimeException("Only ADMIN can assign");
        }

        boolean exists = assignmentRepository
                .existsByExamIdAndEmailAndRole(
                        examId,
                        request.getEmail(),
                        request.getRole()
                );

        if (exists) {
            return "User already assigned";
        }

        ExamAssignment assignment = new ExamAssignment();
        assignment.setExamId(examId);
        assignment.setEmail(request.getEmail());
        assignment.setRole(request.getRole());

        assignmentRepository.save(assignment);

        return "Assigned";
    }

    @GetMapping("/exams/{examId}/access")
    public String accessExam(
            @PathVariable String examId,
            Authentication authentication
    ) {
        String email = authentication.getName();

        ExamAssignment assignment = assignmentRepository
                .findByExamIdAndEmail(examId, email)
                .orElseThrow(() -> new RuntimeException("Not assigned"));

        if (assignment.getRole() != ExamRole.STUDENT) {
            throw new RuntimeException("Forbidden");
        }

        return "ACCESS_GRANTED";
    }
    @PostMapping("/exams/{examId}/start")
public ExamSession startExam(
        @PathVariable String examId,
        Authentication authentication
) {
    String email = authentication.getName();

    ExamAssignment assignment = assignmentRepository
            .findByExamIdAndEmail(examId, email)
            .orElseThrow(() -> new RuntimeException("Not assigned"));

    if (assignment.getRole() != ExamRole.STUDENT) {
        throw new RuntimeException("Only STUDENT can start exam");
    }

    ExamSession session = new ExamSession(email, examId);
    return examSessionRepository.save(session);
}

}
