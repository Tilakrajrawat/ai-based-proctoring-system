# Complete AI Proctoring System Setup Guide

## 📁 All Resources Included
This project is now **100% self-contained** with all external resources copied to the `external_resources/` folder.

## 🎯 What's Included:

### 1. OpenCV Haar Cascades (`external_resources/opencv_cascades/`)
- `haarcascade_frontalface_default.xml` - Face detection model
- `haarcascade_eye.xml` - Eye detection model
- **Source**: Originally from OpenCV installation
- **Usage**: Used by both gaze tracking services

### 2. Original Gaze Tracker (`external_resources/original_gaze_tracker/`)
- `face_eye_tracker.py` - Original Python script with video feed
- `templates/index.html` - Web interface for live demo
- **Source**: From `C:/Kaam/proctoring sys/CascadeProjects/windsurf-project/`
- **Usage**: Standalone gaze tracking demo

### 3. Configuration Files (`external_resources/config/`)
- `requirements.txt` - Python dependencies
- `start_proctoring_system.bat` - Complete startup script
- **Usage**: Environment setup and system startup

### 4. Integrated Services (Root Directory)
- `gaze_service.py` - Enhanced gaze tracking service (port 5001)
- Backend Spring Boot application (port 8080)
- Frontend Next.js application (port 3000)

## 🚀 Quick Start (Everything Included):

### Option 1: Use the Startup Script
```bash
start_proctoring_system.bat
```

### Option 2: Manual Setup
```bash
# Install Python dependencies
pip install -r external_resources/config/requirements.txt

# Start gaze tracking service (port 5001)
python gaze_service.py

# Start original video demo (port 5000)
python external_resources/original_gaze_tracker/face_eye_tracker.py

# Start backend (port 8080)
cd backend
./mvnw.cmd spring-boot:run

# Start frontend (port 3000)
cd ../frontend
npm run dev
```

## 🔗 Access Points:
- **Live Video Demo**: http://localhost:5000
- **Integrated Gaze Service**: http://localhost:5001
- **Backend API**: http://localhost:8080
- **Proctoring Dashboard**: http://localhost:3000

## ✅ Verification:
All resources are now self-contained. No external dependencies required:
- ✅ OpenCV cascade files copied locally
- ✅ Original gaze tracker files included
- ✅ Configuration files bundled
- ✅ Startup scripts ready

The system can run on any machine with Python, Java, and Node.js installed!
