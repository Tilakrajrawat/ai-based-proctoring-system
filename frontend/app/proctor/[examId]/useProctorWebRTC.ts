"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

export function useProctorWebRTC(
  examId: string,
  sessionId: string | null,
  videoRef: React.RefObject<HTMLVideoElement>
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!examId || !sessionId || !videoRef.current || pcRef.current) return;

    const roomId = `${examId}:${sessionId}`;

    const socket = io("http://localhost:3001", {
      reconnection: true,
    });

    socketRef.current = socket;
    socket.emit("join", { roomId, role: "proctor" });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    pc.ontrack = (e) => {
      if (videoRef.current) {
        videoRef.current.srcObject = e.streams[0];
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice", { roomId, candidate: e.candidate });
      }
    };

    socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
    });

    socket.on("ice", async (candidate: RTCIceCandidateInit) => {
      await pc.addIceCandidate(candidate);
    });

    socket.emit("request-offer", { roomId });

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
    };
  }, [examId, sessionId, videoRef]);
}
