import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

console.log("WebRTC signaling server running on port 3001");

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("join", ({ sessionId, role }) => {
    socket.join(sessionId);
    socket.sessionId = sessionId;
    socket.role = role;

    console.log(`${role} joined session ${sessionId}`);

    const room = io.sockets.adapter.rooms.get(sessionId);

    if (room && room.size >= 2) {
      // BOTH student + proctor are now present
      io.to(sessionId).emit("ready");
      console.log(`Session ${sessionId} is ready`);
    }
  });

  socket.on("offer", ({ sessionId, offer }) => {
    socket.to(sessionId).emit("offer", offer);
  });

  socket.on("answer", ({ sessionId, answer }) => {
    socket.to(sessionId).emit("answer", answer);
  });

  socket.on("ice", ({ sessionId, candidate }) => {
    socket.to(sessionId).emit("ice", candidate);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});