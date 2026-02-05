# PowerShell Script to Start All AI Proctoring Services
# Run with: .\quick_start.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AI Proctoring System - Quick Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Java Environment
$env:JAVA_HOME = "C:\Program Files\Java\jdk-24"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Function to start service in new window
function Start-Service($name, $command, $workingDir = ".") {
    Write-Host "[$name] Starting..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workingDir'; $command" -WindowStyle Normal
    Start-Sleep -Seconds 2
}

# Start Services
Write-Host "Starting all services..." -ForegroundColor Green

# 1. Gaze Tracking Service (Port 5001)
Start-Service "Gaze Service" "python gaze_service.py"

# 2. Original Gaze Demo (Port 5000)  
Start-Service "Original Demo" "python external_resources\original_gaze_tracker\face_eye_tracker.py"

# 3. Backend Service (Port 8080)
Start-Service "Backend" "./mvnw.cmd spring-boot:run" "backend"

# 4. Frontend Dashboard (Port 3000)
Start-Service "Frontend" "npm run dev" "frontend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "         SERVICES STARTING UP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Original Gaze Demo:     http://localhost:5000" -ForegroundColor White
Write-Host "🔧 Gaze API Service:       http://localhost:5001" -ForegroundColor White  
Write-Host "🚀 Backend API:           http://localhost:8080" -ForegroundColor White
Write-Host "📊 Proctoring Dashboard:   http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "✅ All services are starting..." -ForegroundColor Green
Write-Host "💡 Wait 30 seconds for full startup" -ForegroundColor Yellow
Write-Host "🌐 Open http://localhost:3000 for main dashboard" -ForegroundColor Cyan
Write-Host ""

# Quick health check after 30 seconds
Write-Host "Performing health checks in 30 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

try {
    $gazeHealth = Invoke-RestMethod -Uri "http://localhost:5001/health" -ErrorAction SilentlyContinue
    Write-Host "✅ Gaze Service: $($gazeHealth.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Gaze Service: Not responding" -ForegroundColor Red
}

try {
    $backendHealth = Invoke-RestMethod -Uri "http://localhost:8080/api/gaze/health" -ErrorAction SilentlyContinue
    Write-Host "✅ Backend Gaze: Healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Gaze: Not responding" -ForegroundColor Red
}

Write-Host ""
Write-Host "Services status check complete!" -ForegroundColor Cyan
