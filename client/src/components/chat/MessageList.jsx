// import { useEffect, useRef, useState } from "react";

// import api from "../../services/api";

// import { useAuth } from "../../context/AuthContext";

// import { useSocket } from "../../context/SocketContext";

// import MessageBubble from "./MessageBubble";

// import TypingIndicator from "./TypingIndicator";

// const MessageList = ({ conversation }) => {
//   const { user } = useAuth();

//   const { socket } = useSocket();

//   const [messages, setMessages] = useState([]);

//   const [isTyping, setIsTyping] = useState(false);

//   const messagesEndRef = useRef(null);

//   /*
//    * LOAD OLD MESSAGES
//    */

//   useEffect(() => {
//     if (!conversation?._id) {
//       setMessages([]);
//       return;
//     }

//     const loadMessages = async () => {
//       try {
//         const response = await api.get(`/messages/${conversation._id}`);

//         setMessages(response.data);
//       } catch (error) {
//         console.error("Message loading error:", error);
//       }
//     };

//     loadMessages();
//   }, [conversation?._id]);

//   /*
//    * JOIN SOCKET ROOM
//    */

//   useEffect(() => {
//     if (!socket || !conversation?._id) {
//       return;
//     }

//     socket.emit("joinConversation", conversation._id);
//   }, [socket, conversation?._id]);

//   /*
//    * REAL-TIME MESSAGE
//    */

//   useEffect(() => {
//     if (!socket || !conversation?._id) {
//       return;
//     }

//     const handleNewMessage = (message) => {
//       if (message.conversation !== conversation._id) {
//         return;
//       }

//       setMessages((previous) => {
//         /*
//          * Prevent duplicates
//          */

//         const exists = previous.some((item) => item._id === message._id);

//         if (exists) {
//           return previous;
//         }

//         return [...previous, message];
//       });

//       /*
//        * If current user is receiver,
//        * mark message as read.
//        */

//       if (message.receiver?._id === user._id) {
//         socket.emit("messageRead", {
//           messageId: message._id,

//           conversationId: conversation._id,
//         });
//       }
//     };

//     socket.on("newMessage", handleNewMessage);

//     return () => {
//       socket.off("newMessage", handleNewMessage);
//     };
//   }, [socket, conversation?._id, user._id]);

//   /*
//    * TYPING
//    */

//   useEffect(() => {
//     if (!socket) {
//       return;
//     }

//     const handleTyping = ({ userId, isTyping }) => {
//       if (userId === user._id) {
//         return;
//       }

//       setIsTyping(isTyping);
//     };

//     socket.on("userTyping", handleTyping);

//     return () => {
//       socket.off("userTyping", handleTyping);
//     };
//   }, [socket, user._id]);

