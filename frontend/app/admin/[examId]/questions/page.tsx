"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../../../lib/api";
import { AdminQuestion, ExamResult } from "../../../../lib/exam-types";

type QuestionPayload = {
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
  displayOrder: number;
};

const emptyPayload: QuestionPayload = {
  questionText: "",
  options: ["", "", "", ""],
  correctOptionIndex: 0,
  marks: 1,
  displayOrder: 0,
};

export default function AdminQuestionPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

  const [form, setForm] = useState<QuestionPayload>(emptyPayload);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => {
    return (
      form.questionText.trim().length > 0 &&
      form.options.filter((o) => o.trim()).length >= 2
    );
  }, [form]);

  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.displayOrder - b.displayOrder),
    [questions]
  );

  const load = useCallback(async () => {
    try {
      const [qRes, resultRes] = await Promise.all([
        api.get<AdminQuestion[]>(`/api/exams/${examId}/questions/admin-view`),
        api
          .get<ExamResult[]>(`/api/exams/${examId}/results`)
          .catch(() => ({ data: [] as ExamResult[] })),
      ]);

      setQuestions(qRes.data);
      setResults(resultRes.data);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submit = async () => {
    if (!valid) return;

    try {
      setSubmitting(true);

      if (editingId) {
        await api.put(`/api/questions/${editingId}`, form, { params: { examId } });
      } else {
        await api.post(`/api/exams/${examId}/questions`, form);
      }

      setForm(emptyPayload);
      setEditingId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (q: AdminQuestion) => {
    setEditingId(q.id);
    setForm({
      questionText: q.questionText,
      options: q.options,
      correctOptionIndex: q.correctOptionIndex,
      marks: q.marks,
      displayOrder: q.displayOrder,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = async (questionId: string) => {
    await api.delete(`/api/questions/${questionId}`, { params: { examId } });
    await load();
  };

  const exportResults = async () => {
    const res = await api.get(`/api/exams/${examId}/results/export`, {
      responseType: "blob",
    });

    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-${examId}-results.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const avgRisk =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.riskScore, 0) / results.length
        ).toFixed(1)
      : "0.0";

  if (loading) {
    return (
      <main className="page-shell flex min-h-screen items-center justify-center px-4">
        <div className="glass-card accent-border w-full max-w-lg p-8 text-center">
          <p className="text-lg font-medium text-white/80">
            Loading question management...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="glass-card accent-border p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                onClick={() => router.back()}
                className="mb-3 text-sm text-white/60 transition hover:text-white"
              >
                ← Back
              </button>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Question & Result Console
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Question Management
              </h1>
              <p className="mt-2 break-all text-sm text-white/55">Exam ID: {examId}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push(`/admin/${examId}/attendance`)}
                className="ai-button-secondary"
              >
                Attendance
              </button>
              <button onClick={exportResults} className="ai-button-primary">
                Export Results (Excel)
              </button>
            </div>
          </div>
        </section>

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Questions"
            value={questions.length}
            hint="Questions configured"
            color="text-cyan-300"
          />
          <MetricCard
            title="Total Results"
            value={results.length}
            hint="Submitted student records"
            color="text-emerald-300"
          />
          <MetricCard
            title="Average Risk"
            value={avgRisk}
            hint="Across submitted attempts"
            color="text-orange-300"
          />
          <MetricCard
            title="Mode"
            value={editingId ? "Editing" : "Create"}
            hint={editingId ? "Updating an existing question" : "Adding a new question"}
            color="text-violet-300"
          />
        </section>

        {/* Main Layout */}
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          {/* Question Builder */}
          <div className="space-y-6">
            <section className="glass-card accent-border p-5 md:p-6">
              <div className="mb-5">
                <h2 className="section-title">
                  {editingId ? "Edit Question" : "Create New Question"}
                </h2>
                <p className="section-subtitle">
                  Add exam questions, configure answer keys, and set marks/order.
                </p>
              </div>

              {editingId && (
                <div className="mb-5 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
                  You are editing an existing question. Save to update it, or clear the form to
                  create a new one.
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/70">
                    Question Text
                  </label>
                  <textarea
                    value={form.questionText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, questionText: e.target.value }))
                    }
                    placeholder="Enter question text"
                    className="ai-input min-h-[140px] resize-none"
                  />
                </div>

                <div className="grid gap-3">
                  {form.options.map((opt, i) => (
                    <div key={i}>
                      <label className="mb-2 block text-sm font-medium text-white/70">
                        Option {String.fromCharCode(65 + i)}
                      </label>
                      <input
                        value={opt}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            options: p.options.map((existing, idx) =>
                              idx === i ? e.target.value : existing
                            ),
                          }))
                        }
                        className="ai-input"
                        placeholder={`Enter option ${i + 1}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Correct Option Index
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={3}
                      value={form.correctOptionIndex}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          correctOptionIndex: Number(e.target.value),
                        }))
                      }
                      className="ai-input"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Marks
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.marks}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, marks: Number(e.target.value) }))
                      }
                      className="ai-input"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/70">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.displayOrder}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))
                      }
                      className="ai-input"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    disabled={!valid || submitting}
                    onClick={submit}
                    className="ai-button-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? editingId
                        ? "Updating..."
                        : "Creating..."
                      : editingId
                      ? "Update Question"
                      : "Create Question"}
                  </button>

                  <button
                    onClick={() => {
                      setForm(emptyPayload);
                      setEditingId(null);
                    }}
                    className="ai-button-secondary"
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </section>

            {/* Existing Questions */}
            <section className="glass-card accent-border p-5 md:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="section-title">Existing Questions</h2>
                  <p className="section-subtitle">
                    Review, edit, or delete the configured exam questions.
                  </p>
                </div>

                <span className="badge-chip">{questions.length} total</span>
              </div>

              {sortedQuestions.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
                  No questions added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-3xl border border-white/[0.06] bg-white/[0.03] p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <span className="badge-chip">Order {q.displayOrder}</span>
                            <span className="badge-chip">Marks {q.marks}</span>
                            <span className="badge-chip">Correct: {q.correctOptionIndex}</span>
                          </div>

                          <h3 className="text-lg font-semibold leading-7 text-white">
                            {q.questionText}
                          </h3>

                          <div className="mt-4 grid gap-2">
                            {q.options.map((o, idx) => {
                              const isCorrect = idx === q.correctOptionIndex;

                              return (
                                <div
                                  key={idx}
                                  className={`rounded-2xl border px-4 py-3 text-sm ${
                                    isCorrect
                                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                      : "border-white/[0.06] bg-white/[0.02] text-white/75"
                                  }`}
                                >
                                  <span className="mr-2 font-semibold">
                                    {String.fromCharCode(65 + idx)}.
                                  </span>
                                  {o}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid gap-3 md:w-[160px]">
                          <button
                            className="ai-button-secondary"
                            onClick={() => onEdit(q)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                            onClick={() => onDelete(q.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Results */}
          <section className="glass-card accent-border p-5 md:p-6">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="section-title">Result Dashboard</h2>
                <p className="section-subtitle">
                  Submitted student attempts and performance overview.
                </p>
              </div>

              <span className="badge-chip">{results.length} records</span>
            </div>

            {results.length === 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8 text-center text-white/60">
                No results available yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-3xl border border-white/[0.06]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-white/[0.04] text-left text-white/70">
                      <tr>
                        <th className="px-4 py-4">Student</th>
                        <th className="px-4 py-4">Score</th>
                        <th className="px-4 py-4">Correct</th>
                        <th className="px-4 py-4">Wrong</th>
                        <th className="px-4 py-4">Unanswered</th>
                        <th className="px-4 py-4">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r) => (
                        <tr
                          key={r.studentId}
                          className="border-t border-white/[0.06] bg-white/[0.02]"
                        >
                          <td className="px-4 py-4 font-medium text-white">{r.studentId}</td>
                          <td className="px-4 py-4 text-white/80">
                            {r.score}/{r.totalMarks} ({r.percentage.toFixed(1)}%)
                          </td>
                          <td className="px-4 py-4 text-emerald-300">{r.correctCount}</td>
                          <td className="px-4 py-4 text-orange-300">{r.wrongCount}</td>
                          <td className="px-4 py-4 text-white/70">{r.unansweredCount}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${riskPill(
                                r.riskScore
                              )}`}
                            >
                              {r.riskScore.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  title,
  value,
  hint,
  color,
}: {
  title: string;
  value: string | number;
  hint: string;
  color: string;
}) {
  return (
    <div className="glass-card-soft accent-border p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{title}</p>
      <p className={`mt-3 text-4xl font-semibold tracking-tight ${color}`}>{value}</p>
      <p className="mt-2 text-sm text-white/55">{hint}</p>
    </div>
  );
}

function riskPill(risk: number) {
  if (risk < 30) return "bg-emerald-500/10 text-emerald-300";
  if (risk < 60) return "bg-yellow-500/10 text-yellow-300";
  if (risk < 90) return "bg-orange-500/10 text-orange-300";
  return "bg-red-500/10 text-red-300";
}