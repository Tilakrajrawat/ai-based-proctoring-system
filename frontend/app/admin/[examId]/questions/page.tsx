"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import api from "../../../../lib/api";

type OptionLabel = "A" | "B" | "C" | "D";
type Question = { id: string; text: string; options: { label: OptionLabel; text: string }[] };

const labels: OptionLabel[] = ["A", "B", "C", "D"];

export default function AdminQuestionPage() {
  const { examId } = useParams<{ examId: string }>();
  const [text, setText] = useState("");
  const [options, setOptions] = useState<Record<OptionLabel, string>>({ A: "", B: "", C: "", D: "" });
  const [correctOption, setCorrectOption] = useState<OptionLabel>("A");
  const [saved, setSaved] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const valid = useMemo(() => text.trim() && labels.every((l) => options[l].trim()), [text, options]);

  const save = async () => {
    if (!valid) return;
    const payload = {
      text,
      options: labels.map((label) => ({ label, text: options[label] })),
      correctOption,
    };
    const res = await api.post(`/api/exams/${examId}/questions`, payload);
    setQuestions((prev) => [{ id: res.data.id ?? `${Date.now()}`, text, options: payload.options }, ...prev]);
    setText("");
    setOptions({ A: "", B: "", C: "", D: "" });
    setCorrectOption("A");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const remove = async (questionId: string) => {
    await api.delete(`/api/exams/${examId}/questions/${questionId}`);
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 grid lg:grid-cols-2 gap-5">
      <section className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-2xl mb-4">Question Builder</h1>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Question text" className="w-full p-3 rounded-xl h-28 bg-white/[0.03] border border-white/10 mb-3" />
        {labels.map((label) => (
          <input key={label} value={options[label]} onChange={(e) => setOptions((prev) => ({ ...prev, [label]: e.target.value }))} placeholder={`Option ${label}`} className="w-full p-3 rounded-xl bg-white/[0.03] border border-white/10 mb-2" />
        ))}
        <div className="flex gap-2 mt-3 mb-4">
          {labels.map((label) => (
            <button key={label} onClick={() => setCorrectOption(label)} className={`px-3 py-2 rounded-xl border transition active:scale-[0.98] ${correctOption === label ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300 shadow-[0_0_16px_rgba(0,230,118,0.3)]" : "bg-white/5 border-white/10"}`}>
              {label}
            </button>
          ))}
        </div>
        <button disabled={!valid} onClick={save} className="w-full py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 disabled:opacity-40 hover:bg-blue-500/30 active:scale-[0.98] transition">
          {saved ? "✓ Saved" : "Save Question"}
        </button>

        <div className="mt-6 space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="mb-2">{q.text}</p>
              {q.options.map((op) => (
                <p key={op.label} className="text-sm text-white/70">{op.label}. {op.text}</p>
              ))}
              <button onClick={() => remove(q.id)} className="mt-2 text-rose-300 hover:text-rose-200 active:scale-[0.98] transition">Delete</button>
            </div>
          ))}
        </div>
      </section>

      <section className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-5 h-fit">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h2 className="text-xl mb-4">Live Preview</h2>
        <p className="text-xl mb-4">{text || "Your question appears here..."}</p>
        <div className="space-y-2">
          {labels.map((label) => (
            <div key={label} className={`p-3 rounded-xl border ${correctOption === label ? "bg-emerald-500/10 border-emerald-400/40 text-emerald-200" : "bg-white/[0.03] border-white/10"}`}>
              {label}. {options[label] || `Option ${label}`}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
