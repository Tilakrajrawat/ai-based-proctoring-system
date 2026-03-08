package com.proctoring.backend.dto;

import com.proctoring.backend.model.session.ExamRole;

public class AssignUserRequest {

    private String email;
    private ExamRole role;

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public ExamRole getRole() {
        return role;
    }

    public void setRole(ExamRole role) {
        this.role = role;
    }
}
