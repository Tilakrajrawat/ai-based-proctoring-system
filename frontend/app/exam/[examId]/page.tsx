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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef<NodeJS.Timeout | null>(null);

  const startedRef = useRef(false);
  const heartbeatFails = useRef(0);

  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("ACTIVE");
  const [showPreview, setShowPreview] = useState(true);

  useStudentWebRTC({ examId, sessionId, stream });

  const reportIncident = useCallback(
    async (type: "TAB_SWITCH" | "WINDOW_BLUR" | "FULLSCREEN_EXIT") => {
      if (!sessionId) return;
      const token = localStorage.getItem("token");
      await fetch(`${API}/api/incidents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId, type, confidence: 0.95 }),
      });
    },
    [sessionId]
  );

  const sendFrame = useCallback(async () => {
    if (!sessionId || !videoRef.current || !canvasRef.current || status !== "ACTIVE") {
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = canvas.toDataURL("image/jpeg", 0.7);

    const token = localStorage.getItem("token");
    await fetch(`${API}/api/frames`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sessionId, frame }),
    });
  }, [sessionId, status]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

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

  useEffect(() => {
    if (access !== "granted" || stream) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setStatus("SUSPENDED"));
  }, [access, stream]);

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

  useEffect(() => {
    if (!sessionId || status !== "ACTIVE") return;
    frameRef.current = setInterval(sendFrame, 2000);

    return () => {
      if (frameRef.current) clearInterval(frameRef.current);
    };
  }, [sessionId, status, sendFrame]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) void reportIncident("TAB_SWITCH");
    };

    const onBlur = () => void reportIncident("WINDOW_BLUR");

    const onFullscreen = () => {
      if (!document.fullscreenElement) {
        void reportIncident("FULLSCREEN_EXIT");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [reportIncident]);

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
          borderRadius: "8px",
        }}
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />

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
