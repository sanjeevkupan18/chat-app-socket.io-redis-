// import { useEffect, useState } from "react";

// import { Menu, X } from "lucide-react";

// import api from "../services/api";

// import { useSocket } from "../context/SocketContext";

// import Sidebar from "../components/layout/Sidebar";

// import ChatWindow from "../components/chat/ChatWindow";

// const Chat = () => {
//   const [conversations, setConversations] = useState([]);

//   const [selectedConversation, setSelectedConversation] = useState(null);

//   const [loading, setLoading] = useState(true);

//   const [sidebarOpen, setSidebarOpen] = useState(false);

//   const { socket } = useSocket();

//   /*
//    * LOAD CONVERSATIONS
//    */

//   useEffect(() => {
//     const loadConversations = async () => {
//       try {
//         setLoading(true);

//         const response = await api.get("/conversations");

//         setConversations(response.data);
//       } catch (error) {
//         console.error("Conversation loading error:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadConversations();
//   }, []);

//   /*
//    * REAL-TIME CONVERSATION UPDATE
//    */

//   useEffect(() => {
//     if (!socket) {
//       return;
//     }

//     const handleConversationUpdate = ({ conversationId, message }) => {
//       setConversations((previous) => {
//         const conversation = previous.find(
//           (item) => item._id === conversationId,
//         );

//         if (!conversation) {
//           /*
//            * The conversation might
//            * not be loaded yet.
//            */

//           return previous;
//         }

//         const updated = {
//           ...conversation,

//           lastMessage: message,

//           updatedAt: message.createdAt,
//         };

//         return [
//           updated,

//           ...previous.filter((item) => item._id !== conversationId),
//         ];
//       });

//       /*
//        * Also update currently
//        * selected conversation
//        */

//       setSelectedConversation((current) => {
//         if (current?._id === conversationId) {
//           return {
//             ...current,

//             lastMessage: message,

//             updatedAt: message.createdAt,
//           };
//         }

//         return current;
//       });
//     };

//     socket.on("conversationUpdated", handleConversationUpdate);

//     return () => {
//       socket.off("conversationUpdated", handleConversationUpdate);
//     };
//   }, [socket]);

//   /*
//    * USER ONLINE/OFFLINE
//    */

//   useEffect(() => {
//     if (!socket) {
//       return;
//     }

//     const handleUserOnline = ({ userId }) => {
//       setConversations((previous) =>
//         previous.map((conversation) => ({
//           ...conversation,

//           participants: conversation.participants.map((participant) =>
//             participant._id === userId
//               ? {
//                   ...participant,
//                   isOnline: true,
//                 }
//               : participant,
//           ),
//         })),
//       );
//     };

//     const handleUserOffline = ({ userId, lastSeen }) => {
//       setConversations((previous) =>
//         previous.map((conversation) => ({
//           ...conversation,

//           participants: conversation.participants.map((participant) =>
//             participant._id === userId
//               ? {
//                   ...participant,

//                   isOnline: false,

//                   lastSeen,
//                 }
//               : participant,
//           ),
//         })),
//       );
//     };

//     socket.on("userOnline", handleUserOnline);

//     socket.on("userOffline", handleUserOffline);

//     return () => {
//       socket.off("userOnline", handleUserOnline);

//       socket.off("userOffline", handleUserOffline);
//     };
//   }, [socket]);

//   /*
//    * SELECT EXISTING USER
//    */

//   const handleSelectUser = async (user) => {
//     try {
//       const response = await api.post("/conversations", {
//         userId: user._id,
//       });

//       const conversation = response.data;

//       setConversations((previous) => {
//         const exists = previous.some((item) => item._id === conversation._id);

//         if (exists) {
//           return previous.map((item) =>
//             item._id === conversation._id
//               ? {
//                   ...item,
//                   ...conversation,
//                 }
//               : item,
//           );
//         }

//         return [conversation, ...previous];
//       });

//       setSelectedConversation(conversation);

//       setSidebarOpen(false);
//     } catch (error) {
//       console.error("Create conversation error:", error);
//     }
//   };

//   /*
//    * SELECT CONVERSATION
//    */

