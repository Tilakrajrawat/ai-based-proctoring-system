import cv2
import numpy as np
import time
from flask import Flask, render_template, Response, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

look_away_start = None
LOOK_AWAY_THRESHOLD = 2.0
warning_triggered = False

def detect_gaze(frame):
    global look_away_start, warning_triggered
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    looking_at_screen = False
    
    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
        
        roi_gray = gray[y:y+h, x:x+w]
        roi_color = frame[y:y+h, x:x+w]
        
        eyes = eye_cascade.detectMultiScale(roi_gray)
        
        if len(eyes) >= 2:
            looking_at_screen = True
            for (ex, ey, ew, eh) in eyes[:2]:
                cv2.rectangle(roi_color, (ex, ey), (ex+ew, ey+eh), (0, 255, 0), 2)
    
    current_time = time.time()
    
    if not looking_at_screen:
        if look_away_start is None:
            look_away_start = current_time
        else:
            look_away_duration = current_time - look_away_start
            if look_away_duration >= LOOK_AWAY_THRESHOLD and not warning_triggered:
                warning_triggered = True
    else:
        look_away_start = None
        warning_triggered = False
    
    return frame, looking_at_screen, warning_triggered

def generate_frames():
    cap = cv2.VideoCapture(0)
    
    while True:
        success, frame = cap.read()
        if not success:
            break
        
        processed_frame, looking_at_screen, warning = detect_gaze(frame.copy())
        
        if warning:
            cv2.putText(
                processed_frame,
                "LOOK AT THE SCREEN!",
                (50, 50),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 0, 255),
                2,
                cv2.LINE_AA
            )
        
        ret, buffer = cv2.imencode('.jpg', processed_frame)
        frame = buffer.tobytes()
        
        yield (
            b'--frame\r\n'
            b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
        )
    
    cap.release()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(
        generate_frames(),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/status')
def get_status():
    global warning_triggered
    return jsonify({
        'warning': warning_triggered,
        'message': 'LOOK AT THE SCREEN!' if warning_triggered else ''
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
