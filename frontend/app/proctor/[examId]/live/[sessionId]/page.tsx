"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { useProctorWebRTC } from "../../useProctorWebRTC";

export default function ProctorLiveFeedPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useProctorWebRTC(sessionId, videoRef);

  return (
    <div style={{ padding: 24 }}>
      <h2>Live Student Feed</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: 480, background: "#000" }}
      />
    </div>
  );
}