//   const handleSelectConversation = (conversation) => {
//     setSelectedConversation(conversation);

//     setSidebarOpen(false);
//   };

//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-slate-950">
//         <div className="flex items-center gap-3 text-slate-400">
//           <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
//           Loading chats...
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="relative h-screen overflow-hidden bg-slate-950">
//       {/* Mobile menu */}

//       <button
//         onClick={() => setSidebarOpen(!sidebarOpen)}
//         className="absolute left-3 top-3 z-[60] rounded-lg bg-slate-800 p-2 text-white md:hidden"
//       >
//         {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
//       </button>

//       <div className="flex h-full">
//         {/* Sidebar */}

//         <div
//           className={`absolute inset-y-0 left-0 z-50 w-[85%] max-w-sm transform transition-transform duration-300 md:relative md:z-auto md:block md:w-80 md:max-w-none md:translate-x-0 ${
//             sidebarOpen ? "translate-x-0" : "-translate-x-full"
//           }`}
//         >
//           <Sidebar
//             conversations={conversations}
//             selectedConversation={selectedConversation}
//             onSelectConversation={handleSelectConversation}
//             onSelectUser={handleSelectUser}
//           />
//         </div>

//         {/* Mobile overlay */}

//         {sidebarOpen && (
//           <div
//             onClick={() => setSidebarOpen(false)}
//             className="absolute inset-0 z-40 bg-black/60 md:hidden"
//           />
//         )}

//         {/* Chat */}

//         <ChatWindow conversation={selectedConversation} />
//       </div>
//     </div>
//   );
// };

// export default Chat;

import { useEffect, useState } from "react";

import { Menu, X } from "lucide-react";

import api from "../services/api";

import { useAuth } from "../context/AuthContext";

import { useSocket } from "../context/SocketContext";
import AppRail from "../components/layout/AppRail";
import Sidebar from "../components/layout/Sidebar";
import CallsPanel from "../components/chat/CallsPanel";
import ChatWindow from "../components/chat/ChatWindow";
import ProfileModal from "../components/layout/ProfileModal";
import CommandPaletteModal from "../components/common/CommandPaletteModal";
import Seo from "../components/Seo";

const sortConversations = (list) => {
  return [...list].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return (
      new Date(b.updatedAt || b.createdAt || 0) -
      new Date(a.updatedAt || a.createdAt || 0)
    );
  });
};

