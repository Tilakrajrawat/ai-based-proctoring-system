# AI Proctoring System - Setup Instructions

## Required Installations

### 1. Java 17
✅ **Already installed and JAVA_HOME configured**
- Java 24 detected, but project requires Java 17
- JAVA_HOME set to: C:\Program Files\Java\jdk-17

### 2. MongoDB
❌ **Not installed or not in PATH**
You need to install MongoDB Community Server:

#### Option A: Download and Install (Recommended)
1. Go to https://www.mongodb.com/try/download/community
2. Download MongoDB Community Server for Windows
3. Run the installer with default settings
4. Make sure "Install MongoDB as a Service" is checked

#### Option B: Using Chocolatey (if installed)
```bash
choco install mongodb
```

### 3. Node.js
✅ **Already installed**
- Frontend dependencies installed successfully

## Starting the Application

### Step 1: Start MongoDB Service
```bash
net start MongoDB
```

### Step 2: Start Backend (Port 8080)
```bash
cd backend
./mvnw.cmd spring-boot:run
```

### Step 3: Start Frontend (Port 3000)
```bash
cd frontend
npm run dev
```

## Access Points
- **Backend API**: http://localhost:8080
- **Frontend Dashboard**: http://localhost:3000
- **MongoDB**: mongodb://localhost:27017/proctoring

## Troubleshooting

### If MongoDB service doesn't start:
1. Check if MongoDB is installed: `mongod --version`
2. Install MongoDB if missing
3. Restart command prompt after installation

### If backend fails to start:
1. Verify JAVA_HOME is set: `echo %JAVA_HOME%`
2. Check Java version: `java -version`
3. Ensure MongoDB is running

### If frontend fails:
1. Verify Node.js installation: `node --version`
2. Install dependencies: `npm install`
3. Check for port conflicts
