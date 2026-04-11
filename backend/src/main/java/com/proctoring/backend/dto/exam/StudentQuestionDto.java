package com.proctoring.backend.dto.exam;

import java.util.List;

public record StudentQuestionDto(
        String id,
        String questionText,
        List<String> options,
        int marks,
        int displayOrder
) {
}
