import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Search, Forward, Users, Check } from "lucide-react";
import { getMediaUrl } from "../../config/endpoints";

const ForwardModal = ({ isOpen, onClose, message, conversations = [], currentUserId, onConfirmForward }) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);

  const filteredConversations = useMemo(() => {
    if (!conversations) return [];
    return conversations.filter((conv) => {
      if (conv.isGroup) {
        return (conv.groupName || "").toLowerCase().includes(search.toLowerCase());
      }
      const otherUser = conv.participants?.find((p) => (p._id || p) !== currentUserId);
      return (otherUser?.name || "").toLowerCase().includes(search.toLowerCase());
    });
  }, [conversations, search, currentUserId]);

  if (!isOpen || !message) return null;

  const toggleSelect = (convId) => {
    setSelectedIds((prev) =>
      prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId],
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0 || sending) return;
    try {
      setSending(true);
      await onConfirmForward?.(selectedIds, message);
      setSelectedIds([]);
      onClose();
    } catch (err) {
      console.error("Forward error:", err);
    } finally {
      setSending(false);
    }
  };

  const getSnippet = () => {
    if (message.text) return message.text;
    if (message.messageType === "image") return "📷 Photo";
    if (message.messageType === "video") return "🎥 Video";
    if (message.messageType === "audio") return "🎤 Voice note";
    if (message.messageType === "file") return `📎 ${message.fileName || "File"}`;
    if (message.messageType === "poll") return `📊 ${message.poll?.question || "Poll"}`;
    return "Message";
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150 select-none"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Forward size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Forward message</h2>
              <p className="text-xs text-[var(--text-secondary)]">Share with other chats</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Preview Box */}
        <div className="px-6 pt-4">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-0.5">
                Forwarding from {message.sender?.name || "Sender"}
              </span>
              <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-relaxed">
                {getSnippet()}
              </p>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="px-6 pt-3">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3.5 py-2">
            <Search size={15} className="text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats or contacts..."
              className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="p-6 max-h-64 overflow-y-auto space-y-1">
          {filteredConversations.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--text-muted)]">No chats found</p>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedIds.includes(conv._id);
              const isGroup = conv.isGroup;
              const otherUser = !isGroup
                ? conv.participants?.find((p) => (p._id || p) !== currentUserId)
                : null;
              const title = isGroup ? conv.groupName : otherUser?.name || "Chat";
              const avatar = isGroup ? conv.groupIcon : otherUser?.avatar;

              return (
                <button
                  key={conv._id}
                  type="button"
                  onClick={() => toggleSelect(conv._id)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 transition text-left cursor-pointer ${
                    isSelected
                      ? "bg-[var(--accent-light)]/40 border border-[var(--accent-primary)]/40"
                      : "hover:bg-[var(--bg-subtle)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-sm font-bold text-[var(--accent-primary)] overflow-hidden">
                      {avatar ? (
                        <img
                          src={getMediaUrl(avatar)}
                          alt={title}
                          className="h-full w-full object-cover"
                        />
                      ) : isGroup ? (
                        <Users size={18} />
                      ) : (
                        title.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {title}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        {isGroup ? `${conv.participants?.length || 0} members` : "Direct message"}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox circle */}
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      isSelected
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : "border-[var(--border-color)] bg-[var(--bg-card)]"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-color)] px-6 py-4 bg-[var(--bg-card)]">
          <span className="text-xs font-semibold text-[var(--text-muted)]">
            {selectedIds.length} {selectedIds.length === 1 ? "chat" : "chats"} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0 || sending}
              onClick={handleSend}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Forward size={14} />
              <span>{sending ? "Sending..." : "Send"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ForwardModal;
