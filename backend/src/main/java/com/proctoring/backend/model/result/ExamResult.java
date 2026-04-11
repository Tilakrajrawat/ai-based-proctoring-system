package com.proctoring.backend.model.result;

import java.time.Instant;
import java.util.UUID;

public class ExamResult {
    private String id;
    private String examId;
    private String studentId;
    private int score;
    private int totalMarks;
    private double percentage;
    private int correctCount;
    private int wrongCount;
    private int unansweredCount;
    private Instant submittedAt;
    private Instant generatedAt;

    public ExamResult() {
        this.id = UUID.randomUUID().toString();
    }

    public String getId() { return id; }
    public String getExamId() { return examId; }
    public void setExamId(String examId) { this.examId = examId; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public int getScore() { return score; }
    public void setScore(int score) { this.score = score; }
    public int getTotalMarks() { return totalMarks; }
    public void setTotalMarks(int totalMarks) { this.totalMarks = totalMarks; }
    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }
    public int getCorrectCount() { return correctCount; }
    public void setCorrectCount(int correctCount) { this.correctCount = correctCount; }
    public int getWrongCount() { return wrongCount; }
    public void setWrongCount(int wrongCount) { this.wrongCount = wrongCount; }
    public int getUnansweredCount() { return unansweredCount; }
    public void setUnansweredCount(int unansweredCount) { this.unansweredCount = unansweredCount; }
    public Instant getSubmittedAt() { return submittedAt; }
    public void setSubmittedAt(Instant submittedAt) { this.submittedAt = submittedAt; }
    public Instant getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(Instant generatedAt) { this.generatedAt = generatedAt; }
}
