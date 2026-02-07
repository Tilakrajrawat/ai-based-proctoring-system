package com.proctoring.backend.model.session;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.Instant;
import java.util.UUID;

@Document(collection = "exam_sessions")
public class ExamSession {

    @Id
    private String id;

    private String studentId;
    private String examId;
    private SessionStatus status;

    private Instant startedAt;
    private Instant endedAt;
    private Instant lastHeartbeatAt;

    private double totalSeverity;
    private Instant lastProctorActionAt;

    public ExamSession() {
        this.id = UUID.randomUUID().toString();
    }

    public ExamSession(String studentId, String examId) {
        this.id = UUID.randomUUID().toString();
        this.studentId = studentId;
        this.examId = examId;
        this.status = SessionStatus.ACTIVE;
        this.startedAt = Instant.now();
        this.lastHeartbeatAt = Instant.now();
        this.totalSeverity = 0.0;
    }

    public String getId() { return id; }
    public String getStudentId() { return studentId; }
    public String getExamId() { return examId; }
    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }
}
