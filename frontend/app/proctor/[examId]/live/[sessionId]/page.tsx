"use client";

import { useParams, useRouter } from "next/navigation";
import { useRef } from "react";
import { useProctorWebRTC } from "../../useProctorWebRTC";

export default function ProctorLivePage() {
  const { examId, sessionId } = useParams<{ examId: string; sessionId: string }>();
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useProctorWebRTC(examId, sessionId, videoRef);

  return (
    <div style={{ padding: 24 }}>
      <button onClick={() => router.back()}>← Back</button>
      <h1 style={{ fontSize: 22, marginTop: 12 }}>Live Feed</h1>
      <div style={{ fontSize: 12, opacity: 0.7 }}>Exam: {examId}</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 12 }}>Session: {sessionId}</div>
      <video ref={videoRef} autoPlay playsInline controls style={{ width: "100%", maxWidth: 900 }} />
    </div>
  );
}
