package com.proctoring.backend.repository;

import com.proctoring.backend.model.session.ExamSession;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ExamSessionRepository extends MongoRepository<ExamSession, String> {
    List<ExamSession> findByExamId(String examId);
}
