"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentWebRTC } from "./useStudentWebRTC";
import { getAuthHeaders } from "../../../lib/auth";
import api from "../../../lib/api";
import { MyExamStatus, StudentQuestion } from "../../../lib/exam-types";

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
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [examStatus, setExamStatus] = useState<MyExamStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60);

  useStudentWebRTC({ examId, sessionId, stream });

  const reportIncident = useCallback(
    async (type: "TAB_SWITCH" | "WINDOW_BLUR" | "FULLSCREEN_EXIT") => {
      if (!sessionId) return;
      await fetch(`${API}/api/incidents`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
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

    await fetch(`${API}/api/frames`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ sessionId, frame }),
    });
  }, [sessionId, status]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const loadExamContent = useCallback(async () => {
    if (!examId) return;
    const [questionRes, statusRes] = await Promise.all([
      api.get<StudentQuestion[]>(`/api/exams/${examId}/questions/student-view`),
      api.get<MyExamStatus>(`/api/exams/${examId}/my-status`),
    ]);
    setQuestions(questionRes.data);
    setExamStatus(statusRes.data);
  }, [examId]);

  useEffect(() => {
    if (!examId) return;
    const checkAccess = async () => {
      try {
        const res = await fetch(`${API}/api/exams/${examId}/access`, {
          headers: getAuthHeaders(),
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
      startedRef.current = true;
      const res = await fetch(`${API}/api/exams/${examId}/start`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        setAccess("submitted");
        return;
      }
      const data = await res.json();
      setSessionId(data.id);
      await loadExamContent();
    };
    startSession();
  }, [access, examId, loadExamContent]);

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
        const res = await fetch(`${API}/api/sessions/${sessionId}/heartbeat`, {
          method: "POST",
          headers: getAuthHeaders(),
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
      const res = await fetch(`${API}/api/sessions/${sessionId}`, {
        headers: getAuthHeaders(),
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

  const saveAnswer = async (questionId: string, selectedOptionIndex: number) => {
    if (!examId || !sessionId) return;
    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionIndex }));
    const res = await api.post<MyExamStatus>(`/api/exams/${examId}/responses/save`, {
      sessionId,
      questionId,
      selectedOptionIndex,
    });
    setExamStatus(res.data);
  };

  const handleSubmit = useCallback(async (autoSubmitted = false) => {
    if (!examId || !sessionId) return;
    await api.post(`/api/exams/${examId}/submit`, { sessionId, autoSubmitted });
    await fetch(`${API}/api/sessions/${sessionId}/end`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    stopStream();
    setStatus("SUBMITTED");
  }, [examId, sessionId, stopStream]);

  useEffect(() => {
    if (status === "SUBMITTED" || access === "submitted") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, access, handleSubmit]);

  const progressCount = useMemo(() => Object.keys(answers).length, [answers]);
  const activeQuestion = questions[current];

  if (access === "checking") return <div className="p-6">Loading...</div>;
  if (access === "denied") return <div className="p-6">Access Denied</div>;
  if (status === "SUBMITTED" || access === "submitted") {
    return <div className="p-8 text-xl">Exam submitted successfully.</div>;
  }

  return (
    <div className="p-4 md:p-8 grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Exam: {examId}</h1>
          <div className="text-sm text-red-400 font-semibold">Time Left: {Math.floor(timeLeft / 60)}:{`${timeLeft % 60}`.padStart(2, "0")}</div>
        </div>

        <div className="text-sm text-gray-300">Progress: {examStatus?.attemptedCount ?? progressCount}/{questions.length}</div>

        {activeQuestion ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-400">Question {current + 1} of {questions.length}</div>
            <h2 className="text-lg font-medium">{activeQuestion.questionText}</h2>
            <div className="space-y-2">
              {activeQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => saveAnswer(activeQuestion.id, idx)}
                  className={`w-full text-left p-3 rounded border ${answers[activeQuestion.id] === idx ? "border-blue-500 bg-blue-500/10" : "border-gray-700"}`}
                >
                  {String.fromCharCode(65 + idx)}. {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>No questions available.</div>
        )}

        <div className="flex justify-between">
          <button disabled={current === 0} onClick={() => setCurrent((v) => Math.max(0, v - 1))} className="px-3 py-2 border rounded disabled:opacity-50">Previous</button>
          <button disabled={current >= questions.length - 1} onClick={() => setCurrent((v) => Math.min(questions.length - 1, v + 1))} className="px-3 py-2 border rounded disabled:opacity-50">Next</button>
        </div>

        <button onClick={() => handleSubmit(false)} className="w-full bg-green-600 hover:bg-green-700 p-2 rounded">Final Submit</button>
      </div>

      <div className="rounded-xl border p-4 space-y-4">
        <button onClick={() => setShowPreview(!showPreview)} className="px-3 py-1 border rounded w-full">
          {showPreview ? "Hide Camera Preview" : "Show Camera Preview"}
        </button>
        <video ref={videoRef} autoPlay muted playsInline className={`w-full rounded border ${showPreview ? "block" : "hidden"}`} />
        <canvas ref={canvasRef} className="hidden" />

        {status === "SUSPENDED" && (
          <div className="text-red-400 border border-red-500 rounded p-3">EXAM SUSPENDED - Contact Proctor</div>
        )}

        <div className="grid grid-cols-5 gap-2">
          {questions.map((q, idx) => (
            <button key={q.id} onClick={() => setCurrent(idx)} className={`py-1 rounded text-sm border ${answers[q.id] !== undefined ? "bg-emerald-600/20 border-emerald-500" : "border-gray-700"}`}>
              {idx + 1}
            </button>
          ))}
        </div>

        <button onClick={() => router.replace("/dashboard")} className="w-full border rounded p-2">Back to Dashboard</button>
      </div>
    </div>
  );
}
