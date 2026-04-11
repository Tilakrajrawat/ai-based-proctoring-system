package com.proctoring.backend.service;

import com.proctoring.backend.dto.exam.ExamResultDto;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ResultExportService {

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_OFFSET_DATE_TIME;

    public byte[] exportResults(List<ExamResultDto> rows) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Exam Results");
            Row header = sheet.createRow(0);

            String[] columns = {
                    "Student Name", "Student ID", "Attendance Status", "Session Status", "Attempted",
                    "Correct", "Wrong", "Unanswered", "Score", "Total Marks", "Percentage", "Risk Score",
                    "Incident Count", "Submission Time"
            };
            for (int i = 0; i < columns.length; i++) {
                header.createCell(i).setCellValue(columns[i]);
            }

            for (int i = 0; i < rows.size(); i++) {
                ExamResultDto row = rows.get(i);
                Row excelRow = sheet.createRow(i + 1);
                // User profile names are not available in current schema, so studentId is used as display name.
                excelRow.createCell(0).setCellValue(row.studentId());
                excelRow.createCell(1).setCellValue(row.studentId());
                excelRow.createCell(2).setCellValue(row.attendanceStatus());
                excelRow.createCell(3).setCellValue(row.sessionStatus());
                excelRow.createCell(4).setCellValue(row.attemptedCount());
                excelRow.createCell(5).setCellValue(row.correctCount());
                excelRow.createCell(6).setCellValue(row.wrongCount());
                excelRow.createCell(7).setCellValue(row.unansweredCount());
                excelRow.createCell(8).setCellValue(row.score());
                excelRow.createCell(9).setCellValue(row.totalMarks());
                excelRow.createCell(10).setCellValue(row.percentage());
                excelRow.createCell(11).setCellValue(row.riskScore());
                excelRow.createCell(12).setCellValue(row.incidentCount());
                excelRow.createCell(13).setCellValue(row.submittedAt() == null ? "-" : FORMATTER.format(row.submittedAt().atOffset(ZoneOffset.UTC)));
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new RuntimeException("Failed to export results", e);
        }
    }
}
