from __future__ import annotations

import base64
from typing import Any, Dict, List

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from face_detector import FaceDetector
from gaze_detector import GazeDetector
from object_detector import ObjectDetector
from fastapi import UploadFile, File
app = FastAPI(title="AI Proctoring Detection Service", version="1.0.0")

face_detector = FaceDetector()
object_detector = ObjectDetector()
gaze_detector = GazeDetector()


class FrameRequest(BaseModel):
    sessionId: str
    frame: str


class DetectionResponse(BaseModel):
    incidents: List[Dict[str, Any]]


def decode_frame(encoded: str) -> np.ndarray:
    payload = encoded.split(",", 1)[1] if "," in encoded else encoded
    data = base64.b64decode(payload)
    image = np.frombuffer(data, dtype=np.uint8)
    frame = cv2.imdecode(image, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Unable to decode input frame")
    return frame


def preprocess_frame(frame: np.ndarray) -> np.ndarray:
    """Normalize frame before running detectors to improve consistency."""
    denoised = cv2.GaussianBlur(frame, (3, 3), 0)
    return cv2.convertScaleAbs(denoised, alpha=1.05, beta=2)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}

@app.post("/test_image")
async def test_image(file: UploadFile = File(...)):
    contents = await file.read()

    npimg = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    incidents = []
    incidents.extend(face_detector.detect(frame).incidents)
    incidents.extend(object_detector.detect(frame))
    incidents.extend(gaze_detector.detect(frame))

    return {"incidents": incidents}

@app.post("/detect_objects", response_model=DetectionResponse)
def detect_objects(request: FrameRequest) -> DetectionResponse:
    frame = preprocess_frame(decode_frame(request.frame))
    return DetectionResponse(incidents=object_detector.detect(frame))


@app.post("/detect_gaze", response_model=DetectionResponse)
def detect_gaze(request: FrameRequest) -> DetectionResponse:
    frame = preprocess_frame(decode_frame(request.frame))
    return DetectionResponse(incidents=gaze_detector.detect(frame))


@app.post("/analyze_frame", response_model=DetectionResponse)
def analyze_frame(request: FrameRequest) -> DetectionResponse:
    try:
        frame = preprocess_frame(decode_frame(request.frame))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    incidents: List[Dict[str, Any]] = []
    incidents.extend(face_detector.detect(frame).incidents)
    incidents.extend(object_detector.detect(frame))
    incidents.extend(gaze_detector.detect(frame))

    deduped: List[Dict[str, Any]] = []
    seen: set[tuple[str, int]] = set()
    for incident in incidents:
        key = (incident["type"], incident.get("severityScore", 0))
        if key not in seen:
            seen.add(key)
            deduped.append(incident)

    return DetectionResponse(incidents=deduped)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("detection_service:app", host="0.0.0.0", port=8000, reload=False)
