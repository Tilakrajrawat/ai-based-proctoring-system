# 🧠 AI-Based Proctoring and Online Examination Platform

This project extends a baseline **AI-Based Proctoring System** into a full-stack **online examination and invigilation platform**.

It combines **secure exam delivery**, **role-based access control**, **live proctor monitoring**, **AI-assisted incident detection**, **session risk scoring**, and **server-side evaluation/reporting** in one integrated architecture.

The platform is designed as a **final-year major project prototype** with a modular architecture that can be extended toward production-grade persistence, media archival, and advanced analytics.

---

## 🚀 Key Highlights

- **Integrated MCQ online examination workflow**
- **AI-assisted proctoring pipeline**
- **Role-based exam-scoped access control (Admin / Proctor / Student)**
- **Live student webcam monitoring using WebRTC**
- **Incident detection + risk score accumulation**
- **Proctor controls (suspend / resume / force submit)**
- **Server-side response storage, scoring, and result reporting**
- **Admin-only Excel export of exam results**

---

## 📌 Implemented Features

### 1) Integrated MCQ Examination Module ✅
- Admin can create, edit, list, and delete MCQ questions per exam.
- Question fields:
  - `questionText`
  - `options[]`
  - `correctOptionIndex`
  - `marks`
  - `displayOrder`
- Student payload is sanitized and **never includes answer keys**.

### 2) Student Exam Interface ✅
- Student exam page includes:
  - question panel with options
  - auto-save on option selection
  - next / previous navigation
  - question palette / progress indicator
  - timer with auto-submit trigger
  - final submit flow
- Existing proctoring hooks are preserved:
  - webcam capture
  - heartbeat
  - frame upload
  - browser event incidents

### 3) Browser Lock / Anti-Cheat Event Handling ✅
The student exam flow supports browser-behavior monitoring for anti-cheat signals:

- **Tab switch detection**
- **Window blur detection**
- **Fullscreen exit detection**
- **Browser back navigation detection**
- Incidents are sent to backend instead of immediate hard termination
- Backend can accumulate **risk score** and automatically handle escalation (e.g. suspend / submit) based on thresholds

> This keeps the frontend lightweight while centralizing policy decisions in the backend.

### 4) Proctor Attendance & Live Analytics ✅
Proctor dashboard includes:

- attendance summary cards:
  - registered
  - present
  - absent
  - inactive
- live analytics cards:
  - active sessions
  - suspended sessions
  - high-risk sessions
  - average risk score
  - incident count
- student progress table:
  - attempted / total
  - submission state
  - session state
  - risk score
  - incident count

**Important:** Proctor does **not** receive:
- correct answers
- answer key
- student selected options

### 5) Live Session Monitoring & Control ✅
Proctor can:

- open **live WebRTC feed** for active student sessions
- view **incident timeline**
- **suspend** a session
- **resume** a suspended session
- **force submit** a session

Additional behavior:
- Live feed is disabled for terminal states such as:
  - `SUBMITTED`
  - `ENDED`

### 6) Server-Side Response Storage & Scoring ✅
- Backend stores per-student responses by exam
- Submission status supported:
  - `IN_PROGRESS`
  - `SUBMITTED`
  - `AUTO_SUBMITTED`
- On submit, score is computed **server-side** from stored responses and question key
- Result computation is **idempotent**
  - resubmits update existing result record safely

### 7) Admin Result Dashboard ✅
Admin can:
- fetch exam result list
- fetch per-student result

Results include:
- score
- totals
- counts
- percentage
- submission time
- monitoring metadata

### 8) Admin Excel Export ✅
Admin-only `.xlsx` export powered by **Apache POI**

Export includes:
- student ID / name (best-effort from existing schema)
- attendance / session state
- attempted / correct / wrong / unanswered
- score
- percentage
- risk score
- incident count
- submission time

---

## 🛡️ Anti-Cheat & Proctoring Capabilities

Implemented monitoring and cheating signals include:

