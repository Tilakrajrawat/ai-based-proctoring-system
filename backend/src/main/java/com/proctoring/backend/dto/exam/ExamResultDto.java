package com.proctoring.backend.dto.exam;

import java.time.Instant;

public record ExamResultDto(
        String studentId,
        int score,
        int totalMarks,
        double percentage,
        int correctCount,
        int wrongCount,
        int unansweredCount,
        int attemptedCount,
        String attendanceStatus,
        String sessionStatus,
        double riskScore,
        int incidentCount,
        Instant submittedAt
) {
}
