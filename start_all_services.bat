@echo off
echo ========================================
echo   AI Proctoring System - All Services
echo ========================================
echo.

:: Set Java Home
set JAVA_HOME=C:\Program Files\Java\jdk-24
set PATH=%JAVA_HOME%\bin;%PATH%

echo [1/5] Starting Python Gaze Tracking Service (Port 5001)...
start "Gaze Tracking Service" cmd /k "python gaze_service.py"
timeout /t 3 /nobreak >nul

echo [2/5] Starting Original Gaze Demo (Port 5000)...
start "Original Gaze Demo" cmd /k "python external_resources\original_gaze_tracker\face_eye_tracker.py"
timeout /t 3 /nobreak >nul

echo [3/5] Starting Spring Boot Backend (Port 8080)...
cd backend
start "Backend Service" cmd /k "./mvnw.cmd spring-boot:run"
cd ..
timeout /t 10 /nobreak >nul

echo [4/5] Starting Frontend Dashboard (Port 3000)...
cd frontend
start "Frontend Dashboard" cmd /k "npm run dev"
cd ..
timeout /t 5 /nobreak >nul

echo [5/5] All Services Starting...
echo.
echo ========================================
echo         SERVICES ACCESS URLS
echo ========================================
echo.
echo 🎯 Original Gaze Demo:     http://localhost:5000
echo 🔧 Gaze API Service:       http://localhost:5001
echo 🚀 Backend API:           http://localhost:8080
echo 📊 Proctoring Dashboard:   http://localhost:3000
echo.
echo ========================================
echo         API ENDPOINTS
echo ========================================
echo.
echo Gaze Service Health:       http://localhost:5001/health
echo Backend Gaze Health:       http://localhost:8080/api/gaze/health
echo All Sessions:              http://localhost:8080/sessions/all
echo.
echo ========================================
echo         TESTING COMMANDS
echo ========================================
echo.
echo Test Gaze Analysis:
echo curl -X POST http://localhost:8080/api/gaze/analyze/YOUR_SESSION_ID
echo.
echo Create Test Session:
echo curl -X POST "http://localhost:8080/sessions/start?studentId=test123&examId=exam456"
echo.
echo ========================================
echo.
echo ✅ All services are starting up...
echo 💡 Wait 30 seconds for full startup
echo 🌐 Open http://localhost:3000 for the main dashboard
echo.
pause
