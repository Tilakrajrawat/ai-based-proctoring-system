package com.proctoring.backend.model.session;

import jakarta.persistence.*;

@Entity
@Table(
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"examId", "email"}
    )
)
public class ExamAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String examId;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamRole role;

    public Long getId() {
        return id;
    }

    public String getExamId() {
    return examId;
}

public void setExamId(String examId) {
    this.examId = examId;
}


    public String getEmail() {
        return email;
    }

    public ExamRole getRole() {
        return role;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setRole(ExamRole role) {
        this.role = role;
    }
}
