import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, FileText, Loader2, Search, Star, StarOff, X } from "lucide-react";
import api from "../../services/api";
import { getMediaUrl } from "../../config/endpoints";

const StarredMessagesModal = ({
  isOpen,
  onClose,
  conversationId,
  onScrollToMessage,
}) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterThisChat, setFilterThisChat] = useState(Boolean(conversationId));
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchStarred = async () => {
      try {
        setLoading(true);
        const url = filterThisChat && conversationId
          ? `/messages/starred?conversationId=${conversationId}`
          : "/messages/starred";
        const res = await api.get(url);
        if (isMounted) {
          setMessages(res.data || []);
        }
      } catch (err) {
        console.error("Failed to load starred messages:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchStarred();
    return () => {
      isMounted = false;
    };
  }, [isOpen, filterThisChat, conversationId]);

  if (!isOpen) return null;

  const handleUnstar = async (messageId) => {
    try {
      setActionLoadingId(messageId);
      await api.put(`/messages/${messageId}/star`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    } catch (err) {
      console.error("Failed to unstar message:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const textMatch = m.text?.toLowerCase().includes(q);
    const fileMatch = m.fileName?.toLowerCase().includes(q);
    const senderMatch = m.sender?.name?.toLowerCase().includes(q);
    return textMatch || fileMatch || senderMatch;
  });

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
              <Star size={18} fill="currentColor" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Starred Messages</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {messages.length} saved {messages.length === 1 ? "message" : "messages"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter controls */}
        <div className="border-b border-[var(--border-color)] bg-[var(--bg-app)]/50 p-4 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search starred messages..."
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            {conversationId && (
              <button
                type="button"
                onClick={() => setFilterThisChat((prev) => !prev)}
                className={`rounded-xl border px-3 py-2 text-xs font-medium transition shrink-0 ${
                  filterThisChat
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                    : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {filterThisChat ? "This Chat" : "All Chats"}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--text-secondary)] gap-2 text-xs">
              <Loader2 size={16} className="animate-spin text-amber-500" />
              <span>Loading starred messages...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--text-secondary)]">
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-app)] text-amber-500/50">
                <Star size={24} />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">No starred messages</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Star important messages from the message menu to view them here.
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const rawMedia = msg.mediaUrl || (msg.messageType !== "text" ? msg.text : "");
              const fullMedia = getMediaUrl(rawMedia);

              return (
                <div
                  key={msg._id}
                  className="group relative flex flex-col gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)]/60 p-3.5 transition hover:border-[var(--accent-primary)]/40 hover:bg-[var(--bg-app)]"
                >
                  {/* Sender & timestamp */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--accent-primary)]">
                        {msg.sender?.name || "Participant"}
                      </span>
                      {msg.conversation?.isGroup && (
                        <span className="rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                          {msg.conversation.groupName || "Group"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(msg.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Body Content */}
                  {msg.messageType === "image" && rawMedia && (
                    <div className="overflow-hidden rounded-xl bg-black/5 max-h-40">
                      <img
                        src={fullMedia}
                        alt="Photo"
                        className="max-h-40 w-auto rounded-xl object-contain"
                      />
                    </div>
                  )}

                  {msg.messageType === "file" && (
                    <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-2 text-xs">
                      <FileText size={16} className="text-[var(--accent-primary)] shrink-0" />
                      <span className="truncate flex-1 text-[var(--text-primary)]">
                        {msg.fileName || "Document"}
                      </span>
                    </div>
                  )}

                  {msg.text && (
                    <p className="whitespace-pre-wrap break-words text-xs leading-5 text-[var(--text-primary)]">
                      {msg.text}
                    </p>
                  )}

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border-color)]">
                    <button
                      type="button"
                      disabled={actionLoadingId === msg._id}
                      onClick={() => handleUnstar(msg._id)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-card)] hover:text-amber-500"
                      title="Unstar"
                    >
                      <StarOff size={12} />
                      <span>Unstar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onScrollToMessage?.(msg._id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-primary)] hover:text-white"
                    >
                      <ExternalLink size={12} />
                      <span>Go to message</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default StarredMessagesModal;
