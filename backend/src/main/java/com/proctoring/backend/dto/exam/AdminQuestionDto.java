package com.proctoring.backend.dto.exam;

import java.util.List;

public record AdminQuestionDto(
        String id,
        String examId,
        String questionText,
        List<String> options,
        int correctOptionIndex,
        int marks,
        int displayOrder
) {
}
