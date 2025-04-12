/**
 * Socket.IO Chat Application - Backend Server
 *
 * This server handles real-time communication between clients using Socket.IO.
 * It sets up an Express server with Socket.IO integration to manage websocket
 * connections for a simple chat application.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

// Initialize Express application
const app = express();

// Create HTTP server using the Express app
const server = http.createServer(app);

// Setup Redis clients
const pubClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
const subClient = pubClient.duplicate();

// Fatal error handling for Redis connections - fail hard
pubClient.on("error", (err) => {
  console.error("FATAL: Redis pubClient error:", err);
  process.exit(1); // Exit with error code
});

subClient.on("error", (err) => {
  console.error("FATAL: Redis subClient error:", err);
  process.exit(1); // Exit with error code
});

/**
 * Socket.IO Configuration
 *
 * Path is configured for WebSocket connections in production
 */
const io = new Server(server, {
  path: "/api/socket", // Path for WebSocket connections in production
});

// Setup Redis adapter after clients are connected - fail hard if it doesn't work
const setupRedisAdapter = async () => {
  try {
    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Redis adapter initialized successfully");
  } catch (err) {
    console.error("FATAL: Failed to setup Redis adapter:", err);
    process.exit(1); // Exit with error code
  }
};

// Initialize Redis adapter
setupRedisAdapter();

const PORT = process.env.PORT || 5000;

// API routes
app.use("/api", express.static("public"));
app.get("/api", (req, res) => {
  res.send("Socket.IO server is running");
});

/**
 * Socket.IO Connection Handler
 *
 * This section manages all real-time communication events:
 * - New client connections
 * - Message broadcasting
 * - Disconnections
 */
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send welcome message to newly connected client only
  socket.emit("message", `Welcome! Your ID is ${socket.id}`);

  // Broadcast to everyone except the new user that someone joined
  socket.broadcast.emit(
    "message",
    `User ${socket.id.substring(0, 4)} has joined the chat`
  );

  /**
   * Chat Message Event Handler
   *
   * When a client sends a 'chat message', this handler:
   * 1. Logs the message to the server console
   * 2. Broadcasts the message to all connected clients EXCEPT sender
   * 3. Emits the message back to sender with isCurrentUser flag for UI differentiation
   */
  socket.on("chat message", (msg) => {
    console.log(`Message from ${socket.id}: ${msg}`);

    // Create the message object
    const messageObj = {
      userId: socket.id.substring(0, 4),
      message: msg,
      timestamp: new Date().toISOString(),
    };

    // Send to everyone EXCEPT the sender
    socket.broadcast.emit("chat message", messageObj);

    // Send back to the sender with the isCurrentUser flag
    socket.emit("chat message", {
      ...messageObj,
      isCurrentUser: true,
    });
  });

  /**
   * Typing Status Event Handlers
   *
   * These events notify other users when someone is typing
   */
  socket.on("typing", () => {
    socket.broadcast.emit("user typing", socket.id.substring(0, 4));
  });

  socket.on("stop typing", () => {
    socket.broadcast.emit("user stopped typing", socket.id.substring(0, 4));
  });

  /**
   * Disconnection Handler
   *
   * When a client disconnects, this handler:
   * 1. Logs the disconnection
   * 2. Notifies other users that someone left
   */
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Notify all remaining clients that a user left
    io.emit("message", `User ${socket.id.substring(0, 4)} has left the chat.`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Socket.IO server listening on *:${PORT}`);
  console.log(`Visit http://localhost:${PORT}/api to check server status`);
});

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing HTTP server");

  // Close Socket.IO connections
  io.close(() => {
    console.log("Socket.IO connections closed");
  });

  // Close Redis connections
  await pubClient.quit();
  await subClient.quit();

  // Close HTTP server
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});
