"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Row = {
  sessionId: string | null;
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
};

const API = "http://localhost:8080";

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId =
    typeof params.examId === "string" ? params.examId : null;

  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const load = useCallback(async () => {
    if (!token || !examId) return;

    try {
      const res = await axios.get<Row[]>(
        `${API}/api/exams/${examId}/attendance`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRows(res.data);
      setError("");
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [examId, token]);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }
    load();
  }, [token, router, load]);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter(r => r.attended).length;
    const absent = total - present;
    const active = rows.filter(r => r.status === "ACTIVE").length;
    const suspended = rows.filter(r => r.status === "SUSPENDED").length;

    return { total, present, absent, active, suspended };
  }, [rows]);

  const act = async (
    sessionId: string | null,
    action: "suspend" | "resume" | "submit"
  ) => {
    if (!token || !examId || !sessionId) return;

    const map = {
      suspend: "suspend",
      resume: "resume",
      submit: "submit",
    };

    await axios.post(
      `${API}/api/proctor/exams/${examId}/students/${sessionId}/${map[action]}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    load();
  };

  if (!examId) return <div style={{ padding: 24 }}>Invalid exam</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => router.back()}>← Back</button>

      <h1 style={{ fontSize: 24 }}>Proctor Dashboard</h1>
      <div style={{ fontSize: 12, marginBottom: 20 }}>
        Exam ID: {examId}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Suspended" value={stats.suspended} />
      </div>

      <table border={1} cellPadding={8} width="100%">
        <thead>
          <tr>
            <th>Email</th>
            <th>Attended</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const terminal =
              row.status === "ENDED" || row.status === "SUBMITTED";

            return (
              <tr key={row.sessionId ?? row.email}>
                <td>{row.email}</td>
                <td>{row.attended ? "Yes" : "No"}</td>
                <td>{row.status ?? "-"}</td>
                <td>
                  {row.lastHeartbeatAt
                    ? new Date(row.lastHeartbeatAt).toLocaleTimeString()
                    : "-"}
                </td>
                <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!row.sessionId && "-"}

                  {row.sessionId && (
                    <>
                      <button
                        onClick={() =>
                          router.push(
                            `/proctor/${examId}/live/${row.sessionId}`
                          )
                        }
                      >
                        Live Feed
                      </button>

                      <button
                        onClick={() =>
                          router.push(
                            `/proctor/${examId}/incidents/${row.sessionId}`
                          )
                        }
                      >
                        Incidents
                      </button>

                      {!terminal && row.status === "ACTIVE" && (
                        <button
                          onClick={() =>
                            act(row.sessionId, "suspend")
                          }
                        >
                          Suspend
                        </button>
                      )}

                      {!terminal && row.status === "SUSPENDED" && (
                        <button
                          onClick={() =>
                            act(row.sessionId, "resume")
                          }
                        >
                          Resume
                        </button>
                      )}

                      {!terminal && (
                        <button
                          style={{ color: "red" }}
                          onClick={() =>
                            act(row.sessionId, "submit")
                          }
                        >
                          Force Submit
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: 12,
        minWidth: 120,
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 20 }}>{value}</div>
    </div>
  );
}