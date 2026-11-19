import { useEffect, useRef, useState } from "react";
import { ArrowDown, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import {
  playReceivedSound,
  playSentSound,
  requestNotificationPermission,
  showDesktopNotification,
} from "../../utils/soundAndNotification";

const MessageList = ({
  conversation,
  onStartEdit,
  editingMessageId,
  onCancelEdit,
  onReply,
  inChatSearchOpen = false,
  onCloseInChatSearch,
  onPinMessage,
  onForwardMessage,
  onShowMessageInfo,
  pinnedMessages = [],
  onMessagesLoaded,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState("");
  const [showScrollPill, setShowScrollPill] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  // In-chat search state
  const [searchQuery, setSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const messagesEndRef = useRef(null);
  const listContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Request browser notification permission once
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Reset state on conversation switch
  const [prevConvId, setPrevConvId] = useState(conversation?._id);
  if (conversation?._id !== prevConvId) {
    setPrevConvId(conversation?._id);
    setIsTyping(false);
    setTypingUserName("");
    setMessages([]);
    setShowScrollPill(false);
    setUnreadBelowCount(0);
    setSearchQuery("");
    setCurrentMatchIndex(0);
  }

  // Load old messages & mark read
  useEffect(() => {
    if (!conversation?._id || !socket) {
      return;
    }

    const loadMessages = async () => {
      try {
        const response = await api.get(`/messages/${conversation._id}`);
        const loadedMessages = response.data;
        setMessages(loadedMessages);
        onMessagesLoaded?.(loadedMessages);

        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
          isNearBottomRef.current = true;
        });

        const hasUnread = loadedMessages.some((m) => {
          const senderId = (m.sender?._id || m.sender)?.toString();
          if (senderId === user._id?.toString()) return false;
          if (conversation.isGroup) {
            return !(m.readBy || []).some(
              (rId) => (rId._id || rId)?.toString() === user._id?.toString(),
            );
          }
          return (m.receiver?._id || m.receiver) === user._id && m.status !== "read";
        });

        if (hasUnread) {
          socket?.emit("markConversationRead", {
            conversationId: conversation._id,
          });
          api.put(`/conversations/${conversation._id}/read`).catch(() => {});
        }
      } catch (error) {
        console.error("Message loading error:", error);
      }
    };

    loadMessages();
  }, [conversation?._id, socket, user._id]);

  // Join conversation socket room
  useEffect(() => {
    if (!socket || !conversation?._id) return;
    socket.emit("joinConversation", conversation._id);
  }, [socket, conversation?._id]);

  // Real-time new messages
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleNewMessage = (message) => {
      const msgConvId = message.conversation?._id || message.conversation;
      if (msgConvId !== conversation._id) return;

      setMessages((prev) => {
        const exists = prev.some((item) => item._id === message._id);
        if (exists) return prev;
        return [...prev, message];
      });

      const isMine = (message.sender?._id || message.sender) === user._id;

      if (isMine) {
        playSentSound();
      } else {
        const isMuted = Boolean(
          user?.mutedConversations?.some(
            (m) =>
              (m.conversationId?._id || m.conversationId)?.toString() ===
                conversation?._id?.toString() &&
              (!m.mutedUntil || new Date(m.mutedUntil) > new Date()),
          ),
        );

        if (!isMuted) {
          playReceivedSound();
          showDesktopNotification({
            title: conversation.isGroup
              ? conversation.groupName
              : message.sender?.name || "New message",
            body:
              message.text ||
              (message.messageType === "image"
                ? "📷 Photo"
                : message.messageType === "video"
                ? "🎥 Video"
                : message.messageType === "audio"
                ? "🎤 Voice note"
                : "📎 Attachment"),
          });
        }
      }

      if (isNearBottomRef.current || isMine) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        });
      } else {
        setShowScrollPill(true);
        setUnreadBelowCount((c) => c + 1);
      }

      if (!isMine) {
        socket?.emit("markConversationRead", {
          conversationId: conversation._id,
        });
        api.put(`/conversations/${conversation._id}/read`).catch(() => {});
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [
    socket,
    conversation?._id,
    conversation?.isGroup,
    conversation?.groupName,
    user._id,
    user?.mutedConversations,
  ]);

  // Real-time message edits
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleMessageUpdated = (updatedMessage) => {
      const msgConvId = updatedMessage.conversation?._id || updatedMessage.conversation;
      if (msgConvId !== conversation._id) return;

      setMessages((prev) =>
        prev.map((item) =>
          item._id === updatedMessage._id ? { ...item, ...updatedMessage } : item,
        ),
      );

      if (editingMessageId === updatedMessage._id) {
        onCancelEdit?.();
      }
    };

    socket.on("messageUpdated", handleMessageUpdated);
    return () => {
      socket.off("messageUpdated", handleMessageUpdated);
    };
  }, [socket, conversation?._id, editingMessageId, onCancelEdit]);

  // Real-time message deletions (everyone vs me)
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleMessageDeleted = (data) => {
      const msgConvId = data.conversationId;
      if (msgConvId !== conversation._id) return;

      if (data.deleteType === "me") {
        setMessages((prev) => prev.filter((item) => item._id !== data.messageId));
      } else {
        setMessages((prev) =>
          prev.map((item) =>
            item._id === data.messageId
              ? {
                  ...item,
                  isDeleted: true,
                  text: "This message was deleted",
                  mediaUrl: "",
                  ...(data.message || {}),
                }
              : item,
          ),
        );
      }

      if (editingMessageId === data.messageId) {
        onCancelEdit?.();
      }
    };

    socket.on("messageDeleted", handleMessageDeleted);
    return () => {
      socket.off("messageDeleted", handleMessageDeleted);
    };
  }, [socket, conversation?._id, editingMessageId, onCancelEdit]);

  // Real-time delivery receipts (Double Grey Check)
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleMessagesDelivered = ({ conversationId, messageIds, deliveredAt }) => {
      if (conversationId && conversationId !== conversation._id) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (messageIds.includes(msg._id)) {
            return {
              ...msg,
              status: msg.status === "read" ? "read" : "delivered",
              deliveredAt: deliveredAt || new Date(),
            };
          }
          return msg;
        }),
      );
    };

    socket.on("messagesDelivered", handleMessagesDelivered);
    return () => {
      socket.off("messagesDelivered", handleMessagesDelivered);
    };
  }, [socket, conversation?._id]);

  // Real-time read receipts (Double Blue Check)
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleMessagesRead = ({ conversationId, messageIds }) => {
      if (conversationId !== conversation._id) return;

      setMessages((prev) =>
        prev.map((msg) => {
          if (messageIds.includes(msg._id)) {
            return {
              ...msg,
              isRead: true,
              status: "read",
            };
          }
          return msg;
        }),
      );
    };

    const handleMessageRead = ({ conversationId, messageId }) => {
      if (conversationId !== conversation._id) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isRead: true,
                status: "read",
              }
            : msg,
        ),
      );
    };

    socket.on("messagesRead", handleMessagesRead);
    socket.on("messageRead", handleMessageRead);

    return () => {
      socket.off("messagesRead", handleMessagesRead);
      socket.off("messageRead", handleMessageRead);
    };
  }, [socket, conversation?._id]);

  // Real-time reactions
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleReactionUpdated = (data) => {
      if (data.conversationId !== conversation._id) return;

      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg,
        ),
      );
    };

    socket.on("messageReactionUpdated", handleReactionUpdated);
    return () => {
      socket.off("messageReactionUpdated", handleReactionUpdated);
    };
  }, [socket, conversation?._id]);

  // Real-time Poll Updates
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handlePollUpdated = ({ conversationId, messageId, poll }) => {
      if (conversationId !== conversation._id) return;
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, poll } : m)),
      );
    };

    socket.on("pollUpdated", handlePollUpdated);
    return () => {
      socket.off("pollUpdated", handlePollUpdated);
    };
  }, [socket, conversation?._id]);

  // Real-time typing indicator
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleUserTyping = ({ conversationId, userId, userName, isTyping: typingStatus }) => {
      if (conversationId !== conversation._id || userId === user._id) return;
      if (typingStatus) {
        let resolvedName = userName;
        if (!resolvedName && conversation.participants) {
          const participant = conversation.participants.find(
            (p) => (p._id ? p._id.toString() : p.toString()) === userId?.toString()
          );
          resolvedName = participant?.name;
        }
        setTypingUserName(resolvedName ? resolvedName.split(" ")[0] : "");
        setIsTyping(true);
      } else {
        setIsTyping(false);
        setTypingUserName("");
      }
    };

    socket.on("userTyping", handleUserTyping);
    return () => {
      socket.off("userTyping", handleUserTyping);
    };
  }, [socket, conversation?._id, conversation?.participants, user._id]);

  const handleReact = (messageId, emoji) => {
    if (!socket || !conversation?._id) return;

    socket.emit("messageReaction", {
      conversationId: conversation._id,
      messageId,
      emoji,
    });
  };

  const handleVotePoll = (messageId, optionId) => {
    if (!socket || !conversation?._id) return;

    socket.emit("votePoll", {
      conversationId: conversation._id,
      messageId,
      optionId,
    });
  };

  const handleStarMessage = async (message) => {
    try {
      const res = await api.put(`/messages/${message._id}/star`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === message._id ? { ...m, starredBy: res.data.starredBy } : m,
        ),
      );
    } catch (err) {
      console.error("Failed to star message:", err);
    }
  };

  const matchedMessageIds = searchQuery.trim()
    ? messages
        .filter((m) =>
          m.text?.toLowerCase().includes(searchQuery.trim().toLowerCase()),
        )
        .map((m) => m._id)
    : [];

  const handlePrevMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx =
      currentMatchIndex <= 0 ? matchedMessageIds.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(nextIdx);
    scrollToMessage(matchedMessageIds[nextIdx]);
  };

  const handleNextMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx =
      currentMatchIndex >= matchedMessageIds.length - 1 ? 0 : currentMatchIndex + 1;
    setCurrentMatchIndex(nextIdx);
    scrollToMessage(matchedMessageIds[nextIdx]);
  };

  const handleDeleteMessage = (message, deleteType = "everyone") => {
    if (!socket || !conversation?._id) return;

    socket.emit("deleteMessage", {
      conversationId: conversation._id,
      messageId: message._id,
      deleteType,
    });

    if (editingMessageId === message._id) {
      onCancelEdit?.();
    }
  };

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollPill(false);
    setUnreadBelowCount(0);
    isNearBottomRef.current = true;
  };

  const handleScroll = () => {
    const el = listContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNear = distanceToBottom < 150;
    isNearBottomRef.current = isNear;

    if (isNear) {
      setShowScrollPill(false);
      setUnreadBelowCount(0);
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

  useEffect(() => {
    if (isTyping && isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isTyping]);

  if (!conversation) return null;

  return (
    <div
      ref={listContainerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto bg-[var(--bg-subtle)] px-4 py-4 md:px-6 transition-colors duration-200"
    >
      {/* In-chat search sticky bar */}
      {inChatSearchOpen && (
        <div className="sticky top-0 z-30 mb-3 mx-auto max-w-4xl flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2.5 shadow-xl backdrop-blur-md animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex flex-1 items-center">
            <Search size={15} className="absolute left-3 text-[var(--text-muted)]" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setCurrentMatchIndex(0);
                if (val.trim()) {
                  const firstMatch = messages.find((m) =>
                    m.text?.toLowerCase().includes(val.trim().toLowerCase()),
                  );
                  if (firstMatch) scrollToMessage(firstMatch._id);
                }
              }}
              placeholder="Search in this conversation..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] py-1.5 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0 text-xs text-[var(--text-muted)]">
            {searchQuery.trim() && (
              <span className="text-[11px] font-medium mr-1 text-[var(--text-muted)]">
                {matchedMessageIds.length > 0
                  ? `${currentMatchIndex + 1} of ${matchedMessageIds.length}`
                  : "No matches"}
              </span>
            )}

            <button
              type="button"
              disabled={matchedMessageIds.length === 0}
              onClick={handlePrevMatch}
              className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-40"
              title="Previous match"
            >
              <ChevronUp size={16} />
            </button>

            <button
              type="button"
              disabled={matchedMessageIds.length === 0}
              onClick={handleNextMatch}
              className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-40"
              title="Next match"
            >
              <ChevronDown size={16} />
            </button>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                onCloseInChatSearch?.();
              }}
              className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] ml-1"
              title="Close search"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-4xl flex-col gap-1">
        {messages.length === 0 && (
          <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] text-2xl shadow-xs">
              💬
            </div>
            <h3 className="font-semibold text-[var(--text-primary)]">Start the conversation</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Send a message, voice note, or photo to start chatting.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message._id}
            message={message}
            onEdit={onStartEdit}
            onDelete={handleDeleteMessage}
            onReply={onReply}
            onScrollToMessage={scrollToMessage}
            onReact={handleReact}
            onStar={handleStarMessage}
            onPin={onPinMessage}
            onForward={onForwardMessage}
            onVotePoll={handleVotePoll}
            onShowMessageInfo={onShowMessageInfo}
            isPinned={pinnedMessages.some(
              (pm) => (pm?._id || pm)?.toString() === message._id?.toString(),
            )}
            searchKeyword={searchQuery}
            isGroup={Boolean(conversation?.isGroup)}
          />
        ))}

        {isTyping && <TypingIndicator typingName={typingUserName} />}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating "New Messages" Scroll Pill */}
      {showScrollPill && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="fixed bottom-24 right-8 z-30 flex items-center gap-2 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)] px-3.5 py-2 text-xs font-semibold text-white shadow-xl transition hover:scale-105 hover:bg-[var(--accent-hover)] animate-in fade-in slide-in-from-bottom-2 duration-150"
          aria-label="Scroll to newest messages"
        >
          <ArrowDown size={14} className="animate-bounce" />
          <span>New messages</span>
          {unreadBelowCount > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[var(--accent-primary)]">
              {unreadBelowCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default MessageList;
