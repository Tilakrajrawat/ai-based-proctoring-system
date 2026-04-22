"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";

type Props = {
  examId: string;
  sessionId: string | null;
  stream: MediaStream | null;
};

const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL ?? "http://localhost:3001";

export function useStudentWebRTC({ examId, sessionId, stream }: Props) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const offerSentRef = useRef(false);

  useEffect(() => {
    if (!examId || !sessionId || !stream || pcRef.current) return;

    const roomId = `${examId}:${sessionId}`;
    let isMounted = true;

    const socket = io(SIGNALING_URL, {
      reconnection: true,
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pcRef.current = pc;
    offerSentRef.current = false;

    socket.emit("join", { roomId, role: "student" });

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice", { roomId, candidate: event.candidate });
      }
    };

    socket.on("answer", async (answer: RTCSessionDescriptionInit) => {
      try {
        if (!isMounted || pc.signalingState === "closed") return;
        if (pc.currentRemoteDescription) return;

        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      } catch (err) {
        console.error("Student failed to handle answer", err);
      }
    });

    socket.on("ice", async (candidate: RTCIceCandidateInit) => {
      try {
        if (!pc.remoteDescription) return;
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Student failed to add ICE candidate", err);
      }
    });

    socket.on("request-offer", async () => {
      try {
        if (!isMounted || pc.signalingState === "closed") return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { roomId, offer });
        offerSentRef.current = true;
      } catch (err) {
        console.error("Student failed to respond with offer", err);
      }
    });

    const sendInitialOffer = async () => {
      try {
        if (!isMounted || pc.signalingState === "closed" || offerSentRef.current) return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit("offer", { roomId, offer });
        offerSentRef.current = true;
      } catch (err) {
        console.error("Student failed to send initial offer", err);
      }
    };

    void sendInitialOffer();

    return () => {
      isMounted = false;

      try {
        socket.off("answer");
        socket.off("ice");
        socket.off("request-offer");
        socket.disconnect();
      } catch {}

      try {
        pc.onicecandidate = null;
        pc.close();
      } catch {}

      socketRef.current = null;
      pcRef.current = null;
      offerSentRef.current = false;
    };
  }, [examId, sessionId, stream]);
}