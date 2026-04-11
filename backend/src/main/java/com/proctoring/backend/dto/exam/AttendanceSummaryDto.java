package com.proctoring.backend.dto.exam;

public record AttendanceSummaryDto(
        int totalRegisteredStudents,
        int present,
        int absent,
        int suspended,
        int ended,
        int inactive
) {
}
