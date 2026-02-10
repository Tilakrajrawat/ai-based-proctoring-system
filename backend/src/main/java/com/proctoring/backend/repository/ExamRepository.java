package com.proctoring.backend.repository;

import com.proctoring.backend.model.exam.Exam;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExamRepository extends JpaRepository<Exam, String> {
}