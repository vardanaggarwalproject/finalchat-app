/* eslint-disable no-unused-vars */
/* eslint-disable no-console */

import React, { useState, useEffect, useRef,useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosConfig";
import socket from "../socket";
import { useOnlineStatusManager, markUserOffline } from "@/hooks/useOnlineStatusManager";
import useTabSynchronization from "@/hooks/useTabSynchronization";
import { useProfileSync, useProfileRefreshFallback } from "@/hooks/useProfileSync";
import Logo from "@/components/Logo";
import SplashScreen from "@/components/SplashScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  Trash2,
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
import AddNewConversationModal from "@/components/AddNewConversationModal";
import AddGroupMembersModal from "@/components/AddGroupMembersModal";

const UserSkeleton = () => (
  <div className="w-full flex items-center gap-3 px-4 py-3 border-l-4 border-transparent">
    <Skeleton className="w-12 h-12 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-32" />
    </div>
  </div>
);

const MessageSkeleton = ({ side }) => (
  <div className={`flex ${side === 'left' ? 'justify-start' : 'justify-end'} mb-4 px-4`}>
    <div className={`flex ${side === 'left' ? 'flex-row' : 'flex-row-reverse'} items-end gap-2 max-w-[80%]`}>
      <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
      <div className={`flex flex-col ${side === 'left' ? 'items-start' : 'items-end'} space-y-1`}>
        <Skeleton className={`h-16 w-32 md:w-64 rounded-2xl ${side === 'left' ? 'rounded-bl-none' : 'rounded-br-none'}`} />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);

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
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(true);
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

  // Add new conversation modal states
  const [showAddConversationModal, setShowAddConversationModal] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState("connected"); // connected, disconnected, reconnecting

  // ... (existing code)

  // Connection status monitoring
  useEffect(() => {
    if (socket.connected) {
      setConnectionStatus("connected");
    }

    const onConnect = () => setConnectionStatus("connected");
    const onDisconnect = () => setConnectionStatus("disconnected");
    const onReconnectAttempt = () => setConnectionStatus("reconnecting");
    const onReconnect = () => {
      setConnectionStatus("connected");
      fetchUsers();
      fetchGroups();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("reconnect_attempt", onReconnectAttempt);
    socket.on("reconnect", onReconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("reconnect_attempt", onReconnectAttempt);
      socket.off("reconnect", onReconnect);
    };
  }, []);
  const [allUsers, setAllUsers] = useState([]); // All available users (for modal)
  const [chatUsers, setChatUsers] = useState([]); // Only users with chat history (for main tab)

  // Group management states
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);

  const messagesEndRef = useRef(null);
  const socketInitialized = useRef(false);
  const selectedUserRef = useRef(null);
  const selectedGroupRef = useRef(null);
  const currentUserRef = useRef(null);

  // Sync refs with state for socket listeners
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Helper to update and sort user/group lists for sidebar
  const refreshSidebar = useCallback(() => {
    const sortFn = (a, b) => {
      const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 
                    (a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0);
      const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 
                    (b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0);
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    };
    setUsers(prev => [...prev].sort(sortFn));
    setGroups(prev => [...prev].sort(sortFn));
  }, []);

  // Fetch all users logic
  const fetchUsers = useCallback(async (user) => {
    const activeUser = user || currentUserRef.current;
    if (!activeUser) {
      console.log(" [FETCH USERS] No user available, skipping");
      return;
    }

    try {
      console.log(" [FETCH USERS] Fetching users for:", activeUser.id);
      const response = await axiosInstance.get(`/api/user/all`);
      
      let otherUsers = response.data.users.filter(
        (u) => String(u.id) !== String(activeUser.id)
      );

      // Backend already provides unreadCount, so we can use the response directly
      // This is more reliable than tracking it in frontend state during a full fetch
      const usersToShow = otherUsers.filter(u => {
        const show = u.hasChat || u.addedForChat;
        if (!show) console.log(`   - User ignored: ${u.userName} (hasChat=${u.hasChat}, addedForChat=${u.addedForChat})`);
        return show;
      });
      
      console.log(` 📋 [USERS FETCH] Found ${usersToShow.length} users to show out of ${otherUsers.length}`);
      setUsers(usersToShow);
      setFilteredUsers(usersToShow);
      setAllUsers(otherUsers);
      setLoadingUsers(false);
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      setLoadingUsers(false);
    }
  }, []); // No longer depends on users

  // Fetch groups logic
  const fetchGroups = useCallback(async (user) => {
    const activeUser = user || currentUserRef.current;
    if (!activeUser) {
      console.log(" [FETCH GROUPS] No user available, skipping");
      return;
    }

    try {
      console.log(" [FETCH GROUPS] Fetching groups...");
      const response = await axiosInstance.get(`/api/groups/my-groups`);
      const groupsData = response.data.groups || [];
      
      setGroups(groupsData);
      setFilteredGroups(groupsData);
      setLoadingGroups(false);
    } catch (error) {
      console.error(" Error fetching groups:", error);
      setLoadingGroups(false);
    }
  }, []);

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
        
        // Immediate data fetch to ensure UI populates even if socket delays
        // Await these to ensure skeletons show until data is ready (prevents flickering)
        await Promise.all([
          fetchUsers(user),
          fetchGroups(user)
        ]);
        setLoading(false);
      } catch (error) {
        console.error(" Error initializing user:", error);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    initializeUser();
  }, [navigate]);

  // Initialize tab synchronization (sync logout/login across tabs)
  useTabSynchronization();

  // Initialize profile synchronization (sync profile updates across users)
  useProfileSync(setUsers, setSelectedUser, currentUser);

  // Initialize profile refresh fallback (ensures profiles stay fresh)
  useProfileRefreshFallback(currentUser);

  // Sync refs with state to ensure socket listeners have most current data
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedGroupRef.current = selectedGroup;
  }, [selectedGroup]);

  // Listen for real-time profile updates (including current user's own updates)
  useEffect(() => {
    const handleProfileUpdate = (data) => {
      console.log("🔄 [CHATWINDOW] Received profile_updated event");
      console.log(`   Event data:`, data);
      console.log(`   Updated user ID: ${data.userId}`);
      console.log(`   Current user ID: ${currentUserRef.current?.id}`);
      console.log(`   Data user object:`, data.user);

      if (!data || !data.userId || !data.user) {
        console.error("❌ Invalid profile update data received:", data);
        return;
      }

      // If it's the current user's profile that was updated, update their state immediately
      if (data.userId === currentUserRef.current?.id) {
        console.log("👤 [CHATWINDOW] Profile update is for CURRENT USER - updating state");
        console.log(`   Old name: ${currentUserRef.current?.name || currentUserRef.current?.userName}`);
        console.log(`   New name: ${data.user.name || data.user.userName}`);
        console.log(`   New image: ${data.user.image ? "provided" : "unchanged"}`);
        console.log(`   Full new user object:`, data.user);

        // Merge the new data with existing user to preserve any fields not in the update
        const mergedUser = {
          ...currentUserRef.current,
          ...data.user,
        };

        console.log(`   Merged user object:`, mergedUser);

        // Update current user in main state
        setCurrentUser(mergedUser);

        // Also update localStorage to keep it in sync
        localStorage.setItem("user", JSON.stringify(mergedUser));
        console.log("✅ [CHATWINDOW] Current user state and localStorage updated");
        console.log(`   State after update:`, mergedUser);
      } else {
        console.log("👥 [CHATWINDOW] Profile update is for ANOTHER USER - updating their info");

        // Update the user in both users and allUsers lists
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === data.userId ? { ...u, ...data.user } : u
          )
        );

        setAllUsers((prevAllUsers) =>
          prevAllUsers.map((u) =>
            u.id === data.userId ? { ...u, ...data.user } : u
          )
        );

        // Also update selectedUser if they're viewing this user
        if (selectedUserRef.current?.id === data.userId) {
          setSelectedUser((prevSelected) => ({
            ...prevSelected,
            ...data.user,
          }));
        }

        console.log("✅ [CHATWINDOW] Updated user profile in all lists");
      }
    };

    const handleUserCreated = (data) => {
      console.log("🆕 [CHATWINDOW] Received user_created event");
      console.log(`   Event data:`, data);

      if (!data || !data.user) {
        console.error("❌ Invalid user created data received:", data);
        return;
      }

      const newUser = data.user;

      // Don't add if it's the current user (shouldn't happen but good to be safe)
      if (newUser.id === currentUserRef.current?.id) {
        return;
      }

      setAllUsers((prevAllUsers) => {
        // Check if user already exists to prevent duplicates
        const exists = prevAllUsers.some((u) => u.id === newUser.id);
        if (exists) {
          console.log(`   User ${newUser.userName} already in allUsers list, skipping`);
          return prevAllUsers;
        }

        console.log(`   ➕ Adding new user ${newUser.userName} to allUsers list`);
        return [...prevAllUsers, { ...newUser, hasChat: false, addedForChat: false }];
      });
    };

    if (!socket) return;

    console.log("✅ [CHATWINDOW] Setting up profile update listener for current user");
    socket.on("profile_updated", handleProfileUpdate);
    socket.on("user_created", handleUserCreated);

    return () => {
      console.log("🧹 [CHATWINDOW] Removing profile update listener");
      socket.off("profile_updated", handleProfileUpdate);
      socket.off("user_created", handleUserCreated);
    };
  }, []);

  // Initialize online status manager
  useOnlineStatusManager(currentUser?.id, currentUser);

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

      // Refresh data when bucket reconnects to ensure we have latest state
      // Pass the current user explicitly
      const activeUser = currentUserRef.current;
      if (activeUser) {
        fetchUsers(activeUser);
        fetchGroups(activeUser);
      }
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
        // Don't add new user unless they have chat history or are added as contacts
        // Only update online status of users already in the list
        return prevUsers;
      });

      // Update allUsers to sync status in "Start New Conversation" modal
      setAllUsers((prevAllUsers) =>
        prevAllUsers.map((u) =>
          u.id === onlineUser.id ? { ...u, isOnline: true } : u
        )
      );

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

      // Update allUsers to sync status in "Start New Conversation" modal
      setAllUsers((prevAllUsers) =>
        prevAllUsers.map((u) => (u.id === userId ? { ...u, isOnline } : u))
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
          (String(messageData.senderId) === String(selectedUserRef.current.id) &&
            String(messageData.receiverId) === String(currentUserRef.current.id)) ||
          (String(messageData.senderId) === String(currentUserRef.current.id) &&
            String(messageData.receiverId) === String(selectedUserRef.current.id)) ||
          (String(messageData.senderId) === String(selectedUserRef.current.id) &&
            !messageData.receiverId) || // Old format compatibility
          (String(messageData.receiverId) === String(selectedUserRef.current.id) &&
            !messageData.groupId); // Old format compatibility

        if (isMessageForThisChat) {
          console.log(
            " Adding message to chat - Valid for current conversation"
          );
          // Standardize message object to match our UI expectations
          const formattedMessage = {
            ...messageData,
            id: messageData.id || `msg-${Date.now()}`,
            senderId: messageData.senderId,
            content: messageData.content,
            createdAt: messageData.createdAt || new Date().toISOString(),
            senderName: messageData.senderName,
            senderUserName: messageData.senderUserName
          };
          setMessages((prevMessages) => [...prevMessages, formattedMessage]);
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
        const normalizedSenderId = String(messageData.senderId).toLowerCase().trim();
        const senderExists = prevUsers.find(
          (u) => String(u.id).toLowerCase().trim() === normalizedSenderId
        );
        console.log(" Sender exists in users list:", !!senderExists);

        if (!senderExists) {
          console.log(` Sender ${normalizedSenderId} NOT in list - adding them.`);
          const newUser = {
            id: messageData.senderId,
            userName: messageData.senderUserName || "Unknown",
            name: messageData.senderName || messageData.senderUserName || "Unknown User",
            email: messageData.senderEmail || "",
            hasChat: true,
            addedForChat: false,
            lastMessage: {
              content: messageData.content || messageData.text || "",
              createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(),
              senderId: messageData.senderId,
            },
            unreadCount: 1,
            isOnline: true,
          };
          return [newUser, ...prevUsers].sort((a, b) => {
            const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
            const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
            return timeB - timeA;
          });
        }

        return prevUsers.map((u) => {
          if (String(u.id).toLowerCase().trim() === normalizedSenderId) {
            const isCurrentlySelected = selectedUserRef.current && String(selectedUserRef.current.id).toLowerCase().trim() === normalizedSenderId;
            return {
              ...u,
              hasChat: true,
              lastMessage: {
                content: messageData.content || messageData.text || "",
                createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(),
                senderId: messageData.senderId,
              },
              unreadCount: isCurrentlySelected ? 0 : (u.unreadCount || 0) + 1,
            };
          }
          return u;
        }).sort((a, b) => {
          const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
          const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
          return timeB - timeA;
        });
      });
    });

    // Listen for message sent confirmation (for sender's UI update)
    socket.on("message_sent", (messageData) => {
      console.log(" Message sent confirmation:", messageData);

      if (messageData.receiverId) {
        // Direct message - update user list to show last message
        console.log(" Receiver ID:", messageData.receiverId, "Content:", messageData.content);

        setUsers((prevUsers) => {
          console.log(" Updating sender's user list, total users:", prevUsers.length);
          const normalizedReceiverId = String(messageData.receiverId).toLowerCase().trim();
          const updated = prevUsers.map((u) => {
            if (String(u.id).toLowerCase().trim() === normalizedReceiverId) {
              console.log(" Found receiver in users list, updating lastMessage");
              return {
                ...u,
                hasChat: true,
                lastMessage: {
                  content: messageData.content || messageData.text || "",
                  createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(),
                  senderId: String(messageData.senderId),
                },
              };
            }
            return u;
          });
          console.log(" Updated users list after message_sent:", updated);
          return updated.sort((a, b) => {
            const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
            const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
            return timeB - timeA;
          });
        });
      } else if (messageData.groupId) {
        // Group message - add confirmed message to chat
        console.log(" Group message confirmed. Adding message to chat");

        setMessages((prevMessages) => {
          // Check if message already exists to prevent duplicates
          const exists = prevMessages.some((msg) => msg.id === messageData.id);
          if (exists) {
            console.log(" Message already in chat, skipping:", messageData.id);
            return prevMessages;
          }

          console.log(" Adding confirmed group message:", messageData.id);
          return [...prevMessages, messageData];
        });

        setGroups((prevGroups) =>
          prevGroups.map((g) => {
            if (g.id === messageData.groupId) {
              return {
                ...g,
                lastMessage: {
                  content: messageData.content,
                  createdAt: messageData.createdAt || new Date().toISOString(),
                  senderName: messageData.senderUserName || messageData.senderName,
                },
              };
            }
            return g;
          }).sort((a, b) => {
            const timeA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
            const timeB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          })
        );
      }
    });

    // Listen for new group messages - Enhanced for unread counts
    socket.on("receive_group_message", (messageData) => {
      console.log("📨 [RECEIVE_GROUP_MESSAGE] Received group message:", messageData);
      console.log(`   Group ID: ${messageData.groupId}`);
      console.log(`   Sender: ${messageData.senderUserName || messageData.senderName}`);
      console.log(`   Content: "${messageData.content?.substring(0, 50)}..."`);
      console.log(`   Message ID: ${messageData.id}`);
      console.log(`   Created At: ${messageData.createdAt}`);

      // Add message to chat if it's in the currently selected group
      // CRITICAL: Also ensure we're NOT viewing a direct message chat
      // CRITICAL: Use String() for comparison to handle potentially mixed types (number/string)
      const isActiveGroup = selectedGroupRef.current && 
                           !selectedUserRef.current &&  // Must NOT have a user selected
                           String(messageData.groupId) === String(selectedGroupRef.current.id);
      console.log(`   🎯 Is Active Group: ${isActiveGroup}`);
      console.log(`   📊 Selected User: ${selectedUserRef.current?.userName || 'none'}`);
      console.log(`   📊 Selected Group: ${selectedGroupRef.current?.name || 'none'}`);
      
      if (isActiveGroup) {
        setMessages((prevMessages) => {
          // Check if message already exists to prevent duplicates
          const exists = prevMessages.some((msg) => msg.id === messageData.id);
          if (exists) {
            console.log("⚠️  Message already in chat, skipping:", messageData.id);
            return prevMessages;
          }
          console.log("✅ Adding received group message to active chat:", messageData.id);
          return [...prevMessages, messageData];
        });
      } else {
        console.log("📝 Message is for a different group or user is selected, updating sidebar only");
      }

      // CRITICAL: Update group list with new last message and UNREAD COUNT
      // This MUST happen for ALL groups, not just the active one
      console.log(`\n   🔄 [SIDEBAR UPDATE] Updating group sidebar...`);
      setGroups((prevGroups) => {
        console.log(`      Total groups before update: ${prevGroups.length}`);
        const groupExists = prevGroups.find(g => String(g.id) === String(messageData.groupId));
        console.log(`      Target group exists: ${!!groupExists}`);
        if (groupExists) {
          console.log(`      Target group name: "${groupExists.name}"`);
        }
        
        const updatedGroups = prevGroups.map((g) => {
          if (String(g.id) === String(messageData.groupId)) {
            const isDifferentUser = String(messageData.senderId) !== String(currentUserRef.current?.id);
            const newUnreadCount = isActiveGroup ? 0 : (isDifferentUser ? (g.unreadCount || 0) + 1 : g.unreadCount);
            
            console.log(`      ✅ MATCH FOUND - Updating group "${g.name}"`);
            console.log(`         Old unread: ${g.unreadCount || 0}, New unread: ${newUnreadCount}`);
            console.log(`         Old last message: "${g.lastMessage?.content?.substring(0, 30)}..."`);
            console.log(`         New last message: "${messageData.content?.substring(0, 30)}..."`);
            
            return {
              ...g,
              lastMessage: {
                content: messageData.content || messageData.text || "",
                createdAt: messageData.createdAt || messageData.created_at || new Date().toISOString(),
                senderName:
                  messageData.senderUserName || messageData.senderName,
              },
              unreadCount: newUnreadCount
            };
          }
          return g;
        });
        
        console.log(`      Groups after update: ${updatedGroups.length}`);
        
        // Sort by most recent message
        const sortedGroups = updatedGroups.sort((a, b) => {
          const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
          const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
          return timeB - timeA;
        });
        
        console.log(`   ✅ [SIDEBAR UPDATE] Complete - returning ${sortedGroups.length} groups\n`);
        return sortedGroups;
      });
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

    // Listen for member added to group
    socket.on("group_member_added", (data) => {
      console.log("👥 [SOCKET] Group member added:", data);
      
      // If current user was added, add the group to their list
      if (String(data.userId) === String(currentUserRef.current?.id)) {
        console.log("✅ Current user added to new group, adding to list");
        setGroups((prevGroups) => {
          const exists = prevGroups.find((g) => g.id === data.groupId);
          if (!exists && data.group) {
            
            // Join the socket room for this group
            socket.emit("join_group", { groupId: data.groupId });
            
            return [{ ...data.group, role: "member", unreadCount: 0 }, ...prevGroups];
          }
          return prevGroups;
        });
      }
    });

    // Listen for member removed from group
    socket.on("group_member_removed", (data) => {
      console.log("👋 [SOCKET] Group member removed:", data);
      
      // If current user was removed, remove the group from their list
      if (String(data.userId) === String(currentUserRef.current?.id)) {
        console.log("🚫 Current user removed from group, removing from list");
        
        // Remove from groups list
        setGroups((prevGroups) => prevGroups.filter((g) => g.id !== data.groupId));
        
        // If currently viewing this group, clear selection
        if (selectedGroupRef.current && selectedGroupRef.current.id === data.groupId) {
          setSelectedGroup(null);
        }
      }
    });

    // Listen for profile updates
    socket.on("profile_updated", (data) => {
      console.log("👤 [SOCKET] Profile updated:", data);
      const updatedUser = data.user;
      
      // Update users list
      setUsers((prevUsers) => 
        prevUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u)
      );
      
      // Update allUsers list (for modal)
      setAllUsers((prevAllUsers) => 
        prevAllUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u)
      );
      
      // Update filtered users if needed
      setFilteredUsers((prevFiltered) => 
        prevFiltered.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u)
      );
      
      // Update selected user if currently chatting with them
      if (selectedUserRef.current && selectedUserRef.current.id === updatedUser.id) {
        setSelectedUser(prev => ({ ...prev, ...updatedUser }));
      }
      
      // Update messages to reflect new name/avatar
      setMessages((prevMessages) => 
        prevMessages.map(msg => 
          msg.senderId === updatedUser.id 
            ? { ...msg, senderName: updatedUser.name || updatedUser.userName, senderUserName: updatedUser.userName } 
            : msg
        )
      );
      
      // Update group last messages
      setGroups((prevGroups) => 
        prevGroups.map(g => {
          if (g.lastMessage && g.lastMessage.senderName === (updatedUser.name || updatedUser.userName)) { // This check is heuristic
             // Better to just update if we knew the sender ID of last message, but we might not always have it
             return g; 
          }
          return g;
        })
      );
    });

    // Connection status monitoring
    socket.on("connect", () => {
      console.log("✅ [SOCKET] Connected");
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ [SOCKET] Disconnected:", reason);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 [SOCKET] Reconnected after attempt", attemptNumber);
      // Re-fetch crucial data on reconnect
      fetchUsers();
      fetchGroups();
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

    // Listen for member added to group
    socket.on("member_added_to_group", (data) => {
      console.log(" Member added to group:", data);
      // Refresh group members if the current group is open
      if (selectedGroupRef.current?.id === data.groupId) {
        fetchGroupMembers(data.groupId);
      }
    });

    // Listen for member removed from group
    socket.on("member_removed_from_group", (data) => {
      console.log(" Member removed from group:", data);
      // Refresh group members if the current group is open
      if (selectedGroupRef.current?.id === data.groupId) {
        fetchGroupMembers(data.groupId);
      }
    });

    // Listen for user exiting group
    socket.on("user_exited_group", (data) => {
      console.log(" User exited group:", data);
      // Remove group from list if current user exits
      if (data.userId === currentUserRef.current?.id) {
        setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
        setFilteredGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      }
      // Refresh group members if viewing
      if (selectedGroupRef.current?.id === data.groupId) {
        fetchGroupMembers(data.groupId);
      }
    });

    // Listen for group deleted
    socket.on("group_deleted", (data) => {
      console.log(" Group deleted:", data);
      setGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      setFilteredGroups((prev) => prev.filter((g) => g.id !== data.groupId));
      // Deselect group if it's currently selected
      if (selectedGroupRef.current?.id === data.groupId) {
        setSelectedGroup(null);
        setSelectedUser(null);
      }
    });

    socket.on("message_error", (error) => {
      console.error(" Message error:", error);
      alert("Failed to send message: " + error.error);
    });

    // Note: profile_updated listener is now handled by useProfileSync hook
    // Keeping this comment to document that it was moved
    // The hook provides better organization and logging

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
      socket.off("member_added_to_group");
      socket.off("member_removed_from_group");
      socket.off("user_exited_group");
      socket.off("group_deleted");
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

  // Initial fetch and on currentUser change
  useEffect(() => {
    if (currentUser) {
      console.log(" Initial population of users and groups for:", currentUser.id);
      fetchUsers(currentUser);
      fetchGroups(currentUser);
    }
  }, [currentUser, fetchUsers, fetchGroups]);

  // Final loading state coordination to prevent flickering
  useEffect(() => {
    if (!loadingUsers && !loadingGroups) {
      // Small delay to ensure state updates have propagated to UI
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingUsers, loadingGroups]);

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

      setLoadingMessages(true);
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
              String(u.id) === String(selectedUser.id)
                ? {
                    ...u,
                    lastMessage: {
                      content: lastMsg.content,
                      createdAt: lastMsg.createdAt,
                      senderId: String(lastMsg.senderId),
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
              String(u.id) === String(selectedUser.id) ? { ...u, unreadCount: 0 } : u
            )
          );
        } catch (error) {
          console.error("❌ Error marking messages as read:", error);
        }
      } catch (error) {
        console.error("❌ Error fetching direct messages:", error);
        setMessages([]);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchDirectMessages();
  }, [selectedUser, selectedGroup]);

  // Fetch messages when a group is selected
  useEffect(() => {
    const fetchGroupMessages = async () => {
      if (!selectedGroup || selectedUser) return;

      setLoadingMessages(true);
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
      } finally {
        setLoadingMessages(false);
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

        // DON'T add optimistic message for groups - wait for server confirmation
        // This prevents duplicate message issues
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
          id: `temp-${Date.now()}`,
          senderId: currentUser.id,
          receiverId: selectedUser.id,
          content: messageContent,
          createdAt: new Date().toISOString(),
          senderName: currentUser.name || currentUser.userName,
          senderUserName: currentUser.userName,
        };

        setMessages((prev) => [...prev, tempMessage]);

        // Update last message in user list
        setUsers((prevUsers) => {
          const targetId = String(selectedUser.id).toLowerCase().trim();
          const updated = prevUsers.map((u) => {
            if (String(u.id).toLowerCase().trim() === targetId) {
              return {
                ...u,
                hasChat: true,
                lastMessage: {
                  content: messageContent,
                  createdAt: new Date().toISOString(),
                  senderId: String(currentUser.id),
                },
              };
            }
            return u;
          });
          return updated.sort((a, b) => {
            const timeA = (a.lastMessage?.createdAt || a.lastMessage?.created_at) ? new Date(a.lastMessage.createdAt || a.lastMessage.created_at).getTime() : 0;
            const timeB = (b.lastMessage?.createdAt || b.lastMessage?.created_at) ? new Date(b.lastMessage.createdAt || b.lastMessage.created_at).getTime() : 0;
            return timeB - timeA;
          });
        });
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
      console.log(" 📤 [UPDATE PROFILE] Sending profile update to server...");
      console.log(`   Name: ${editName}`);
      console.log(`   Email: ${editEmail}`);
      console.log(`   Image: ${editImage ? "provided" : "unchanged"}`);

      const response = await axiosInstance.put(`/api/user/update`, {
        name: editName,
        email: editEmail,
        image: editImage,
      });

      console.log(" ✅ [UPDATE PROFILE] Profile updated from server:", response.data);

      // Update current user with fresh data
      const updatedUser = response.data.user;
      console.log(" 🔄 [UPDATE PROFILE] Updated user object from response:", updatedUser);
      console.log(" 📊 [UPDATE PROFILE] Current user ID:", currentUser?.id);
      console.log(" 📊 [UPDATE PROFILE] Updated user ID:", updatedUser?.id);

      // Update state and localStorage immediately
      console.log(" 💾 [UPDATE PROFILE] Updating currentUser state...");
      setCurrentUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      console.log(" ✅ [UPDATE PROFILE] Updated user saved to localStorage");
      console.log(" 📋 [UPDATE PROFILE] New localStorage value:", JSON.parse(localStorage.getItem("user")));

      // Update users list immediately (don't wait for socket event)
      console.log(" 👥 [UPDATE PROFILE] Updating users list...");
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === updatedUser.id ? { ...u, ...updatedUser } : u
        )
      );
      console.log(" ✅ [UPDATE PROFILE] Users list updated with new profile data");

      // Update selected user if it's the one being viewed
      if (selectedUser?.id === updatedUser.id) {
        console.log(" 🎯 [UPDATE PROFILE] Updating selected user (being viewed)...");
        setSelectedUser(updatedUser);
        console.log(" ✅ [UPDATE PROFILE] Selected user updated with new profile data");
      }

      // Force a re-render by updating edit fields too
      console.log(" 📝 [UPDATE PROFILE] Updating edit fields for form...");
      setEditName(updatedUser.name || updatedUser.userName || "");
      setEditEmail(updatedUser.email || "");
      setEditImage(updatedUser.image || "");

      setShowEditProfile(false);
      console.log(" 🎉 [UPDATE PROFILE] Profile dialog closed - profile fully updated!");
      alert("Profile updated successfully!");
    } catch (error) {
      console.error(" ❌ [UPDATE PROFILE] Error updating profile:", error);
      console.error(" 📋 [UPDATE PROFILE] Error response:", error.response?.data);
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

  // Handle adding a new conversation
  const handleAddNewConversation = async (user) => {
    console.log("📝 [ADD CONVERSATION] User selected for conversation:", user.name || user.userName);
    console.log("   User ID:", user.id);

    try {
      // Call API to add user as contact
      console.log("📤 [ADD CONVERSATION] Calling API to add user as contact...");
      const response = await axiosInstance.post(`/api/user/contacts/add`, {
        contactUserId: user.id,
      });

      console.log("✅ [ADD CONVERSATION] User added as contact successfully:", response.data);

      // Add the user to the chat list with addedForChat flag
      const userWithFlag = {
        ...user,
        addedForChat: true,
      };

      const userExists = users.some((u) => String(u.id).toLowerCase().trim() === String(user.id).toLowerCase().trim());
      if (!userExists) {
        console.log("✅ [ADD CONVERSATION] Adding user to chat list");
        setUsers((prev) => [userWithFlag, ...prev]);
        setFilteredUsers((prev) => [userWithFlag, ...prev]);

        // Also update allUsers to mark this user as addedForChat
        setAllUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, addedForChat: true } : u
          )
        );
      }

      // Select the user to open the chat
      console.log("💬 [ADD CONVERSATION] Opening chat with user");
      setSelectedUser(userWithFlag);
      setSelectedGroup(null);
    } catch (error) {
      console.error("❌ [ADD CONVERSATION] Error adding user as contact:", error);
      alert(
        "Failed to add user: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Fetch group members
  const fetchGroupMembers = async (groupId) => {
    try {
      console.log(`🔍 [GROUP] Fetching members for group ${groupId}`);
      setLoadingGroupMembers(true);
      const response = await axiosInstance.get(`/api/groups/${groupId}`);
      console.log(`✅ [GROUP] Members fetched:`, response.data.members);
      setGroupMembers(response.data.members);
    } catch (error) {
      console.error(`❌ [GROUP] Error fetching members:`, error);
      alert("Failed to fetch group members");
    } finally {
      setLoadingGroupMembers(false);
    }
  };

  // Open group members modal
  const handleOpenGroupMembersModal = async (group) => {
    console.log(`👥 [GROUP] Opening members modal for group: ${group.name}`);
    await fetchGroupMembers(group.id);
    setShowGroupMembersModal(true);
  };

  // Add member to group
  const handleAddGroupMember = async (user) => {
    if (!selectedGroup) return;

    try {
      console.log(`👤 [GROUP] Adding member ${user.name} to group ${selectedGroup.id}`);
      await axiosInstance.post(`/api/groups/${selectedGroup.id}/members`, {
        userId: user.id,
      });
      console.log(`✅ [GROUP] Member added successfully`);

      // Refresh group members list
      await fetchGroupMembers(selectedGroup.id);

      // Emit socket event for real-time update
      if (socket.connected) {
        socket.emit("member_added_to_group", {
          groupId: selectedGroup.id,
          userId: user.id,
          user: user,
        });
      }
    } catch (error) {
      console.error(`❌ [GROUP] Error adding member:`, error);
      alert(
        "Failed to add member: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Remove member from group
  const handleRemoveGroupMember = async (userId) => {
    if (!selectedGroup) return;

    try {
      console.log(`🗑️ [GROUP] Removing member ${userId} from group ${selectedGroup.id}`);
      await axiosInstance.delete(`/api/groups/${selectedGroup.id}/members/${userId}`);
      console.log(`✅ [GROUP] Member removed successfully`);

      // Refresh group members list
      await fetchGroupMembers(selectedGroup.id);

      // Emit socket event for real-time update
      if (socket.connected) {
        socket.emit("member_removed_from_group", {
          groupId: selectedGroup.id,
          userId: userId,
        });
      }
    } catch (error) {
      console.error(`❌ [GROUP] Error removing member:`, error);
      alert(
        "Failed to remove member: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Exit group
  const handleExitGroup = async (groupId) => {
    if (!confirm("Are you sure you want to exit this group?")) return;

    try {
      console.log(`👋 [GROUP] User exiting group ${groupId}`);
      await axiosInstance.post(`/api/groups/${groupId}/exit`);
      console.log(`✅ [GROUP] Exited group successfully`);

      // Remove group from list
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setFilteredGroups((prev) => prev.filter((g) => g.id !== groupId));

      // Deselect group if it's currently selected
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setSelectedUser(null);
      }

      // Emit socket event
      if (socket.connected) {
        socket.emit("user_exited_group", {
          groupId: groupId,
          userId: currentUser.id,
        });
      }

      alert("You have exited the group");
    } catch (error) {
      console.error(`❌ [GROUP] Error exiting group:`, error);
      alert(
        "Failed to exit group: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Delete group
  const handleDeleteGroup = async (groupId) => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;

    try {
      console.log(`🗑️ [GROUP] Admin deleting group ${groupId}`);
      await axiosInstance.delete(`/api/groups/${groupId}`);
      console.log(`✅ [GROUP] Group deleted successfully`);

      // Remove group from list
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      setFilteredGroups((prev) => prev.filter((g) => g.id !== groupId));

      // Deselect group
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
        setSelectedUser(null);
      }

      // Emit socket event
      if (socket.connected) {
        socket.emit("group_deleted", {
          groupId: groupId,
        });
      }

      alert("Group deleted successfully");
    } catch (error) {
      console.error(`❌ [GROUP] Error deleting group:`, error);
      alert(
        "Failed to delete group: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      // First mark user as offline if socket is connected
      if (socket.connected && currentUser?.id) {
        socket.emit("user_going_offline", {
          userId: currentUser.id,
          timestamp: new Date().toISOString(),
        });
      }

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

  // REMOVED: Initial loading no longer uses SplashScreen, handled in the return JSX with skeletons

  const selectedChat = selectedUser || selectedGroup || pendingSelection;

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
              <div className="flex flex-col items-start">
                <span className="text-xl font-bold text-[#040316] leading-none">VibeMesh</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected" ? "bg-green-500" :
                    connectionStatus === "reconnecting" ? "bg-yellow-500 animate-pulse" :
                    "bg-red-500"
                  }`} />
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider leading-none">
                    {connectionStatus === "connected" ? "Online" :
                     connectionStatus === "reconnecting" ? "Reconnecting" :
                     "Offline"}
                  </span>
                </div>
              </div>
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
                          {currentUser?.name || currentUser?.userName}
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

        {/* Search Bar with Add Button */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0 space-y-3">
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.trim())}
                placeholder="Search conversations..."
                className="pl-10 bg-slate-50 border-slate-200 focus:border-darkPurple focus:ring-darkPurple"
              />
            </div>

            {/* Add New Conversation Button */}
            <Button
              size="icon"
              onClick={() => setShowAddConversationModal(true)}
              className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white shadow-lg hover:shadow-xl transition-all duration-300 h-10 w-10 flex-shrink-0"
              title="Start a new conversation"
            >
              <Plus className="w-5 h-5" />
            </Button>
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
              {loading ? (
                <div className="py-2">
                  {[...Array(8)].map((_, i) => (
                    <UserSkeleton key={i} />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center h-full">
                  <div className="w-16 h-16 bg-darkPurple/5 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-8 h-8 text-darkPurple/30" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 mb-1">No active chats</h3>
                  <p className="text-xs text-slate-500 mb-6 max-w-[180px] mx-auto">
                    {searchQuery 
                      ? `No users found matching "${searchQuery}"`
                      : "Start a conversation to see it here."}
                  </p>
                  {!searchQuery && (
                    <Button
                      size="sm"
                      onClick={() => setShowAddConversationModal(true)}
                      className="bg-darkPurple hover:bg-darkPurple/90 text-white shadow-md hover:shadow-lg transition-all duration-300 h-9"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Chat
                    </Button>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (selectedUser?.id === user.id && !selectedGroup) return;
                        
                        setLoadingMessages(true);
                        setPendingSelection(user);
                        setMessages([]);
                        // Deliberate 2-second delay as requested
                        setTimeout(() => {
                          setSelectedUser(user);
                          setSelectedGroup(null);
                          setPendingSelection(null);
                          // unreadCount update moved here
                          setUsers(prevUsers => 
                            prevUsers.map(u => String(u.id) === String(user.id) ? { ...u, unreadCount: 0 } : u)
                          );
                        }, 2000);
                      }}
                      className={`w-full flex items-center gap-2 px-2 sm:px-4 py-3 transition-colors overflow-hidden ${
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
                            {getInitials(user.name || user.userName)}
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
                            {user.name || user.userName}
                          </p>
                          {user.lastMessage && (
                            <span className="text-xs text-slate-500 flex-shrink-0 whitespace-nowrap">
                              {formatTimeAgo(user.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-1 w-full min-w-0">
                          {user.lastMessage ? (
                            <p className="text-xs text-slate-600 flex-1 line-clamp-1 overflow-hidden text-ellipsis min-w-0 break-all">
                              {String(user.lastMessage.senderId) === String(currentUser?.id)
                                ? "You: "
                                : ""}
                              {truncateMessage(user.lastMessage.content, 25)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic flex-shrink-0">
                              No messages yet
                            </p>
                          )}
                          {Number(user.unreadCount) > 0 && (
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
              {loading ? (
                <div className="py-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredGroups.length === 0 ? (
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
                        if (selectedGroup?.id === group.id && !selectedUser) return;

                        setLoadingMessages(true);
                        setPendingSelection(group);
                        setMessages([]);
                        // Deliberate 2-second delay as requested
                        setTimeout(() => {
                          setSelectedGroup(group);
                          setSelectedUser(null);
                          setPendingSelection(null);
                          // unreadCount update
                          setGroups(prevGroups => 
                            prevGroups.map(g => g.id === group.id ? { ...g, unreadCount: 0 } : g)
                          );
                        }, 2000);
                      }}
                      className={`w-full flex items-center gap-2 px-2 sm:px-4 py-3 transition-colors overflow-hidden ${
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
                        <div className="flex items-center justify-between gap-1 w-full min-w-0">
                          {group.lastMessage ? (
                            <p className="text-xs text-slate-600 flex-1 line-clamp-1 overflow-hidden text-ellipsis min-w-0 break-all">
                              {String(group.lastMessage.senderId) === String(currentUser?.id)
                                ? "You: "
                                : `${group.lastMessage.senderName || group.lastMessage.senderUserName || "User"}: `}
                              {truncateMessage(group.lastMessage.content, 25)}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic flex-shrink-0">
                              No messages yet
                            </p>
                          )}
                          {group.role === "admin" && (
                            <span className="bg-gradient-to-r from-primaryColor/20 to-secondaryColor/20 text-darkPurple text-xs px-2 py-0.5 rounded font-semibold flex-shrink-0 whitespace-nowrap">
                              Admin
                            </span>
                          )}
                          {Number(group.unreadCount) > 0 && (
                            <span className="bg-gradient-to-r from-darkPurple to-primaryColor text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 min-h-5 min-w-5 shadow-md ml-1">
                              {group.unreadCount}
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
                      <button
                        onClick={() => selectedGroup && handleOpenGroupMembersModal(selectedGroup)}
                        className={`font-semibold text-slate-800 text-sm sm:text-base break-words ${
                          selectedGroup ? "hover:text-darkPurple cursor-pointer transition-colors" : ""
                        }`}
                      >
                        {selectedChat.name || selectedChat.userName}
                      </button>
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

                  {/* Group Options Menu */}
                  {selectedGroup && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10"
                        >
                          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border border-slate-200">
                        {/* View/Manage Members */}
                        <DropdownMenuItem
                          onClick={() => handleOpenGroupMembersModal(selectedGroup)}
                          className="cursor-pointer hover:bg-slate-100 rounded-lg py-2.5 px-3 mx-1"
                        >
                          <Users className="w-4 h-4 mr-3 text-darkPurple" />
                          <span className="font-medium text-slate-700">Manage Members</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="my-1" />

                        {/* Exit Group - All members */}
                        <DropdownMenuItem
                          onClick={() => handleExitGroup(selectedGroup.id)}
                          className="cursor-pointer hover:bg-orange-50 rounded-lg py-2.5 px-3 mx-1"
                        >
                          <LogOut className="w-4 h-4 mr-3 text-orange-500" />
                          <span className="font-medium text-slate-700">Exit Group</span>
                        </DropdownMenuItem>

                        {/* Delete Group - Admin only */}
                        {selectedGroup.role === "admin" && (
                          <>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem
                              onClick={() => handleDeleteGroup(selectedGroup.id)}
                              className="cursor-pointer hover:bg-red-50 rounded-lg py-2.5 px-3 mx-1"
                            >
                              <Trash2 className="w-4 h-4 mr-3 text-red-500" />
                              <span className="font-medium text-red-600">Delete Group</span>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* User Options - Placeholder */}
                  {selectedUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-slate-600 hover:text-darkPurple h-9 w-9 sm:h-10 sm:w-10"
                    >
                      <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-2 sm:p-4 bg-slate-50 overflow-hidden min-h-0">
              <div className="space-y-2 sm:space-y-4">
                {loadingMessages ? (
                  <div className="py-4 space-y-6">
                    <MessageSkeleton side="left" />
                    <MessageSkeleton side="right" />
                    <MessageSkeleton side="left" />
                    <MessageSkeleton side="right" />
                    <MessageSkeleton side="left" />
                  </div>
                ) : messages.length === 0 ? (
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
                          className={`w-auto max-w-[90%] xs:max-w-[85%] sm:max-w-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl break-inside-avoid ${
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
                          <p className="text-xs max-w-full sm:text-sm break-all overflow-hidden whitespace-pre-wrap">
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
        ) : loading ? (
          <div className="hidden md:flex flex-1 flex-col bg-slate-50 p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm">
              <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 sm:w-48" />
                <Skeleton className="h-3 w-20 sm:w-24" />
              </div>
            </div>
            <div className="flex-1 space-y-6 sm:space-y-8 px-2 sm:px-4">
              <MessageSkeleton side="left" />
              <MessageSkeleton side="right" />
              <MessageSkeleton side="left" />
              <MessageSkeleton side="right" />
              <MessageSkeleton side="left" />
            </div>
          </div>
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
                title="Please enter a valid email address"
              />
              {editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail) && (
                <p className="text-xs text-red-500">Please enter a valid email address</p>
              )}
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
                disabled={
                  updatingProfile ||
                  (editEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail))
                }
                className="bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Add New Conversation Modal */}
      <AddNewConversationModal
        isOpen={showAddConversationModal}
        onOpenChange={setShowAddConversationModal}
        allUsers={allUsers}
        chatUsers={users}
        onUserSelect={handleAddNewConversation}
        isLoading={loading}
      />

      {/* Group Members Modal */}
      <AddGroupMembersModal
        isOpen={showGroupMembersModal}
        onOpenChange={setShowGroupMembersModal}
        allUsers={users}
        groupMembers={groupMembers}
        onAddMember={handleAddGroupMember}
        onRemoveMember={handleRemoveGroupMember}
        isAdmin={selectedGroup?.role === "admin"}
        isLoading={loadingGroupMembers}
      />
    </div>
  );
};

export default ChatWindow;
