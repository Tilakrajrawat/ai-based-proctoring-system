# AI Proctoring System - Service Commands Reference

## 🚀 Quick Start Options

### Option 1: All-in-One Startup
```bash
# Windows Batch File
start_all_services.bat

# PowerShell Script  
.\quick_start.ps1
```

### Option 2: Individual Services
See `individual_start_commands.txt`

## 📋 Service Details

| Service | Port | File | Purpose |
|---------|------|------|---------|
| Original Gaze Demo | 5000 | `external_resources/original_gaze_tracker/face_eye_tracker.py` | Live video feed demo |
| Gaze API Service | 5001 | `gaze_service.py` | Backend API for integration |
| Spring Boot Backend | 8080 | `backend/` | Main proctoring backend |
| Frontend Dashboard | 3000 | `frontend/` | React dashboard |

## 🔧 Manual Commands

### 1. Install Dependencies (First time only)
```bash
# Python packages
pip install -r external_resources/config/requirements.txt

# Node.js packages
cd frontend && npm install && cd ..
```

### 2. Start Services Individually
```bash
# Terminal 1: Gaze API Service
python gaze_service.py

# Terminal 2: Original Demo  
python external_resources/original_gaze_tracker/face_eye_tracker.py

# Terminal 3: Backend
cd backend
set JAVA_HOME=C:\Program Files\Java\jdk-24
./mvnw.cmd spring-boot:run

# Terminal 4: Frontend
cd frontend  
npm run dev
```

## 🌐 Access URLs

### Main Interfaces
- **Proctoring Dashboard**: http://localhost:3000
- **Live Gaze Demo**: http://localhost:5000  
- **Backend API**: http://localhost:8080

### API Endpoints
- **Gaze Service Health**: http://localhost:5001/health
- **Backend Gaze Health**: http://localhost:8080/api/gaze/health
- **All Sessions**: http://localhost:8080/sessions/all
- **Create Session**: POST http://localhost:8080/sessions/start?studentId=X&examId=Y

## 🧪 Testing Commands

### Health Checks
```bash
curl http://localhost:5001/health
curl http://localhost:8080/api/gaze/health
```

### Create Test Session
```bash
curl -X POST "http://localhost:8080/sessions/start?studentId=test123&examId=exam456"
```

### Test Gaze Analysis
```bash
# Replace SESSION_ID with actual session ID
curl -X POST http://localhost:8080/api/gaze/analyze/SESSION_ID
```

## 🔍 Troubleshooting

### Port Conflicts
If ports are busy, change them in:
- `gaze_service.py` (line 197): `app.run(port=5001)`
- `face_eye_tracker.py` (line 103): `app.run(port=5000)`
- `backend/src/main/resources/application.properties`: `server.port=8080`
- `frontend/next.config.js`: Port 3000

### Java Issues
Ensure JAVA_HOME points to JDK 24:
```bash
set JAVA_HOME=C:\Program Files\Java\jdk-24
set PATH=%JAVA_HOME%\bin;%PATH%
```

### Python Issues
Install required packages:
```bash
pip install opencv-python numpy Flask Flask-CORS
```

## 📁 File Locations

- **Main Services**: Project root
- **Original Demo**: `external_resources/original_gaze_tracker/`
- **Configuration**: `external_resources/config/`
- **OpenCV Models**: `external_resources/opencv_cascades/`
