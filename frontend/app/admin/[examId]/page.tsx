"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";

type ExamRole = "ADMIN" | "PROCTOR" | "STUDENT";

type Assignment = {
  email: string;
  role: ExamRole;
};


export default function AdminExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();

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
      
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
      }, [examId, router]);

  const assignUser = async () => {
    if (!email) return;

    await api.post(`/api/exams/${examId}/assign`, { email, role });

    setAssignments(prev => [...prev, { email, role }]);
    setEmail("");
    setRole("STUDENT");
  };

  const updateRole = async (targetEmail: string, newRole: ExamRole) => {
    await api.put(`/api/exams/${examId}/assignments/${targetEmail}/role`, null, {
      params: { role: newRole },
    });

    setAssignments(prev =>
      prev.map(a =>
        a.email === targetEmail ? { ...a, role: newRole } : a
      )
    );
  };

  const removeUser = async (targetEmail: string) => {
    await api.delete(`/api/exams/${examId}/assignments/${targetEmail}`);

    setAssignments(prev =>
      prev.filter(a => a.email !== targetEmail)
    );
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <button onClick={() => router.back()}>
        ← Back
      </button>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Manage Exam</h1>

      <p style={{ fontSize: 12, marginBottom: 24 }}>
        Exam ID: {examId}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          placeholder="User email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ flex: 1, padding: 6 }}
        />

        <select
          value={role}
          onChange={e => setRole(e.target.value as ExamRole)}
        >
          <option value="STUDENT">Student</option>
          <option value="PROCTOR">Proctor</option>
        </select>

        <button onClick={assignUser}>Assign</button>
      </div>

      <hr />

      <h2 style={{ marginTop: 24, marginBottom: 12 }}>
        Assigned Users
      </h2>

      {assignments.length === 0 && <p>No users assigned yet.</p>}

      {assignments.map(a => (
        <div
          key={a.email}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <span style={{ flex: 1 }}>
            {a.email} — <strong>{a.role}</strong>
          </span>

          {a.role !== "ADMIN" && (
            <>
              <select
                value={a.role}
                onChange={e =>
                  updateRole(
                    a.email,
                    e.target.value as ExamRole
                  )
                }
              >
                <option value="STUDENT">Student</option>
                <option value="PROCTOR">Proctor</option>
              </select>

              <button
                onClick={() => removeUser(a.email)}
                style={{ color: "red" }}
              >
                Remove
              </button>
            </>
          )}
        </div>
      ))}
      <button
  onClick={() => router.push(`/admin/${examId}/attendance`)}
>
  View Attendance
</button>
    </div>
  );
}