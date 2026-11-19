import { useState } from "react";
import { Pin, X, ChevronRight, ChevronLeft } from "lucide-react";

const PinnedMessagesBanner = ({
  pinnedMessages = [],
  messages = [],
  onScrollToMessage,
  onUnpin,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  // Ensure index is valid
  const safeIndex = currentIndex >= pinnedMessages.length ? 0 : currentIndex;
  const item = pinnedMessages[safeIndex];
  if (!item) return null;

  const rawId = (item?._id || item)?.toString();
  // Find full message from messages list if item is just an ID or missing sender/text
  const matchedMsg = messages.find((m) => m._id?.toString() === rawId);
  const currentMsg = matchedMsg || (typeof item === "object" ? item : null) || {};

  const getSnippet = (msg) => {
    if (msg.text) return msg.text;
    if (msg.messageType === "image") return "📷 Photo";
    if (msg.messageType === "video") return "🎥 Video";
    if (msg.messageType === "audio") return "🎤 Voice note";
    if (msg.messageType === "file") return `📎 ${msg.fileName || "File"}`;
    if (msg.messageType === "poll") return `📊 Poll: ${msg.poll?.question || "Poll"}`;
    return "Pinned message";
  };

  const senderName = currentMsg.sender?.name || "Pinned Message";

  return (
    <div className="relative z-20 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md px-4 py-2 transition-all shadow-xs animate-in fade-in slide-in-from-top-1 duration-150 select-none">
      {/* Clickable Area to Scroll */}
      <button
        type="button"
        onClick={() => onScrollToMessage?.(rawId)}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 transition-transform group-hover:scale-105">
          <Pin size={13} className="fill-amber-500" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">
              Pinned {pinnedMessages.length > 1 ? `(${safeIndex + 1}/${pinnedMessages.length})` : ""}: {senderName}
            </span>
          </div>
          <p className="text-xs text-[var(--text-primary)] truncate font-medium">
            {getSnippet(currentMsg)}
          </p>
        </div>
      </button>

      {/* Navigation & Unpin Controls */}
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {pinnedMessages.length > 1 && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) =>
                  prev === 0 ? pinnedMessages.length - 1 : prev - 1,
                );
              }}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              title="Previous pinned message"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex((prev) => (prev + 1) % pinnedMessages.length);
              }}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              title="Next pinned message"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnpin?.(rawId);
          }}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition cursor-pointer"
          title="Unpin message"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default PinnedMessagesBanner;
