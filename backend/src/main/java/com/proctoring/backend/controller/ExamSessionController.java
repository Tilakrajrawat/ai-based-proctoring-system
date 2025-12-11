package com.proctoring.backend.controller;
import java.util.List;
import com.proctoring.backend.model.session.SessionStatus;

import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.service.ExamSessionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/sessions")
public class ExamSessionController {

    private final ExamSessionService service;

    public ExamSessionController(ExamSessionService service) {
        this.service = service;
    }

    @PostMapping("/start")
    public ExamSession startSession(
            @RequestParam String studentId,
            @RequestParam String examId
    ) {
        return service.startSession(studentId, examId);
    }
    @PostMapping("/heartbeat/{sessionId}")
public ExamSession heartbeat(@PathVariable String sessionId) {
    return service.heartbeat(sessionId);
}
@GetMapping("/{sessionId}")
public ExamSession getSession(@PathVariable String sessionId) {
    return service.getSession(sessionId);
}
@GetMapping("/all")
public List<ExamSession> getAllSessions() {
    return service.getAll();
}
@PostMapping("/suspend/{sessionId}")
public ExamSession suspendSession(@PathVariable String sessionId) {
    return service.suspendByProctor(sessionId);
}

@PostMapping("/resume/{sessionId}")
public ExamSession resumeSession(@PathVariable String sessionId) {
    return service.resumeSession(sessionId);
}

@PostMapping("/end/{sessionId}")
public ExamSession endSession(@PathVariable String sessionId) {
    return service.endSession(sessionId);
}


}
