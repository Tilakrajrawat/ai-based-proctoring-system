"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentWebRTC } from "./useStudentWebRTC";
import { getAuthHeaders } from "../../../lib/auth";
import StatusBadge from "../../../components/StatusBadge";

type AccessState = "checking" | "granted" | "denied" | "submitted";
type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";
type Question = { id: string; text: string; options: { id: string; label: "A" | "B" | "C" | "D"; text: string }[] };

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
  const [riskScore, setRiskScore] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  useStudentWebRTC({ examId, sessionId, stream });

  const currentQuestion = questions[currentIndex];

  const submitAnswers = useCallback(async () => {
    if (submitted || !examId) return;
    const payload = {
      answers: Object.entries(answers).map(([questionId, selectedOption]) => ({ questionId, selectedOption })),
    };
    try {
      await fetch(`${API}/api/exams/${examId}/submit`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });
    } finally {
      setSubmitted(true);
      setStatus("SUBMITTED");
      stopStream();
    }
  }, [answers, examId, submitted]);

  const reportIncident = useCallback(
    async (type: "TAB_SWITCH" | "WINDOW_BLUR" | "FULLSCREEN_EXIT") => {
      if (!sessionId) return;
      await fetch(`${API}/api/incidents`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ sessionId, type, confidence: 0.95 }),
      });
      setIncidentCount((prev) => prev + 1);
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

  useEffect(() => {
    if (!examId) return;
    const checkAccess = async () => {
      try {
        const res = await fetch(`${API}/api/exams/${examId}/access`, { headers: getAuthHeaders() });
        if (!res.ok) throw new Error();
        setAccess("granted");
      } catch {
        setAccess("denied");
      }
    };
    void checkAccess();
  }, [examId]);

  useEffect(() => {
    if (!examId || access !== "granted") return;
    const loadQuestions = async () => {
      const res = await fetch(`${API}/api/exams/${examId}/questions`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setQuestions(data.questions ?? []);
      setTimeLeft((data.durationMinutes ?? 60) * 60);
    };
    void loadQuestions();
  }, [access, examId]);

  useEffect(() => {
    if (access !== "granted" || startedRef.current || !examId) return;
    const startSession = async () => {
      startedRef.current = true;
      const res = await fetch(`${API}/api/exams/${examId}/start`, { method: "POST", headers: getAuthHeaders() });
      if (!res.ok) {
        setAccess("submitted");
        return;
      }
      const data = await res.json();
      setSessionId(data.id);
    };
    void startSession();
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
        const res = await fetch(`${API}/api/sessions/${sessionId}/heartbeat`, { method: "POST", headers: getAuthHeaders() });
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
      const res = await fetch(`${API}/api/sessions/${sessionId}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (typeof data.totalSeverity === "number") setRiskScore(data.totalSeverity);
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
      if (!document.fullscreenElement) void reportIncident("FULLSCREEN_EXIT");
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

  useEffect(() => {
    if (submitted || status !== "ACTIVE") return;
    if (timeLeft <= 0 && questions.length > 0) {
      void submitAnswers();
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted, status, submitAnswers, questions.length]);

  const handleEndExam = async () => {
    if (!sessionId) return;
    await fetch(`${API}/api/sessions/${sessionId}/end`, { method: "POST", headers: getAuthHeaders() });
    stopStream();
    setStatus("SUBMITTED");
    router.replace("/dashboard");
  };

  const timerText = useMemo(() => {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const s = (timeLeft % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [timeLeft]);

  if (access === "checking") return <div className="p-6">Loading...</div>;
  if (access === "denied") return <div className="p-6">Access Denied</div>;
  if (status === "SUBMITTED" || access === "submitted" || submitted) {
    return (
      <div className="min-h-screen grid place-items-center p-5">
        <div className="relative w-full max-w-lg bg-white/[0.04] backdrop-blur-2xl border border-emerald-400/30 rounded-2xl shadow-[0_0_45px_rgba(0,230,118,0.22)] p-8 text-center">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="text-5xl text-emerald-300 mb-3">✓</div>
          <h2 className="text-2xl">Submission Confirmed</h2>
          <p className="text-white/60 mt-2">Your answers and monitoring data were submitted successfully.</p>
        </div>
      </div>
    );
  }

  const progress = questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-4">
      <header className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-2xl">Exam Session {examId}</h1>
        <div className="flex items-center gap-3">
          <StatusBadge status={status === "SUSPENDED" ? "critical" : "safe"} />
          <p className={`timer text-xl ${timeLeft <= 300 ? "text-rose-300 live-pulse" : "text-white"}`}>{timerText}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4"><div className="h-full bg-blue-400" style={{ width: `${progress}%` }} /></div>
          <p className="text-white/60 text-sm mb-2">Question {currentIndex + 1} / {questions.length || 0}</p>
          <p className="text-xl mb-4">{currentQuestion?.text ?? "Loading questions..."}</p>
          <div className="space-y-2">
            {currentQuestion?.options.map((option) => {
              const selected = answers[currentQuestion.id] === option.id;
              return (
                <button key={option.id} onClick={() => setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option.id }))} className={`w-full text-left rounded-xl p-3 border transition hover:bg-white/10 active:scale-[0.98] ${selected ? "bg-blue-500/10 border-blue-500/50 text-blue-300" : "bg-white/[0.03] border-white/10"}`}>
                  <span className="font-mono mr-2">{option.label}.</span>{option.text}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {questions.map((question, i) => {
              const answered = Boolean(answers[question.id]);
              const current = i === currentIndex;
              return <button key={question.id} onClick={() => setCurrentIndex(i)} className={`h-3 rounded-full transition-all ${current ? "w-8 bg-blue-400" : answered ? "w-3 bg-emerald-400" : "w-3 bg-white/20"}`} />;
            })}
          </div>

          <div className="flex justify-between mt-5">
            <button onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0} className="px-4 py-2 rounded-xl bg-white/10 disabled:opacity-40 hover:bg-white/20 active:scale-[0.98]">Previous</button>
            {currentIndex < questions.length - 1 ? (
              <button onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))} className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-200 hover:bg-blue-500/30 active:scale-[0.98]">Next</button>
            ) : (
              <button onClick={() => void submitAnswers()} className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/30 active:scale-[0.98]">Submit</button>
            )}
          </div>
        </section>

        <section className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d15] min-h-[280px] grid place-items-center">
            <video ref={videoRef} autoPlay muted playsInline className={`${showPreview ? "block" : "hidden"} w-full h-full object-cover`} />
            <div className="pointer-events-none absolute inset-0">
              <div className="scan-line h-16 bg-gradient-to-b from-blue-400/0 via-blue-400/30 to-blue-400/0" />
              <div className="absolute left-3 top-3 h-6 w-6 border-l border-t border-blue-300/70" />
              <div className="absolute right-3 top-3 h-6 w-6 border-r border-t border-blue-300/70" />
              <div className="absolute left-3 bottom-3 h-6 w-6 border-l border-b border-blue-300/70" />
              <div className="absolute right-3 bottom-3 h-6 w-6 border-r border-b border-blue-300/70" />
            </div>
            <button onClick={() => setShowPreview((p) => !p)} className="absolute top-3 right-3 px-2 py-1 text-xs rounded bg-black/40 hover:bg-black/60 active:scale-[0.98]">{showPreview ? "Hide" : "Show"}</button>
            <span className="absolute left-3 top-3 text-xs flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400 live-pulse" />LIVE</span>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-white/50 text-xs">Risk Score</p><p className="font-mono text-xl">{riskScore.toFixed(1)}</p></div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-white/50 text-xs">Incidents</p><p className="font-mono text-xl">{incidentCount}</p></div>
          </div>
          {status === "SUSPENDED" && <p className="mt-4 rounded-xl bg-rose-500/10 border border-rose-400/30 text-rose-300 p-3">EXAM SUSPENDED - Contact Proctor</p>}
          <button onClick={handleEndExam} className="mt-4 w-full px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-400/30 text-rose-200 hover:bg-rose-500/30 active:scale-[0.98]">End Exam</button>
        </section>
      </div>
    </div>
  );
}
