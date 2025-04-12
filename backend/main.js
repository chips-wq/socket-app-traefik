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
const cors = require("cors");

// Initialize Express application
const app = express();
app.use(cors()); // Enable CORS for all origins to allow cross-domain requests

// Create HTTP server using the Express app
const server = http.createServer(app);

/**
 * Socket.IO Configuration
 *
 * The Socket.IO server is configured with CORS settings to allow
 * connections from the React frontend. This is essential for cross-origin
 * communication between the frontend and backend.
 */
const io = new Server(server, {
  cors: {
    origin: "*", // In production, specify exact origin like "http://localhost:3000"
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000; // Using 5000 to avoid conflicts with React's default port (3000)

// Basic route to check if server is running
app.get("/", (req, res) => {
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
  console.log(`Visit http://localhost:${PORT} to check server status`);
});