const Chat = () => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("chat");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const { socket } = useSocket();

  // Cmd+K / Ctrl+K Global Shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  /*
   * ============================================================
   * LOAD CONVERSATIONS
   * ============================================================
   */

  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);

        const response = await api.get("/conversations");

        setConversations(response.data);
      } catch (error) {
        console.error("Conversation loading error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, []);

  /*
   * ============================================================
   * REAL-TIME MESSAGE ROUTING
   * ============================================================
   *
   * Backend sends:
   *
   * conversationUpdated
   *
   * through the receiver's socket ID.
   *
   * This works even when the receiver has NOT opened
   * the conversation.
   *
   * Flow:
   *
   * Sender
   *    ↓
   * sendMessage
   *    ↓
   * Socket Server
   *    ↓
   * Redis
   *    ↓
   * receiver socket IDs
   *    ↓
   * conversationUpdated
   *    ↓
   * This handler
   *    ↓
   * Update conversation sidebar
   */

  useEffect(() => {
    if (!socket || !user?._id) {
      return;
    }

    const handleConversationUpdate = ({
      conversationId,
      message,
      updatedAt,
    }) => {
      console.log("Real-time conversation update:", {
        conversationId,
        message,
      });

      const isSelectedConversation =
        selectedConversation?._id === conversationId;

      const isIncomingMessage =
        message &&
        (message.sender?._id !== user._id && message.sender !== user._id);

      /*
       * ========================================================
       * UPDATE CONVERSATION LIST
       * ========================================================
       */

      setConversations((previous) => {
        const conversation = previous.find(
          (item) => item._id === conversationId,
        );

        /*
         * Conversation isn't currently
         * present in the sidebar.
         *
         * We don't create a partial conversation here because
         * the backend event only contains the message.
         *
         * The conversation can be loaded normally through
         * the REST API.
         */

        if (!conversation) {
          return previous;
        }

        /*
         * Update last message.
         */

        const updatedConversation = {
          ...conversation,

          lastMessage: message || null,

          updatedAt:
            updatedAt || message?.updatedAt || message?.createdAt || new Date(),

          unreadCount: isSelectedConversation
            ? 0
            : isIncomingMessage
              ? (conversation.unreadCount || 0) + 1
              : conversation.unreadCount || 0,
        };

        /*
         * Move updated conversation
         * to the top.
         */

        return sortConversations([
          updatedConversation,

          ...previous.filter((item) => item._id !== conversationId),
        ]);
      });

      /*
       * ========================================================
       * UPDATE SELECTED CONVERSATION
       * ========================================================
       *
       * If this conversation is currently open,
       * update its last message as well.
       */

      setSelectedConversation((current) => {
        if (!current || current._id !== conversationId) {
          return current;
        }

        return {
          ...current,

          lastMessage: message || null,

          updatedAt:
            updatedAt || message?.updatedAt || message?.createdAt || new Date(),

          unreadCount: 0,
        };
      });
    };

    /*
     * Listen for backend event.
     */

    socket.on("conversationUpdated", handleConversationUpdate);

    /*
     * Listen for Pinned Messages updates
     */
    const handlePinnedUpdated = ({ conversationId, pinnedMessages: updatedPinned }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c._id?.toString() === conversationId?.toString()
            ? { ...c, pinnedMessages: updatedPinned }
            : c,
        ),
      );

      setSelectedConversation((current) => {
        if (!current || current._id?.toString() !== conversationId?.toString()) {
          return current;
        }
        return {
          ...current,
          pinnedMessages: updatedPinned,
        };
      });
    };

    socket.on("conversationPinnedUpdated", handlePinnedUpdated);

    /*
     * Listen for real-time user profile/status updates
     */
    const handleUserProfileUpdated = (updatedUser) => {
      if (!updatedUser?._id) return;
      setConversations((prev) =>
        prev.map((c) => {
          const isParticipant = (c.participants || []).some(
            (p) => (p._id || p)?.toString() === updatedUser._id.toString(),
          );
          if (!isParticipant) return c;
          return {
            ...c,
            participants: (c.participants || []).map((p) =>
              (p._id || p)?.toString() === updatedUser._id.toString()
                ? { ...p, ...updatedUser }
                : p,
            ),
          };
        }),
      );

      setSelectedConversation((current) => {
        if (!current) return current;
        return {
          ...current,
          participants: (current.participants || []).map((p) =>
            (p._id || p)?.toString() === updatedUser._id.toString()
              ? { ...p, ...updatedUser }
              : p,
          ),
        };
      });
    };

    socket.on("userProfileUpdated", handleUserProfileUpdated);

    /*
     * Cleanup.
     */

    return () => {
      socket.off("conversationUpdated", handleConversationUpdate);
      socket.off("conversationPinnedUpdated", handlePinnedUpdated);
      socket.off("userProfileUpdated", handleUserProfileUpdated);
    };
  }, [socket, selectedConversation?._id, user?._id]);

  /*
   * ============================================================
   * CLEAR UNREAD COUNTS WHEN MESSAGES ARE MARKED READ
   * ============================================================
   */

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMessagesRead = ({ conversationId }) => {
      setConversations((previous) =>
        previous.map((conversation) =>
          conversation._id === conversationId
            ? {
                ...conversation,
                unreadCount: 0,
              }
            : conversation,
        ),
      );

      setSelectedConversation((current) => {
        if (!current || current._id !== conversationId) {
          return current;
        }

        return {
          ...current,
          unreadCount: 0,
        };
      });
    };

    socket.on("messagesRead", handleMessagesRead);

    return () => {
      socket.off("messagesRead", handleMessagesRead);
    };
  }, [socket, selectedConversation?._id]);

  /*
   * ============================================================
   * USER ONLINE / OFFLINE
   * ============================================================
   *
   * These events update the participant object inside
   * every conversation.
   */

  useEffect(() => {
    if (!socket) {
      return;
    }

    /*
     * ==========================================================
     * USER ONLINE
     * ==========================================================
     */

    const handleUserOnline = ({ userId }) => {
      console.log("User came online:", userId);

      setConversations((previous) =>
        previous.map((conversation) => ({
          ...conversation,

          participants: conversation.participants.map((participant) =>
            participant._id === userId
              ? {
                  ...participant,

                  isOnline: true,

                  lastSeen: null,
                }
              : participant,
          ),
        })),
      );

      /*
       * Also update selected conversation.
       */

      setSelectedConversation((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          participants: current.participants.map((participant) =>
            participant._id === userId
              ? {
                  ...participant,

                  isOnline: true,

                  lastSeen: null,
                }
              : participant,
          ),
        };
      });
    };

    /*
     * ==========================================================
     * USER OFFLINE
     * ==========================================================
     */

    const handleUserOffline = ({ userId, lastSeen }) => {
      console.log("User went offline:", userId);

      setConversations((previous) =>
        previous.map((conversation) => ({
          ...conversation,

          participants: conversation.participants.map((participant) =>
            participant._id === userId
              ? {
                  ...participant,

                  isOnline: false,

                  lastSeen,
                }
              : participant,
          ),
        })),
      );

      /*
       * Also update selected conversation.
       */

      setSelectedConversation((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,

          participants: current.participants.map((participant) =>
            participant._id === userId
              ? {
                  ...participant,

                  isOnline: false,

                  lastSeen,
                }
              : participant,
          ),
        };
      });
    };

    /*
     * Register listeners.
     */

    socket.on("userOnline", handleUserOnline);

    socket.on("userOffline", handleUserOffline);

    /*
     * Cleanup.
     */

    return () => {
      socket.off("userOnline", handleUserOnline);

      socket.off("userOffline", handleUserOffline);
    };
  }, [socket]);

  /*
   * ============================================================
   * SELECT EXISTING USER
   * ============================================================
   */

  const handleSelectUser = async (user) => {
    try {
      const response = await api.post("/conversations", {
        userId: user._id,
      });

      const conversation = {
        ...response.data,

        unreadCount: 0,
      };

      /*
       * Add conversation if it doesn't exist.
       *
       * Otherwise update the existing conversation.
       */

      setConversations((previous) => {
        const exists = previous.some((item) => item._id === conversation._id);

        if (exists) {
          return previous.map((item) =>
            item._id === conversation._id
              ? {
                  ...item,

                  ...conversation,

                  unreadCount: 0,
                }
              : item,
          );
        }

        return [conversation, ...previous];
      });

      /*
       * Open conversation.
       */

      setSelectedConversation(conversation);

      /*
       * Close mobile sidebar.
       */

      setSidebarOpen(false);
    } catch (error) {
      console.error("Create conversation error:", error);
    }
  };

  /*
   * ============================================================
   * SELECT CONVERSATION
   * ============================================================
   */

  const handleSelectConversation = (conversation) => {
    if (!conversation) return;

    setConversations((previous) =>
      previous.map((item) =>
        item._id === conversation._id
          ? {
              ...item,
              unreadCount: 0,
            }
          : item,
      ),
    );

    setSelectedConversation({
      ...conversation,
      unreadCount: 0,
    });

    if (conversation._id) {
      socket?.emit("markConversationRead", {
        conversationId: conversation._id,
      });
      api.put(`/conversations/${conversation._id}/read`).catch(() => {});
    }

    setSidebarOpen(false);
  };

  const handleTogglePinConversation = async (conversationId) => {
    try {
      const res = await api.put(`/conversations/${conversationId}/pin`);
      const updated = res.data;
      setConversations((prev) =>
        sortConversations(
          prev.map((c) =>
            c._id === conversationId ? { ...c, isPinned: updated.isPinned } : c,
          ),
        ),
      );
      setSelectedConversation((curr) =>
        curr?._id === conversationId ? { ...curr, isPinned: updated.isPinned } : curr,
      );
    } catch (err) {
      console.error("Failed to toggle pin:", err);
    }
  };

  const scrollToMessage = (messageId) => {
    if (!messageId) return;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-blue-500", "bg-blue-500/10");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-blue-500", "bg-blue-500/10");
      }, 1500);
    }
  };

  const handleGroupCreated = (newGroup) => {
    setConversations((prev) =>
      sortConversations([
        newGroup,
        ...prev.filter((c) => c._id !== newGroup._id),
      ]),
    );
    setSelectedConversation(newGroup);
    setSidebarOpen(false);
  };

  const handleGroupUpdated = (updatedGroup) => {
    setConversations((prev) =>
      prev.map((c) => (c._id === updatedGroup._id ? { ...c, ...updatedGroup } : c)),
    );
    setSelectedConversation((curr) =>
      curr?._id === updatedGroup._id ? { ...curr, ...updatedGroup } : curr,
    );
  };

  const handleLeaveGroup = (groupId) => {
    setConversations((prev) => prev.filter((c) => c._id !== groupId));
    setSelectedConversation((curr) => (curr?._id === groupId ? null : curr));
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)]">
        <div className="flex items-center gap-3 text-[var(--text-secondary)] text-sm font-medium">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-color)] border-t-[var(--accent-primary)]" />
          Loading workspace...
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * UI (Floating Modern Dashboard Layout Matching Reference)
   * ============================================================
   */

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg-app)] flex sm:p-2 md:p-3 transition-colors duration-200">
      <Seo
        title="Messages"
        description="ChatApp keeps your conversations fast, private, and in sync across devices."
        path="/"
      />

      {/* Main Workspace Frame (Rounded Floating Card with Soft Shadow) */}
      <div className="flex-1 flex overflow-hidden rounded-none sm:rounded-[24px] md:rounded-[32px] border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl relative">
        {/* Column 1: Far-Left App Rail (Navbar) */}
        <AppRail
          onOpenProfile={() => setIsProfileModalOpen(true)}
          activeNav={activeNav}
          setActiveNav={setActiveNav}
        />

        {/* Column 2: Chat Sidebar / Calls Panel (Full width on mobile when no chat active, side-by-side on md+) */}
        <div
          className={`${
            selectedConversation ? "hidden md:flex" : "flex w-full"
          } md:w-72 lg:w-80 shrink-0 flex-col h-full border-r border-[var(--border-color)] relative z-10`}
        >
          {activeNav === "calls" || activeNav === "video" ? (
            <CallsPanel
              initialFilter={activeNav === "video" ? "video" : "all"}
              onSelectUser={(u) => {
                handleSelectUser(u);
                setActiveNav("chat");
              }}
              onClose={() => setActiveNav("chat")}
            />
          ) : (
            <Sidebar
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={(conv) => {
                handleSelectConversation(conv);
              }}
              onSelectUser={(u) => {
                handleSelectUser(u);
              }}
              onGroupCreated={handleGroupCreated}
              onTogglePinConversation={handleTogglePinConversation}
              onScrollToMessage={scrollToMessage}
              onOpenProfile={() => setIsProfileModalOpen(true)}
              onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
              activeNav={activeNav}
              setActiveNav={setActiveNav}
            />
          )}
        </div>

        {/* Column 3 & 4: Active Chat Window & Shared Files */}
        <div
          className={`${
            selectedConversation ? "flex w-full" : "hidden md:flex"
          } flex-1 min-w-0 h-full flex-col relative z-0`}
        >
          <ChatWindow
            key={selectedConversation?._id || "no-conversation"}
            conversation={selectedConversation}
            conversations={conversations}
            onGroupUpdated={handleGroupUpdated}
            onLeaveGroup={handleLeaveGroup}
            onBack={() => setSelectedConversation(null)}
          />
        </div>
      </div>

      <ProfileModal
        key={`${user?._id || "user"}-${isProfileModalOpen ? "open" : "closed"}`}
        open={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Global Cmd+K / Ctrl+K Command Palette */}
      <CommandPaletteModal
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenCreateGroup={() => {
          // Open sidebar and trigger create group
          setActiveNav("chat");
        }}
        selectedConversation={selectedConversation}
      />
    </div>
  );
};

export default Chat;
