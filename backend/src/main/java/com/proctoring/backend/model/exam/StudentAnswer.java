package com.proctoring.backend.model.exam;

import java.time.Instant;

public class StudentAnswer {
    private String questionId;
    private Integer selectedOptionIndex;
    private Instant answeredAt;

    public StudentAnswer() {
    }

    public StudentAnswer(String questionId, Integer selectedOptionIndex, Instant answeredAt) {
        this.questionId = questionId;
        this.selectedOptionIndex = selectedOptionIndex;
        this.answeredAt = answeredAt;
    }

    public String getQuestionId() {
        return questionId;
    }

    public void setQuestionId(String questionId) {
        this.questionId = questionId;
    }

    public Integer getSelectedOptionIndex() {
        return selectedOptionIndex;
    }

    public void setSelectedOptionIndex(Integer selectedOptionIndex) {
        this.selectedOptionIndex = selectedOptionIndex;
    }

    public Instant getAnsweredAt() {
        return answeredAt;
    }

    public void setAnsweredAt(Instant answeredAt) {
        this.answeredAt = answeredAt;
    }
}
