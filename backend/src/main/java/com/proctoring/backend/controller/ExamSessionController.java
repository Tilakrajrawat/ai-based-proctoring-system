package com.proctoring.backend.controller;
import com.proctoring.backend.dto.AssignUserRequest;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import com.proctoring.backend.dto.MyExamResponse;
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
        assignment.setExamId(savedExam.getId()); // String ID ✔
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

    //  Check ADMIN role for this exam
    ExamAssignment adminAssignment = assignmentRepository
            .findByExamIdAndEmail(examId, adminEmail)
            .orElseThrow(() -> new RuntimeException("Not assigned to exam"));

    if (adminAssignment.getRole() != ExamRole.ADMIN) {
        throw new RuntimeException("Only ADMIN can assign users");
    }

    //  Prevent duplicate assignment
    boolean exists = assignmentRepository
            .existsByExamIdAndEmailAndRole(
                    examId,
                    request.getEmail(),
                    request.getRole()
            );

    if (exists) {
        return "User already assigned with this role";
    }

    // 3 Assign user
    ExamAssignment assignment = new ExamAssignment();
    assignment.setExamId(examId);
    assignment.setEmail(request.getEmail());
    assignment.setRole(request.getRole());

    assignmentRepository.save(assignment);

    return "User assigned successfully";
}
@GetMapping("/exams/{examId}/access")
public String accessExam(
        @PathVariable String examId,
        Authentication authentication
) {
    String email = authentication.getName();

    ExamAssignment assignment = assignmentRepository
            .findByExamIdAndEmail(examId, email)
            .orElseThrow(() -> new RuntimeException("Not assigned to this exam"));

    if (assignment.getRole() != ExamRole.STUDENT) {
        throw new RuntimeException("Only STUDENT can access exam");
    }

    return "Access granted";
}
@GetMapping("/exams/{examId}/proctor/access")
public String proctorAccess(
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
@GetMapping("/exams/{examId}/proctor/sessions")
public List<ExamSession> getExamSessionsForProctor(
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

    return examSessionRepository.findAll()
            .stream()
            .filter(s -> examId.equals(s.getExamId()))
            .toList();
}

@GetMapping("/exams/{examId}/proctor/students")
public List<ExamSession> getStudents(
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

    return examSessionRepository.findAll()
            .stream()
            .filter(s -> examId.equals(s.getExamId()))
            .toList();
}

}
