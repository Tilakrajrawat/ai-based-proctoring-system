package com.proctoring.backend.repository;

import com.proctoring.backend.model.session.ExamAssignment;
import com.proctoring.backend.model.session.ExamRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ExamAssignmentRepository
        extends JpaRepository<ExamAssignment, Long> {

    Optional<ExamAssignment> findByExamIdAndEmail(
            String examId,
            String email
    );

    List<ExamAssignment> findByEmail(String email);

    List<ExamAssignment> findByExamId(String examId);

    boolean existsByExamIdAndEmail(
            String examId,
            String email
    );

    boolean existsByExamIdAndEmailAndRole(
            String examId,
            String email,
            ExamRole role
    );

    void deleteByExamIdAndEmail(String examId, String email);
}