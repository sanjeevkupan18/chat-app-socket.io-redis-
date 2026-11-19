import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCheck,
  Check,
  Clock,
  Users,
  Eye,
  Loader2,
  FileText,
  Image as ImageIcon,
  Mic,
  Video,
  BarChart2,
} from "lucide-react";
import api from "../../services/api";
import { getMediaUrl } from "../../config/endpoints";

const formatExactTime = (dateString) => {
  if (!dateString) return "Just now";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Recently";

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) return `Today at ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return `Yesterday at ${timeStr}`;

  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${timeStr}`;
};

const MessageInfoDrawer = ({ open, onClose, message }) => {
  const [loading, setLoading] = useState(true);
  const [infoData, setInfoData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !message?._id) {
      setInfoData(null);
      setError("");
      return;
    }

    const fetchInfo = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/messages/${message._id}/info`);
        setInfoData(res.data);
      } catch (err) {
        console.error("Failed to fetch message info:", err);
        setError(err.response?.data?.message || "Could not load message info");
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [open, message?._id]);

  if (!open || !message) return null;

  const renderMessagePreview = () => {
    if (message.messageType === "image") {
      return (
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-blue-500" />
          <span className="text-xs font-medium">Photo</span>
        </div>
      );
    }
    if (message.messageType === "video") {
      return (
        <div className="flex items-center gap-2">
          <Video size={16} className="text-purple-500" />
          <span className="text-xs font-medium">Video</span>
        </div>
      );
    }
    if (message.messageType === "audio") {
      return (
        <div className="flex items-center gap-2">
          <Mic size={16} className="text-emerald-500" />
          <span className="text-xs font-medium">Voice note</span>
        </div>
      );
    }
    if (message.messageType === "poll") {
      return (
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-amber-500" />
          <span className="text-xs font-medium">Poll: {message.poll?.question}</span>
        </div>
      );
    }
    if (message.messageType === "file") {
      return (
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-400" />
          <span className="text-xs font-medium truncate">{message.fileName || "File"}</span>
        </div>
      );
    }
    return (
      <p className="text-xs text-[var(--text-primary)] font-medium line-clamp-3">
        {message.text || "Message"}
      </p>
    );
  };

  const readByList = infoData?.readBy || [];
  const deliveredToList = infoData?.deliveredTo || [];

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-md max-h-[85vh] rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <Eye size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Message Info
              </h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Delivery and read receipts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message Snippet Card */}
        <div className="border-b border-[var(--border-color)] p-4 bg-[var(--bg-subtle)]/50">
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-xs">
            {renderMessagePreview()}
            <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)] border-t border-[var(--border-color)]/30 pt-1.5">
              <span>Sent: {formatExactTime(message.createdAt)}</span>
              <span className="flex items-center gap-1 font-semibold text-blue-500">
                <CheckCheck size={13} />
              </span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
              <Loader2 size={24} className="animate-spin text-[var(--accent-primary)] mb-2" />
              <p className="text-xs">Loading read receipts...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-red-500 font-medium">
              {error}
            </div>
          ) : (
            <>
              {/* Read By Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                    <CheckCheck size={14} className="text-blue-500" />
                    <span>Read by ({readByList.length})</span>
                  </div>
                </div>

                {readByList.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] italic py-2">
                    No one has read this message yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {readByList.map((item) => (
                      <div
                        key={item.user?._id || Math.random()}
                        className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5 shadow-2xs hover:bg-[var(--bg-subtle)] transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.user?.avatar ? (
                            <img
                              src={getMediaUrl(item.user.avatar)}
                              alt={item.user?.name}
                              className="h-8 w-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 font-bold text-xs shrink-0">
                              {item.user?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {item.user?.name || "Participant"}
                              </span>
                              {item.user?.statusEmoji && (
                                <span className="text-xs" title={item.user?.statusText}>
                                  {item.user?.statusEmoji}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                              {item.user?.email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] font-semibold text-blue-500 flex items-center justify-end gap-1">
                            <CheckCheck size={12} />
                            Read
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {formatExactTime(item.readAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivered To / Remaining Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
                    <CheckCheck size={14} className="text-gray-400" />
                    <span>Delivered / Unread ({deliveredToList.length})</span>
                  </div>
                </div>

                {deliveredToList.length === 0 ? (
                  <p className="text-xs text-emerald-500 font-medium py-1 flex items-center gap-1">
                    <CheckCheck size={13} />
                    All participants have read this message!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {deliveredToList.map((item) => (
                      <div
                        key={item.user?._id || Math.random()}
                        className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2.5 opacity-80"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.user?.avatar ? (
                            <img
                              src={getMediaUrl(item.user.avatar)}
                              alt={item.user?.name}
                              className="h-8 w-8 rounded-full object-cover shrink-0 grayscale-30"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-bold text-xs shrink-0">
                              {item.user?.name?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {item.user?.name || "Participant"}
                              </span>
                              {item.user?.statusEmoji && (
                                <span className="text-xs">{item.user?.statusEmoji}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                              {item.user?.email}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] font-medium text-[var(--text-muted)] flex items-center justify-end gap-1">
                            <Clock size={11} />
                            Delivered
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MessageInfoDrawer;
