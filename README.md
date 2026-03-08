# 🧠 AI-Based Proctoring System

A **production-grade, real-time AI-powered exam proctoring platform** that combines computer vision, WebRTC video streaming, and automated incident detection to ensure exam integrity during remote examinations.

The system monitors students in real time, detects suspicious behavior using a hybrid AI pipeline (OpenCV + YOLOv8 + MediaPipe), and delivers instant alerts to proctors via WebSocket — reducing manual monitoring workload significantly.

---

## 🎯 Problem Statement

Remote examinations face a fundamental challenge — verifying exam integrity without physical supervision. IncidentIQ solves this by:

- Streaming live video from student browsers to proctors in real time
- Automatically detecting suspicious behavior using computer vision
- Assigning severity scores to incidents and auto-suspending sessions when thresholds are exceeded
- Giving proctors a live dashboard to monitor multiple students simultaneously

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Student Browser                     │
│   Next.js │ WebRTC Camera │ Tab/Window Event Hooks  │
└───────────────────────┬─────────────────────────────┘
                        │ WebRTC Stream + REST
┌───────────────────────▼─────────────────────────────┐
│              Spring Boot Backend                     │
│  Exam Management │ Session Lifecycle │ Incident API  │
│  WebSocket STOMP │ Exam-Scoped RBAC                 │
└───────┬───────────────────────────────┬─────────────┘
        │                               │
┌───────▼───────────┐         ┌─────────▼─────────────┐
│   MongoDB          │         │  Python AI Services    │
│  Exams, Sessions   │         │  FastAPI Microservice  │
│  Incidents, Users  │         │  OpenCV + YOLOv8       │
└───────────────────┘         │  MediaPipe             │
                              └────────────────────────┘
                                        │
                              ┌─────────▼──────────────┐
                              │  Incident Pipeline      │
                              │  Severity Scoring       │
                              │  Auto-Suspend Logic     │
                              └────────────────────────┘
```

---

## ✨ Core Features

### 🔐 Exam-Scoped Role Based Access Control

Users can have **different roles across different exams** — a fully flexible RBAC system.

| Role | Permissions |
|------|-------------|
| Admin | Create exams, manage participants, assign roles |
| Proctor | Monitor sessions, review incidents, suspend/resume/end sessions |
| Student | Join exam, stream video, submit exam |

**Example — same user, different roles per exam:**

| User | Exam A | Exam B |
|------|--------|--------|
| Alice | Admin | Student |
| Bob | Proctor | — |
| Charlie | Student | Admin |

Roles are stored per exam in MongoDB, enabling fully flexible exam management.

---

### 🎥 Live Video Proctoring (WebRTC)

- Student camera streamed to backend via **WebRTC peer-to-peer** connection
- Proctor dashboard displays all active sessions in a live grid
- Low-latency frame extraction for AI analysis
- Concurrent monitoring of multiple student sessions simultaneously

---

### 🤖 AI Detection Pipeline

A **three-stage hybrid computer vision pipeline** runs continuously on student video frames:

```
Student Camera
      │
WebRTC Stream
      │
Frame Extraction
      │
┌─────▼──────────────┐
│ OpenCV             │
│ Frame preprocessing│
│ Face detection     │
│ Eye detection      │
└─────┬──────────────┘
      │
┌─────▼──────────────┐
│ YOLOv8             │
│ Phone detection    │
│ Multiple persons   │
│ Suspicious objects │
└─────┬──────────────┘
      │
┌─────▼──────────────┐
│ MediaPipe          │
│ Facial landmarks   │
│ Gaze estimation    │
│ Head pose tracking │
│ Eye closure        │
└─────┬──────────────┘
      │
Incident Generation → Spring Boot → MongoDB → WebSocket Alert
```

**Detections supported:**

| Detection Type | Tool | Severity |
|---------------|------|----------|
| Face not detected | OpenCV | MEDIUM |
| Multiple faces detected | YOLOv8 | HIGH |
| Phone detected | YOLOv8 | HIGH |
| Looking away from screen | MediaPipe | MEDIUM |
| Eyes closed extended | MediaPipe | MEDIUM |
| Tab switching | Browser Event | LOW |
| Window blur | Browser Event | LOW |
| Fullscreen exit | Browser Event | LOW |
| Session timeout | Backend | HIGH |
| Auto-suspend triggered | Backend | CRITICAL |

Each incident contains:
```json
{
  "sessionId": "abc123",
  "type": "PHONE_DETECTED",
  "severity": "HIGH",
  "confidenceScore": 0.91,
  "severityScore": 4,
  "timestamp": "2025-03-09T10:15:30Z"
}
```

---

### 🔥 Auto-Suspend System

The backend continuously tracks **cumulative severity score** per session.

- Every incident adds its severity score to the session total
- When total severity crosses the configured threshold — session is **automatically suspended**
- Dashboard immediately reflects suspended status via WebSocket broadcast
- Proctor can manually **Resume** or **End** the session

```
Incident received
      │
