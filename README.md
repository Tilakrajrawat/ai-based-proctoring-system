# 🧠 AI-Based Proctoring and Online Examination Platform

This repository extends the original **AI-Based Proctoring System** into an integrated **online examination + proctoring platform**.

It now includes:
- AI proctoring (camera/WebRTC + incident pipeline + auto-suspend)
- Exam-scoped RBAC (Admin / Proctor / Student)
- MCQ question authoring
- Student exam response workflow
- Server-side scoring and result reporting
- Admin-only Excel export

---

## Implemented Features

### 1) Integrated MCQ Examination Module ✅
- Admin can create, edit, list, and delete MCQ questions per exam.
- Question fields: `questionText`, `options[]`, `correctOptionIndex`, `marks`, `displayOrder`.
- Student payload is sanitized and does **not** include answer keys.

### 2) Student Exam Interface ✅
- Student exam page now includes:
  - question panel with options
  - auto-save on option selection
  - next/previous navigation
  - question palette / progress indicator
  - timer with auto-submit trigger
  - final submit flow
- Existing proctoring hooks (camera, heartbeat, frame upload, browser event incidents) are preserved.

### 3) Proctor Attendance & Live Analytics ✅
- Proctor dashboard now includes:
  - attendance summary cards (registered/present/absent/inactive)
  - live analytics cards (active/suspended/high-risk/avg risk/incident count)
  - student progress table (attempted/total, submission state, session/risk/incident state)
- Proctor does **not** receive correct answers or selected options.

### 4) Server-Side Response Storage & Scoring ✅
- Backend stores per-student responses by exam.
- Submission status supported: `IN_PROGRESS`, `SUBMITTED`, `AUTO_SUBMITTED`.
- On submit, score is computed server-side from stored responses and question key.
- Result computation is idempotent (resubmits update existing result record).

### 5) Admin Result Dashboard ✅
- Admin can fetch exam result list and per-student result.
- Results include score, totals, counts, percentage, submission time, and monitoring metadata.

### 6) Admin Excel Export ✅
- Admin-only `.xlsx` export powered by Apache POI.
- Includes: student ID/name (best-effort from existing schema), attendance/session state, attempted/correct/wrong/unanswered, score, percentage, risk score, incident count, submission time.

---

## Partially Implemented / Notes

- The current backend has mixed persistence patterns (JPA + in-memory repositories). New exam-question/response/result flows follow existing in-memory repository style for consistency with active session/incident logic in this repo snapshot.
- Student timer currently uses frontend countdown with backend submit endpoint integration; exam-duration source is not yet centrally configured per exam entity.

---

## Security Model (Critical)

- **Admin only**:
  - create/edit/delete questions
  - admin question view (includes correct option)
  - result APIs
  - Excel export
- **Student only**:
  - fetch sanitized questions
  - save answers
  - submit exam
  - view own submission status
- **Proctor/Admin only**:
  - attendance summary
  - progress monitoring
  - live analytics
- **Never exposed to Student/Proctor payloads**:
  - `correctOptionIndex`
  - answer key
  - student selected options

---

## Architecture Update

```
Student UI (Next.js)
  ├─ Proctoring hooks (WebRTC / browser events)
  └─ MCQ exam workflow (student-safe questions, save, submit)
        │
        ▼
Spring Boot Backend
  ├─ Exam + assignment + session lifecycle
  ├─ Question management (admin)
  ├─ Response storage
  ├─ Server-side scoring + results
  ├─ Attendance/progress/live analytics
  └─ Excel export (Apache POI)
        │
        ├─ Data stores (repo layer used in this snapshot)
        └─ AI services integration (incidents / severity)
```

---

## API Reference (New/Extended)

### Admin Question Management
- `POST /api/exams/{examId}/questions`
- `GET /api/exams/{examId}/questions/admin-view`
- `PUT /api/questions/{questionId}?examId={examId}`
- `DELETE /api/questions/{questionId}?examId={examId}`

### Student Exam Flow
- `GET /api/exams/{examId}/questions/student-view`
- `POST /api/exams/{examId}/responses/save`
- `POST /api/exams/{examId}/submit`
- `GET /api/exams/{examId}/my-status`

### Monitoring (Proctor/Admin)
- `GET /api/exams/{examId}/attendance`
- `GET /api/exams/{examId}/attendance/summary`
- `GET /api/exams/{examId}/progress`
- `GET /api/analytics/exam/{examId}/live`

### Admin Results
- `GET /api/exams/{examId}/results`
- `GET /api/exams/{examId}/results/{studentId}`
- `GET /api/exams/{examId}/results/export`

---

## Monorepo Structure

- `frontend/` – Next.js App Router + TypeScript + Tailwind
- `backend/` – Spring Boot + Spring Security + STOMP + repository layer
- `ai-services/` – FastAPI + OpenCV + YOLOv8 + MediaPipe
- `docs/` – docs/screenshots

