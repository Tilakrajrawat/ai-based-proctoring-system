package com.proctoring.backend.dto;

import com.proctoring.backend.model.session.ExamRole;

public class MyExamResponse {

    private String examId;
    private ExamRole role;

    public MyExamResponse(String examId, ExamRole role) {
        this.examId = examId;
        this.role = role;
    }

    public String getExamId() {
        return examId;
    }

    public ExamRole getRole() {
        return role;
    }
}
