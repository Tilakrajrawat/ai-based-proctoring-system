package com.proctoring.backend.repository;

import com.proctoring.backend.model.result.ExamResult;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class ExamResultRepository {
    private final Map<String, ExamResult> results = new ConcurrentHashMap<>();

    public ExamResult save(ExamResult result) {
        results.put(result.getId(), result);
        return result;
    }

    public ExamResult findByExamIdAndStudentId(String examId, String studentId) {
        return results.values().stream()
                .filter(r -> examId.equals(r.getExamId()) && studentId.equals(r.getStudentId()))
                .findFirst()
                .orElse(null);
    }

    public List<ExamResult> findByExamId(String examId) {
        return results.values().stream().filter(r -> examId.equals(r.getExamId())).toList();
    }

    public List<ExamResult> findAll() {
        return new ArrayList<>(results.values());
    }
}
