package com.proctoring.backend.controller;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.proctoring.backend.controller.dto.FrameAnalyzeRequest;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.service.DetectionService;

@RestController
@RequestMapping("/api/frames")
public class FrameController {

    private final DetectionService detectionService;

    public FrameController(DetectionService detectionService) {
        this.detectionService = detectionService;
    }

    @PostMapping
    public List<Incident> analyzeFrame(
            @Validated @RequestBody FrameAnalyzeRequest request,
            Authentication authentication
    ) {
        return detectionService.analyzeFrame(
                request.getSessionId(),
                request.getFrame(),
                authentication
        );
    }
}
