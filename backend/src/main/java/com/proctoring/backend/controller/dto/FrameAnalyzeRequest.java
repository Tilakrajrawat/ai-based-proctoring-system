package com.proctoring.backend.controller.dto;

import jakarta.validation.constraints.NotBlank;

public class FrameAnalyzeRequest {

    @NotBlank
    private String sessionId;

    @NotBlank
    private String frame;

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getFrame() {
        return frame;
    }

    public void setFrame(String frame) {
        this.frame = frame;
    }
}
