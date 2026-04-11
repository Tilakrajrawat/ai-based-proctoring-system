package com.proctoring.backend.model.result;

import com.proctoring.backend.model.exam.StudentAnswer;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class StudentResponse {
    private String id;
    private String examId;
    private String studentId;
    private String sessionId;
    private List<StudentAnswer> answers;
    private ResponseStatus status;
    private Instant submittedAt;
    private Instant createdAt;
    private Instant updatedAt;

    public StudentResponse() {
        this.id = UUID.randomUUID().toString();
        this.answers = new ArrayList<>();
        this.status = ResponseStatus.IN_PROGRESS;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public String getId() { return id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }
    public List<StudentAnswer> getAnswers() { return answers; }
    public void setAnswers(List<StudentAnswer> answers) { this.answers = answers; }
    public ResponseStatus getStatus() { return status; }
    public void setStatus(ResponseStatus status) { this.status = status; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    public int getAttemptedCount() {
        return (int) answers.stream().filter(a -> a.getSelectedOptionIndex() != null).count();
    }
}
