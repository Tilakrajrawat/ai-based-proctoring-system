from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import cv2
import numpy as np


@dataclass
class FaceDetectionResult:
    incidents: List[Dict[str, Any]]
    face_count: int


class FaceDetector:
    """OpenCV-based face detector used by the FastAPI detection service."""

    def __init__(self) -> None:
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def detect(self, frame: np.ndarray) -> FaceDetectionResult:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.2, 5)

        incidents: List[Dict[str, Any]] = []
        if len(faces) == 0:
            incidents.append(
                {
                    "type": "FACE_NOT_DETECTED",
                    "severity": "MEDIUM",
                    "confidenceScore": 0.9,
                    "severityScore": 2,
                }
            )

        return FaceDetectionResult(incidents=incidents, face_count=int(len(faces)))
