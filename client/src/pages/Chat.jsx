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

import Sidebar from "../components/layout/Sidebar";

import ChatWindow from "../components/chat/ChatWindow";

const Chat = () => {
  const { user } = useAuth();

  const [conversations, setConversations] = useState([]);

  const [selectedConversation, setSelectedConversation] = useState(null);

  const [loading, setLoading] = useState(true);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { socket } = useSocket();

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
        (message.receiver?._id === user._id || message.receiver === user._id);

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

        return [
          updatedConversation,

          ...previous.filter((item) => item._id !== conversationId),
        ];
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
     * Cleanup.
     */

    return () => {
      socket.off("conversationUpdated", handleConversationUpdate);
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
      if (selectedConversation?._id !== conversationId) {
        return;
      }

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

    setSidebarOpen(false);
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          Loading chats...
        </div>
      </div>
    );
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950">
      {/* ========================================================
          MOBILE MENU
      ======================================================== */}

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-3 top-3 z-[60] rounded-lg bg-slate-800 p-2 text-white md:hidden"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <div className="flex h-full">
        {/* ======================================================
            SIDEBAR
        ====================================================== */}

        <div
          className={`absolute inset-y-0 left-0 z-50 w-[85%] max-w-sm transform transition-transform duration-300 md:relative md:z-auto md:block md:w-80 md:max-w-none md:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onSelectUser={handleSelectUser}
          />
        </div>

        {/* ======================================================
            MOBILE OVERLAY
        ====================================================== */}

        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 z-40 bg-black/60 md:hidden"
          />
        )}

        {/* ======================================================
            CHAT WINDOW
        ====================================================== */}

        <ChatWindow
          key={selectedConversation?._id || "no-conversation"}
          conversation={selectedConversation}
        />
      </div>
    </div>
  );
};

export default Chat;
