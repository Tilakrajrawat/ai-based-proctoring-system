"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  const [form, setForm] = useState<QuestionPayload>(emptyPayload);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [results, setResults] = useState<ExamResult[]>([]);

  const valid = useMemo(() => {
    return form.questionText.trim().length > 0 && form.options.filter((o) => o.trim()).length >= 2;
  }, [form]);

  const load = useCallback(async () => {
    const [qRes, resultRes] = await Promise.all([
      api.get<AdminQuestion[]>(`/api/exams/${examId}/questions/admin-view`),
      api.get<ExamResult[]>(`/api/exams/${examId}/results`).catch(() => ({ data: [] as ExamResult[] })),
    ]);
    setQuestions(qRes.data);
    setResults(resultRes.data);
  }, [examId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const submit = async () => {
    if (!valid) return;
    if (editingId) {
      await api.put(`/api/questions/${editingId}`, form, { params: { examId } });
    } else {
      await api.post(`/api/exams/${examId}/questions`, form);
    }
    setForm(emptyPayload);
    setEditingId(null);
    load();
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
  };

  const onDelete = async (questionId: string) => {
    await api.delete(`/api/questions/${questionId}`, { params: { examId } });
    load();
  };

  const exportResults = async () => {
    const res = await api.get(`/api/exams/${examId}/results/export`, { responseType: "blob" });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `exam-${examId}-results.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 grid lg:grid-cols-2 gap-5">
      <section className="border rounded-xl p-4 space-y-3">
        <h1 className="text-2xl font-semibold">Question Management</h1>
        <textarea value={form.questionText} onChange={(e) => setForm((p) => ({ ...p, questionText: e.target.value }))} placeholder="Question text" className="w-full border rounded p-2 h-24 bg-transparent" />
        {form.options.map((opt, i) => (
          <input key={i} value={opt} onChange={(e) => setForm((p) => ({ ...p, options: p.options.map((existing, idx) => (idx === i ? e.target.value : existing)) }))} className="w-full border rounded p-2 bg-transparent" placeholder={`Option ${i + 1}`} />
        ))}
        <div className="grid grid-cols-3 gap-2">
          <input type="number" value={form.correctOptionIndex} onChange={(e) => setForm((p) => ({ ...p, correctOptionIndex: Number(e.target.value) }))} className="border rounded p-2 bg-transparent" placeholder="Correct Index" />
          <input type="number" value={form.marks} onChange={(e) => setForm((p) => ({ ...p, marks: Number(e.target.value) }))} className="border rounded p-2 bg-transparent" placeholder="Marks" />
          <input type="number" value={form.displayOrder} onChange={(e) => setForm((p) => ({ ...p, displayOrder: Number(e.target.value) }))} className="border rounded p-2 bg-transparent" placeholder="Order" />
        </div>
        <button disabled={!valid} onClick={submit} className="w-full rounded p-2 bg-blue-600 disabled:opacity-50">{editingId ? "Update" : "Create"} Question</button>

        <div className="space-y-2 pt-3">
          {questions.map((q) => (
            <div key={q.id} className="border rounded p-3">
              <div className="font-medium">[{q.displayOrder}] {q.questionText}</div>
              <div className="text-xs text-gray-400">Marks: {q.marks} • Correct index: {q.correctOptionIndex}</div>
              <ul className="list-disc pl-5 text-sm">{q.options.map((o, idx) => <li key={idx}>{o}</li>)}</ul>
              <div className="space-x-3 text-sm">
                <button className="underline" onClick={() => onEdit(q)}>Edit</button>
                <button className="text-red-400" onClick={() => onDelete(q.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Result Dashboard</h2>
          <button onClick={exportResults} className="border rounded px-3 py-1">Export Excel</button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-700">
              <th className="py-2">Student</th><th>Score</th><th>Correct</th><th>Wrong</th><th>Unanswered</th><th>Risk</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.studentId} className="border-b border-gray-800">
                <td className="py-2">{r.studentId}</td>
                <td>{r.score}/{r.totalMarks} ({r.percentage.toFixed(1)}%)</td>
                <td>{r.correctCount}</td>
                <td>{r.wrongCount}</td>
                <td>{r.unansweredCount}</td>
                <td>{r.riskScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
