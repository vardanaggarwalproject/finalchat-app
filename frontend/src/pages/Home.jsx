"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MessageSquare,
  Search,
  Send,
  MoreVertical,
  LogOut,
  Settings,
  User,
  Smile,
  Paperclip,
  Phone,
  Video,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react"

const Home = () => {
  const [selectedChat, setSelectedChat] = useState(null)
  const [message, setMessage] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  const currentUser = {
    name: "John Doe",
    email: "john@example.com",
    avatar: "",
  }

  const conversations = [
    {
      id: 1,
      name: "Alice Johnson",
      avatar: "",
      lastMessage: "Hey! How are you doing?",
      time: "2m ago",
      unread: 3,
      online: true,
    },
    {
      id: 2,
      name: "Bob Smith",
      avatar: "",
      lastMessage: "Let's catch up tomorrow",
      time: "1h ago",
      unread: 0,
      online: false,
    },
    {
      id: 3,
      name: "Team Design",
      avatar: "",
      lastMessage: "Sarah: Great work on the mockups!",
      time: "3h ago",
      unread: 5,
      online: true,
    },
    {
      id: 4,
      name: "Mike Wilson",
      avatar: "",
      lastMessage: "Thanks for the help!",
      time: "1d ago",
      unread: 0,
      online: false,
    },
    {
      id: 5,
      name: "Emma Davis",
      avatar: "",
      lastMessage: "See you at the meeting",
      time: "2d ago",
      unread: 1,
      online: true,
    },
    {
      id: 6,
      name: "Chris Brown",
      avatar: "",
      lastMessage: "That's perfect!",
      time: "3d ago",
      unread: 0,
      online: false,
    },
    {
      id: 7,
      name: "Sarah Miller",
      avatar: "",
      lastMessage: "Looking forward to it!",
      time: "4d ago",
      unread: 0,
      online: false,
    },
    {
      id: 8,
      name: "David Lee",
      avatar: "",
      lastMessage: "Great presentation today",
      time: "5d ago",
      unread: 2,
      online: true,
    },
  ]

  const messages = selectedChat
    ? [
        {
          id: 1,
          sender: "other",
          text: "Hey! How are you doing?",
          time: "10:30 AM",
        },
        {
          id: 2,
          sender: "me",
          text: "I'm doing great! How about you?",
          time: "10:32 AM",
        },
        {
          id: 3,
          sender: "other",
          text: "Pretty good! Working on some exciting projects.",
          time: "10:33 AM",
        },
        {
          id: 4,
          sender: "me",
          text: "That sounds awesome! Tell me more about it.",
          time: "10:35 AM",
        },
        {
          id: 5,
          sender: "other",
          text: "We're building a new chat application with real-time features.",
          time: "10:36 AM",
        },
        {
          id: 6,
          sender: "me",
          text: "Interesting! What technologies are you using?",
          time: "10:38 AM",
        },
      ]
    : []

  const handleLogout = () => {
    console.log("Logging out...")
  }

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log("Sending message:", message)
      setMessage("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCloseChat = () => {
    setSelectedChat(null)
    setIsSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Sidebar - Chat List */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 fixed lg:relative z-30 w-full sm:w-80 h-screen bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out`}
      >
        {/* Sidebar Header - Fixed */}
        <div className="p-4 border-b border-slate-200 flex-shrink-0 bg-white">
          <div className="flex items-center justify-between gap-3 mb-4">
            {/* Chatly Logo Section */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-800 truncate">
                <span className="text-cyan-500">Chatly</span>
              </h1>
            </div>

            {/* User Profile Section - Avatar and Dropdown Only */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="relative group">
                    <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-cyan-400/30 group-hover:ring-cyan-400/60 transition-all cursor-pointer">
                      <AvatarImage src={currentUser.avatar || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-semibold text-sm">
                        {currentUser.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="flex flex-col">
                    <span className="font-semibold text-slate-800">{currentUser.name}</span>
                    <span className="text-xs text-slate-500">{currentUser.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Conversations List - Scrollable Table Format */}
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center px-4 py-3 cursor-pointer transition-all hover:bg-slate-50 ${
                  selectedChat?.id === conv.id
                    ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-l-4 border-cyan-500"
                    : ""
                }`}
                onClick={() => {
                  setSelectedChat(conv)
                  setIsSidebarOpen(false)
                }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0 mr-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={conv.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-semibold text-sm">
                      {conv.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                {/* Name and Message */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-800 truncate mb-0.5">{conv.name}</h3>
                  <p className="text-xs text-slate-500 truncate">{conv.lastMessage}</p>
                </div>

                {/* Time and Badge */}
                <div className="flex flex-col items-end ml-3 flex-shrink-0 space-y-1">
                  <span className="text-xs text-slate-500">{conv.time}</span>
                  {conv.unread > 0 && (
                    <Badge className="bg-cyan-500 hover:bg-cyan-600 text-white h-5 min-w-[20px] px-1.5 text-xs">
                      {conv.unread}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area - Fixed Height */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {selectedChat ? (
          <>
            {/* Chat Header - Fixed */}
            <div className="bg-white border-b border-slate-200 p-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseChat}
                    className="h-9 w-9 flex-shrink-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={selectedChat.avatar || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-semibold">
                      {selectedChat.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-800 truncate">{selectedChat.name}</h2>
                    <div className="text-xs text-slate-500 flex items-center">
                      {selectedChat.online && <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>}
                      {selectedChat.online ? "Online" : "Offline"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 transition-colors">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 transition-colors">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages Area - Scrollable, Takes remaining space */}
            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-slate-50 to-blue-50">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "me" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] ${
                        msg.sender === "me"
                          ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                          : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                      } rounded-2xl px-4 py-2.5 transition-all hover:shadow-lg`}
                    >
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <span
                        className={`text-xs mt-1.5 block ${msg.sender === "me" ? "text-cyan-100" : "text-slate-500"}`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message Input - Fixed */}
            <div className="bg-white border-t border-slate-200 p-2 sm:p-2 flex-shrink-0">
              <div className="flex items-end space-x-3 max-w-4xl mx-auto">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <div className="flex-1 relative min-w-0">
                  <Input
                    placeholder="Type a message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="h-11 pr-12 border-slate-300 focus:border-cyan-500 focus:ring-cyan-500 transition-colors"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Smile className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  className="h-11 px-4 sm:px-6 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold shadow-md hover:shadow-lg transition-all flex-shrink-0"
                  disabled={!message.trim()}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          // Empty State
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
            <div className="text-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">
                Welcome to <span className="text-cyan-500">Chatly</span>
              </h2>
              <p className="text-slate-600 mb-6 text-sm sm:text-base">Select a conversation to start messaging</p>
              <Button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white shadow-md hover:shadow-lg transition-all"
              >
                <Menu className="mr-2 h-4 w-4" />
                View Conversations
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  )
}

export default Home
