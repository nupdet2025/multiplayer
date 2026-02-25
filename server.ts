import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Game state
  const players: Record<string, { id: string; x: number; y: number; color: string; name: string }> = {};

  const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Initialize player
    players[socket.id] = {
      id: socket.id,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      name: `Player ${socket.id.substr(0, 4)}`,
    };

    // Send current players to the new player
    socket.emit("currentPlayers", players);

    // Broadcast the new player to others
    socket.broadcast.emit("newPlayer", players[socket.id]);

    socket.on("playerMovement", (movementData) => {
      if (players[socket.id]) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        socket.broadcast.emit("playerMoved", players[socket.id]);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      delete players[socket.id];
      io.emit("playerDisconnected", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
