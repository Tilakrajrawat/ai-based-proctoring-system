package com.proctoring.backend.model.session;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "exam_sessions")
public class ExamSession {
  

    @Id
    private String id;

    private String studentId;   // reference User
    private String examId;

    private SessionStatus status;

    private Instant startedAt;
    private Instant endedAt;
    private Instant lastHeartbeatAt;

    private Instant createdAt;
    private Instant updatedAt;

    private double totalSeverity;
    private Instant lastProctorActionAt;

    public ExamSession() {}

    public ExamSession(String studentId, String examId) {
    this.studentId = studentId.trim();
    this.examId = examId.trim();
    this.status = SessionStatus.ACTIVE;
    this.startedAt = Instant.now();
    this.lastHeartbeatAt = Instant.now();
    this.createdAt = Instant.now();
    this.updatedAt = Instant.now();
    this.totalSeverity = 0.0;

}


    public String getId() {
    return id;
}

public String getStudentId() {
    return studentId;
}

public String getExamId() {
    return examId;
}

public SessionStatus getStatus() {
    return status;
}

public Instant getStartedAt() {
    return startedAt;
}

public Instant getLastHeartbeatAt() {
    return lastHeartbeatAt;
}

public Instant getCreatedAt() {
    return createdAt;
}

public Instant getUpdatedAt() {
    return updatedAt;
}
public void setLastHeartbeatAt(Instant lastHeartbeatAt) {
    this.lastHeartbeatAt = lastHeartbeatAt;
}

public void setUpdatedAt(Instant updatedAt) {
    this.updatedAt = updatedAt;
}

public void setStatus(SessionStatus status) {
    this.status = status;
}

public void setEndedAt(Instant endedAt) {
    this.endedAt = endedAt;
}
public double getTotalSeverity() {
    return totalSeverity;
}

public void addSeverity(double value) {
    this.totalSeverity += value;
}
public void setTotalSeverity(double totalSeverity) {
    this.totalSeverity = totalSeverity;
}
public Instant getLastProctorActionAt() {
    return lastProctorActionAt;
}

public void setLastProctorActionAt(Instant lastProctorActionAt) {
    this.lastProctorActionAt = lastProctorActionAt;
}





}
