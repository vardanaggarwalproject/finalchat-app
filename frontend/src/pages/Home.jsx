import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import socket from "../socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, 
  Send, 
  LogOut, 
  Users, 
  Loader2,
  Circle
} from "lucide-react";

const Home = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // Get token from cookies
  const getTokenFromCookie = () => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') {
        return value;
      }
    }
    return null;
  };

  // Initialize user and socket connection
  useEffect(() => {
    const userData = localStorage.getItem("user");
    const token = getTokenFromCookie();
    
    if (userData && token) {
      const user = JSON.parse(userData);
      setCurrentUser(user);
      
      // Connect socket with authentication
      socket.auth = { token };
      socket.connect();
      
      console.log("🔌 Connecting socket with user:", user.id);
      
      // Socket event listeners
      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
      });

      socket.on("connect_error", (error) => {
        console.error("❌ Socket connection error:", error);
      });

      // Listen for user online status
      socket.on("user_online", (onlineUser) => {
        console.log("👤 User came online:", onlineUser);
        setUsers((prevUsers) => {
          const exists = prevUsers.find(u => u.id === onlineUser.id);
          if (exists) {
            return prevUsers.map(u => 
              u.id === onlineUser.id ? { ...u, isOnline: true } : u
            );
          }
          return [...prevUsers, { ...onlineUser, isOnline: true }];
        });
      });

      // Listen for user status changes
      socket.on("user_status_change", ({ userId, isOnline }) => {
        console.log(`📊 User status changed: ${userId} - ${isOnline ? 'online' : 'offline'}`);
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, isOnline } : u
          )
        );
      });

      // Listen for direct messages
      socket.on("receive_direct_message", (messageData) => {
        console.log("📨 Received message:", messageData);
        
        // Add message to chat if it's from the currently selected user
        if (selectedUser && 
            (messageData.senderId === selectedUser.id || 
             messageData.receiverId === selectedUser.id)) {
          setMessages((prevMessages) => [...prevMessages, messageData]);
        }

        // Update user list with new last message
        setUsers((prevUsers) =>
          prevUsers.map((u) => {
            if (u.id === messageData.senderId) {
              return {
                ...u,
                lastMessage: {
                  content: messageData.content,
                  createdAt: messageData.createdAt,
                  senderId: messageData.senderId,
                },
                unreadCount: selectedUser?.id === messageData.senderId 
                  ? u.unreadCount 
                  : (u.unreadCount || 0) + 1,
              };
            }
            return u;
          })
        );
      });

      // Listen for message sent confirmation
      socket.on("message_sent", (messageData) => {
        console.log("✅ Message sent confirmed:", messageData);
      });

      socket.on("message_error", (error) => {
        console.error("❌ Message error:", error);
      });
    }
    
    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("user_online");
      socket.off("user_status_change");
      socket.off("receive_direct_message");
      socket.off("message_sent");
      socket.off("message_error");
      socket.disconnect();
    };
  }, []);

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;
      
      try {
        const response = await axios.get("http://localhost:8000/api/user/all", {
          withCredentials: true,
        });
        
        console.log("👥 Fetched users:", response.data);
        
        // Filter out current user
        const otherUsers = response.data.users.filter(
          (user) => user.id !== currentUser.id
        );
        setUsers(otherUsers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Fetch messages when a user is selected
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser) return;
      
      try {
        const response = await axios.get(
          `http://localhost:8000/api/messages/direct/${selectedUser.id}`,
          { withCredentials: true }
        );
        console.log("💬 Fetched messages:", response.data);
        setMessages(response.data.messages || []);

        // Mark messages as read
        try {
          await axios.post(
            `http://localhost:8000/api/messages/mark-read/${selectedUser.id}`,
            {},
            { withCredentials: true }
          );
          
          // Update unread count in users list
          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === selectedUser.id ? { ...u, unreadCount: 0 } : u
            )
          );
        } catch (error) {
          console.error("Error marking messages as read:", error);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [selectedUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message via Socket.io
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    setSending(true);
    
    try {
      const messageContent = newMessage.trim();
      
      // Send message via socket
      socket.emit("send_direct_message", {
        receiverId: selectedUser.id,
        content: messageContent,
      });

      // Optimistically add message to UI
      const tempMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        receiverId: selectedUser.id,
        content: messageContent,
        createdAt: new Date().toISOString(),
        senderName: currentUser.name,
        senderUserName: currentUser.userName,
      };

      setMessages((prev) => [...prev, tempMessage]);
      
      // Update last message in user list
      setUsers((prevUsers) =>
        prevUsers.map((u) => {
          if (u.id === selectedUser.id) {
            return {
              ...u,
              lastMessage: {
                content: messageContent,
                createdAt: new Date().toISOString(),
                senderId: currentUser.id,
              },
            };
          }
          return u;
        })
      );
      
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await axios.get("http://localhost:8000/api/auth/logout", {
        withCredentials: true,
      });
      localStorage.removeItem("user");
      socket.disconnect();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("user");
      socket.disconnect();
      navigate("/login");
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-cyan-500">Chatly</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-slate-600 hover:text-red-500"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Current User */}
          <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
            <Avatar className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500">
              <AvatarFallback className="text-white font-semibold">
                {getInitials(currentUser?.userName || currentUser?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 truncate">
                {currentUser?.userName || currentUser?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-hidden">
          <div className="p-3 border-b border-slate-200 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">
              All Users ({users.length})
            </span>
          </div>
          
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="p-2">
              {users.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">
                  No other users available
                </p>
              ) : (
                users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1 ${
                      selectedUser?.id === user.id
                        ? "bg-cyan-50 border-2 border-cyan-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="w-11 h-11 bg-gradient-to-br from-slate-400 to-slate-600">
                        <AvatarFallback className="text-white font-semibold">
                          {getInitials(user.userName || user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`w-3 h-3 absolute bottom-0 right-0 rounded-full border-2 border-white ${
                          user.isOnline ? "fill-green-500 text-green-500" : "fill-slate-400 text-slate-400"
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-slate-800 truncate">
                          {user.userName || user.name}
                        </p>
                        {user.unreadCount > 0 && (
                          <span className="ml-2 bg-cyan-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {user.unreadCount}
                          </span>
                        )}
                      </div>
                      {user.lastMessage ? (
                        <p className="text-xs text-slate-500 truncate">
                          {user.lastMessage.senderId === currentUser.id ? "You: " : ""}
                          {user.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          {user.isOnline ? "Online" : "Offline"}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="w-11 h-11 bg-gradient-to-br from-slate-400 to-slate-600">
                    <AvatarFallback className="text-white font-semibold">
                      {getInitials(selectedUser.userName || selectedUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <Circle
                    className={`w-3 h-3 absolute bottom-0 right-0 rounded-full border-2 border-white ${
                      selectedUser.isOnline ? "fill-green-500 text-green-500" : "fill-slate-400 text-slate-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {selectedUser.userName || selectedUser.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {selectedUser.isOnline ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-slate-50">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                    <MessageSquare className="w-16 h-16 mb-4" />
                    <p className="text-lg">No messages yet</p>
                    <p className="text-sm">Start a conversation!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isOwn = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                            isOwn
                              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white"
                              : "bg-white text-slate-800 border border-slate-200"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? "text-cyan-100" : "text-slate-400"
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
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="bg-white border-t border-slate-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 h-11 border-slate-300 focus:border-cyan-500 focus:ring-cyan-500"
                  disabled={sending}
                />
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="h-11 px-6 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50">
            <div className="text-center text-slate-400">
              <MessageSquare className="w-20 h-20 mx-auto mb-4" />
              <p className="text-xl font-semibold">Welcome to Chatly!</p>
              <p className="text-sm mt-2">Select a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;