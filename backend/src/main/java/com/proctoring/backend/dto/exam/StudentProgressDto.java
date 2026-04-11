package com.proctoring.backend.dto.exam;

public record StudentProgressDto(
        String studentId,
        String sessionId,
        String sessionStatus,
        int attemptedCount,
        int totalQuestions,
        boolean submitted,
        double riskScore,
        int incidentCount
) {
}
