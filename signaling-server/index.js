import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "*", // In production, replace with your frontend URL
  },
});

console.log("WebRTC signaling server running on port 3001");

io.on("connection", (socket) => {
  // Use a temporary variable for logging
  const transportId = socket.id;

  socket.on("join", ({ sessionId, role }) => {
  socket.join(sessionId);
  socket.sessionId = sessionId;
  socket.role = role;

  // Get the number of people in the room
  const clients = io.sockets.adapter.rooms.get(sessionId);
  const numClients = clients ? clients.size : 0;

  console.log(`${role} joined. Total in room: ${numClients}`);

  // TRIGGER LOGIC:
  // If a proctor joins, tell whoever is there (the student) to start.
  if (role === "proctor") {
    socket.to(sessionId).emit("proctor-ready");
  }

  // NEW: If a student joins and the proctor is ALREADY there, 
  // tell the student to start immediately.
  if (role === "student" && numClients > 1) {
    socket.emit("proctor-ready"); 
  }
});

  socket.on("offer", ({ sessionId, offer }) => {
    // Basic validation: ensures offer exists before broadcasting
    if (offer) {
      socket.to(sessionId).emit("offer", offer);
    }
  });

  socket.on("answer", ({ sessionId, answer }) => {
    if (answer) {
      socket.to(sessionId).emit("answer", answer);
    }
  });

  socket.on("ice", ({ sessionId, candidate }) => {
    if (candidate) {
      socket.to(sessionId).emit("ice", candidate);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${transportId}`);
  });
});