Severity score added to session total
      │
Total ≥ Threshold?
      │
   YES → Auto-suspend session
        → Broadcast SUSPENDED status via STOMP
        → Block Resume button on dashboard
   NO  → Continue monitoring
```

---

### 🕹️ Manual Proctor Controls

Proctors can take manual action on any session:

| Action | Result |
|--------|--------|
| Suspend | Pauses student session immediately |
| Resume | Restores session (blocked if severity ≥ threshold) |
| End | Permanently ends session and saves full incident log |

All actions are broadcast live via WebSocket to all connected dashboard clients.

---

### 📡 Real-Time Proctor Dashboard

- Live session grid showing all active students
- Severity level highlighting per session
- Incident feed updating instantly via STOMP WebSocket
- Resume button automatically disabled when severity threshold exceeded
- Manual controls per session — Suspend, Resume, End

---
### 📋 Attendance Tracking

The system automatically tracks student attendance for every exam session in real time.

**Attendance States:**

| State | Condition |
|-------|-----------|
| ABSENT | Student has not started the session yet |
| PRESENT | Student has started and session is active |
| INACTIVE | Session was suspended or ended |

**How it works:**
- When an exam starts, all registered students are marked **ABSENT** by default
- When a student hits `POST /api/session/start`, their status updates to **PRESENT**
- If a session is suspended or ended — manually or via auto-suspend — status updates to **INACTIVE**
- Admin and Proctor can view attendance status per student on the dashboard
- Full attendance report available per exam via `GET /api/exams/{id}/attendance`
  
### 🖥️ Browser Behavior Detection

Client-side event hooks detect browser-level cheating attempts:

- **Tab Switch** — student switches to another browser tab
- **Window Blur** — student clicks outside the exam window
- **Fullscreen Exit** — student exits fullscreen mode
- Each event triggers an incident report to the backend immediately

---

## 🧰 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js (App Router) | Student + Proctor dashboard UI |
| TypeScript | Type-safe frontend code |
| Tailwind CSS | Styling |
| WebRTC | Live video streaming |
| STOMP.js + SockJS | Real-time incident and session updates |
| Axios | REST API communication |

### Backend
| Technology | Purpose |
|-----------|---------|
| Spring Boot | Main backend service |
| Spring Security | Authentication and exam-scoped RBAC |
| WebSocket (STOMP) | Real-time messaging to dashboard |
| REST APIs | Exam, session, and incident management |
| MongoDB | Storage for exams, sessions, incidents, users |
| Java 17 | Backend language |
| Maven | Build system |

### AI Detection Services
| Technology | Purpose |
|-----------|---------|
| Python | AI service language |
| FastAPI | AI microservice REST server |
| OpenCV | Frame preprocessing and face/eye detection |
| YOLOv8 | Object detection — phones, multiple persons |
| MediaPipe | Gaze tracking, head pose, eye closure detection |
| Uvicorn | ASGI server for FastAPI |

---

## 📂 Project Structure

```
ai-proctoring-system/
├── frontend/
│   ├── app/
│   │   ├── student/          # Student exam interface
│   │   ├── proctor/          # Proctor monitoring dashboard
│   │   └── admin/            # Exam management
│   ├── components/
│   │   ├── VideoStream.tsx   # WebRTC camera component
│   │   ├── SessionGrid.tsx   # Live session monitoring grid
│   │   └── IncidentFeed.tsx  # Real-time incident display
│   └── lib/
│       ├── webrtc.ts         # WebRTC connection logic
│       ├── stomp.ts          # WebSocket client
│       └── events.ts         # Browser behavior hooks
│
├── backend/
│   └── src/main/java/
│       ├── controller/       # REST API controllers
│       ├── service/          # Business logic
│       ├── model/            # MongoDB models
│       ├── security/         # Spring Security + RBAC
│       └── websocket/        # STOMP WebSocket config
│
├── ai-services/
│   ├── detection_service.py  # FastAPI main service
│   ├── gaze_detector.py      # MediaPipe gaze tracking
│   ├── object_detector.py    # YOLOv8 phone/person detection
│   └── face_detector.py      # OpenCV face/eye detection
│
└── docs/
    └── screenshots/          # Dashboard screenshots
