package com.proctoring.backend.controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/webrtc")
public class WebRTCController {

    private final Map<String, Object> signals = new ConcurrentHashMap<>();

    @PostMapping("/offer/{sessionId}")
    public void offer(
            @PathVariable String sessionId,
            @RequestBody Object offer
    ) {
        signals.put(sessionId + ":offer", offer);
    }

    @GetMapping("/offer/{sessionId}")
    public Object getOffer(@PathVariable String sessionId) {
        return signals.get(sessionId + ":offer");
    }

    @PostMapping("/answer/{sessionId}")
    public void answer(
            @PathVariable String sessionId,
            @RequestBody Object answer
    ) {
        signals.put(sessionId + ":answer", answer);
    }

    @GetMapping("/answer/{sessionId}")
    public Object getAnswer(@PathVariable String sessionId) {
        return signals.get(sessionId + ":answer");
    }

    @PostMapping("/candidate/{sessionId}")
    public void candidate(
            @PathVariable String sessionId,
            @RequestBody Object candidate
    ) {
        signals.put(sessionId + ":candidate", candidate);
    }

    @GetMapping("/candidate/{sessionId}")
    public Object getCandidate(@PathVariable String sessionId) {
        return signals.get(sessionId + ":candidate");
    }
}