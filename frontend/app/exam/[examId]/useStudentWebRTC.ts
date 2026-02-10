"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

type Props = {
  sessionId: string | null;
};

export function useStudentWebRTC({ sessionId }: Props) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!sessionId || pcRef.current) return;

    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.emit("join", { sessionId, role: "student" });

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(stream => {
        stream.getTracks().forEach(track =>
          pc.addTrack(track, stream)
        );
      });

    pc.onicecandidate = (e: RTCPeerConnectionIceEvent) => {
      if (e.candidate) {
        socket.emit("ice", {
          sessionId,
          candidate: e.candidate,
        });
      }
    };

    socket.on(
      "answer",
      async (answer: RTCSessionDescriptionInit) => {
        await pc.setRemoteDescription(answer);
      }
    );

    socket.on(
      "ice",
      async (candidate: RTCIceCandidateInit) => {
        await pc.addIceCandidate(candidate);
      }
    );

    socket.on("ready", async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { sessionId, offer });
    });

    return () => {
      socket.disconnect();
      pc.close();
      pcRef.current = null;
    };
  }, [sessionId]);
}