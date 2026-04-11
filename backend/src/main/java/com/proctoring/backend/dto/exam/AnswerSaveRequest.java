package com.proctoring.backend.dto.exam;

public record AnswerSaveRequest(
        String sessionId,
        String questionId,
        Integer selectedOptionIndex
) {
}