- Webcam live stream from student to proctor (**WebRTC**)
- Frame upload pipeline for AI analysis
- Browser/tab visibility change detection
- Window blur detection
- Fullscreen exit detection
- Browser back navigation detection
- Incident generation with confidence / severity
- Risk score accumulation per session
- Auto-suspend / force-submit capable session control via proctor or backend rules

### AI-related incident categories supported in the project architecture
- `FACE_NOT_DETECTED`
- `MULTIPLE_FACES_DETECTED`
- `EYES_CLOSED`
- `LOOKING_AWAY`
- `PHONE_DETECTED`
- `SPEAKING_DETECTED`

### Browser / behavior incidents
- `TAB_SWITCH`
- `WINDOW_BLUR`
- `FULLSCREEN_EXIT`
- `BROWSER_BACK`

### Session / proctor actions
- `SESSION_TIMEOUT`
- `SESSION_AUTO_SUSPEND`
- `PROCTOR_SUSPENDED_SESSION`
- `PROCTOR_RESUMED_SESSION`
- `PROCTOR_ENDED_SESSION`

---

## 🔐 Security Model

### **Admin only**
- create / edit / delete questions
- admin question view (includes correct option)
- result APIs
- Excel export
- exam management / assignment control

### **Student only**
- fetch sanitized questions
- save answers
- submit exam
- view own submission status
- start personal exam session

### **Proctor / Admin only**
- attendance summary
- progress monitoring
- live analytics
- incident monitoring
- live feed access
- session control actions

### **Never exposed to Student / Proctor payloads**
- `correctOptionIndex`
- answer key
- student selected options

---

## 🏗️ Architecture Overview

```text
Student UI (Next.js)
  ├─ Proctoring hooks (WebRTC / browser events / fullscreen handling)
  └─ MCQ exam workflow (student-safe questions, save, submit)
        │
        ▼
Spring Boot Backend
  ├─ Exam + assignment + session lifecycle
  ├─ Question management (admin)
  ├─ Response storage
  ├─ Server-side scoring + results
  ├─ Attendance / progress / live analytics
  ├─ Incident ingestion + severity / risk handling
  └─ Excel export (Apache POI)
        │
        ├─ Repository layer (current snapshot)
        └─ AI services integration (incidents / severity)
                │
                ▼
AI Services (FastAPI)
  ├─ OpenCV frame processing
  ├─ YOLOv8 object detection
  └─ MediaPipe-based behavior signals

Realtime Layer
  ├─ STOMP (session + incident updates)
  └─ Socket.IO signaling server (WebRTC negotiation)
````

---

## 🧰 Tech Stack

### Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Axios
* WebRTC
* Socket.IO Client

### Backend

* Spring Boot
* Spring Security
* STOMP WebSocket
* Apache POI (Excel export)
* Mixed persistence pattern in current snapshot:

  * existing repo layer
  * in-memory repositories for some newer flows

### AI Services

* FastAPI
* OpenCV
* YOLOv8
* MediaPipe

### Realtime / Signaling

* Socket.IO signaling server for WebRTC offer / answer / ICE exchange

---

## 📂 Monorepo Structure

* `frontend/` – Next.js App Router + TypeScript + Tailwind
* `backend/` – Spring Boot + Spring Security + STOMP + repository layer
* `ai-services/` – FastAPI + OpenCV + YOLOv8 + MediaPipe
* `signaling-server/` – Socket.IO signaling server for WebRTC negotiation
* `docs/` – docs / screenshots / diagrams

---

## 🔌 API Reference (New / Extended)

### Admin Question Management

* `POST /api/exams/{examId}/questions`
* `GET /api/exams/{examId}/questions/admin-view`
* `PUT /api/questions/{questionId}?examId={examId}`
* `DELETE /api/questions/{questionId}?examId={examId}`

### Student Exam Flow

* `GET /api/exams/{examId}/questions/student-view`
* `POST /api/exams/{examId}/responses/save`
* `POST /api/exams/{examId}/submit`
* `GET /api/exams/{examId}/my-status`

### Monitoring (Proctor / Admin)

* `GET /api/exams/{examId}/attendance`
* `GET /api/exams/{examId}/attendance/summary`
* `GET /api/exams/{examId}/progress`
* `GET /api/analytics/exam/{examId}/live`

### Incidents

* `POST /api/incidents`
* `GET /api/incidents/session/{sessionId}`

### Admin Results

* `GET /api/exams/{examId}/results`
* `GET /api/exams/{examId}/results/{studentId}`
* `GET /api/exams/{examId}/results/export`

---

## ▶️ How to Run

### 1) Start Backend

```bash
cd backend
./mvnw spring-boot:run
```

> On Windows (if needed):

```bash
mvnw.cmd spring-boot:run
```

### 2) Start AI Services

```bash
cd ai-services
uvicorn main:app --reload --port 8000
```

### 3) Start WebRTC Signaling Server

```bash
cd signaling-server
npm install
node index.js
```

### 4) Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### Default Local Ports

* Frontend: `http://localhost:3000`
* Backend: `http://localhost:8080`
* AI Services: `http://localhost:8000`
* Signaling Server: `http://localhost:3001`

