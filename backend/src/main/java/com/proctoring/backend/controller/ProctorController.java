package com.proctoring.backend.controller;

import com.proctoring.backend.model.session.ExamSession;
import com.proctoring.backend.service.ExamSessionService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/proctor/sessions")
public class ProctorController {

    private final ExamSessionService service;

    public ProctorController(ExamSessionService service) {
        this.service = service;
    }

    @PostMapping("/{sessionId}/resume")
    public ExamSession resume(@PathVariable String sessionId) {
        return service.resumeSession(sessionId);
    }

    @PostMapping("/{sessionId}/end")
    public ExamSession end(@PathVariable String sessionId) {
        return service.endSession(sessionId);
    }
}
