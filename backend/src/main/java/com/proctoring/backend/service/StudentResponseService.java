package com.proctoring.backend.service;

import com.proctoring.backend.dto.exam.AnswerSaveRequest;
import com.proctoring.backend.dto.exam.MyExamStatusDto;
import com.proctoring.backend.model.exam.Question;
import com.proctoring.backend.model.exam.StudentAnswer;
import com.proctoring.backend.model.result.ResponseStatus;
import com.proctoring.backend.model.result.StudentResponse;
import com.proctoring.backend.repository.StudentAnswerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Service
public class StudentResponseService {

    private final StudentAnswerRepository repository;
    private final McqService mcqService;

    public StudentResponseService(StudentAnswerRepository repository, McqService mcqService) {
        this.repository = repository;
        this.mcqService = mcqService;
    }

    public StudentResponse saveAnswer(String examId, String studentId, AnswerSaveRequest request) {
        ensureQuestionBelongsToExam(examId, request.questionId());

        StudentResponse response = findOrCreate(examId, studentId, request.sessionId());
        if (response.getStatus() != ResponseStatus.IN_PROGRESS) {
            throw new IllegalStateException("Exam already submitted");
        }

        List<StudentAnswer> answers = new ArrayList<>(response.getAnswers());
        answers.removeIf(a -> a.getQuestionId().equals(request.questionId()));
        answers.add(new StudentAnswer(request.questionId(), request.selectedOptionIndex(), Instant.now()));

        response.setAnswers(answers);
        response.setUpdatedAt(Instant.now());

        return repository.save(response);
    }

    public StudentResponse submit(String examId, String studentId, String sessionId, boolean autoSubmitted) {
        StudentResponse response = findOrCreate(examId, studentId, sessionId);
        if (response.getStatus() == ResponseStatus.SUBMITTED || response.getStatus() == ResponseStatus.AUTO_SUBMITTED) {
            return response;
        }
        response.setStatus(autoSubmitted ? ResponseStatus.AUTO_SUBMITTED : ResponseStatus.SUBMITTED);
        response.setSubmittedAt(Instant.now());
        response.setUpdatedAt(Instant.now());
        return repository.save(response);
    }

    public StudentResponse findOrCreate(String examId, String studentId, String sessionId) {
        StudentResponse existing = repository.findByExamIdAndStudentId(examId, studentId);
        if (existing != null) {
            if (existing.getSessionId() == null && sessionId != null) {
                existing.setSessionId(sessionId);
                existing.setUpdatedAt(Instant.now());
                repository.save(existing);
            }
            return existing;
        }

        StudentResponse created = new StudentResponse();
        created.setExamId(examId);
        created.setStudentId(studentId);
        created.setSessionId(sessionId);
        return repository.save(created);
    }

    public StudentResponse getByExamAndStudent(String examId, String studentId) {
        return repository.findByExamIdAndStudentId(examId, studentId);
    }

    public List<StudentResponse> getByExam(String examId) {
        return repository.findByExamId(examId);
    }

    public MyExamStatusDto myStatus(String examId, String studentId) {
        StudentResponse response = repository.findByExamIdAndStudentId(examId, studentId);
        int totalQuestions = mcqService.rawQuestions(examId).size();
        if (response == null) {
            return new MyExamStatusDto(ResponseStatus.IN_PROGRESS, 0, totalQuestions, false, null);
        }
        boolean submitted = response.getStatus() == ResponseStatus.SUBMITTED || response.getStatus() == ResponseStatus.AUTO_SUBMITTED;
        return new MyExamStatusDto(response.getStatus(), response.getAttemptedCount(), totalQuestions, submitted, response.getSubmittedAt());
    }

    private void ensureQuestionBelongsToExam(String examId, String questionId) {
        Question question = mcqService.rawQuestions(examId).stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Question does not belong to exam"));
        if (!examId.equals(question.getExamId())) {
            throw new IllegalArgumentException("Invalid question for this exam");
        }
    }
}
