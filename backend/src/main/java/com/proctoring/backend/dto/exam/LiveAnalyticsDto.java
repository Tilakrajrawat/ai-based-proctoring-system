package com.proctoring.backend.dto.exam;

public record LiveAnalyticsDto(
        int totalStudents,
        int activeSessions,
        int suspendedSessions,
        int highRiskSessions,
        double averageRiskScore,
        int totalIncidents
) {
}
