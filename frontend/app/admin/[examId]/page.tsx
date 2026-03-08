"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";
type Assignment = { email: string; role: ExamRole };
type Section = "Overview" | "Questions" | "Analytics" |"Attendance";

const sections: Section[] = ["Overview", "Questions", "Analytics", "Attendance"];

export default function AdminExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [active, setActive] = useState<Section>("Overview");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ExamRole>("STUDENT");
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    const load = async () => {
      const res = await api.get(`/api/exams/${examId}/assignments`);
      setAssignments(res.data);
      setLoading(false);
    };
    void load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [examId, router]);

  const counts = useMemo(
    () => ({ students: assignments.filter((a) => a.role === "STUDENT").length, proctors: assignments.filter((a) => a.role === "PROCTOR").length }),
    [assignments]
  );

  const assignUser = async () => {
    if (!email) return;
    await api.post(`/api/exams/${examId}/assign`, { email, role });
    setAssignments((prev) => [...prev, { email, role }]);
    setEmail("");
  };

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 grid md:grid-cols-[220px_1fr] gap-5">
      <aside className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-3 h-fit">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h2 className="px-2 py-3 text-lg">Admin Panel</h2>
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => {
              setActive(section);
              if (section === "Questions") router.push(`/admin/${examId}/questions`);
              if (section === "Analytics")router.push(`/admin/${examId}/analytics`);
              if (section === "Attendance")router.push(`/admin/${examId}/attendance`);
             
            }}
            className={`w-full text-left px-3 py-2 rounded-xl mb-1 transition hover:bg-white/10 active:scale-[0.98] ${
              active === section ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" : "border border-transparent text-white/70"
            }`}
          >
            {section}
          </button>
        ))}
      </aside>

      <section className="relative bg-white/[0.04] backdrop-blur-2xl border border-white/[0.07] rounded-2xl shadow-2xl p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <h1 className="text-2xl mb-2">Overview</h1>
        <p className="text-white/50 font-mono text-sm">Exam ID: {examId}</p>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-white/60 text-xs uppercase">Students</p><p className="font-mono text-2xl">{counts.students}</p></div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-3"><p className="text-white/60 text-xs uppercase">Proctors</p><p className="font-mono text-2xl">{counts.proctors}</p></div>
        </div>

        <div className="mt-6 flex flex-col md:flex-row gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="User email" className="flex-1 p-3 rounded-xl bg-white/[0.03] border border-white/10" />
          <select value={role} onChange={(e) => setRole(e.target.value as ExamRole)} className="p-3 rounded-xl bg-[#13131f] border border-white/10">
            <option value="STUDENT">Student</option>
            <option value="PROCTOR">Proctor</option>
          </select>
          <button onClick={assignUser} className="px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 active:scale-[0.98] transition">Assign</button>
        </div>
      </section>
    </div>
  );
}
