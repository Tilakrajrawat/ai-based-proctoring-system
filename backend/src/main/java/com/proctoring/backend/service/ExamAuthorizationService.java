package com.proctoring.backend.service;

import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import com.proctoring.backend.repository.ExamAssignmentRepository;
import org.springframework.stereotype.Service;

@Service
public class ExamAuthorizationService {

    private final ExamAssignmentRepository repository;

    public ExamAuthorizationService(ExamAssignmentRepository repository) {
        this.repository = repository;
    }

    public ExamRole getRole(String examId, String email) {
        return repository
            .findByExamIdAndEmail(examId, email)
            .orElseThrow(() ->
                new RuntimeException("User not assigned to this exam")
            )
            .getRole();
    }

    public void requireAdmin(String examId, String email) {
        ExamRole role = getRole(examId, email);
        if (role != ExamRole.ADMIN) {
            throw new RuntimeException("Admin access required");
        }
    }
}
