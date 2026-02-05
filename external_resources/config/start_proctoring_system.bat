@echo off
echo Starting AI Proctoring System...
echo.

echo 1. Starting Python Gaze Tracking Service...
start "Gaze Tracking Service" cmd /k "python gaze_service.py"

echo 2. Waiting for gaze service to start...
timeout /t 3 /nobreak >nul

echo 3. Starting Spring Boot Backend...
cd backend
start "Backend Service" cmd /k "$env:JAVA_HOME=\"C:\Program Files\Java\jdk-24\"; $env:PATH=\"$env:JAVA_HOME\bin;$env:PATH\"; ./mvnw.cmd spring-boot:run"

echo 4. Waiting for backend to start...
timeout /t 10 /nobreak >nul

echo 5. Starting Frontend...
cd ../frontend
start "Frontend Service" cmd /k "npm run dev"

echo.
echo AI Proctoring System is starting up...
echo.
echo Services will be available at:
echo - Gaze Tracking: http://localhost:5001
echo - Backend API: http://localhost:8080  
echo - Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause >nul
