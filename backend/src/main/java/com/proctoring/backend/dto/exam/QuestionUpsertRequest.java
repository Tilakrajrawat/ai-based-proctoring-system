package com.proctoring.backend.dto.exam;

import java.util.List;

public record QuestionUpsertRequest(
        String questionText,
        List<String> options,
        int correctOptionIndex,
        Integer marks,
        Integer displayOrder
) {
}
