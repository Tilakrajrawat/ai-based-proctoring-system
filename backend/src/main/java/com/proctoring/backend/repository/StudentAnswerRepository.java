package com.proctoring.backend.repository;

import com.proctoring.backend.model.result.StudentResponse;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class StudentAnswerRepository {
    private final Map<String, StudentResponse> responsesById = new ConcurrentHashMap<>();

    public StudentResponse save(StudentResponse response) {
        responsesById.put(response.getId(), response);
        return response;
    }

    public StudentResponse findByExamIdAndStudentId(String examId, String studentId) {
        return responsesById.values().stream()
                .filter(r -> examId.equals(r.getExamId()) && studentId.equals(r.getStudentId()))
                .findFirst()
                .orElse(null);
    }

    public List<StudentResponse> findByExamId(String examId) {
        return responsesById.values().stream().filter(r -> examId.equals(r.getExamId())).toList();
    }

    public List<StudentResponse> findAll() {
        return new ArrayList<>(responsesById.values());
    }
}
