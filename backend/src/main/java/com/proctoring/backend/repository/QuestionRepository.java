package com.proctoring.backend.repository;

import com.proctoring.backend.model.exam.Question;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class QuestionRepository {
    private final Map<String, Question> questions = new ConcurrentHashMap<>();

    public Question save(Question question) {
        questions.put(question.getId(), question);
        return question;
    }

    public Question findById(String id) {
        return questions.get(id);
    }

    public List<Question> findByExamId(String examId) {
        return questions.values().stream()
                .filter(q -> examId.equals(q.getExamId()))
                .sorted(Comparator.comparingInt(Question::getDisplayOrder).thenComparing(Question::getCreatedAt))
                .toList();
    }

    public void deleteById(String id) {
        questions.remove(id);
    }

    public List<Question> findAll() {
        return new ArrayList<>(questions.values());
    }
}