//   /*
//    * AUTO SCROLL
//    */

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({
//       behavior: "smooth",
//     });
//   }, [messages, isTyping]);

//   if (!conversation) {
//     return null;
//   }

//   return (
//     <div className="flex-1 overflow-y-auto bg-slate-950 px-5 py-5">
//       <div className="mx-auto flex max-w-4xl flex-col gap-3">
//         {messages.length === 0 && (
//           <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
//             <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl">
//               👋
//             </div>

//             <h3 className="font-semibold text-white">Start the conversation</h3>

//             <p className="mt-1 text-sm text-slate-500">
//               Send a message to start chatting.
//             </p>
//           </div>
//         )}

//         {messages.map((message) => (
//           <MessageBubble key={message._id} message={message} />
//         ))}

//         {isTyping && <TypingIndicator />}

//         <div ref={messagesEndRef} />
//       </div>
//     </div>
//   );
// };

// export default MessageList;

import { useEffect, useRef, useState } from "react";

import api from "../../services/api";

import { useAuth } from "../../context/AuthContext";

import { useSocket } from "../../context/SocketContext";

import MessageBubble from "./MessageBubble";

import TypingIndicator from "./TypingIndicator";

const MessageList = ({
  conversation,
  onStartEdit,
  editingMessageId,
  onCancelEdit,
}) => {
  const { user } = useAuth();

  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);

  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef(null);

  /*
   * ============================================================
   * RESET TYPING WHEN CONVERSATION CHANGES
   * ============================================================
   */

  useEffect(() => {
    setIsTyping(false);
  }, [conversation?._id]);

  /*
   * ============================================================
   * LOAD OLD MESSAGES
   * ============================================================
   */

  useEffect(() => {
    if (!conversation?._id) {
      setMessages([]);

      return;
    }

    if (!socket) {
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${conversation._id}`);

        const loadedMessages = response.data;

        setMessages(loadedMessages);

        /*
         * ======================================================
         * FIND UNREAD MESSAGES
         * ======================================================
         */

        const hasUnreadMessages = loadedMessages.some(
          (message) => message.receiver?._id === user._id && !message.isRead,
        );

        /*
         * ======================================================
         * MARK CONVERSATION AS READ
         * ======================================================
         */

        if (hasUnreadMessages) {
          socket.emit("markConversationRead", {
            conversationId: conversation._id,
          });
        }
      } catch (error) {
        console.error("Message loading error:", error);
      }
    };

    loadMessages();
  }, [conversation?._id, socket, user._id]);

  /*
   * ============================================================
   * JOIN SOCKET ROOM
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    socket.emit("joinConversation", conversation._id);
  }, [socket, conversation?._id]);

  /*
   * ============================================================
   * REAL-TIME MESSAGE
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    const handleNewMessage = (message) => {
      /*
       * Ignore messages from another conversation.
       */

      const messageConversationId =
        message.conversation?._id || message.conversation;

      if (messageConversationId !== conversation._id) {
        return;
      }

      /*
       * Add message to state.
       */

      setMessages((previous) => {
        const exists = previous.some((item) => item._id === message._id);

        if (exists) {
          return previous;
        }

        return [...previous, message];
      });

      /*
       * ======================================================
       * CURRENT USER IS RECEIVER
       * ======================================================
       */

      if (message.receiver?._id === user._id) {
        socket.emit("messageRead", {
          messageId: message._id,
          conversationId: conversation._id,
        });
      }
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, conversation?._id, user._id]);

  /*
   * ============================================================
   * MESSAGE UPDATE
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    const handleMessageUpdated = (message) => {
      const messageConversationId =
        message.conversation?._id || message.conversation;

      if (messageConversationId !== conversation._id) {
        return;
      }

      setMessages((previous) =>
        previous.map((item) =>
          item._id === message._id
            ? {
                ...item,
                ...message,
              }
            : item,
        ),
      );

      if (editingMessageId === message._id) {
        onCancelEdit?.();
      }
    };

    socket.on("messageUpdated", handleMessageUpdated);

    return () => {
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [socket, conversation?._id, editingMessageId, onCancelEdit]);

  /*
   * ============================================================
   * MESSAGE DELETE
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    const handleMessageDeleted = (message) => {
      const messageConversationId =
        message.conversation?._id || message.conversation;

      if (messageConversationId !== conversation._id) {
        return;
      }

      setMessages((previous) =>
        previous.map((item) =>
          item._id === message._id
            ? {
                ...item,
                ...message,
              }
            : item,
        ),
      );

      if (editingMessageId === message._id) {
        onCancelEdit?.();
      }
    };

    socket.on("messageDeleted", handleMessageDeleted);

    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, conversation?._id, editingMessageId, onCancelEdit]);

  /*
   * ============================================================
   * MESSAGE READ RECEIPT
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    /*
     * ==========================================================
     * MULTIPLE MESSAGES READ
     * ==========================================================
     */

    const handleMessagesRead = ({ conversationId, messageIds }) => {
      if (conversationId !== conversation._id) {
        return;
      }

      setMessages((previous) =>
        previous.map((message) => {
          if (messageIds.includes(message._id)) {
            return {
              ...message,
              isRead: true,
            };
          }

          return message;
        }),
      );
    };

    /*
     * ==========================================================
     * SINGLE MESSAGE READ
     * ==========================================================
     */

    const handleMessageRead = ({ messageId, conversationId }) => {
      if (conversationId !== conversation._id) {
        return;
      }

      setMessages((previous) =>
        previous.map((message) => {
          if (message._id === messageId) {
            return {
              ...message,
              isRead: true,
            };
          }

          return message;
        }),
      );
    };

    socket.on("messagesRead", handleMessagesRead);

    socket.on("messageRead", handleMessageRead);

    return () => {
      socket.off("messagesRead", handleMessagesRead);

      socket.off("messageRead", handleMessageRead);
    };
  }, [socket, conversation?._id]);

  /*
   * ============================================================
   * TYPING INDICATOR
   * ============================================================
   */

  useEffect(() => {
    if (!socket || !conversation?._id) {
      return;
    }

    const handleTyping = ({ userId, conversationId, isTyping }) => {
      /*
       * Ignore our own typing event.
       */

      if (userId === user._id) {
        return;
      }

      /*
       * Ignore typing events from
       * another conversation.
       */

      if (conversationId !== conversation._id) {
        return;
      }

      /*
       * Update typing state.
       */

      setIsTyping(isTyping);
    };

    socket.on("userTyping", handleTyping);

    return () => {
      socket.off("userTyping", handleTyping);

      /*
       * Reset indicator when
       * listener is removed.
       */

      setIsTyping(false);
    };
  }, [socket, conversation?._id, user._id]);

  /*
   * ============================================================
   * AUTO SCROLL
   * ============================================================
  */

  const handleEditMessage = (message) => {
    onStartEdit?.(message);
  };

  const handleDeleteMessage = (message) => {
    const confirmed = window.confirm("Delete this message?");

    if (!confirmed) {
      return;
    }

    if (!socket || !conversation?._id) {
      return;
    }

    socket.emit("deleteMessage", {
      conversationId: conversation._id,
      messageId: message._id,
    });

    if (editingMessageId === message._id) {
      onCancelEdit?.();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  /*
   * ============================================================
   * NO CONVERSATION
   * ============================================================
   */

  if (!conversation) {
    return null;
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 px-5 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl">
              👋
            </div>

            <h3 className="font-semibold text-white">Start the conversation</h3>

            <p className="mt-1 text-sm text-slate-500">
              Send a message to start chatting.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            onEdit={handleEditMessage}
            onDelete={handleDeleteMessage}
          />
        ))}

        {isTyping && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
