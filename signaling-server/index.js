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

  socket.on("join", ({ roomId }) => {
    socket.join(roomId);
  });
  
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });
  
  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });
  
  socket.on("ice", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice", candidate);
  });
  
  socket.on("request-offer", ({ roomId }) => {
    socket.to(roomId).emit("request-offer");
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