import { Server } from "socket.io";

const PORT = Number(process.env.SIGNALING_PORT || 3001);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "*";

const io = new Server(PORT, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
});

console.log(`WebRTC signaling server running on port ${PORT}`);

io.on("connection", (socket) => {
  const transportId = socket.id;

  console.log(`User connected: ${transportId}`);

  socket.on("join", ({ roomId, role }) => {
    if (!roomId) return;

    socket.join(roomId);
    console.log(`[join] ${transportId} joined room ${roomId}${role ? ` as ${role}` : ""}`);
  });

  socket.on("offer", ({ roomId, offer }) => {
    if (!roomId || !offer) return;

    socket.to(roomId).emit("offer", offer);
    console.log(`[offer] ${transportId} -> room ${roomId}`);
  });

  socket.on("answer", ({ roomId, answer }) => {
    if (!roomId || !answer) return;

    socket.to(roomId).emit("answer", answer);
    console.log(`[answer] ${transportId} -> room ${roomId}`);
  });

  socket.on("ice", ({ roomId, candidate }) => {
    if (!roomId || !candidate) return;

    socket.to(roomId).emit("ice", candidate);
    console.log(`[ice] ${transportId} -> room ${roomId}`);
  });

  socket.on("request-offer", ({ roomId }) => {
    if (!roomId) return;

    socket.to(roomId).emit("request-offer");
    console.log(`[request-offer] ${transportId} -> room ${roomId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${transportId} (${reason})`);
  });
});