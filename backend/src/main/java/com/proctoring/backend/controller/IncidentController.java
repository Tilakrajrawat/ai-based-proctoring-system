package com.proctoring.backend.controller;

import com.proctoring.backend.controller.dto.IncidentReportRequest;
import com.proctoring.backend.model.incident.Incident;
import com.proctoring.backend.service.IncidentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/incidents")
public class IncidentController {

    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    @PostMapping("/report")
    public Incident report(@RequestBody IncidentReportRequest request) {

        Incident incident = new Incident(
                request.getSessionId(),
                request.getType(),
                request.getConfidence()
        );

        return service.reportIncident(incident);
    }
}
