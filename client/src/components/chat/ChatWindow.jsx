import { MessageCircle, Sparkles, UploadCloud } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import MediaLinksDrawer from "./MediaLinksDrawer";
import PinnedMessagesBanner from "./PinnedMessagesBanner";
import ForwardModal from "./ForwardModal";
import MessageInfoDrawer from "./MessageInfoDrawer";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ChatWindow = ({
  conversation,
  conversations = [],
  onGroupUpdated,
  onLeaveGroup,
  onBack,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [showSharedFiles, setShowSharedFiles] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState(conversation?.pinnedMessages || []);
  const [loadedMessages, setLoadedMessages] = useState([]);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  // Drag-and-drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Reset state on conversation switch
  const [prevConvId, setPrevConvId] = useState(conversation?._id);
  if (conversation?._id !== prevConvId) {
    setPrevConvId(conversation?._id);
    setEditingMessage(null);
    setReplyingToMessage(null);
    setInChatSearchOpen(false);
    setPinnedMessages(conversation?.pinnedMessages || []);
    setIsDraggingOver(false);
    dragCounter.current = 0;
  }

  // Real-time Pinned Messages Listener
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handlePinnedUpdated = ({ conversationId, pinnedMessages: updatedPinned }) => {
      if (conversationId?.toString() === conversation._id?.toString()) {
        setPinnedMessages(updatedPinned || []);
      }
    };

    socket.on("conversationPinnedUpdated", handlePinnedUpdated);
    return () => {
      socket.off("conversationPinnedUpdated", handlePinnedUpdated);
    };
  }, [socket, conversation?._id]);

  useEffect(() => {
    setPinnedMessages(conversation?.pinnedMessages || []);
  }, [conversation?._id, conversation?.pinnedMessages]);

  const scrollToMessage = (messageId) => {
    if (!messageId) return;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-500", "bg-amber-500/15");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-500", "bg-amber-500/15");
      }, 2000);
    }
  };

  const handlePinMessage = async (message) => {
    if (!conversation?._id || !message?._id) return;
    const isAlreadyPinned = pinnedMessages.some(
      (pm) => (pm?._id || pm)?.toString() === message._id?.toString(),
    );

    if (isAlreadyPinned) {
      handleUnpinMessage(message._id);
      return;
    }

    // Optimistic update
    setPinnedMessages((prev) => {
      const filtered = prev.filter(
        (pm) => (pm?._id || pm)?.toString() !== message._id?.toString(),
      );
      if (filtered.length >= 3) filtered.shift();
      return [...filtered, message];
    });

    if (socket && socket.connected) {
      socket.emit("pinMessage", {
        conversationId: conversation._id,
        messageId: message._id,
      });
    } else {
      try {
        const res = await api.put(`/conversations/${conversation._id}/pin-message`, {
          messageId: message._id,
        });
        if (res.data?.pinnedMessages) {
          setPinnedMessages(res.data.pinnedMessages);
        }
      } catch (err) {
        console.error("Pin REST error:", err);
      }
    }
  };

  const handleUnpinMessage = async (messageId) => {
    if (!conversation?._id || !messageId) return;
    setPinnedMessages((prev) =>
      prev.filter((pm) => (pm?._id || pm)?.toString() !== messageId?.toString()),
    );

    if (socket && socket.connected) {
      socket.emit("unpinMessage", {
        conversationId: conversation._id,
        messageId,
      });
    } else {
      try {
        await api.delete(`/conversations/${conversation._id}/pin-message/${messageId}`);
      } catch (err) {
        console.error("Unpin REST error:", err);
      }
    }
  };

  // Forwarding handler
  const handleConfirmForward = async (targetConversationIds, msgToForward) => {
    if (!socket || !targetConversationIds.length || !msgToForward) return;

    for (const targetId of targetConversationIds) {
      const targetConv = conversations.find((c) => c._id === targetId);
      const isGroup = Boolean(targetConv?.isGroup);
      const otherUser = !isGroup
        ? targetConv?.participants?.find((p) => (p._id || p) !== user._id)
        : null;

      socket.emit("sendMessage", {
        conversationId: targetId,
        receiverId: isGroup ? null : otherUser?._id || otherUser,
        text: msgToForward.text || "",
        messageType: msgToForward.messageType,
        mediaUrl: msgToForward.mediaUrl || "",
        fileName: msgToForward.fileName || "",
        fileSize: msgToForward.fileSize || 0,
        audioDuration: msgToForward.audioDuration || 0,
        poll: msgToForward.poll,
        isForwarded: true,
      });
    }
  };

  // Drag and Drop Upload
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0 || !socket || !conversation) return;

    const isGroup = Boolean(conversation.isGroup);
    const receiver = !isGroup
      ? conversation.participants?.find((p) => (p._id || p) !== user._id)
      : null;
    if (!isGroup && !receiver) return;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        socket.emit("sendMessage", {
          conversationId: conversation._id,
          receiverId: isGroup ? null : receiver?._id || receiver,
          text: "",
          messageType: res.data.messageType,
          mediaUrl: res.data.url,
          fileName: res.data.fileName,
          fileSize: res.data.fileSize,
        });
      } catch (err) {
        console.error("Drop upload error:", err);
      }
    }
  };

  if (!conversation) {
    return (
      <main className="hidden flex-1 items-center justify-center bg-[var(--bg-subtle)] md:flex select-none transition-colors duration-200">
        <div className="max-w-sm text-center p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-md text-[var(--accent-primary)]">
            <MessageCircle size={36} />
          </div>

          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Pick a conversation
          </h2>

          <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
            Select an active chat from the sidebar, search people, or create a group to start messaging.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-light)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-text)]">
            <Sparkles size={12} />
            <span>Real-time sync & Cloudinary media</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div
      className="relative flex flex-1 h-full min-w-0 overflow-hidden bg-[var(--bg-subtle)]"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-card)]/90 backdrop-blur-md border-3 border-dashed border-[var(--accent-primary)] rounded-3xl m-4 pointer-events-none animate-in fade-in zoom-in-95 duration-150 select-none shadow-2xl">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] mb-3 shadow-lg animate-bounce">
            <UploadCloud size={40} />
          </div>
          <p className="text-base font-extrabold text-[var(--text-primary)]">Drop files to send</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Photos, videos, and documents will be shared directly
          </p>
        </div>
      )}

      {/* Active Conversation Column */}
      <main className="flex min-w-0 flex-1 flex-col h-full bg-[var(--bg-subtle)]">
        <ChatHeader
          conversation={conversation}
          onGroupUpdated={onGroupUpdated}
          onLeaveGroup={onLeaveGroup}
          onToggleInChatSearch={() => setInChatSearchOpen((prev) => !prev)}
          onToggleSharedFiles={() => setShowSharedFiles((prev) => !prev)}
          showSharedFiles={showSharedFiles}
          onScrollToMessage={scrollToMessage}
          onBack={onBack}
        />

        {/* Pinned Messages Banner */}
        <PinnedMessagesBanner
          pinnedMessages={pinnedMessages}
          messages={loadedMessages}
          onScrollToMessage={scrollToMessage}
          onUnpin={handleUnpinMessage}
        />

        <MessageList
          conversation={conversation}
          inChatSearchOpen={inChatSearchOpen}
          onCloseInChatSearch={() => setInChatSearchOpen(false)}
          onStartEdit={(msg) => {
            setReplyingToMessage(null);
            setEditingMessage(msg);
          }}
          editingMessageId={editingMessage?._id || null}
          onCancelEdit={() => setEditingMessage(null)}
          onReply={(msg) => {
            setEditingMessage(null);
            setReplyingToMessage(msg);
          }}
          onPinMessage={handlePinMessage}
          onForwardMessage={(msg) => setForwardingMessage(msg)}
          onShowMessageInfo={(msg) => setInfoMessage(msg)}
          pinnedMessages={pinnedMessages}
          onMessagesLoaded={setLoadedMessages}
        />

        <MessageInput
          key={`${conversation._id}-${editingMessage?._id || "new"}`}
          conversation={conversation}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          replyingTo={replyingToMessage}
          onCancelReply={() => setReplyingToMessage(null)}
        />
      </main>

      {/* Right Column: Shared Files Panel (Inline on desktop when toggled, or Drawer on mobile) */}
      {showSharedFiles && (
        <MediaLinksDrawer
          isOpen={showSharedFiles}
          onClose={() => setShowSharedFiles(false)}
          conversation={conversation}
          isInline={true}
        />
      )}

      {/* Message Info Drawer */}
      <MessageInfoDrawer
        open={Boolean(infoMessage)}
        onClose={() => setInfoMessage(null)}
        message={infoMessage}
      />

      {/* Message Forwarding Modal */}
      <ForwardModal
        isOpen={Boolean(forwardingMessage)}
        onClose={() => setForwardingMessage(null)}
        message={forwardingMessage}
        conversations={conversations}
        currentUserId={user._id}
        onConfirmForward={handleConfirmForward}
      />
    </div>
  );
};

export default ChatWindow;
