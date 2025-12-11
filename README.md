# 🧠 AI-Based Proctoring System  
A real-time online exam monitoring system that uses AI-driven incident detection, WebRTC video streaming, and a live proctor dashboard to ensure exam integrity.

---

## 🚀 Overview  
This project implements a full-stack **AI-based exam proctoring solution**, capable of:

- Streaming live camera feed from student to server
- Detecting suspicious behaviors (face mismatch, multiple persons, looking away, no face, etc.)
- Automatically suspending a session based on severity
- Allowing manual proctor actions (Suspend / Resume / End)
- Sending real-time updates to the dashboard using WebSockets (STOMP)
- Maintaining exam session data in a secure backend

---

## 🏗️ Tech Stack

### **Frontend**
| Technology | Purpose |
|-----------|----------|
| **Next.js (App Router)** | Proctor dashboard UI |
| **Tailwind CSS** | Styling |
| **STOMP.js + SockJS** | Realtime incident/session updates |
| **Axios** | REST communication |

### **Backend**
| Technology | Purpose |
|-----------|----------|
| **Spring Boot** | Main backend service |
| **WebSocket (STOMP)** | Real-time messaging |
| **MongoDB** | Session & incident storage |
| **Java 17** | Backend language |
| **Maven** | Build system |

### **AI / Detection**
- Custom AI detection pipeline (face/behavior detection)
- Severity scoring
- Auto-suspend logic  
*(Integrated through your backend logic or external detection service)*

---

## 🖥️ Features

### 🎥 **1. Live Video Proctoring**
- Student camera streamed to backend using WebRTC
- Proctor sees incidents in real time

### ⚠️ **2. AI Incident Detection**
Detects events like:
- No face detected  
- Multiple persons  
- Looking away  
- Face mismatch  
- Object detection  
- Suspicious movements  

Every incident carries:
- severity score  
- confidence score  
- type  
- timestamp  

### 🔥 **3. Auto-Suspend System**
If total severity crosses the threshold, the backend automatically:
- Changes session status to **SUSPENDED**
- Broadcasts update to dashboard
- Sends auto-suspend incident

### 🕹️ **4. Manual Proctor Controls**
Proctor can:
- Suspend session  
- Resume session  
- End session  

All actions broadcast live via WebSocket.

### 📡 **5. Real-Time Dashboard**
- Displays sessions  
- Highlights severity levels  
- Updates instantly when incidents occur  
- Blocks Resume button when severity ≥ threshold

---

## 🗄️ Backend Architecture

Spring Boot (REST + WebSocket)
│
├── Session Management
│ ├── Start Session
│ ├── Heartbeat
│ ├── Auto & Manual Suspension
│ └── End Session
│
├── Incident Handling
│ ├── Save Incidents
│ ├── Notify Dashboard (STOMP)
│ └── Severity Policy Enforcement
│
└── MongoDB Storage
├── ExamSession
└── Incident


---

## 🖼️ Frontend Architecture (Proctor Dashboard)

Next.js App Router
│
├── Session Grid (live updating)
│ ├── WebSocket Client (STOMP)
│ ├── Incident Listener
│ └── Session Listener
│
└── Controls: Suspend / Resume / End


