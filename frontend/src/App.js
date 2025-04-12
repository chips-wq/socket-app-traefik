import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import "./App.css";

/**
 * Chat Application - Frontend Component
 *
 * This React component provides a user interface for the Socket.IO chat application.
 * It handles:
 * - Connection to the Socket.IO backend server
 * - Sending and receiving messages
 * - Displaying user typing status
 * - Showing connection status
 */
function App() {
  // State management
  const [socket, setSocket] = useState(null);
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [userId, setUserId] = useState("");

  const chatEndRef = useRef(null); // Reference for auto-scrolling
  const typingTimeoutRef = useRef(null); // Reference for typing timeout

  // Connect to Socket.IO server on component mount only
  useEffect(() => {
    // Create a new connection to the backend WebSocket server
    const newSocket = io("http://localhost:5000", {
      withCredentials: true,
      transports: ["websocket"],
    });

    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []); // Empty dependency array ensures this only runs once on mount

  // Set up event listeners when socket is available
  useEffect(() => {
    if (!socket) return;

    // Define event handlers
    const handleConnect = () => {
      setIsConnected(true);
      console.log("Connected to WebSocket server", socket.id);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log("Disconnected from WebSocket server");
    };

    const handleMessage = (msg) => {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "system",
          content: msg,
          timestamp: new Date().toISOString(),
        },
      ]);

      // If the message starts with "Welcome", extract and save the user ID
      if (typeof msg === "string" && msg.startsWith("Welcome!")) {
        const idMatch = msg.match(/Your ID is (.*)/);
        if (idMatch && idMatch[1]) {
          setUserId(idMatch[1].substring(0, 4));
        }
      }
    };

    const handleChatMessage = (data) => {
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          type: "chat",
          userId: data.userId,
          content: data.message,
          timestamp: data.timestamp,
          isCurrentUser: data.isCurrentUser || data.userId === userId,
        },
      ]);
    };

    const handleUserTyping = (typingUserId) => {
      setTypingUsers((prev) => {
        if (!prev.includes(typingUserId)) {
          return [...prev, typingUserId];
        }
        return prev;
      });
    };

    const handleUserStoppedTyping = (typingUserId) => {
      setTypingUsers((prev) => prev.filter((id) => id !== typingUserId));
    };

    const handleReconnect = () => {
      setTypingUsers([]);
    };

    // Register event listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("message", handleMessage);
    socket.on("chat message", handleChatMessage);
    socket.on("user typing", handleUserTyping);
    socket.on("user stopped typing", handleUserStoppedTyping);
    socket.on("reconnect", handleReconnect);

    // Cleanup function to remove all listeners when component unmounts
    // or when socket changes
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("message", handleMessage);
      socket.off("chat message", handleChatMessage);
      socket.off("user typing", handleUserTyping);
      socket.off("user stopped typing", handleUserStoppedTyping);
      socket.off("reconnect", handleReconnect);
    };
  }, [socket, userId]); // Only re-run if socket or userId changes

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handle sending a message
  const sendMessage = () => {
    if (message.trim() && socket) {
      socket.emit("chat message", message);
      setMessage("");
      // Also emit stop typing when sending a message
      socket.emit("stop typing");
      clearTimeout(typingTimeoutRef.current);
    }
  };

  // Handle typing indicator
  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!socket) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event
    socket.emit("typing");

    // Set a timeout to stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop typing");
    }, 1000);
  };

  return (
    <div className="chat-app">
      <header className="chat-header">
        <h1>Socket.IO Chat App</h1>
        <div className="connection-status">
          Status:{" "}
          {isConnected ? (
            <span className="status connected">Connected</span>
          ) : (
            <span className="status disconnected">Disconnected</span>
          )}
        </div>
        {userId && <div className="user-id">Your ID: {userId}</div>}
      </header>

      <div className="chat-container">
        <div className="messages-container">
          {chatMessages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.type === "system" ? "system" : ""} ${
                msg.type === "chat" && msg.isCurrentUser ? "current-user" : ""
              }`}
            >
              {msg.type === "chat" && (
                <div className="message-header">
                  <span className="user-id">{msg.userId}</span>
                  <span className="timestamp">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div className="message-content">{msg.content}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.length === 1
              ? `User ${typingUsers[0]} is typing...`
              : `${typingUsers.length} users are typing...`}
          </div>
        )}

        <div className="message-input-container">
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            disabled={!isConnected}
          />
          <button
            onClick={sendMessage}
            disabled={!isConnected || !message.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
