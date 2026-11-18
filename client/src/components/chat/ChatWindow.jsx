import { MessageCircle, Sparkles } from "lucide-react";
import { useState } from "react";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import MediaLinksDrawer from "./MediaLinksDrawer";

const ChatWindow = ({
  conversation,
  onGroupUpdated,
  onLeaveGroup,
  onBack,
}) => {
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [showSharedFiles, setShowSharedFiles] = useState(false);

  // Official React pattern: reset state during render when prop changes
  const [prevConvId, setPrevConvId] = useState(conversation?._id);
  if (conversation?._id !== prevConvId) {
    setPrevConvId(conversation?._id);
    setEditingMessage(null);
    setReplyingToMessage(null);
    setInChatSearchOpen(false);
  }

  const scrollToMessage = (messageId) => {
    if (!messageId) return;
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-[var(--accent-primary)]", "bg-[var(--accent-light)]/30");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-[var(--accent-primary)]", "bg-[var(--accent-light)]/30");
      }, 1500);
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
    <div className="flex flex-1 h-full min-w-0 overflow-hidden bg-[var(--bg-subtle)]">
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
    </div>
  );
};

export default ChatWindow;
