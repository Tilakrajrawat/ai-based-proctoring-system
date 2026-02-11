package com.proctoring.backend.controller;

import com.proctoring.backend.dto.AssignUserRequest;
import com.proctoring.backend.dto.AttendanceResponse;
import com.proctoring.backend.dto.MyExamResponse;
import com.proctoring.backend.model.exam.Exam;
import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import com.proctoring.backend.repository.ExamRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class ExamSessionController {

private final ExamSessionRepository examSessionRepository;  
private final ExamAssignmentRepository assignmentRepository;  
private final ExamRepository examRepository;  

public ExamSessionController(  
        ExamSessionRepository examSessionRepository,  
        ExamAssignmentRepository assignmentRepository,  
        ExamRepository examRepository  
) {  
    this.examSessionRepository = examSessionRepository;  
    this.assignmentRepository = assignmentRepository;  
    this.examRepository = examRepository;  
}  

@PostMapping("/exams")  
public Exam createExam(Authentication authentication) {  
    String email = authentication.getName();  

    Exam exam = examRepository.save(new Exam(email));  

    ExamAssignment assignment = new ExamAssignment();  
    assignment.setExamId(exam.getId());  
    assignment.setEmail(email);  
    assignment.setRole(ExamRole.ADMIN);  
    assignmentRepository.save(assignment);  

    return exam;  
}  

@GetMapping("/my-exams")  
public List<MyExamResponse> getMyExams(Authentication authentication) {  
    return assignmentRepository.findByEmail(authentication.getName())  
            .stream()  
            .map(a -> new MyExamResponse(a.getExamId(), a.getRole()))  
            .collect(Collectors.toList());  
}  

@PostMapping("/exams/{examId}/assign")  
public String assignUser(  
        @PathVariable String examId,  
        @RequestBody AssignUserRequest request,  
        Authentication authentication  
) {  
    ensureAdmin(examId, authentication);  

    boolean exists = assignmentRepository  
            .existsByExamIdAndEmailAndRole(  
                    examId,  
                    request.getEmail(),  
                    request.getRole()  
            );  

    if (exists) return "User already assigned";  

    ExamAssignment assignment = new ExamAssignment();  
    assignment.setExamId(examId);  
    assignment.setEmail(request.getEmail());  
    assignment.setRole(request.getRole());  

    assignmentRepository.save(assignment);  
    return "ASSIGNED";  
}  

@GetMapping("/exams/{examId}/assignments")  
public List<ExamAssignment> getAssignments(  
        @PathVariable String examId,  
        Authentication authentication  
) {  
    ensureAdmin(examId, authentication);  
    return assignmentRepository.findByExamId(examId);  
}  

@PutMapping("/exams/{examId}/assignments/{email}/role")  
public String updateRole(  
        @PathVariable String examId,  
        @PathVariable String email,  
        @RequestParam ExamRole role,  
        Authentication authentication  
) {  
    ensureAdmin(examId, authentication);  

    ExamAssignment assignment = assignmentRepository  
            .findByExamIdAndEmail(examId, email)  
            .orElseThrow(() -> new RuntimeException("User not assigned"));  

    assignment.setRole(role);  
    assignmentRepository.save(assignment);  

    return "ROLE_UPDATED";  
}  

@DeleteMapping("/exams/{examId}/assignments/{email}")  
@Transactional  
public String removeAssignment(  
        @PathVariable String examId,  
        @PathVariable String email,  
        Authentication authentication  
) {  
    ensureAdmin(examId, authentication);  
    assignmentRepository.deleteByExamIdAndEmail(examId, email);  
    return "REMOVED";  
}  

@GetMapping("/exams/{examId}/access")  
public String accessExam(  
        @PathVariable String examId,  
        Authentication authentication  
) {  
    ExamAssignment assignment = assignmentRepository  
            .findByExamIdAndEmail(examId, authentication.getName())  
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

    boolean alreadyFinished = examSessionRepository.findAll().stream()  
            .anyMatch(s ->  
                    examId.equals(s.getExamId()) &&  
                    email.equals(s.getStudentId()) &&  
                    (s.getStatus() == SessionStatus.ENDED ||  
                     s.getStatus() == SessionStatus.SUBMITTED)  
            );  

    if (alreadyFinished) {  
        throw new RuntimeException("Exam already submitted");  
    }  

    ExamSession session = new ExamSession(email, examId);  
    return examSessionRepository.save(session);  
}  

@PostMapping("/sessions/{sessionId}/heartbeat")  
public String heartbeat(  
        @PathVariable String sessionId,  
        Authentication authentication  
) {  
    ExamSession session = examSessionRepository.findById(sessionId);  

    if (!session.getStudentId().equals(authentication.getName())) {  
        throw new RuntimeException("Forbidden");  
    }  

    if (session.getStatus() == SessionStatus.SUSPENDED) {  
        throw new RuntimeException("Session suspended");  
    }  

    session.setLastHeartbeatAt(Instant.now());  
    session.setUpdatedAt(Instant.now());  
    examSessionRepository.save(session);  

    return "OK";  
}  

@PostMapping("/sessions/{sessionId}/end")  
public String endSession(  
        @PathVariable String sessionId,  
        Authentication authentication  
) {  
    ExamSession session = examSessionRepository.findById(sessionId);  

    if (!session.getStudentId().equals(authentication.getName())) {  
        throw new RuntimeException("Forbidden");  
    }  

    session.setStatus(SessionStatus.ENDED);  
    session.setEndedAt(Instant.now());  
    session.setUpdatedAt(Instant.now());  
    examSessionRepository.save(session);  

    return "ENDED";  
}

@GetMapping("/exams/{examId}/attendance")
public List<AttendanceResponse> getAttendance(
@PathVariable String examId,
Authentication authentication
) {
String email = authentication.getName();

ExamAssignment assignment = assignmentRepository  
        .findByExamIdAndEmail(examId, email)  
        .orElseThrow(() -> new RuntimeException("Not assigned"));  

if (assignment.getRole() != ExamRole.ADMIN &&  
    assignment.getRole() != ExamRole.PROCTOR) {  
    throw new RuntimeException("Forbidden");  
}  

List<ExamAssignment> students = assignmentRepository  
        .findByExamId(examId)  
        .stream()  
        .filter(a -> a.getRole() == ExamRole.STUDENT)  
        .toList();  

List<ExamSession> sessions = examSessionRepository.findAll();  

return students.stream().map(student -> {  
    ExamSession session = sessions.stream()  
            .filter(s ->  
                    examId.equals(s.getExamId()) &&  
                    student.getEmail().equals(s.getStudentId())  
            )  
            .sorted((s1, s2) -> s2.getStartedAt().compareTo(s1.getStartedAt()))
            .findFirst()  
            .orElse(null);  

    if (session == null) {  
        return new AttendanceResponse(  
                null,  
                student.getEmail(),  
                false,  
                null,  
                null,  
                null  
        );  
    }  

    return new AttendanceResponse(  
            session.getId(),  
            student.getEmail(),  
            true,  
            session.getStatus(),  
            session.getStartedAt(),  
            session.getLastHeartbeatAt()  
    );  
}).toList();

}
private void ensureAdmin(String examId, Authentication authentication) {
ExamAssignment admin = assignmentRepository
.findByExamIdAndEmail(examId, authentication.getName())
.orElseThrow(() -> new RuntimeException("Not assigned"));

if (admin.getRole() != ExamRole.ADMIN) {  
        throw new RuntimeException("Forbidden");  
    }  
}

}