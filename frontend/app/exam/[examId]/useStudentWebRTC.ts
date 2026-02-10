"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

type Props = {
  sessionId: string | null;
  stream: MediaStream | null;
};

export function useStudentWebRTC({ sessionId, stream }: Props) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!sessionId || !stream || pcRef.current) return;

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    socket.emit("join", { sessionId, role: "student" });

    pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        socket.emit("ice", { 
          sessionId, 
          candidate: event.candidate.toJSON() 
        });
      }
    };

    socket.on("proctor-ready", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { sessionId, offer });
    });

    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      await pc.setRemoteDescription(answer);
    });

    socket.on("ice", async (candidate: RTCIceCandidateInit) => {
      await pc.addIceCandidate(candidate);
    });

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
      socketRef.current = null;
    };
  }, [sessionId, stream]);
}