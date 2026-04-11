package com.proctoring.backend.dto.exam;

import com.proctoring.backend.model.result.ResponseStatus;

import java.time.Instant;

public record MyExamStatusDto(
        ResponseStatus responseStatus,
        int attemptedCount,
        int totalQuestions,
        boolean submitted,
        Instant submittedAt
) {
}
