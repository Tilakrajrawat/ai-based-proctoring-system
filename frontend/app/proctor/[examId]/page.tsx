"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStompClient } from "../../../lib/stomp";
import { useParams, useRouter } from "next/navigation";
import api from "../../../lib/api";
import { getAuthToken } from "../../../lib/auth";

type SessionStatus = "ACTIVE" | "SUSPENDED" | "ENDED" | "SUBMITTED";

type Row = {
  sessionId: string | null;
  email: string;
  attended: boolean;
  status: SessionStatus | null;
  lastHeartbeatAt: string | null;
  totalSeverity: number;
};

export default function ProctorDashboardPage() {
  const params = useParams();
  const examId = typeof params.examId === "string" ? params.examId : null;
  const router = useRouter();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!examId) return;

    try {
      const res = await api.get<Row[]>(`/api/exams/${examId}/attendance`);
      setRows(res.data);
      setError("");
    } catch {
      setError("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router, load]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
  
    const client = createStompClient(token, (connectedClient) => {
      connectedClient.subscribe("/topic/sessions", (message) => {
        const session = JSON.parse(message.body) as {
          id: string;
          status: SessionStatus;
          lastHeartbeatAt: string;
          totalSeverity?: number;
        };
  
        setRows((prev) =>
          prev.map((row) =>
            row.sessionId === session.id
              ? {
                  ...row,
                  status: session.status,
                  lastHeartbeatAt: session.lastHeartbeatAt,
                  totalSeverity: session.totalSeverity ?? row.totalSeverity,
                }
              : row
          )
        );
      });
    });
  
    return () => {
      client.deactivate(); // now TS is happy
    };
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter((r) => r.attended).length;
    const absent = total - present;
    const active = rows.filter((r) => r.status === "ACTIVE").length;
    const suspended = rows.filter((r) => r.status === "SUSPENDED").length;

    return { total, present, absent, active, suspended };
  }, [rows]);

  const act = async (
    sessionId: string | null,
    action: "suspend" | "resume" | "submit"
  ) => {
    if (!examId || !sessionId) return;

    await api.post(
      `/api/proctor/exams/${examId}/students/${sessionId}/${action}`,
      {}
    );

    load();
  };

  if (!examId) return <div style={{ padding: 24 }}>Invalid exam</div>;
  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h1 style={{ fontSize: 24 }}>Proctor Dashboard</h1>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push(`/proctor/${examId}/attendance`)}>
            Attendance
          </button>

          <button onClick={() => router.push(`/proctor/${examId}/analytics`)}>
            Analytics
          </button>
        </div>
      </div>

      <div style={{ fontSize: 12, marginBottom: 20 }}>Exam ID: {examId}</div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <Stat label="Total" value={stats.total} />
        <Stat label="Present" value={stats.present} />
        <Stat label="Absent" value={stats.absent} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Suspended" value={stats.suspended} />
      </div>

      {/* Table */}
      <table border={1} cellPadding={8} width="100%">
        <thead>
          <tr>
            <th>Email</th>
            <th>Attended</th>
            <th>Status</th>
            <th>Last Seen</th>
            <th>Severity</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
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

                <td>{row.totalSeverity?.toFixed(2) ?? "0.00"}</td>

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
                          onClick={() => act(row.sessionId, "suspend")}
                        >
                          Suspend
                        </button>
                      )}

                      {!terminal && row.status === "SUSPENDED" && (
                        <button
                          disabled={(row.totalSeverity ?? 0) >= 2.0}
                          onClick={() => act(row.sessionId, "resume")}
                        >
                          Resume
                        </button>
                      )}

                      {!terminal && (
                        <button
                          style={{ color: "red" }}
                          onClick={() => act(row.sessionId, "submit")}
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