import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCheck,
  MoreVertical,
  PencilLine,
  Trash2,
  Reply,
  Copy,
  FileText,
  Download,
  Ban,
  ExternalLink,
  ImageOff,
  Smile,
  Star,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { getMediaUrl } from "../../config/endpoints";
import VoiceNoteBubble from "./VoiceNoteBubble";
import MediaPreviewModal from "./MediaPreviewModal";
import DeleteModal from "./DeleteModal";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const MessageBubble = ({
  message,
  onEdit,
  onDelete,
  onReply,
  onScrollToMessage,
  onReact,
  onStar,
  searchKeyword = "",
  isGroup = false,
}) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const menuRef = useRef(null);
  const reactionRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);
  const [imageError, setImageError] = useState(false);

  const isMine = message.sender?._id === user._id;

  const isStarred = Boolean(
    (message.starredBy || []).some((id) => (id._id || id) === user._id),
  );

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const renderSearchHighlight = (content, keyPrefix = "") => {
    if (!searchKeyword?.trim() || !content) return content;
    const parts = content.split(
      new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
    );
    return parts.map((part, i) =>
      part.toLowerCase() === searchKeyword.toLowerCase() ? (
        <mark
          key={`${keyPrefix}-${i}`}
          className="rounded bg-amber-400/50 text-white font-medium px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  const renderMessageContent = (text) => {
    if (!text) return null;

    // Pattern for @Mentions (e.g. @John or @John Doe)
    const mentionRegex = /(@[A-Za-z0-9_.-]+(?:\s[A-Za-z0-9_.-]+)?)/g;
    const parts = text.split(mentionRegex);

    return parts.map((part, idx) => {
      if (part.startsWith("@")) {
        const mentionClean = part.slice(1).trim().toLowerCase();
        const myName = (user?.name || "").toLowerCase();
        const isSelf =
          myName && (myName === mentionClean || myName.startsWith(mentionClean));

        return (
          <span
            key={`mention-${idx}`}
            className={`inline-block px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold ${
              isSelf
                ? "bg-amber-400/25 text-amber-300 ring-1 ring-amber-400/40"
                : "bg-sky-500/20 text-sky-300"
            }`}
          >
            {renderSearchHighlight(part, `m-${idx}`)}
          </span>
        );
      }
      return renderSearchHighlight(part, `p-${idx}`);
    });
  };

  const [isEditable] = useState(() => {
    if (!isMine || message.isDeleted) return false;
    const fifteenMinutes = 15 * 60 * 1000;
    return Date.now() - new Date(message.createdAt).getTime() <= fifteenMinutes;
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
      if (reactionRef.current && !reactionRef.current.contains(event.target)) {
        setShowReactionsBar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isDeleted = Boolean(message.isDeleted);
  const rawMedia = message.mediaUrl || (message.messageType !== "text" ? message.text : "");
  const fullMediaUrl = getMediaUrl(rawMedia);

  const handleCopy = () => {
    if (message.text) {
      navigator.clipboard.writeText(message.text);
      setShowMenu(false);
    }
  };

  // Group reactions by emoji
  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    if (!r.emoji) return acc;
    const existing = acc.find((item) => item.emoji === r.emoji);
    const userId = r.user?._id || r.user;
    const userName = r.user?.name || (userId === user._id ? "You" : "Participant");
    const isMe = userId === user._id;

    if (existing) {
      existing.count += 1;
      existing.users.push(userName);
      if (isMe) existing.reactedByMe = true;
    } else {
      acc.push({
        emoji: r.emoji,
        count: 1,
        users: [userName],
        reactedByMe: isMe,
      });
    }
    return acc;
  }, []);

  // System Messages (e.g. "Sanjeev added Ayush")
  if (message.messageType === "system") {
    return (
      <div id={`msg-${message._id}`} className="my-2.5 flex justify-center">
        <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-1 text-center text-xs text-[var(--text-muted)] shadow-xs">
          {message.text}
        </span>
      </div>
    );
  }

  // Interactive WhatsApp-style Call Log Bubble
  if (message.messageType === "call") {
    const isVideo =
      message.callInfo?.callType === "video" ||
      message.text?.toLowerCase().includes("video");
    const status =
      message.callInfo?.status ||
      (message.text?.toLowerCase().includes("missed")
        ? "missed"
        : message.text?.toLowerCase().includes("declined")
        ? "rejected"
        : "completed");
    const isMissed = status === "missed";
    const duration = message.callInfo?.duration || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationStr =
      duration > 0 ? `${mins > 0 ? `${mins}m ` : ""}${secs}s` : "";

    const otherUser = isMine ? message.receiver : message.sender;

    return (
      <div
        id={`msg-${message._id}`}
        className={`flex ${isMine ? "justify-end" : "justify-start"} my-2.5 px-2`}
      >
        <div
          className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 shadow-sm transition max-w-sm ${
            isMissed && !isMine
              ? "border-red-500/30 bg-red-500/10 dark:bg-red-950/20"
              : isMine
              ? "border-[var(--accent-primary)]/20 bg-[var(--accent-light)]/40 dark:bg-[var(--bg-card)]"
              : "border-[var(--border-color)] bg-[var(--bg-card)]"
          }`}
        >
          {/* Call Type Icon Badge */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-2xs ${
              isMissed && !isMine
                ? "bg-red-500/20 text-red-500"
                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {isVideo ? <Video size={18} /> : <Phone size={18} />}
          </div>

          {/* Call Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-bold truncate ${
                  isMissed && !isMine
                    ? "text-red-500"
                    : "text-[var(--text-primary)]"
                }`}
              >
                {!isMine && isMissed
                  ? `Missed ${isVideo ? "video" : "voice"} call`
                  : isMine && isMissed
                  ? `Unanswered ${isVideo ? "video" : "voice"} call`
                  : status === "rejected"
                  ? `Declined ${isVideo ? "video" : "voice"} call`
                  : `${isVideo ? "Video" : "Voice"} call`}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--text-muted)]">
              <div className="flex items-center gap-1">
                {isMine ? (
                  <PhoneOutgoing size={11} className="text-gray-400" />
                ) : isMissed ? (
                  <PhoneMissed size={11} className="text-red-500" />
                ) : (
                  <PhoneIncoming size={11} className="text-emerald-500" />
                )}
                <span>{durationStr || (isMissed ? "Missed" : "Ended")}</span>
              </div>
              <span>•</span>
              <span>{time}</span>
            </div>
          </div>

          {/* Quick Call-Back Button */}
          {otherUser && (
            <button
              type="button"
              onClick={() => startCall(otherUser, isVideo ? "video" : "audio")}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white transition shadow-2xs"
              title={`Call back with ${isVideo ? "video" : "voice"}`}
            >
              {isVideo ? <Video size={14} /> : <Phone size={14} />}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        id={`msg-${message._id}`}
        className={`flex ${isMine ? "justify-end" : "justify-start"} items-start gap-2.5 my-2 transition-colors duration-200`}
      >
        {/* Incoming Sender Avatar (matches reference image) */}
        {!isMine && (
          <div className="shrink-0 mt-5">
            {message.sender?.avatar ? (
              <img
                src={getMediaUrl(message.sender.avatar)}
                alt={message.sender?.name}
                className="h-7 w-7 rounded-full object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] text-[10px] font-bold shadow-xs">
                {message.sender?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
        )}

        <div
          className={`group relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${
            isMine ? "items-end" : "items-start"
          } flex flex-col`}
        >
          {/* Sender & Timestamp Above Bubble (matches reference image) */}
          <div
            className={`text-[11px] font-medium text-[var(--text-muted)] mb-1 px-1.5 ${
              isMine ? "text-right" : "text-left"
            }`}
          >
            {isMine ? (
              <span>You, {time}</span>
            ) : (
              <span>
                {message.sender?.name || "Participant"}, {time}
              </span>
            )}
          </div>

          {/* Bubble Box */}
          <div
            className={`relative px-4 py-3 shadow-xs transition ${
              isMine
                ? "rounded-[20px] rounded-tr-sm bg-[var(--bubble-out-bg)] border border-[var(--bubble-out-border)] text-[var(--bubble-out-text)]"
                : "rounded-[20px] rounded-tl-sm bg-[var(--bubble-in-bg)] border border-[var(--bubble-in-border)] text-[var(--bubble-in-text)]"
            }`}
          >
            {/* Quick Reactions Floating Bar */}
            {showReactionsBar && (
              <div
                ref={reactionRef}
                className={`absolute -top-11 z-40 flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
                  isMine ? "right-0" : "left-0"
                }`}
              >
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact?.(message._id, emoji);
                      setShowReactionsBar(false);
                    }}
                    className="rounded-full p-1 text-base transition hover:scale-125 hover:bg-[var(--bg-subtle)]"
                    title={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Quoted / Replied preview box */}
            {message.replyTo && (
              <button
                type="button"
                onClick={() => onScrollToMessage?.(message.replyTo._id)}
                className={`mb-2 w-full text-left rounded-xl p-2 text-xs border-l-4 transition ${
                  isMine
                    ? "bg-black/10 border-[var(--accent-primary)] text-inherit hover:bg-black/15"
                    : "bg-[var(--bg-subtle)] border-[var(--accent-primary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]/20"
                }`}
              >
                <div className="font-semibold text-[11px] opacity-90">
                  {message.replyTo.sender?._id === user._id
                    ? "You"
                    : message.replyTo.sender?.name || "Participant"}
                </div>
                <div className="line-clamp-1 opacity-80 mt-0.5">
                  {message.replyTo.isDeleted
                    ? "Deleted message"
                    : message.replyTo.text ||
                      (message.replyTo.messageType === "image" ? "📷 Photo" :
                       message.replyTo.messageType === "audio" ? "🎤 Voice note" :
                       message.replyTo.messageType === "video" ? "🎥 Video" : "📎 Attachment")}
                </div>
              </button>
            )}

            {/* Message Body */}
            {!isDeleted ? (
              <div className="space-y-1.5">
                {/* IMAGE */}
                {message.messageType === "image" && rawMedia && (
                  <div className="overflow-hidden rounded-xl bg-black/10 min-h-[120px] flex items-center justify-center">
                    {imageError ? (
                      <div className="flex flex-col items-center justify-center p-4 text-xs text-slate-400 gap-1.5">
                        <ImageOff size={24} />
                        <span>Could not display image</span>
                        <a
                          href={fullMediaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          Open image
                        </a>
                      </div>
                    ) : (
                      <img
                        src={fullMediaUrl}
                        alt={message.fileName || "Photo"}
                        onError={() => setImageError(true)}
                        onClick={() => setPreviewMediaUrl(fullMediaUrl)}
                        className="max-h-80 w-auto max-w-full cursor-pointer rounded-xl object-contain transition hover:opacity-95"
                        loading="lazy"
                      />
                    )}
                  </div>
                )}

                {/* VIDEO */}
                {message.messageType === "video" && rawMedia && (
                  <div className="overflow-hidden rounded-xl bg-black min-w-[220px]">
                    <video
                      controls
                      preload="metadata"
                      src={fullMediaUrl}
                      className="max-h-80 w-full rounded-xl"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* VOICE NOTE */}
                {message.messageType === "audio" && rawMedia && (
                  <VoiceNoteBubble
                    mediaUrl={rawMedia}
                    audioDuration={message.audioDuration}
                    isMine={isMine}
                  />
                )}

                {/* DOCUMENT / FILE */}
                {message.messageType === "file" && rawMedia && (
                  <div
                    className={`flex items-center gap-3 rounded-xl p-3 min-w-[220px] max-w-xs ${
                      isMine ? "bg-black/10" : "bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <div className="rounded-xl bg-[var(--accent-light)] p-2 text-[var(--accent-text)] shrink-0">
                      <FileText size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold" title={message.fileName}>
                        {message.fileName || "Document"}
                      </p>
                      <p className="text-[10px] opacity-75 mt-0.5">
                        {formatBytes(message.fileSize)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={fullMediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1.5 opacity-70 hover:opacity-100 transition"
                        title="Open file"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <a
                        href={fullMediaUrl}
                        download={message.fileName || "download"}
                        className="rounded-lg p-1.5 opacity-70 hover:opacity-100 transition"
                        title="Download"
                      >
                        <Download size={15} />
                      </a>
                    </div>
                  </div>
                )}

                {/* TEXT / CAPTION */}
                {message.text && message.messageType !== "image" && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {renderMessageContent(message.text)}
                  </p>
                )}
                {message.text && message.messageType === "image" && message.text !== rawMedia && (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed pt-1">
                    {renderMessageContent(message.text)}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 py-0.5 italic text-sm opacity-70">
                <Ban size={14} className="opacity-70" />
                <span>This message was deleted</span>
              </div>
            )}

            {/* Floating Options & Reaction Trigger (Elevated above bubble) */}
            {!isDeleted && (
              <div
                className={`absolute -top-3.5 right-2 z-20 flex items-center gap-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)]/90 px-1 py-0.5 shadow-sm backdrop-blur-sm transition-opacity duration-150 ${
                  showMenu || showReactionsBar
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                ref={menuRef}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowReactionsBar((prev) => !prev);
                    setShowMenu(false);
                  }}
                  className="rounded-full p-1 text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  aria-label="React to message"
                  title="React"
                >
                  <Smile size={13} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu((prev) => !prev);
                    setShowReactionsBar(false);
                  }}
                  className="rounded-full p-1 text-[var(--text-muted)] transition hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  aria-label="Message options"
                >
                  <MoreVertical size={13} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-7 z-30 w-36 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                    <button
                      type="button"
                      onClick={() => {
                        onStar?.(message);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      <Star
                        size={12}
                        className={isStarred ? "text-amber-400 fill-amber-400" : ""}
                      />
                      <span>{isStarred ? "Unstar" : "Star"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onReply?.(message);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      <Reply size={12} />
                      Reply
                    </button>

                    {message.text && (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                      >
                        <Copy size={12} />
                        Copy text
                      </button>
                    )}

                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => {
                          onEdit?.(message);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                      >
                        <PencilLine size={12} />
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteModal(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-left text-[11px] font-medium text-red-500 transition hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reaction Badges (Floats neatly below bubble) */}
          {groupedReactions.length > 0 && !isDeleted && (
            <div
              className={`flex flex-wrap gap-1 mt-1 ${
                isMine ? "justify-end" : "justify-start"
              }`}
            >
              {groupedReactions.map(({ emoji, count, reactedByMe, users }) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onReact?.(message._id, emoji)}
                  title={users.join(", ")}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition border shadow-xs ${
                    reactedByMe
                      ? "border-[var(--accent-primary)] bg-[var(--accent-light)] text-[var(--accent-text)] font-semibold"
                      : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && (
                    <span className="text-[10px] font-semibold opacity-90">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Status Indicator & Receipts Footer */}
          <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-[var(--text-muted)]">
            {isStarred && (
              <Star
                size={11}
                className="text-amber-500 fill-amber-500 shrink-0"
                title="Starred message"
              />
            )}

            {message.editedAt && !isDeleted && (
              <span className="text-[9px] text-[var(--text-muted)]">(edited)</span>
            )}

            {isMine && !isDeleted && (
              <span title={message.status === "read" || message.isRead ? "Read" : message.status === "delivered" ? "Delivered" : "Sent"}>
                {message.status === "read" || message.isRead ? (
                  <CheckCheck size={14} className="text-emerald-500" />
                ) : message.status === "delivered" ? (
                  <CheckCheck size={14} className="text-[var(--text-muted)]" />
                ) : (
                  <Check size={14} className="text-[var(--text-muted)]" />
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Media Fullscreen Preview Lightbox */}
      {previewMediaUrl && (
        <MediaPreviewModal
          url={previewMediaUrl}
          fileName={message.fileName}
          onClose={() => setPreviewMediaUrl(null)}
        />
      )}

      {/* Delete Action Sheet Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        isMine={isMine}
        isDeleted={isDeleted}
        onClose={() => setShowDeleteModal(false)}
        onDelete={(deleteType) => onDelete?.(message, deleteType)}
      />
    </>
  );
};

export default MessageBubble;
