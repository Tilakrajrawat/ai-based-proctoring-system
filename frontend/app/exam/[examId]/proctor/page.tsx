"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ProctorPage() {
  const { examId } = useParams();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`http://localhost:8080/api/exams/${examId}/proctor/access`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Denied");
        return res.text();
      })
      .then(() => setAllowed(true))
      .catch(() => setAllowed(false));
  }, [examId]);

  if (!allowed) return <p>Proctor access denied</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>👮 Proctor Dashboard</h2>
      <p>Exam ID: {examId}</p>
      <p>Waiting for student streams...</p>
    </div>
  );
}
