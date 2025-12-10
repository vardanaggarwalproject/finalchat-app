// pages/ChatPage.jsx

import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const { roomId } = useParams();
  const navigate = useNavigate();
  const chatEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Get current user info (adjust based on your auth setup)
    const getUserInfo = async () => {
      try {
        // Replace with your actual user fetch logic
        const response = await axios.get("http://localhost:8000/api/user/me", {
          withCredentials: true,
        });
        setCurrentUser(response.data.user);
        return response.data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        navigate("/login");
      }
    };

    const initializeChat = async () => {
      try {
        const user = await getUserInfo();
        if (!user) return;

        // Fetch group info
        const groupResponse = await axios.get(
          `http://localhost:8000/api/groups/${roomId}`,
          { withCredentials: true }
        );
        setGroupInfo(groupResponse.data.group);
        setMembers(groupResponse.data.members);

        // Fetch message history
        const messagesResponse = await axios.get(
          `http://localhost:8000/api/groups/${roomId}/messages`,
          { withCredentials: true }
        );
        setChat(messagesResponse.data.messages);

        // Join the room with user info
        socket.emit("join_group", {
          groupId: roomId,
          userId: user.id,
          username: user.name || user.email,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error initializing chat:", error);
        alert("Failed to load chat");
        navigate("/");
      }
    };

    initializeChat();

    // Socket listeners
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("user_joined", (data) => {
      console.log(data.message);
      // Optionally show notification
    });

    socket.on("user_left", (data) => {
      console.log(data.message);
    });

    socket.on("active_users", (users) => {
      setActiveUsers(users);
    });

    socket.on("user_typing", (data) => {
      setTypingUsers((prev) => [...new Set([...prev, data.username])]);
    });

    socket.on("user_stop_typing", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.username));
    });

    return () => {
      socket.off("receive_message");
      socket.off("user_joined");
      socket.off("user_left");
      socket.off("active_users");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [roomId, navigate]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const sendMessage = () => {
    if (!message.trim() || !currentUser) return;

    const msgData = {
      groupId: roomId,
      userId: currentUser.id,
      username: currentUser.name || currentUser.email,
      content: message.trim(),
    };

    socket.emit("send_message", msgData);
    setMessage("");
    
    // Stop typing indicator
    socket.emit("stop_typing", {
      groupId: roomId,
      username: currentUser.name || currentUser.email,
    });
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);

    if (!currentUser) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing event
    socket.emit("typing", {
      groupId: roomId,
      username: currentUser.name || currentUser.email,
    });

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        groupId: roomId,
        username: currentUser.name || currentUser.email,
      });
    }, 2000);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">{groupInfo?.name}</h2>
            {groupInfo?.description && (
              <p className="text-sm text-gray-600">{groupInfo.description}</p>
            )}
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back to Groups
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {chat.map((msg, i) => {
            const isOwnMessage = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id || i}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-md px-4 py-2 rounded-lg ${
                    isOwnMessage
                      ? "bg-blue-500 text-white"
                      : "bg-white border"
                  }`}
                >
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold mb-1 text-gray-600">
                      {msg.senderName}
                    </p>
                  )}
                  <p className="break-words">{msg.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwnMessage ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-6 py-2 text-sm text-gray-600 italic">
            {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t px-6 py-4">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={handleTyping}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Members */}
      <div className="w-64 bg-white border-l p-4">
        <h3 className="font-bold mb-4">Members ({members.length})</h3>
        <div className="space-y-2">
          {members.map((member) => {
            const isOnline = activeUsers.some((u) => u.userId === member.id);
            return (
              <div key={member.id} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.role}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}