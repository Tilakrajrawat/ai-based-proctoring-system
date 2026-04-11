package com.proctoring.backend.service;

import com.proctoring.backend.dto.exam.ExamResultDto;
import com.proctoring.backend.model.exam.Question;
import com.proctoring.backend.model.exam.StudentAnswer;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.result.ExamResult;
import com.proctoring.backend.model.result.StudentResponse;
import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.repository.ExamResultRepository;
import com.proctoring.backend.repository.ExamSessionRepository;
import com.proctoring.backend.repository.IncidentRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ResultService {

    private final McqService mcqService;
    private final StudentResponseService responseService;
    private final ExamResultRepository resultRepository;
    private final ExamSessionRepository examSessionRepository;
    private final IncidentRepository incidentRepository;

    public ResultService(
            McqService mcqService,
            StudentResponseService responseService,
            ExamResultRepository resultRepository,
            ExamSessionRepository examSessionRepository,
            IncidentRepository incidentRepository
    ) {
        this.mcqService = mcqService;
        this.responseService = responseService;
        this.resultRepository = resultRepository;
        this.examSessionRepository = examSessionRepository;
        this.incidentRepository = incidentRepository;
    }

    public ExamResult scoreAndSave(String examId, String studentId) {
        StudentResponse response = responseService.getByExamAndStudent(examId, studentId);
        if (response == null) {
            throw new IllegalArgumentException("No response found for student");
        }

        List<Question> questions = mcqService.rawQuestions(examId);
        Map<String, StudentAnswer> answerMap = new HashMap<>();
        for (StudentAnswer answer : response.getAnswers()) {
            answerMap.put(answer.getQuestionId(), answer);
        }

        int totalMarks = questions.stream().mapToInt(Question::getMarks).sum();
        int score = 0;
        int correct = 0;
        int wrong = 0;
        int unanswered = 0;

        for (Question question : questions) {
            StudentAnswer answer = answerMap.get(question.getId());
            if (answer == null || answer.getSelectedOptionIndex() == null) {
                unanswered++;
                continue;
            }
            if (Objects.equals(answer.getSelectedOptionIndex(), question.getCorrectOptionIndex())) {
                correct++;
                score += question.getMarks();
            } else {
                wrong++;
            }
        }

        double percentage = totalMarks == 0 ? 0 : ((double) score / totalMarks) * 100.0;

        ExamResult existing = resultRepository.findByExamIdAndStudentId(examId, studentId);
        ExamResult result = existing == null ? new ExamResult() : existing;
        result.setExamId(examId);
        result.setStudentId(studentId);
        result.setScore(score);
        result.setTotalMarks(totalMarks);
        result.setPercentage(percentage);
        result.setCorrectCount(correct);
        result.setWrongCount(wrong);
        result.setUnansweredCount(unanswered);
        result.setSubmittedAt(response.getSubmittedAt());
        result.setGeneratedAt(Instant.now());

        return resultRepository.save(result);
    }

    public List<ExamResultDto> resultsByExam(String examId) {
        return resultRepository.findByExamId(examId).stream().map(r -> mapToDto(examId, r)).toList();
    }

    public ExamResultDto resultByExamAndStudent(String examId, String studentId) {
        ExamResult result = resultRepository.findByExamIdAndStudentId(examId, studentId);
        if (result == null) {
            throw new IllegalArgumentException("Result not found");
        }
        return mapToDto(examId, result);
    }

    private ExamResultDto mapToDto(String examId, ExamResult result) {
        StudentResponse response = responseService.getByExamAndStudent(examId, result.getStudentId());
        ExamSession session = examSessionRepository.findAll().stream()
                .filter(s -> examId.equals(s.getExamId()) && result.getStudentId().equals(s.getStudentId()))
                .findFirst().orElse(null);

        int incidentCount = 0;
        if (session != null) {
            incidentCount = incidentRepository.findBySessionId(session.getId()).size();
        }

        return new ExamResultDto(
                result.getStudentId(),
                result.getScore(),
                result.getTotalMarks(),
                result.getPercentage(),
                result.getCorrectCount(),
                result.getWrongCount(),
                result.getUnansweredCount(),
                response == null ? 0 : response.getAttemptedCount(),
                session == null ? "ABSENT" : "PRESENT",
                session == null ? "NOT_STARTED" : session.getStatus().name(),
                session == null ? 0.0 : session.getTotalSeverity(),
                incidentCount,
                result.getSubmittedAt()
        );
    }

    public List<ExamResultDto> resultsForExport(String examId) {
        return resultsByExam(examId);
    }
}
