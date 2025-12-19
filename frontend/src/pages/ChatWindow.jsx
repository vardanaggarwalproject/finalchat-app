/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import socket from "../socket";
import Logo from "@/components/Logo";
import SplashScreen from "@/components/SplashScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  LogOut,
  Users,
  Loader2,
  Circle,
  Plus,
  Hash,
  MoreVertical,
  User,
  Mail,
  Image as ImageIcon,
  Search,
  ArrowLeft,
  Phone,
  Video,
  Paperclip,
  Smile,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeAgo } from "@/utils/timeago";

const ChatWindow = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [activeTab, setActiveTab] = useState("users");

  // Profile edit states
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editImage, setEditImage] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const messagesEndRef = useRef(null);
  const socketInitialized = useRef(false);
  const selectedUserRef = useRef(null);
  const selectedGroupRef = useRef(null);
  const currentUserRef = useRef(null);

  // Initialize user first
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const userData = localStorage.getItem("user");

        if (!userData) {
          console.error(" No user data found, redirecting to login");
          navigate("/login");
          return;
        }

        const user = JSON.parse(userData);
        // console.log(" User data loaded:", user);
        setCurrentUser(user);
        setEditName(user.name || user.userName || "");
        setEditEmail(user.email || "");
        setEditImage(user.image || "");
      } catch (error) {
        console.error(" Error initializing user:", error);
        navigate("/login");
      }
    };

    initializeUser();
  }, [navigate]);

  // Initialize socket connection AFTER user is set
  useEffect(() => {
    if (!currentUser || socketInitialized.current) return;

    // console.log(" Initializing socket connection for user:", currentUser.id);
    socketInitialized.current = true;

    // Ensure socket is disconnected first
    if (socket.connected) {
      console.log("Socket already connected, disconnecting first...");
      socket.disconnect();
    }

    // Small delay to ensure clean disconnect
    setTimeout(() => {
      console.log("Attempting to connect socket...");
      socket.connect();
    }, 100);

    // Socket event listeners
    socket.on("connect", () => {
      console.log(" Socket connected successfully:", socket.id);
      setSocketConnected(true);

      // Refresh user list to get current online status when socket connects
      const refreshUserStatus = async () => {
        try {
          console.log(" Refreshing user list after socket connection...");
          const response = await axiosInstance.get(`/api/user/all`);

          if (currentUserRef.current) {
            const otherUsers = response.data.users.filter(
              (user) => user.id !== currentUserRef.current.id
            );
            setUsers(otherUsers);
            setFilteredUsers(otherUsers);
            console.log(" User list refreshed with current online status");
          }
        } catch (error) {
          console.error(" Error refreshing user list:", error);
        }
      };

      refreshUserStatus();
    });

    socket.on("connect_error", (error) => {
      // console.error( Socket connection error:", error.message);
      setSocketConnected(false);
    });

    socket.on("disconnect", (reason) => {
      console.log(" Socket disconnected. Reason:", reason);
      setSocketConnected(false);
    });

    // Listen for user online status
    socket.on("user_online", (onlineUser) => {
      console.log(" User came online:", onlineUser);
      setUsers((prevUsers) => {
        const exists = prevUsers.find((u) => u.id === onlineUser.id);
        if (exists) {
          return prevUsers.map((u) =>
            u.id === onlineUser.id ? { ...u, isOnline: true } : u
          );
        }
        return [...prevUsers, { ...onlineUser, isOnline: true }];
      });

      // Update selectedUser if they came online
      if (selectedUserRef.current?.id === onlineUser.id) {
        setSelectedUser((prevSelected) => ({
          ...prevSelected,
          isOnline: true,
        }));
      }
    });

    // Listen for user status changes
    socket.on("user_status_change", ({ userId, isOnline }) => {
      console.log(
        ` User status changed: ${userId} - ${isOnline ? "online" : "offline"}`
      );
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, isOnline } : u))
      );

      // Update selectedUser if their status changed
      if (selectedUserRef.current?.id === userId) {
        setSelectedUser((prevSelected) => ({
          ...prevSelected,
          isOnline,
        }));
      }
    });

    // Listen for direct messages
    socket.on("receive_direct_message", (messageData) => {
      console.log(" Received direct message:", messageData);
      console.log(
        " Sender ID:",
        messageData.senderId,
        "Content:",
        messageData.content,
        "Created At:",
        messageData.createdAt
      );

      // Add message to chat if it's between current user and selected user
      if (
        selectedUserRef.current &&
        !selectedGroupRef.current &&
        currentUserRef.current
      ) {
        // Check if message is between current user and the selected user
        const isMessageForThisChat =
          (messageData.senderId === selectedUserRef.current.id &&
            messageData.receiverId === currentUserRef.current.id) ||
          (messageData.senderId === currentUserRef.current.id &&
            messageData.receiverId === selectedUserRef.current.id) ||
          (messageData.senderId === selectedUserRef.current.id &&
            !messageData.receiverId) || // Old format compatibility
          (messageData.receiverId === selectedUserRef.current.id &&
            !messageData.groupId); // Old format compatibility

        if (isMessageForThisChat) {
          console.log(
            " Adding message to chat - Valid for current conversation"
          );
          setMessages((prevMessages) => [...prevMessages, messageData]);
        } else {
          console.log(
            " Message not for this chat - Sender:",
            messageData.senderId,
            "Receiver:",
            messageData.receiverId,
            "Selected user:",
            selectedUserRef.current.id
          );
        }
      }

      // Update user list with new last message
      // This updates the sender's last message in the receiver's list
      console.log(
        " Updating user list with last message from sender:",
        messageData.senderId
      );
      setUsers((prevUsers) => {
        console.log(" Current users in state before update:", prevUsers.length);

        // Check if sender exists in users list
        const senderExists = prevUsers.some(
          (u) => u.id === messageData.senderId
        );
        console.log(" Sender exists in users list:", senderExists);

        if (!senderExists) {
          console.log(
            " SENDER NOT IN LIST! This might be the issue. Users list:",
            prevUsers.map((u) => ({ id: u.id, name: u.userName }))
          );
        }

        const updated = prevUsers.map((u) => {
          if (u.id === messageData.senderId) {
            console.log(" Found sender in users list, updating lastMessage:", {
              content: messageData.content,
              createdAt: messageData.createdAt,
              senderId: messageData.senderId,
            });
            return {
              ...u,
              lastMessage: {
                content: messageData.content,
                createdAt: messageData.createdAt,
                senderId: messageData.senderId,
              },
              unreadCount:
                selectedUserRef.current?.id === messageData.senderId
                  ? u.unreadCount
                  : (u.unreadCount || 0) + 1,
            };
          }
          return u;
        });
        console.log(" Updated users list:", updated);
        return updated;
      });
    });

    // Listen for message sent confirmation (for sender's UI update)
    socket.on("message_sent", (messageData) => {
      console.log(" Message sent confirmation:", messageData);
      console.log(
        " Receiver ID:",
        messageData.receiverId,
        "Content:",
        messageData.content
      );

      // Update user list to show the message in the receiver's entry
      setUsers((prevUsers) => {
        console.log(
          " Updating sender's user list, total users:",
          prevUsers.length
        );
        const updated = prevUsers.map((u) => {
          if (u.id === messageData.receiverId) {
            console.log(" Found receiver in users list, updating lastMessage");
            return {
              ...u,
              lastMessage: {
                content: messageData.content,
                createdAt: messageData.createdAt,
                senderId: messageData.senderId,
              },
            };
          }
          return u;
        });
        console.log(" Updated users list after message_sent:", updated);
        return updated;
      });
    });

    // Listen for group messages
    socket.on("receive_group_message", (messageData) => {
      console.log(" Received group message:", messageData);

      // Add message to chat if it's in the currently selected group
      if (
        selectedGroupRef.current &&
        messageData.groupId === selectedGroupRef.current.id
      ) {
        setMessages((prevMessages) => [...prevMessages, messageData]);
      }

      // Update group list with new last message
      setGroups((prevGroups) =>
        prevGroups.map((g) => {
          if (g.id === messageData.groupId) {
            return {
              ...g,
              lastMessage: {
                content: messageData.content,
                createdAt: messageData.createdAt,
                senderName:
                  messageData.senderUserName || messageData.senderName,
              },
            };
          }
          return g;
        })
      );
    });

    // Listen for new groups created (real-time sync)
    socket.on("group_created", (groupData) => {
      console.log(" New group created:", groupData);
      // Add group to list if current user is a member
      if (
        groupData.memberIds &&
        groupData.memberIds.includes(currentUserRef.current?.id)
      ) {
        setGroups((prevGroups) => {
          const exists = prevGroups.find((g) => g.id === groupData.group.id);
          if (!exists) {
            return [...prevGroups, { ...groupData.group, role: "member" }];
          }
          return prevGroups;
        });
      }
    });

    // Listen for being added to a group
    socket.on("added_to_group", (groupData) => {
      console.log(" Added to group:", groupData);
      setGroups((prevGroups) => {
        const exists = prevGroups.find((g) => g.id === groupData.id);
        if (!exists) {
          return [...prevGroups, { ...groupData, role: "member" }];
        }
        return prevGroups;
      });
    });

    socket.on("message_error", (error) => {
      console.error(" Message error:", error);
      alert("Failed to send message: " + error.error);
    });

    // Listen for profile updates from server (broadcasts to all connected clients)
    socket.on("profile_updated", (data) => {
      console.log(" Profile updated from server:", data);
      console.log(
        " Current user ID:",
        currentUserRef.current?.id,
        "Updated user ID:",
        data.userId
      );

      // If it's the current user's profile that was updated
      if (data.userId === currentUserRef.current?.id) {
        console.log(
          " Updating CURRENT user profile in state and localStorage:",
          data.user
        );
        setCurrentUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
        console.log(" Current user updated in localStorage");
      } else {
        console.log(" Updating OTHER user profile in users list");
      }

      // Update the user in the users list if they exist
      setUsers((prevUsers) => {
        const updated = prevUsers.map((u) => {
          if (u.id === data.userId) {
            console.log(
              " Updating user in list:",
              data.userId,
              "with new data:",
              data.user
            );
            return { ...u, ...data.user };
          }
          return u;
        });
        return updated;
      });

      // Update the selected user if it's the one being viewed
      if (selectedUserRef.current?.id === data.userId) {
        console.log(" Updating selected user:", data.userId);
        setSelectedUser((prevSelected) => ({ ...prevSelected, ...data.user }));
      }
    });

    return () => {
      console.log(" Cleaning up socket listeners");
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("user_online");
      socket.off("user_status_change");
      socket.off("receive_direct_message");
      socket.off("receive_group_message");
      socket.off("group_created");
      socket.off("added_to_group");
      socket.off("message_sent");
      socket.off("message_error");
      socket.off("profile_updated");
      socket.disconnect();
      socketInitialized.current = false;
    };
  }, [currentUser]);

  // Keep refs updated with current values
  useEffect(() => {
    selectedUserRef.current = selectedUser;
    selectedGroupRef.current = selectedGroup;
    currentUserRef.current = currentUser;
  }, [selectedUser, selectedGroup, currentUser]);

  // Populate edit form fields when dialog opens or currentUser changes
  useEffect(() => {
    if (showEditProfile && currentUser) {
      console.log(" Populating edit form with current user data:", currentUser);
      setEditName(currentUser.name || currentUser.userName || "");
      setEditEmail(currentUser.email || "");
      setEditImage(currentUser.image || "");
    }
  }, [showEditProfile, currentUser]);

  // Refresh timestamps every 30 seconds to keep "time ago" format current
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Force a re-render to update timestamps
      setUsers((prevUsers) => [...prevUsers]);
      setGroups((prevGroups) => [...prevGroups]);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Fetch all users AFTER socket is connected
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;

      try {
        console.log(" Fetching users...");
        const response = await axiosInstance.get(`/api/user/all`);

        console.log(" Fetched users:", response.data);

        // Filter out current user
        let otherUsers = response.data.users.filter(
          (user) => user.id !== currentUser.id
        );

        // Fetch last message for each user in parallel
        const usersWithMessages = await Promise.all(
          otherUsers.map(async (user) => {
            try {
              const messagesResponse = await axiosInstance.get(
                `/api/messages/direct/${user.id}`
              );
              const messages = messagesResponse.data.messages || [];

              if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                return {
                  ...user,
                  lastMessage: {
                    content: lastMsg.content,
                    createdAt: lastMsg.createdAt,
                    senderId: lastMsg.senderId,
                  },
                };
              }
              return user;
            } catch (error) {
              console.error(
                `Error fetching messages for user ${user.id}:`,
                error
              );
              return user;
            }
          })
        );

        setUsers(usersWithMessages);
        setFilteredUsers(usersWithMessages);
      } catch (error) {
        console.error("❌ Error fetching users:", error);
      }
    };

    const timer = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser]);

  // Fetch groups
  useEffect(() => {
    const fetchGroups = async () => {
      if (!currentUser) return;

      try {
        console.log(" Fetching groups...");
        const response = await axiosInstance.get(`/api/groups/my-groups`);

        console.log(" Fetched groups:", response.data);
        let allGroups = response.data.groups || [];

        // Fetch last message for each group in parallel
        const groupsWithMessages = await Promise.all(
          allGroups.map(async (group) => {
            try {
              const messagesResponse = await axiosInstance.get(
                `/api/groups/${group.id}/messages`
              );
              const messages = messagesResponse.data.messages || [];

              if (messages.length > 0) {
                const lastMsg = messages[messages.length - 1];
                return {
                  ...group,
                  lastMessage: {
                    content: lastMsg.content,
                    createdAt: lastMsg.createdAt,
                    senderName: lastMsg.senderUserName || lastMsg.senderName,
                  },
                };
              }
              return group;
            } catch (error) {
              console.error(
                `Error fetching messages for group ${group.id}:`,
                error
              );
              return group;
            }
          })
        );

        setGroups(groupsWithMessages);
        setFilteredGroups(groupsWithMessages);
        setLoading(false);
      } catch (error) {
        console.error(" Error fetching groups:", error);
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchGroups();
    }, 500);

    return () => clearTimeout(timer);
  }, [currentUser]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      setFilteredGroups(groups);
      return;
    }

    const query = searchQuery.toLowerCase();
    setFilteredUsers(
      users.filter(
        (user) =>
          user.userName?.toLowerCase().includes(query) ||
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query)
      )
    );
    setFilteredGroups(
      groups.filter((group) => group.name?.toLowerCase().includes(query))
    );
  }, [searchQuery, users, groups]);

  // Fetch messages when a user is selected
  useEffect(() => {
    const fetchDirectMessages = async () => {
      if (!selectedUser || selectedGroup) return;

      try {
        console.log(" Fetching messages with:", selectedUser.id);
        const response = await axiosInstance.get(
          `/api/messages/direct/${selectedUser.id}`
        );
        console.log(" Fetched messages:", response.data);
        const fetchedMessages = response.data.messages || [];
        setMessages(fetchedMessages);

        // Update lastMessage in user list from fetched messages
        if (fetchedMessages.length > 0) {
          const lastMsg = fetchedMessages[fetchedMessages.length - 1];
          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === selectedUser.id
                ? {
                    ...u,
                    lastMessage: {
                      content: lastMsg.content,
                      createdAt: lastMsg.createdAt,
                      senderId: lastMsg.senderId,
                    },
                  }
                : u
            )
          );
        }

        // Mark messages as read
        try {
          await axiosInstance.post(
            `/api/messages/mark-read/${selectedUser.id}`,
            {}
          );

          setUsers((prevUsers) =>
            prevUsers.map((u) =>
              u.id === selectedUser.id ? { ...u, unreadCount: 0 } : u
            )
          );
        } catch (error) {
          console.error("❌ Error marking messages as read:", error);
        }
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
        setMessages([]);
      }
    };

    fetchDirectMessages();
  }, [selectedUser, selectedGroup]);

  // Fetch messages when a group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedGroup || selectedUser) return;

      try {
        // console.log(" Fetching group messages for:", selectedGroup.id);
        const response = await axiosInstance.get(
          `/api/groups/${selectedGroup.id}/messages`
        );
        // console.log(" Fetched group messages:", response.data);
        const fetchedMessages = response.data.messages || [];
        setMessages(fetchedMessages);

        // Update lastMessage in group list from fetched messages
        if (fetchedMessages.length > 0) {
          const lastMsg = fetchedMessages[fetchedMessages.length - 1];
          setGroups((prevGroups) =>
            prevGroups.map((g) =>
              g.id === selectedGroup.id
                ? {
                    ...g,
                    lastMessage: {
                      content: lastMsg.content,
                      createdAt: lastMsg.createdAt,
                      senderName: lastMsg.senderUserName || lastMsg.senderName,
                    },
                  }
                : g
            )
          );
        }

        // Join the group room via socket
        if (socket.connected) {
          socket.emit("join_group", { groupId: selectedGroup.id });
        }
      } catch (error) {
        console.error("❌ Error fetching group messages:", error);
        setMessages([]);
      }
    };

    fetchGroupMessages();

    return () => {
      // Leave group room when deselecting
      if (selectedGroupRef.current && socket.connected) {
        socket.emit("leave_group", { groupId: selectedGroupRef.current.id });
      }
    };
  }, [selectedGroup, selectedUser]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message via Socket.io
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim()) {
      console.log("Empty message, not sending");
      return;
    }

    if (!selectedUser && !selectedGroup) {
      console.log("No user or group selected");
      return;
    }

    if (!socketConnected) {
      alert("Not connected. Please wait for connection...");
      return;
    }

    setSending(true);

    try {
      const messageContent = newMessage.trim();

      if (selectedGroup) {
        console.log("Sending group message:", {
          groupId: selectedGroup.id,
          content: messageContent,
        });

        // Send group message
        socket.emit("send_group_message", {
          groupId: selectedGroup.id,
          content: messageContent,
        });

        // Optimistically add message to UI
        const tempMessage = {
          id: Date.now().toString(),
          senderId: currentUser.id,
          groupId: selectedGroup.id,
          content: messageContent,
          createdAt: new Date().toISOString(),
          senderName: currentUser.name,
          senderUserName: currentUser.userName,
        };

        setMessages((prev) => [...prev, tempMessage]);
      } else if (selectedUser) {
        console.log("Sending direct message:", {
          receiverId: selectedUser.id,
          content: messageContent,
        });

        // Send direct message
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
      }

      setNewMessage("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // Create group
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setCreatingGroup(true);

    try {
      const response = await axiosInstance.post(`/api/groups/create`, {
        name: groupName.trim(),
        description: groupDescription.trim(),
        memberIds: selectedMembers,
      });

      // console.log(" Group created:", response.data);

      // Add new group to list
      setGroups((prev) => [...prev, { ...response.data.group, role: "admin" }]);

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
      setShowCreateGroup(false);

      // Emit socket event for real-time sync
      if (socket.connected) {
        socket.emit("group_created", {
          group: response.data.group,
          memberIds: selectedMembers,
        });
      }
    } catch (error) {
      console.error("❌ Error creating group:", error);
      alert("Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);

    try {
      // console.log(" Sending profile update to server...");
      const response = await axiosInstance.put(`/api/user/update`, {
        name: editName,
        email: editEmail,
        image: editImage,
      });

      // console.log(" Profile updated from server:", response.data);

      // Update current user with fresh data
      const updatedUser = response.data.user;
      // console.log(" Updated user object:", updatedUser);
      // console.log(" Current user ID:", currentUser?.id);

      // Update state and localStorage immediately
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // console.log(" Updated user saved to localStorage");

      // Update users list immediately (don't wait for socket event)
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === updatedUser.id ? { ...u, ...updatedUser } : u
        )
      );
      // console.log(" Users list updated with new profile data");

      // Update selected user if it's the one being viewed
      if (selectedUser?.id === updatedUser.id) {
        setSelectedUser(updatedUser);
        // console.log("Selected user updated with new profile data");
      }

      // Force a re-render by updating edit fields too
      setEditName(updatedUser.name || updatedUser.userName || "");
      setEditEmail(updatedUser.email || "");
      setEditImage(updatedUser.image || "");

      setShowEditProfile(false);
      // console.log(" Profile dialog closed - waiting for socket broadcast");
      alert("Profile updated successfully!");
    } catch (error) {
      // console.error(" Error updating profile:", error);
      alert(
        "Failed to update profile: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Toggle member selection
  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // Logout
  const handleLogout = async () => {
    try {
      await axiosInstance.get(`/api/auth/logout`);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      socket.disconnect();
      navigate("/login");
    } catch (error) {
      // console.error(" Logout error:", error);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
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
      .toUpperCase()
      .slice(0, 2);
  };

  // Truncate long messages to fit in the preview (max 50 chars for now)
  const truncateMessage = (message, maxLength = 50) => {
    if (!message) return "";
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + "...";
  };

  if (loading) {
    return <SplashScreen duration={2700} />;
  }

  const selectedChat = selectedUser || selectedGroup;

  return (
    <div className="h-screen w-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      {/* Sidebar - Hidden on mobile when chat is selected */}
      <div
        className={`${
          selectedChat ? "hidden md:flex" : "flex"
        } w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col h-screen md:h-screen overflow-hidden transition-all duration-300`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Logo className="w-10 h-10" />
              <span className="text-xl font-bold text-[#040316]">VibeMesh</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-shrink-0 rounded-full p-0.5 bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:opacity-80 transition-all cursor-pointer shadow-md">
                  <Avatar className="w-10 h-10 bg-gradient-to-br from-primaryColor to-secondaryColor border-2 border-white">
                    <AvatarImage
                      src={currentUser?.image || ""}
                      alt="User Avatar"
                    />
                    <AvatarFallback className="text-white font-semibold text-sm">
                      {getInitials(currentUser?.userName || currentUser?.name)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-xl shadow-lg border border-slate-200"
              >
                {/* User Info Header */}
                <div className="px-3 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="p-0.5 bg-gradient-to-r from-[#040316] to-[#1a1a2e] rounded-full flex-shrink-0">
                      <Avatar className="w-12 h-12 bg-gradient-to-br from-primaryColor to-secondaryColor border-2 border-white">
                        <AvatarImage
                          src={currentUser?.image || ""}
                          alt="User Avatar"
                        />
                        <AvatarFallback className="text-white font-semibold">
                          {getInitials(
                            currentUser?.userName || currentUser?.name
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800 truncate text-sm">
                          {currentUser?.userName || currentUser?.name}
                        </p>
                        <Circle
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            socketConnected
                              ? "fill-green-500 text-green-500"
                              : "fill-slate-400 text-slate-400"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {currentUser?.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => setShowEditProfile(true)}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-primaryColor/10 hover:to-secondaryColor/10 rounded-lg py-2.5 px-3 mx-1"
                  >
                    <User className="w-4 h-4 mr-3 text-darkPurple" />
                    <span className="font-medium text-slate-700">
                      Edit Profile
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="cursor-pointer hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 rounded-lg py-2.5 px-3 mx-1"
                  >
                    <LogOut className="w-4 h-4 mr-3 text-red-500" />
                    <span className="font-medium text-slate-700">Log out</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10 bg-slate-50 border-slate-200 focus:border-darkPurple focus:ring-darkPurple"
            />
          </div>
        </div>

        {/* Tabs for Users and Groups */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden min-h-0"
        >
          <div className="border-b border-slate-200 flex-shrink-0 bg-slate-50">
            <TabsList className="w-full grid grid-cols-2 bg-transparent h-auto p-2 gap-2">
              <TabsTrigger
                value="users"
                className="rounded-xl border-2 border-transparent data-[state=active]:bg-gradient-to-r data-[state=active]:from-primaryColor/20 data-[state=active]:to-secondaryColor/20 data-[state=active]:border-darkPurple/30 data-[state=active]:text-darkPurple text-slate-600 py-2.5 font-medium transition-all duration-300 hover:bg-slate-100"
              >
                <Users className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">Users</span>
              </TabsTrigger>
              <TabsTrigger
                value="groups"
                className="rounded-xl border-2 border-transparent data-[state=active]:bg-gradient-to-r data-[state=active]:from-primaryColor/20 data-[state=active]:to-secondaryColor/20 data-[state=active]:border-darkPurple/30 data-[state=active]:text-darkPurple text-slate-600 py-2.5 font-medium transition-all duration-300 hover:bg-slate-100"
              >
                <Hash className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">Groups</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="users"
            className="flex-1 m-0 overflow-hidden min-h-0"
          >
            <ScrollArea className="h-full w-full">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">
                  {searchQuery ? "No users found" : "No other users available"}
                </p>
              ) : (
                <div className="py-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSelectedGroup(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectedUser?.id === user.id && !selectedGroup
                          ? "bg-gradient-to-r from-primaryColor/10 to-secondaryColor/10 border-l-4 border-[#040316]"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-12 h-12 bg-gradient-to-br from-primaryColor to-secondaryColor">
                          <AvatarImage
                            src={user?.image || ""}
                            alt="User Avatar"
                          />
                          <AvatarFallback className="text-white font-semibold text-sm">
                            {getInitials(user.userName || user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <Circle
                          className={`w-3 h-3 absolute bottom-0 right-0 rounded-full border-2 border-white ${
                            user.isOnline
                              ? "fill-green-500 text-green-500"
                              : "fill-slate-400 text-slate-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <p className="font-semibold text-slate-800 text-xs sm:text-sm break-words flex-1">
                            {user.userName || user.name}
                          </p>
                          {user.lastMessage && (
                            <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                              {formatTimeAgo(user.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {user.lastMessage ? (
                            <p className="text-xs text-slate-600 break-words flex-1 line-clamp-1">
                              {user.lastMessage.senderId === currentUser.id
                                ? "You: "
                                : ""}
                              {truncateMessage(user.lastMessage.content, 50)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              No messages yet
                            </p>
                          )}
                          {user.unreadCount > 0 && (
                            <span className="bg-gradient-to-r from-darkPurple to-primaryColor text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 min-h-5 min-w-5 shadow-md">
                              {user.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="groups"
            className="flex-1 m-0 overflow-hidden flex flex-col min-h-0"
          >
            <div className="p-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <span className="text-sm font-semibold text-slate-700">
                My Groups ({groups.length})
              </span>
              <Button
                size="sm"
                onClick={() => setShowCreateGroup(true)}
                className="h-8 px-3 bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>

            <ScrollArea className="flex-1 w-full">
              {filteredGroups.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  {searchQuery ? (
                    <p className="text-sm">No groups found</p>
                  ) : (
                    <>
                      <Hash className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                      <p className="text-sm mb-2">No groups yet</p>
                      <Button
                        size="sm"
                        onClick={() => setShowCreateGroup(true)}
                        variant="outline"
                        className="text-sm"
                      >
                        Create your first group
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => {
                        setSelectedGroup(group);
                        setSelectedUser(null);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                        selectedGroup?.id === group.id && !selectedUser
                          ? "bg-gradient-to-r from-primaryColor/10 to-secondaryColor/10 border-l-4 border-[#040316]"
                          : "hover:bg-slate-50 border-l-4 border-transparent"
                      }`}
                    >
                      <Avatar className="w-12 h-12 bg-gradient-to-br from-primaryColor to-secondaryColor flex-shrink-0">
                        <AvatarFallback className="text-white font-semibold text-sm">
                          {getInitials(group.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1 min-w-0 flex-1">
                            <Hash className="w-3 h-3 text-darkPurple flex-shrink-0 mt-0.5" />
                            <p className="font-semibold text-slate-800 text-xs sm:text-sm break-words flex-1">
                              {group.name}
                            </p>
                          </div>
                          {group.lastMessage && (
                            <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                              {formatTimeAgo(group.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {group.lastMessage ? (
                            <p className="text-xs text-slate-600 break-words flex-1 line-clamp-1">
                              {group.lastMessage.senderName}:{" "}
                              {truncateMessage(group.lastMessage.content, 40)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              No messages yet
                            </p>
                          )}
                          {group.role === "admin" && (
                            <span className="bg-gradient-to-r from-primaryColor/20 to-secondaryColor/20 text-darkPurple text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 whitespace-nowrap">
                              Admin
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Area - Hidden on mobile when no chat is selected */}
      <div
        className={`${
          !selectedChat ? "hidden md:flex" : "flex"
        } flex-1 flex flex-col h-screen md:h-screen overflow-hidden min-h-0 transition-all duration-300`}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b border-slate-200 p-3 sm:p-4 flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedGroup(null);
                    }}
                    className="md:hidden flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="relative flex-shrink-0">
                    <Avatar
                      className={`w-10 h-10 sm:w-11 sm:h-11 ${
                        selectedGroup
                          ? "bg-gradient-to-br from-primaryColor to-secondaryColor"
                          : "bg-gradient-to-br from-primaryColor to-secondaryColor"
                      }`}
                    >
                      <AvatarImage
                        src={selectedChat?.image || ""}
                        alt="User Avatar"
                      />
                      <AvatarFallback className="text-white font-semibold text-xs sm:text-sm">
                        {getInitials(
                          selectedChat.userName || selectedChat.name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    {selectedUser && (
                      <Circle
                        className={`w-3 h-3 absolute bottom-0 right-0 rounded-full border-2 border-white ${
                          selectedUser.isOnline
                            ? "fill-green-500 text-green-500"
                            : "fill-slate-400 text-slate-400"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1 sm:gap-2">
                      {selectedGroup && (
                        <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-darkPurple flex-shrink-0 mt-0.5" />
                      )}
                      <p className="font-semibold text-slate-800 text-sm sm:text-base break-words">
                        {selectedChat.userName || selectedChat.name}
                      </p>
                    </div>
                    <p className="text-xs sm:text-sm flex items-center gap-1">
                      {selectedUser ? (
                        <>
                          <Circle
                            className={`w-2 h-2 flex-shrink-0 ${
                              selectedUser.isOnline
                                ? "fill-green-500 text-green-500"
                                : "fill-slate-400 text-slate-400"
                            }`}
                          />
                          <span
                            className={
                              selectedUser.isOnline
                                ? "text-green-600"
                                : "text-slate-500"
                            }
                          >
                            {selectedUser.isOnline ? "Online" : "Offline"}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500 line-clamp-2">
                          {selectedGroup?.description || "Group chat"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                  >
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                  >
                    <Video className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 sm:p-4 bg-slate-50 overflow-hidden min-h-0">
              <div className="space-y-2 sm:space-y-4">
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
                        className={`flex ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] xs:max-w-[80%] sm:max-w-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl ${
                            isOwn
                              ? "bg-gradient-to-r from-primaryColor/50 via-secondaryColor/50 to-lightPurple/50 text-slate-800 rounded-br-sm shadow-md border border-primaryColor/30"
                              : "bg-gradient-to-r from-[#040316] to-[#1a1a2e] text-white rounded-bl-sm shadow-lg"
                          }`}
                        >
                          {selectedGroup && !isOwn && (
                            <p
                              className={`text-xs font-semibold mb-1 ${
                                isOwn
                                  ? "text-darkPurple"
                                  : "text-primaryColor/80"
                              }`}
                            >
                              {msg.senderUserName || msg.senderName}
                            </p>
                          )}
                          <p className="text-xs max-w-full sm:text-sm wrap-break-words break-all">
                            {msg.content}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? "text-slate-600" : "text-white/80"
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
            <div className="bg-white border-t border-slate-200 p-2 sm:p-4 flex-shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-1 sm:gap-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                >
                  <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 border-slate-300 focus:border-darkPurple focus:ring-darkPurple text-sm sm:text-base h-9 sm:h-10"
                  disabled={sending || !socketConnected}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex"
                >
                  <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
                <Button
                  type="submit"
                  disabled={sending || !newMessage.trim() || !socketConnected}
                  size="icon"
                  className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] h-9 w-9 sm:h-10 sm:w-10 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-slate-50 p-4">
            <div className="text-center text-slate-400">
              <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Logo className="w-24 h-24" />
              </div>
              <p className="text-2xl font-semibold mb-2">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-darkPurple to-primaryColor bg-clip-text text-transparent">
                  VibeMesh
                </span>
              </p>
              <p className="text-sm">
                Select a conversation to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Dialog - KEEPING THE SAME */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-[#040316]">
              <Hash className="w-5 h-5 text-darkPurple" />
              Create New Group
            </DialogTitle>
            <DialogDescription className="text-sm">
              Create a group to chat with multiple users
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                required
                className="h-11 focus:border-darkPurple focus:ring-darkPurple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description</Label>
              <Textarea
                id="groupDescription"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Enter group description (optional)"
                className="resize-none focus:border-darkPurple focus:ring-darkPurple"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Add Members (Optional)</Label>
              <ScrollArea className="h-48 border border-slate-200 rounded-md p-2">
                {users.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-4">
                    No users available
                  </p>
                ) : (
                  <div className="space-y-1">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleMember(user.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                          selectedMembers.includes(user.id)
                            ? "bg-gradient-to-r from-primaryColor/40 via-secondaryColor/40 to-lightPurple/40 border-2 border-primaryColor/50 shadow-lg"
                            : "bg-slate-50 hover:bg-slate-100 border-2 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-primaryColor to-secondaryColor">
                          <AvatarImage
                            src={user?.image || ""}
                            alt="User Avatar"
                          />
                          <AvatarFallback className="text-white font-semibold text-sm">
                            {getInitials(user.userName || user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-semibold truncate text-sm text-slate-800">
                            {user.userName || user.name}
                          </p>
                          <p className="text-xs truncate text-slate-500">
                            {user.email}
                          </p>
                        </div>
                        {selectedMembers.includes(user.id) && (
                          <div className="w-6 h-6 bg-gradient-to-r from-[#040316] to-[#1a1a2e] rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                            <svg
                              className="w-3.5 h-3.5 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {selectedMembers.length > 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  {selectedMembers.length} member
                  {selectedMembers.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateGroup(false)}
                disabled={creatingGroup}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingGroup || !groupName.trim()}
                className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {creatingGroup ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Group"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog - KEEPING THE SAME */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-[#040316]">
              <User className="w-5 h-5 text-darkPurple" />
              Edit Profile
            </DialogTitle>
            <DialogDescription className="text-sm">
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter your name"
                className="h-11 focus:border-darkPurple focus:ring-darkPurple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Enter your email"
                className="h-11 focus:border-darkPurple focus:ring-darkPurple"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editImage">
                <ImageIcon className="w-4 h-4 inline mr-2" />
                Profile Image URL
              </Label>
              <Input
                id="editImage"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                placeholder="Enter image URL"
                className="h-11 focus:border-darkPurple focus:ring-darkPurple"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditProfile(false)}
                disabled={updatingProfile}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updatingProfile}
                className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {updatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatWindow;
