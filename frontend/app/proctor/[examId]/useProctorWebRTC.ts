"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

export function useProctorWebRTC(
  examId: string,
  sessionId: string | null,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    if (!examId || !sessionId || pcRef.current) return;

    const roomId = `${examId}:${sessionId}`;
    let isMounted = true;

    const socket = io("http://localhost:3001", {
      reconnection: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;

    socket.emit("join", { roomId, role: "proctor" });

    pc.ontrack = (event) => {
      if (!isMounted) return;

      const stream = event.streams?.[0];
      if (!stream) return;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice", { roomId, candidate: event.candidate });
      }
    };

    socket.on("offer", async (offer: RTCSessionDescriptionInit) => {
      try {
        if (pc.signalingState === "closed") return;

        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", { roomId, answer });
      } catch (err) {
        console.error("Proctor failed to handle offer", err);
      }
    });

    socket.on("ice", async (candidate: RTCIceCandidateInit) => {
      try {
        if (!pc.remoteDescription) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Proctor failed to add ICE candidate", err);
      }
    });

    socket.emit("request-offer", { roomId });

    return () => {
      isMounted = false;

      try {
        socket.off("offer");
        socket.off("ice");
        socket.disconnect();
      } catch {}

      try {
        pc.ontrack = null;
        pc.onicecandidate = null;
        pc.getReceivers().forEach((receiver) => receiver.track?.stop());
        pc.close();
      } catch {}

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      socketRef.current = null;
      pcRef.current = null;
    };
  }, [examId, sessionId, videoRef]);
}