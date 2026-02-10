"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentWebRTC } from "./useStudentWebRTC";

type AccessState = "checking" | "granted" | "denied" | "submitted";
type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

const API = "http://localhost:8080";

export default function StudentExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // FIX: Explicitly typing the state prevents the 'never' error
  const [stream, setStream] = useState<MediaStream | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startedRef = useRef(false);
  const heartbeatFails = useRef(0);

  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("ACTIVE");
  const [showPreview, setShowPreview] = useState(true);

  // Initialize WebRTC logic
  useStudentWebRTC({ sessionId, stream });

  /* ---------------- HELPERS ---------------- */
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  /* ---------------- ACCESS CHECK ---------------- */
  useEffect(() => {
    if (!examId) return;
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/exams/${examId}/access`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        setAccess("granted");
      } catch {
        setAccess("denied");
      }
    };
    checkAccess();
  }, [examId]);

  /* ---------------- START SESSION ---------------- */
  useEffect(() => {
    if (access !== "granted" || startedRef.current || !examId) return;
    const startSession = async () => {
      const token = localStorage.getItem("token");
      startedRef.current = true;
      const res = await fetch(`${API}/api/exams/${examId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setAccess("submitted");
        return;
      }
      const data = await res.json();
      setSessionId(data.id);
    };
    startSession();
  }, [access, examId]);

  /* ---------------- CAMERA ---------------- */
  useEffect(() => {
    if (access !== "granted" || stream) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setStatus("SUSPENDED"));

    return () => {
      // Logic handled in specific cleanup or stopStream
    };
  }, [access, stream]);

  /* ---------------- HEARTBEAT ---------------- */
  useEffect(() => {
    if (!sessionId || status !== "ACTIVE") return;

    heartbeatRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/sessions/${sessionId}/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error();
        heartbeatFails.current = 0;
      } catch {
        heartbeatFails.current += 1;
        if (heartbeatFails.current >= 3) setStatus("SUSPENDED");
      }
    }, 5000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionId, status]);

  /* ---------------- POLL STATUS ---------------- */
  useEffect(() => {
    if (!sessionId) return;
    pollRef.current = setInterval(async () => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  /* ---------------- UI LOGIC ---------------- */
  const handleEndExam = async () => {
    if (!sessionId) return;
    const token = localStorage.getItem("token");
    await fetch(`${API}/api/sessions/${sessionId}/end`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    stopStream();
    setStatus("SUBMITTED");
    router.replace("/dashboard");
  };

  if (access === "checking") return <div>Loading...</div>;
  if (access === "denied") return <div>Access Denied</div>;
  if (status === "SUBMITTED" || access === "submitted") return <div>Exam Completed</div>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Exam: {examId}</h1>
      
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? "Hide Preview" : "Show Preview"}
        </button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ 
          width: "300px", 
          display: showPreview ? "block" : "none",
          border: "2px solid #ccc",
          borderRadius: "8px"
        }}
      />

      {status === "SUSPENDED" && (
        <div style={{ color: "red", fontWeight: "bold", padding: "10px", border: "1px solid red" }}>
          EXAM SUSPENDED - Contact Proctor
        </div>
      )}

      <button 
        onClick={handleEndExam} 
        style={{ marginTop: 20, padding: "10px 20px", background: "red", color: "white", borderRadius: "4px" }}
      >
        End Exam
      </button>
    </div>
  );
}