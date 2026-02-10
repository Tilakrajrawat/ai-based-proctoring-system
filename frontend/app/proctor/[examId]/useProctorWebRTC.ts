"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";


export function useProctorWebRTC(
  sessionId: string | null,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!sessionId || !videoRef.current || pcRef.current) return;

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.emit("join", { sessionId, role: "proctor" });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    pc.ontrack = (event: RTCTrackEvent) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit("ice", {
          sessionId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    socket.on(
      "offer",
      async (offer: RTCSessionDescriptionInit) => {
        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { sessionId, answer });
      }
    );

    socket.on(
      "ice",
      async (candidate: RTCIceCandidateInit) => {
        await pc.addIceCandidate(candidate);
      }
    );

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
    };
  }, [sessionId, videoRef]);
}