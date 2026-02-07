import cv2
import numpy as np
import time
import json
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

session_data = {}
lock = threading.Lock()

class GazeTracker:
    def __init__(self, session_id):
        self.session_id = session_id
        self.look_away_start = None
        self.multiple_faces_start = None
        self.no_face_start = None
        self.LOOK_AWAY_THRESHOLD = 3.0  # seconds
        self.MULTIPLE_FACES_THRESHOLD = 2.0  # seconds
        self.NO_FACE_THRESHOLD = 5.0  # seconds
        self.last_incident_time = {}
        
    def analyze_frame(self, frame):
        incidents = []
        current_time = time.time()
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        if len(faces) == 0:
            if self.no_face_start is None:
                self.no_face_start = current_time
            else:
                no_face_duration = current_time - self.no_face_start
                if no_face_duration >= self.NO_FACE_THRESHOLD:
                    if self._should_report_incident('NO_FACE', current_time):
                        incidents.append({
                            'type': 'NO_FACE',
                            'confidence': 0.9,
                            'severity': 2.0,
                            'message': 'No face detected for extended period',
                            'duration': no_face_duration
                        })
        else:
            self.no_face_start = None
            
    
        if len(faces) > 1:
            if self.multiple_faces_start is None:
                self.multiple_faces_start = current_time
            else:
                multiple_faces_duration = current_time - self.multiple_faces_start
                if multiple_faces_duration >= self.MULTIPLE_FACES_THRESHOLD:
                    if self._should_report_incident('MULTIPLE_FACES', current_time):
                        incidents.append({
                            'type': 'MULTIPLE_FACES',
                            'confidence': 0.8,
                            'severity': 1.5,
                            'message': f'Multiple faces detected: {len(faces)}',
                            'duration': multiple_faces_duration
                        })
        else:
            self.multiple_faces_start = None
        
 
        looking_at_screen = False
        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray)
            
           
            if len(eyes) >= 2:
                looking_at_screen = True
                break
        
        
        if not looking_at_screen and len(faces) == 1:
            if self.look_away_start is None:
                self.look_away_start = current_time
            else:
                look_away_duration = current_time - self.look_away_start
                if look_away_duration >= self.LOOK_AWAY_THRESHOLD:
                    if self._should_report_incident('LOOKING_AWAY', current_time):
                        incidents.append({
                            'type': 'LOOKING_AWAY',
                            'confidence': 0.7,
                            'severity': 1.0,
                            'message': 'Student looking away from screen',
                            'duration': look_away_duration
                        })
        else:
            self.look_away_start = None
            
        return incidents, len(faces), looking_at_screen
    
    def _should_report_incident(self, incident_type, current_time):

        if incident_type in self.last_incident_time:
            if current_time - self.last_incident_time[incident_type] < 10:
                return False
        
        self.last_incident_time[incident_type] = current_time
        return True

@app.route('/analyze_frame', methods=['POST'])
def analyze_frame():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
   
        with lock:
            if session_id not in session_data:
                session_data[session_id] = GazeTracker(session_id)
            tracker = session_data[session_id]
a
        incidents, face_count, looking_at_screen = tracker.analyze_frame(None)
        
        return jsonify({
            'session_id': session_id,
            'incidents': incidents,
            'face_count': face_count,
            'looking_at_screen': looking_at_screen,
            'timestamp': time.time()
        })
        
    except Exception as e:
        logger.error(f"Error analyzing frame: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
       
        with lock:
            if session_id in session_data:
                session_data[session_id].last_heartbeat = time.time()
        
        return jsonify({'status': 'ok', 'timestamp': time.time()})
        
    except Exception as e:
        logger.error(f"Error in heartbeat: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/end_session', methods=['POST'])
def end_session():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'session_id is required'}), 400
        
    
        with lock:
            if session_id in session_data:
                del session_data[session_id]
        
        return jsonify({'status': 'ok', 'message': 'Session ended'})
        
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/health')
def health_check():
    return jsonify({'status': 'healthy', 'active_sessions': len(session_data)})

if __name__ == '__main__':
    logger.info("Starting Gaze Tracking Service on port 5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
