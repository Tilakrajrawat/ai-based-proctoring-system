from __future__ import annotations

from typing import Any, Dict, List

import cv2
import numpy as np

try:
    import mediapipe as mp
except Exception:  # pragma: no cover - optional dependency fallback
    mp = None


class GazeDetector:
    """MediaPipe-based gaze + eye closure heuristic detector."""

    LEFT_EYE = [33, 160, 158, 133, 153, 144]
    RIGHT_EYE = [362, 385, 387, 263, 373, 380]

    def __init__(self) -> None:
        self.face_mesh = (
            mp.solutions.face_mesh.FaceMesh(static_image_mode=True, max_num_faces=2)
            if mp
            else None
        )

    @staticmethod
    def _eye_aspect_ratio(eye_points: np.ndarray) -> float:
        vertical_1 = np.linalg.norm(eye_points[1] - eye_points[5])
        vertical_2 = np.linalg.norm(eye_points[2] - eye_points[4])
        horizontal = np.linalg.norm(eye_points[0] - eye_points[3])
        if horizontal == 0:
            return 0.0
        return float((vertical_1 + vertical_2) / (2.0 * horizontal))

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        if self.face_mesh is None:
            return []

        incidents: List[Dict[str, Any]] = []
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = self.face_mesh.process(rgb)

        if not result.multi_face_landmarks:
            return incidents

        face = result.multi_face_landmarks[0]
        h, w, _ = frame.shape

        landmarks = np.array([(lm.x * w, lm.y * h) for lm in face.landmark])
        left = landmarks[self.LEFT_EYE]
        right = landmarks[self.RIGHT_EYE]
        left_ear = self._eye_aspect_ratio(left)
        right_ear = self._eye_aspect_ratio(right)
        avg_ear = (left_ear + right_ear) / 2.0

        if avg_ear < 0.18:
            incidents.append(
                {
                    "type": "EYES_CLOSED",
                    "severity": "MEDIUM",
                    "confidenceScore": 0.8,
                    "severityScore": 2,
                }
            )

        nose = landmarks[1]
        centered = 0.35 * w <= nose[0] <= 0.65 * w
        if not centered:
            incidents.append(
                {
                    "type": "LOOKING_AWAY",
                    "severity": "MEDIUM",
                    "confidenceScore": 0.75,
                    "severityScore": 2,
                }
            )

        return incidents
