"use client";

import { useRef } from "react";
import { useParams } from "next/navigation";
import { useProctorWebRTC } from "../../useProctorWebRTC";

export default function LiveFeedPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useProctorWebRTC(sessionId ?? null, videoRef);

  return (
    <div style={{ padding: 24 }}>
      <h2>Live Student Feed</h2>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          maxWidth: 640,
          border: "2px solid #ccc",
          borderRadius: 8,
        }}
      />
    </div>
  );
}