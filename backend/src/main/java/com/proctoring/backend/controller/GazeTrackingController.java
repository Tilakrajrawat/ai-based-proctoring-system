package com.proctoring.backend.controller;

import com.proctoring.backend.service.GazeTrackingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gaze")
public class GazeTrackingController {

    @Autowired
    private GazeTrackingService gazeTrackingService;

    @PostMapping("/analyze/{sessionId}")
    public ResponseEntity<String> analyzeFrame(@PathVariable String sessionId) {
        try {
            // Trigger gaze analysis
            gazeTrackingService.analyzeFrame(sessionId);
            
            return ResponseEntity.ok("Gaze analysis triggered for session: " + sessionId);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error during gaze analysis: " + e.getMessage());
        }
    }
    
    @PostMapping("/heartbeat/{sessionId}")
    public ResponseEntity<String> sendHeartbeat(@PathVariable String sessionId) {
        try {
            // Send heartbeat to gaze service
            gazeTrackingService.sendHeartbeat(sessionId);
            
            return ResponseEntity.ok("Heartbeat sent for session: " + sessionId);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error sending heartbeat: " + e.getMessage());
        }
    }
    
    @PostMapping("/end/{sessionId}")
    public ResponseEntity<String> endGazeSession(@PathVariable String sessionId) {
        try {
            // End gaze tracking session
            gazeTrackingService.endSession(sessionId);
            
            return ResponseEntity.ok("Gaze tracking session ended: " + sessionId);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error ending gaze session: " + e.getMessage());
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        boolean isHealthy = gazeTrackingService.isGazeServiceHealthy();
        
        if (isHealthy) {
            return ResponseEntity.ok("Gaze tracking service is healthy");
        } else {
            return ResponseEntity.status(503).body("Gaze tracking service is unavailable");
        }
    }
}
