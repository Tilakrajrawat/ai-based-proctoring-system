"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useStudentWebRTC } from "./useStudentWebRTC";
import { getAuthHeaders } from "../../../lib/auth";
import api from "../../../lib/api";
import { MyExamStatus, StudentQuestion } from "../../../lib/exam-types";

type AccessState = "checking" | "granted" | "denied" | "submitted";
type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";
type ViolationType = "TAB_SWITCH" | "WINDOW_BLUR" | "FULLSCREEN_EXIT" | "BROWSER_BACK";

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

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
  const submittingRef = useRef(false);
  const lastViolationRef = useRef<Record<string, number>>({});

  const [access, setAccess] = useState<AccessState>("checking");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus>("ACTIVE");
  const [showPreview, setShowPreview] = useState(true);
  const [questions, setQuestions] = useState<StudentQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [examStatus, setExamStatus] = useState<MyExamStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(60 * 60);

  // Fullscreen / lockdown state
  const [showFullscreenGate, setShowFullscreenGate] = useState(true);
  const [fullscreenAccepted, setFullscreenAccepted] = useState(false);
  const [lockdownActive, setLockdownActive] = useState(false);

  useStudentWebRTC({ examId, sessionId, stream });

  const reportIncident = useCallback(
    async (type: ViolationType) => {
      if (!sessionId) return;

      try {
        await fetch(`${API}/api/incidents`, {
          method: "POST",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ sessionId, type, confidence: 0.95 }),
        });
      } catch (err) {
        console.error("Failed to report incident", err);
      }
    },
    [sessionId]
  );

  const handleViolation = useCallback(
    async (type: ViolationType) => {
      if (!sessionId || status === "SUBMITTED" || access === "submitted") return;

      const now = Date.now();
      const lastTime = lastViolationRef.current[type] ?? 0;

      // prevent duplicate spam within 2.5s
      if (now - lastTime < 2500) return;

      lastViolationRef.current[type] = now;

      try {
        await reportIncident(type);

        // refresh session so backend-driven suspend reflects quickly
        const res = await fetch(`${API}/api/sessions/${sessionId}`, {
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setStatus(data.status as SessionStatus);
          }
        }
      } catch (err) {
        console.error("Failed to handle violation", err);
      }
    },
    [sessionId, status, access, reportIncident]
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

    try {
      await fetch(`${API}/api/frames`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ sessionId, frame }),
      });
    } catch (err) {
      console.error("Failed to send frame", err);
    }
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

    if (statusRes.data?.attemptedCount && questionRes.data.length > 0) {
      // optional: keep current as 0; backend doesn't expose answers here
    }
  }, [examId]);

  const handleSubmit = useCallback(
    async (autoSubmitted = false, reason?: string) => {
      if (!examId || !sessionId || submittingRef.current) return;

      try {
        submittingRef.current = true;

        await api.post(`/api/exams/${examId}/submit`, {
          sessionId,
          autoSubmitted,
          reason,
        });

        await fetch(`${API}/api/sessions/${sessionId}/end`, {
          method: "POST",
          headers: getAuthHeaders(),
        }).catch(() => {});

        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch {
            // ignore
          }
        }

        stopStream();
        setLockdownActive(false);
        setStatus("SUBMITTED");
        setAccess("submitted");
      } catch (err) {
        console.error("Failed to submit exam", err);

        if (document.fullscreenElement) {
          try {
            await document.exitFullscreen();
          } catch {
            // ignore
          }
        }

        stopStream();
        setLockdownActive(false);
        setStatus("SUBMITTED");
        setAccess("submitted");
      }
    },
    [examId, sessionId, stopStream]
  );

  const enterFullscreenAndStart = useCallback(async () => {
    try {
      const el = document.documentElement;

      if (el.requestFullscreen) {
        await el.requestFullscreen();
      }

      setFullscreenAccepted(true);
      setShowFullscreenGate(false);
      setLockdownActive(true);
    } catch (err) {
      console.error("Fullscreen request failed", err);
    }
  }, []);

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

    void checkAccess();
  }, [examId]);

  useEffect(() => {
    if (access !== "granted" || startedRef.current || !examId) return;

    const startSession = async () => {
      startedRef.current = true;

      try {
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
      } catch (err) {
        console.error("Failed to start session", err);
        setAccess("submitted");
      }
    };

    void startSession();
  }, [access, examId, loadExamContent]);

  // Get camera stream only
  useEffect(() => {
    if (access !== "granted" || stream) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s);
      })
      .catch((err) => {
        console.error("Failed to access webcam", err);
        setStatus("SUSPENDED");
      });
  }, [access, stream]);

  // Attach stream when video element becomes available (fixes blank preview after fullscreen gate)
  useEffect(() => {
    if (!videoRef.current || !stream) return;

    videoRef.current.srcObject = stream;
    void videoRef.current.play().catch(() => {});
  }, [stream, showFullscreenGate]);

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
      try {
        const res = await fetch(`${API}/api/sessions/${sessionId}`, {
          headers: getAuthHeaders(),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status) {
            setStatus(data.status as SessionStatus);
          }
        }
      } catch (err) {
        console.error("Failed to poll session", err);
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || status !== "ACTIVE") return;

    frameRef.current = setInterval(() => {
      void sendFrame();
    }, 2000);

    return () => {
      if (frameRef.current) clearInterval(frameRef.current);
    };
  }, [sessionId, status, sendFrame]);

  // Lockdown: report violations only (backend decides suspension)
  useEffect(() => {
    if (!lockdownActive || status === "SUBMITTED" || access === "submitted") return;

    const onVisibility = () => {
      if (document.hidden) {
        void handleViolation("TAB_SWITCH");
      }
    };

    const onBlur = () => {
      void handleViolation("WINDOW_BLUR");
    };

    const onFullscreen = () => {
      if (!document.fullscreenElement && fullscreenAccepted) {
        void handleViolation("FULLSCREEN_EXIT");
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
  }, [lockdownActive, status, access, fullscreenAccepted, handleViolation]);

  // Browser back => report incident only, keep student on page
  useEffect(() => {
    if (!lockdownActive || status === "SUBMITTED" || access === "submitted") return;

    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      window.history.pushState(null, "", window.location.href);
      void handleViolation("BROWSER_BACK");
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [lockdownActive, status, access, handleViolation]);

  // If backend ends/submits session, reflect immediately
  useEffect(() => {
    if (status === "SUBMITTED" || status === "ENDED") {
      stopStream();
      setLockdownActive(false);
      setAccess("submitted");
    }
  }, [status, stopStream]);

  useEffect(() => {
    if (status === "SUBMITTED" || access === "submitted") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          void handleSubmit(true, "TIME_UP");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, access, handleSubmit]);

  const saveAnswer = async (questionId: string, selectedOptionIndex: number) => {
    if (!examId || !sessionId || status !== "ACTIVE") return;

    setAnswers((prev) => ({ ...prev, [questionId]: selectedOptionIndex }));

    try {
      const res = await api.post<MyExamStatus>(`/api/exams/${examId}/responses/save`, {
        sessionId,
        questionId,
        selectedOptionIndex,
      });
      setExamStatus(res.data);
    } catch (err) {
      console.error("Failed to save answer", err);
    }
  };

  const progressCount = useMemo(
    () => examStatus?.attemptedCount ?? Object.keys(answers).length,
    [answers, examStatus]
  );

  const activeQuestion = questions[current];
  const progressPercent =
    questions.length > 0 ? Math.round((progressCount / questions.length) * 100) : 0;

  if (access === "checking") {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">Verifying exam access...</p>
        </div>
      </main>
    );
  }

  if (access === "denied") {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-xl p-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Access Denied</h1>
          <p className="mt-3 text-white/60">
            You are not authorized to start this exam or your session is unavailable.
          </p>
          <button onClick={() => router.replace("/dashboard")} className="ai-button-primary mt-6">
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (status === "SUBMITTED" || status === "ENDED" || access === "submitted") {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-xl p-8 text-center">
          <h1 className="text-3xl font-semibold text-white">Exam Submitted</h1>
          <p className="mt-3 text-white/60">Your responses were submitted successfully.</p>
          <button onClick={() => router.replace("/dashboard")} className="ai-button-primary mt-6">
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Fullscreen gate before actual exam starts
  if (showFullscreenGate && access === "granted" && sessionId) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-2xl p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Secure Exam Mode Required
          </p>

          <h1 className="mt-3 text-3xl font-semibold text-white">Fullscreen Required</h1>

          <p className="mt-4 text-sm leading-7 text-white/65">
            To continue, you must enter fullscreen mode. Leaving fullscreen, changing tabs,
            losing focus, or using browser back will be reported as a violation. The backend
            may suspend your session automatically if your risk score becomes too high.
          </p>

          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            Clicking “I Don’t Agree” will immediately submit your exam.
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button onClick={enterFullscreenAndStart} className="ai-button-primary flex-1">
              Agree & Enter Fullscreen
            </button>

            <button
              onClick={() => {
                void handleSubmit(true, "FULLSCREEN_REFUSED");
              }}
              className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
            >
              I Don’t Agree
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 xl:grid-cols-[1.65fr_0.9fr]">
        {/* LEFT PANEL */}
        <section className="glass-card accent-border p-4 md:p-6">
          {/* Top Header */}
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Active Exam Session
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Exam Console
              </h1>
              <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <InfoBadge label="Time Left" value={formatTime(timeLeft)} color="red" />
              <InfoBadge
                label="Progress"
                value={`${progressCount}/${questions.length}`}
                color="cyan"
              />
              <InfoBadge
                label="Session"
                value={status}
                color={status === "ACTIVE" ? "green" : "red"}
              />
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6 rounded-2xl border border-white/6 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-white/65">Completion Progress</span>
              <span className="font-medium text-white">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {status === "SUSPENDED" && (
            <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              Exam session suspended. Please contact the proctor immediately.
            </div>
          )}

          {/* Question Panel */}
          {activeQuestion ? (
            <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-5 md:p-6">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-white/45">
                    Question {current + 1} of {questions.length}
                  </p>
                  <p className="mt-2 text-sm text-white/55">Marks: {activeQuestion.marks}</p>
                </div>

                <span className="badge-chip">
                  {answers[activeQuestion.id] !== undefined ? "Answered" : "Not Answered"}
                </span>
              </div>

              <h2 className="text-lg font-medium leading-8 text-white md:text-xl">
                {activeQuestion.questionText}
              </h2>

              <div className="mt-6 space-y-3">
                {activeQuestion.options.map((opt, idx) => {
                  const selected = answers[activeQuestion.id] === idx;

                  return (
                    <button
                      key={idx}
                      onClick={() => saveAnswer(activeQuestion.id, idx)}
                      disabled={status !== "ACTIVE"}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selected
                          ? "border-cyan-400/40 bg-cyan-400/10 text-white"
                          : "border-white/6 bg-white/[0.02] text-white/85 hover:bg-white/[0.05]"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                            selected
                              ? "bg-cyan-400 text-slate-950"
                              : "bg-white/6 text-white/70"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="leading-7">{opt}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/6 bg-white/[0.03] p-8 text-center text-white/60">
              No questions available.
            </div>
          )}

          {/* Navigation */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              disabled={current === 0}
              onClick={() => setCurrent((v) => Math.max(0, v - 1))}
              className="ai-button-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <button
              disabled={current >= questions.length - 1}
              onClick={() => setCurrent((v) => Math.min(questions.length - 1, v + 1))}
              className="ai-button-secondary flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>

            <button
              onClick={() => {
                void handleSubmit(false);
              }}
              className="ai-button-primary flex-1"
            >
              Final Submit
            </button>
          </div>
        </section>

        {/* RIGHT PANEL */}
        <aside className="space-y-4">
          {/* Camera */}
          <section className="glass-card accent-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Live Camera</h2>
                <p className="text-sm text-white/55">AI preview stream</p>
              </div>

              <button
                onClick={() => setShowPreview(!showPreview)}
                className="ai-button-secondary px-3 py-2 text-sm"
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/6 bg-black/30">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`aspect-video w-full object-cover ${showPreview ? "block" : "hidden"}`}
              />
              {!showPreview && (
                <div className="flex aspect-video items-center justify-center text-sm text-white/45">
                  Camera preview hidden
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </section>

          {/* Monitoring Status */}
          <section className="glass-card accent-border p-4">
            <h2 className="text-lg font-semibold text-white">Monitoring Status</h2>

            <div className="mt-4 grid gap-3">
              <StatusRow
                label="Webcam Stream"
                value={stream ? "Connected" : "Unavailable"}
                ok={!!stream}
              />
              <StatusRow label="Session Status" value={status} ok={status === "ACTIVE"} />
              <StatusRow
                label="Heartbeat"
                value={heartbeatFails.current < 3 ? "Stable" : "Unstable"}
                ok={heartbeatFails.current < 3}
              />
              <StatusRow
                label="Fullscreen Lock"
                value={lockdownActive ? "Enabled" : "Pending"}
                ok={lockdownActive}
              />
              <StatusRow label="Violation Logging" value="Enabled" ok />
            </div>
          </section>

          {/* Question Navigator */}
          <section className="glass-card accent-border p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Question Navigator</h2>
              <span className="badge-chip">{questions.length} total</span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isCurrent = idx === current;
                const answered = answers[q.id] !== undefined;

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(idx)}
                    className={`rounded-xl border py-2 text-sm font-medium transition ${
                      isCurrent
                        ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-200"
                        : answered
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                          : "border-white/6 bg-white/[0.03] text-white/70 hover:bg-white/[0.05]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Actions */}
          <section className="glass-card accent-border p-4">
            <h2 className="text-lg font-semibold text-white">Actions</h2>
            <div className="mt-4 grid gap-3">
              <button
                onClick={() => {
                  void handleSubmit(true, "LEFT_EXAM_TO_DASHBOARD");
                }}
                className="ai-button-secondary w-full"
              >
                Back to Dashboard
              </button>

              <button
                onClick={() => {
                  void handleSubmit(false);
                }}
                className="ai-button-primary w-full"
              >
                Submit Exam Now
              </button>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function InfoBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "green" | "red";
}) {
  const style =
    color === "cyan"
      ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-200"
      : color === "green"
        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
        : "border-red-500/20 bg-red-500/10 text-red-200";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${style}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          ok ? "bg-emerald-500/10 text-emerald-300" : "bg-red-500/10 text-red-300"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${`${seconds}`.padStart(2, "0")}`;
}