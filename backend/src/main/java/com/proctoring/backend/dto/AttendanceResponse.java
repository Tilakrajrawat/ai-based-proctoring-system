package com.proctoring.backend.dto;

import com.proctoring.backend.model.session.SessionStatus;
import java.time.Instant;

public class AttendanceResponse {

    private String sessionId;
    private String email;
    private boolean attended;
    private SessionStatus status;
    private Instant startedAt;
    private Instant lastHeartbeatAt;

    public AttendanceResponse(
            String sessionId,
            String email,
            boolean attended,
            SessionStatus status,
            Instant startedAt,
            Instant lastHeartbeatAt
    ) {
        this.sessionId = sessionId;
        this.email = email;
        this.attended = attended;
        this.status = status;
        this.startedAt = startedAt;
        this.lastHeartbeatAt = lastHeartbeatAt;
    }

    public String getSessionId() { return sessionId; }
    public String getEmail() { return email; }
    public boolean isAttended() { return attended; }
    public SessionStatus getStatus() { return status; }
    public Instant getStartedAt() { return startedAt; }
    public Instant getLastHeartbeatAt() { return lastHeartbeatAt; }
}