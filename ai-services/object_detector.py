from __future__ import annotations

from typing import Any, Dict, List

import numpy as np

try:
    from ultralytics import YOLO
except Exception:  # pragma: no cover - optional dependency fallback
    YOLO = None


class ObjectDetector:
    """YOLOv8 object detector for phones and multiple-person detection."""

    PERSON_CLASS_ID = 0
    CELL_PHONE_CLASS_ID = 67

    def __init__(self, model_path: str = "yolov8n.pt") -> None:
        self.model = YOLO(model_path) if YOLO else None

    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        if self.model is None:
            return []

        incidents: List[Dict[str, Any]] = []
        results = self.model(frame, verbose=False)
        if not results:
            return incidents

        boxes = results[0].boxes
        person_confidences = []

        for box in boxes:
            class_id = int(box.cls.item())
            confidence = float(box.conf.item())

            if class_id == self.PERSON_CLASS_ID:
                person_confidences.append(confidence)
            elif class_id == self.CELL_PHONE_CLASS_ID:
                incidents.append(
                    {
                        "type": "PHONE_DETECTED",
                        "severity": "HIGH",
                        "confidenceScore": round(confidence, 4),
                        "severityScore": 4,
                    }
                )

        if len(person_confidences) > 1:
            incidents.append(
                {
                    "type": "MULTIPLE_FACES_DETECTED",
                    "severity": "HIGH",
                    "confidenceScore": round(max(person_confidences), 4),
                    "severityScore": 4,
                }
            )

        return incidents
