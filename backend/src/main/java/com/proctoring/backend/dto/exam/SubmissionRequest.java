package com.proctoring.backend.dto.exam;

public record SubmissionRequest(
        String sessionId,
        boolean autoSubmitted
) {
}
