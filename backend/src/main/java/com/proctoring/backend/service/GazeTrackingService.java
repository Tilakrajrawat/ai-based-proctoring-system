package com.proctoring.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.model.incident.IncidentType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;

@Service
public class GazeTrackingService {

    private static final Logger logger = LoggerFactory.getLogger(GazeTrackingService.class);
    private static final String GAZE_SERVICE_URL = "http://localhost:5001";
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private IncidentService incidentService;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void analyzeFrame(String sessionId) {
        try {
            String url = GAZE_SERVICE_URL + "/analyze_frame";
            
            // Create request body
            String requestBody = String.format("{\"session_id\":\"%s\"}", sessionId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                processGazeAnalysisResponse(response.getBody());
            } else {
                logger.warn("Gaze tracking service returned status: {}", response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error calling gaze tracking service: {}", e.getMessage());
        }
    }
    
    private void processGazeAnalysisResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            
            String sessionId = root.get("session_id").asText();
            JsonNode incidents = root.get("incidents");
            
            if (incidents != null && incidents.isArray()) {
                for (JsonNode incidentNode : incidents) {
                    createIncidentFromGazeData(sessionId, incidentNode);
                }
            }
            
            // Update session with gaze tracking status
            updateSessionGazeStatus(sessionId, root);
            
        } catch (Exception e) {
            logger.error("Error processing gaze analysis response: {}", e.getMessage());
        }
    }
    
    private void createIncidentFromGazeData(String sessionId, JsonNode incidentNode) {
        try {
            String typeStr = incidentNode.get("type").asText();
            double confidence = incidentNode.get("confidence").asDouble();
            double severity = incidentNode.get("severity").asDouble();
            String message = incidentNode.get("message").asText();
            
            IncidentType incidentType = mapToIncidentType(typeStr);
            
            Incident incident = new Incident(sessionId, incidentType, confidence);
            incident.setSeverity(severity);
            incident.setDetectedAt(Instant.now());
            
            // Store additional metadata in a custom way (since we don't have a details field)
            // For now, we'll use the detectedAt field to store the message as a timestamp
            // In a real implementation, you'd add a details field to the Incident model
            
            incidentService.reportIncident(incident);
            
            logger.info("Created {} incident for session {}: {}", incidentType, sessionId, message);
            
        } catch (Exception e) {
            logger.error("Error creating incident from gaze data: {}", e.getMessage());
        }
    }
    
    private IncidentType mapToIncidentType(String gazeType) {
        switch (gazeType) {
            case "NO_FACE":
                return IncidentType.FACE_NOT_DETECTED;
            case "MULTIPLE_FACES":
                return IncidentType.MULTIPLE_FACES_DETECTED;
            case "LOOKING_AWAY":
                return IncidentType.LOOKING_AWAY;
            default:
                return IncidentType.LOOKING_AWAY; // Default fallback
        }
    }
    
    private void updateSessionGazeStatus(String sessionId, JsonNode response) {
        // For now, just log this information
        // In a full implementation, you'd add gaze tracking fields to ExamSession
        boolean lookingAtScreen = response.get("looking_at_screen").asBoolean();
        int faceCount = response.get("face_count").asInt();
        
        logger.info("Session {} gaze status - Looking at screen: {}, Face count: {}", 
                   sessionId, lookingAtScreen, faceCount);
    }
    
    public void sendHeartbeat(String sessionId) {
        try {
            String url = GAZE_SERVICE_URL + "/heartbeat";
            
            String requestBody = String.format("{\"session_id\":\"%s\"}", sessionId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (response.getStatusCode() != HttpStatus.OK) {
                logger.warn("Gaze tracking heartbeat returned status: {}", response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error sending heartbeat to gaze tracking service: {}", e.getMessage());
        }
    }
    
    public void endSession(String sessionId) {
        try {
            String url = GAZE_SERVICE_URL + "/end_session";
            
            String requestBody = String.format("{\"session_id\":\"%s\"}", sessionId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                logger.info("Successfully ended gaze tracking session: {}", sessionId);
            } else {
                logger.warn("Failed to end gaze tracking session: {}", response.getStatusCode());
            }
            
        } catch (Exception e) {
            logger.error("Error ending gaze tracking session: {}", e.getMessage());
        }
    }
    
    public boolean isGazeServiceHealthy() {
        try {
            String url = GAZE_SERVICE_URL + "/health";
            
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            
            return response.getStatusCode() == HttpStatus.OK;
            
        } catch (Exception e) {
            logger.error("Gaze tracking service health check failed: {}", e.getMessage());
            return false;
        }
    }
}
