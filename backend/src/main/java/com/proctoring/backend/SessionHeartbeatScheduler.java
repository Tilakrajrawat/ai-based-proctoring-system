package com.proctoring.backend.scheduler;

import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.model.session.SessionStatus;
import com.proctoring.backend.repository.ExamSessionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class SessionHeartbeatScheduler {

    private final ExamSessionRepository repository;

    public SessionHeartbeatScheduler(ExamSessionRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedRate = 10000)
    public void checkHeartbeats() {
        Instant now = Instant.now();

        for (ExamSession session : repository.findAll()) {
            if (session.getStatus() == SessionStatus.ACTIVE &&
                session.getLastHeartbeatAt() != null &&
                now.minusSeconds(15).isAfter(session.getLastHeartbeatAt())) {

                session.setStatus(SessionStatus.SUSPENDED);
                session.setLastProctorActionAt(now);
                repository.save(session);
            }
        }
    }
}
