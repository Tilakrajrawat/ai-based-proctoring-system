"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type AccessState = "checking" | "granted" | "denied";

export default function StudentExamPage() {
  const { examId } = useParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [access, setAccess] = useState<AccessState>("checking");
  const [showPreview, setShowPreview] = useState(true);
  useEffect(() => {
    if (access !== "granted") return;
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    fetch(`http://localhost:8080/api/exams/${examId}/start`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.id);
      });
  }, [access, examId]);
  
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      Promise.resolve().then(() => setAccess("denied"));
      return;
    }

    fetch(`http://localhost:8080/api/exams/${examId}/access`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        Promise.resolve().then(() => setAccess("granted"));
      })
      .catch(() => {
        Promise.resolve().then(() => setAccess("denied"));
      });
  }, [examId]);

  useEffect(() => {
    if (access !== "granted") return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [access]);
  useEffect(() => {
    if (!sessionId) return;
  
    const token = localStorage.getItem("token");
    if (!token) return;
  
    const interval = setInterval(() => {
      fetch(
        `http://localhost:8080/api/sessions/${sessionId}/heartbeat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }, 5000);
  
    return () => clearInterval(interval);
  }, [sessionId]);
  
  if (access === "checking") return <p>Checking exam access...</p>;
  if (access === "denied") return <p>Access denied</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>Exam ID: {examId}</h2>

      <button onClick={() => setShowPreview((p) => !p)}>
        {showPreview ? "Hide Camera Preview" : "Show Camera Preview"}
      </button>

      <div style={{ marginTop: 20 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: 300,
            display: showPreview ? "block" : "none",
          }}
        />
      </div>

      {!showPreview && <p>Camera is running</p>}
    </div>
    
  );
}
