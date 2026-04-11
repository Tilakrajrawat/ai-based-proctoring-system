package com.proctoring.backend.service;

import com.proctoring.backend.dto.exam.AdminQuestionDto;
import com.proctoring.backend.dto.exam.QuestionUpsertRequest;
import com.proctoring.backend.dto.exam.StudentQuestionDto;
import com.proctoring.backend.model.exam.Question;
import com.proctoring.backend.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class McqService {

    private final QuestionRepository questionRepository;

    public McqService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public AdminQuestionDto createQuestion(String examId, QuestionUpsertRequest request) {
        validate(request);

        Question question = new Question();
        question.setExamId(examId);
        question.setQuestionText(request.questionText().trim());
        question.setOptions(request.options());
        question.setCorrectOptionIndex(request.correctOptionIndex());
        question.setMarks(request.marks() == null ? 1 : request.marks());
        question.setDisplayOrder(request.displayOrder() == null ? 0 : request.displayOrder());

        return mapAdmin(questionRepository.save(question));
    }

    public List<AdminQuestionDto> adminView(String examId) {
        return questionRepository.findByExamId(examId).stream().map(this::mapAdmin).toList();
    }

    public List<StudentQuestionDto> studentView(String examId) {
        return questionRepository.findByExamId(examId).stream().map(this::mapStudent).toList();
    }

    public AdminQuestionDto updateQuestion(String questionId, QuestionUpsertRequest request) {
        validate(request);
        Question existing = questionRepository.findById(questionId);
        if (existing == null) {
            throw new IllegalArgumentException("Question not found");
        }
        existing.setQuestionText(request.questionText().trim());
        existing.setOptions(request.options());
        existing.setCorrectOptionIndex(request.correctOptionIndex());
        existing.setMarks(request.marks() == null ? 1 : request.marks());
        existing.setDisplayOrder(request.displayOrder() == null ? existing.getDisplayOrder() : request.displayOrder());
        existing.setUpdatedAt(Instant.now());
        return mapAdmin(questionRepository.save(existing));
    }

    public void deleteQuestion(String questionId) {
        questionRepository.deleteById(questionId);
    }

    public List<Question> rawQuestions(String examId) {
        return questionRepository.findByExamId(examId);
    }

    private void validate(QuestionUpsertRequest request) {
        if (request.questionText() == null || request.questionText().isBlank()) {
            throw new IllegalArgumentException("questionText is required");
        }
        if (request.options() == null || request.options().size() < 2) {
            throw new IllegalArgumentException("Minimum 2 options are required");
        }
        if (request.correctOptionIndex() < 0 || request.correctOptionIndex() >= request.options().size()) {
            throw new IllegalArgumentException("correctOptionIndex is out of range");
        }
        if (request.marks() != null && request.marks() <= 0) {
            throw new IllegalArgumentException("marks must be positive");
        }
    }

    private AdminQuestionDto mapAdmin(Question q) {
        return new AdminQuestionDto(
                q.getId(),
                q.getExamId(),
                q.getQuestionText(),
                q.getOptions(),
                q.getCorrectOptionIndex(),
                q.getMarks(),
                q.getDisplayOrder()
        );
    }

    private StudentQuestionDto mapStudent(Question q) {
        return new StudentQuestionDto(
                q.getId(),
                q.getQuestionText(),
                q.getOptions(),
                q.getMarks(),
                q.getDisplayOrder()
        );
    }
}
