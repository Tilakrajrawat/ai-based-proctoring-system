"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type AccessState = "checking" | "granted" | "denied" | "submitted";
type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

const API = "http://localhost:8080";

export default function StudentExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const startedRef = useRef(false);
  const heartbeatFails = useRef(0);

  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("ACTIVE");
  const [showPreview, setShowPreview] = useState(true);

  /* ---------------- ACCESS CHECK ---------------- */

  useEffect(() => {
    if (!examId) return;

    const run = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) throw new Error();

        const res = await fetch(`${API}/api/exams/${examId}/access`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error();
        setAccess("granted");
      } catch {
        setAccess("denied");
      }
    };

    run();
  }, [examId]);

  /* ---------------- START SESSION ---------------- */

  useEffect(() => {
    if (access !== "granted" || startedRef.current || !examId) return;

    const run = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

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

    run();
  }, [access, examId]);

  /* ---------------- CAMERA (NEVER STOP) ---------------- */

  useEffect(() => {
    if (access !== "granted") return;
    if (streamRef.current) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        setStatus("SUSPENDED");
      });
  }, [access]);

  /* ---------------- HEARTBEAT (TOLERANT) ---------------- */

  useEffect(() => {
    if (!sessionId || status !== "ACTIVE") return;

    heartbeatRef.current = setInterval(async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch(
          `${API}/api/sessions/${sessionId}/heartbeat`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error();
        heartbeatFails.current = 0;
      } catch {
        heartbeatFails.current += 1;
        if (heartbeatFails.current >= 3) {
          setStatus("SUSPENDED");
        }
      }
    }, 5000);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [sessionId, status]);

  /* ---------------- POLL SESSION (SAFE JSON) ---------------- */

  useEffect(() => {
    if (!sessionId) return;

    pollRef.current = setInterval(async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const text = await res.text();
      if (!text) return;

      const data = JSON.parse(text);
      if (data.status) setStatus(data.status);
    }, 3000);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sessionId]);

  /* ---------------- CLEANUP ON EXIT ---------------- */

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /* ---------------- TERMINAL STATES ---------------- */

  if (access === "checking") return <p>Checking exam access…</p>;
  if (access === "denied") return <p>Access denied</p>;
  if (access === "submitted") return <p>Exam already submitted</p>;
  if (status === "ENDED" || status === "SUBMITTED")
    return <p>Exam submitted</p>;

  /* ---------------- UI ---------------- */

  return (
    <div style={{ padding: 24, position: "relative" }}>
      <h2>Exam ID: {examId}</h2>

      <button onClick={() => setShowPreview(v => !v)}>
        {showPreview ? "Hide Camera Preview" : "Show Camera Preview"}
      </button>

      <div style={{ marginTop: 16 }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: 320, display: showPreview ? "block" : "none" }}
        />
      </div>

      {!showPreview && <p>Camera is running</p>}

      {status === "SUSPENDED" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <h2>Exam Suspended</h2>
          <p>Please wait until the proctor resumes your exam.</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>
            Camera is still active
          </p>
        </div>
      )}

      <button
        onClick={async () => {
          if (!sessionId) return;

          const token = localStorage.getItem("token");
          if (!token) return;

          await fetch(`${API}/api/sessions/${sessionId}/end`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });

          setSessionId(null);
          setStatus("SUBMITTED");
          router.replace("/dashboard");
        }}
        disabled={status === "SUSPENDED"}
        style={{
          background: "#e53935",
          color: "white",
          padding: "10px 16px",
          borderRadius: 6,
          marginTop: 16,
          opacity: status === "SUSPENDED" ? 0.5 : 1,
        }}
      >
        End Exam
      </button>
    </div>
  );
}