---

## ⚙️ Environment Configuration (Example)

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_SIGNALING_URL=http://localhost:3001
```

### Signaling Server (`signaling-server/.env` or system env)

```env
SIGNALING_PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
```

---

## 📊 Current Implementation Notes

* The current backend snapshot has **mixed persistence patterns**
* Some newer exam / question / response / result flows use **in-memory storage style** for consistency with the current repo snapshot
* Student timer currently uses a **frontend countdown** with backend submit endpoint integration
* Exam duration is **not yet centrally configured per exam entity**
* Live dashboard supports:

  * **STOMP-based session updates**
  * **periodic auto-refresh polling** for analytics / progress consistency

---

## ⚠️ Current Limitations / Scope Notes

This project is intentionally optimized as a **final-year academic prototype** and focuses on demonstrating the complete architecture and working flow.

Current limitations include:

* Some repository flows still use **in-memory storage patterns** in this snapshot
* Exam duration is not yet fully centralized in the exam entity
* Replay / event-based clip archival is **not implemented in the current milestone**
* Current anti-cheat browser controls prioritize:

  * incident generation
  * risk scoring
  * backend-driven escalation
    rather than forcing immediate hard termination on every single event
* Media storage for long-term audit trails is not yet added

---

## 📈 Why This Design Is Storage-Efficient

The system currently prioritizes:

* incident metadata
* risk scoring
* live monitoring
* server-side scoring
* event-based enforcement

instead of storing full continuous exam recordings.

This makes the project:

* lighter
* easier to run locally
* easier to demonstrate in an academic setting
* extensible toward future media archival (snapshots / short replay clips / cloud storage)

---

## 🔮 Future Enhancements

* Event-based incident replay clips or incident snapshots
* Persistent database-backed repositories for all modules
* Per-exam configurable duration and rules
* Historical analytics dashboards and audit reports
* Cloud object storage for incident media
* Face recognition / candidate identity verification
* Multi-proctor support and audit trails
* Richer proctor annotations and incident review workflow
* Advanced cheating severity calibration / policy engine

---

## 🎓 Academic Value / Learning Outcomes

This project demonstrates practical understanding of:

* full-stack web application development
* secure role-based access control
* online examination workflow design
* WebRTC-based real-time media streaming
* real-time signaling and WebSocket communication
* AI-assisted proctoring architecture
* event-driven monitoring and risk scoring
* backend-driven scoring and reporting
* secure data sanitization between roles
* export/report generation for academic/admin workflows

---

## 📝 Conclusion

This repository represents an integrated **AI-based proctoring + online examination platform** suitable for a **final-year major project**.

It goes beyond a standalone proctoring demo by combining:

* secure online examination
* live proctor monitoring
* AI incident ingestion
* risk-aware session control
* server-side scoring
* admin reporting and export

The current implementation is intentionally designed as a **working academic prototype** with clear extension paths toward persistent storage, media replay, and production-grade scalability.

