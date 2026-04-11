export type StudentQuestion = {
  id: string;
  questionText: string;
  options: string[];
  marks: number;
  displayOrder: number;
};

export type AdminQuestion = StudentQuestion & {
  examId: string;
  correctOptionIndex: number;
};

export type MyExamStatus = {
  responseStatus: "IN_PROGRESS" | "SUBMITTED" | "AUTO_SUBMITTED";
  attemptedCount: number;
  totalQuestions: number;
  submitted: boolean;
  submittedAt: string | null;
};

export type ExamResult = {
  studentId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  attemptedCount: number;
  attendanceStatus: string;
  sessionStatus: string;
  riskScore: number;
  incidentCount: number;
  submittedAt: string | null;
};

export type AttendanceSummary = {
  totalRegisteredStudents: number;
  present: number;
  absent: number;
  suspended: number;
  ended: number;
  inactive: number;
};

export type LiveAnalytics = {
  totalStudents: number;
  activeSessions: number;
  suspendedSessions: number;
  highRiskSessions: number;
  averageRiskScore: number;
  totalIncidents: number;
};

export type StudentProgress = {
  studentId: string;
  sessionId: string | null;
  sessionStatus: string;
  attemptedCount: number;
  totalQuestions: number;
  submitted: boolean;
  riskScore: number;
  incidentCount: number;
};