```

---

## 📡 API Reference

### Exam Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/exams | Create exam | Admin |
| GET | /api/exams | List all exams | Admin/Proctor |
| POST | /api/exams/{id}/start | Start exam | Admin |
| POST | /api/exams/{id}/end | End exam | Admin |

### Session Management
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/session/start | Start student session | Student |
| POST | /api/session/heartbeat | Session keepalive | Student |
| POST | /api/session/end | End student session | Student/Proctor |
| PATCH | /api/session/{id}/suspend | Suspend session | Proctor/Auto |
| PATCH | /api/session/{id}/resume | Resume session | Proctor |

### Incident Reporting
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | /api/incidents | Report incident | AI Service/Student |
| GET | /api/incidents/session/{sessionId} | Get session incidents | Proctor/Admin |
| GET | /api/incidents/exam/{examId} | Get all exam incidents | Admin |

---

## 🚀 Getting Started

### Prerequisites
```
Node.js 18+
Java 17+
Python 3.9+
MongoDB
Maven
```

### 1. Clone Repository
```bash
git clone https://github.com/Tilakrajrawat/ai-proctoring-system.git
cd ai-proctoring-system
```

### 2. Backend Setup
```bash
cd backend
# Configure MongoDB URI in application.properties
mvn spring-boot:run
# Runs on http://localhost:8080
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# Runs on http://localhost:3000
```

### 4. AI Services Setup
```bash
cd ai-services
pip install opencv-python ultralytics mediapipe fastapi uvicorn
python detection_service.py
# Runs on http://localhost:8000
```

---

## 🔑 Key Design Decisions

**Why WebRTC for video streaming?**
WebRTC provides peer-to-peer low-latency video without requiring a media server, making it ideal for real-time proctoring where sub-second latency matters.

**Why a separate Python microservice for AI?**
YOLOv8 and MediaPipe are Python-native libraries. Running them as a separate FastAPI microservice keeps the Spring Boot backend focused on business logic while allowing the AI service to scale independently.

**Why STOMP over raw WebSockets?**
STOMP provides a messaging protocol on top of WebSockets with built-in support for topics and subscriptions, making it easy to broadcast incidents to specific proctor dashboards without custom routing logic.

**Why exam-scoped RBAC?**
Real exam platforms need flexible role assignment — a professor might be an admin for their own exam but a student in a training course. Exam-scoped roles reflect this real-world requirement.

---

## 📈 Future Enhancements
- Face mismatch detection using DeepFace for identity verification
- Distributed AI inference for high-concurrency exams
- Automated exam analytics and cheating pattern reports
- Mobile browser support
- Recording and playback of flagged sessions

---

## 👨‍💻 Author

**Tilak Raj Rawat**
Final Year B.Tech CSE — Graphic Era Hill University
[LinkedIn](https://linkedin.com/in/tilakrajrawat142) | [GitHub](https://github.com/Tilakrajrawat)

## 📊 Monitoring & Analytics Enhancements

The platform now includes production-style monitoring capabilities for proctors and admins:

- **Incident Timeline** (`GET /api/incidents/session/{sessionId}`) with time-sorted events, confidence, severity, and replay metadata.
- **Incident Playback Support** with `videoSnippetUrl` attached to incidents and replay controls in timeline UI.
- **Exam Analytics API** (`GET /api/exams/{examId}/analytics`) with total students, suspicious sessions, average risk score, and top incident types.
- **Incident Statistics API** (`GET /api/exams/{examId}/incident-stats`) for pie chart visualization.
- **Session Risk Heatmap API** (`GET /api/exams/{examId}/sessions`) for color-coded student risk monitoring.
- **Proctor Session Inspection Page** at `frontend/app/proctor/session/[sessionId]/page.tsx`.
- **Live Event Stream** now includes high-level events: `incidentDetected`, `sessionUpdated`, and `riskScoreUpdated` on `/topic/events`.
- **Glassmorphism dashboard updates** using Tailwind classes (`backdrop-blur-xl`, `bg-white/10`, `border-white/20`, `shadow-lg`, `rounded-2xl`).

### New Frontend Views

- `frontend/components/IncidentTimeline.tsx`
- `frontend/components/CheatingTrendChart.tsx` (Recharts line chart)
- `frontend/app/admin/analytics/page.tsx` (analytics, trend, pie, heatmap)
- `frontend/app/proctor/session/[sessionId]/page.tsx` (detailed proctor inspection)

These additions enable multi-student live monitoring, replay of suspicious moments, incident trend analysis, and rapid risk-based prioritization.
