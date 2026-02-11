"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

type Props = {
  examId: string;
  sessionId: string | null;
  stream: MediaStream | null;
};

export function useStudentWebRTC({ examId, sessionId, stream }: Props) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!examId || !sessionId || !stream || pcRef.current) return;

    const roomId = `${examId}:${sessionId}`;

    const socket = io("http://localhost:3001", {
      reconnection: true,
    });

    socketRef.current = socket;
    socket.emit("join", { roomId, role: "student" });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice", { roomId, candidate: e.candidate });
      }
    };

    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      if (!pc.currentRemoteDescription) {
        await pc.setRemoteDescription(answer);
      }
    });

    socket.on("ice", async (candidate: RTCIceCandidateInit) => {
      await pc.addIceCandidate(candidate);
    });

    socket.on("request-offer", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
    });

    (async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, offer });
    })();

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
    };
  }, [examId, sessionId, stream]);
}
