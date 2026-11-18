import { useEffect, useState, useCallback } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { useSocket } from "../../context/SocketContext";
import { getMediaUrl } from "../../config/endpoints";

export const CallsPanel = ({ onSelectUser, onClose, initialFilter = "all" }) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const { socket } = useSocket();

  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(initialFilter); // 'all' | 'video' | 'missed'
  const [searchQuery, setSearchQuery] = useState("");

  // Sync with prop when switched via nav
  useEffect(() => {
    if (initialFilter) {
      setFilter(initialFilter);
    }
  }, [initialFilter]);

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/calls/history?limit=50");
      setCalls(res.data?.calls || []);
    } catch (err) {
      console.error("Failed to fetch call history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  // Real-time call history refresh when calls end
  useEffect(() => {
    if (!socket) return;
    const handleCallEnded = () => {
      fetchCalls();
    };
    socket.on("call:ended", handleCallEnded);
    socket.on("call:missed", handleCallEnded);
    socket.on("call:rejected", handleCallEnded);

    return () => {
      socket.off("call:ended", handleCallEnded);
      socket.off("call:missed", handleCallEnded);
      socket.off("call:rejected", handleCallEnded);
    };
  }, [socket, fetchCalls]);

  const formatCallTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) return `Today, ${timeStr}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    if (isYesterday) return `Yesterday, ${timeStr}`;

    return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins > 0 ? `${mins}m ` : ""}${secs}s`;
  };

  // Filter & Search
  const filteredCalls = calls.filter((call) => {
    const isCaller = call.caller?._id === user?._id;
    const otherUser = isCaller ? call.receiver : call.caller;
    const isMissed = call.status === "missed";
    const isVideo = call.callType === "video";

    if (filter === "missed" && (!isMissed || isCaller)) {
      return false;
    }

    if (filter === "video" && !isVideo) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = otherUser?.name?.toLowerCase().includes(q);
      const matchEmail = otherUser?.email?.toLowerCase().includes(q);
      return matchName || matchEmail;
    }

    return true;
  });

  return (
    <div className="flex h-full w-full flex-col bg-[var(--bg-card)] select-none">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              {filter === "video" ? <Video size={18} /> : <Phone size={18} />}
            </div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {filter === "video" ? "Video Calls" : "Calls"}
            </h2>
          </div>

          <button
            type="button"
            onClick={fetchCalls}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
            title="Refresh call log"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Filter Tabs: All | Video | Missed */}
        <div className="mt-3 flex items-center gap-1 rounded-xl bg-[var(--bg-subtle)] p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              filter === "all"
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("video")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              filter === "video"
                ? "bg-[var(--bg-card)] text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-[var(--text-muted)] hover:text-emerald-600"
            }`}
          >
            Video
          </button>
          <button
            type="button"
            onClick={() => setFilter("missed")}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
              filter === "missed"
                ? "bg-[var(--bg-card)] text-red-500 shadow-xs"
                : "text-[var(--text-muted)] hover:text-red-500"
            }`}
          >
            Missed
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-2.5">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search calls..."
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-hidden transition"
          />
        </div>
      </div>

      {/* Call List Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {loading && calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
            <Loader2 size={24} className="animate-spin mb-2" />
            <span className="text-xs">Loading calls...</span>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
              <Phone size={28} />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">
              {filter === "missed" ? "No missed calls" : "No recent calls"}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-[200px]">
              {filter === "missed"
                ? "You have no missed calls."
                : "Calls made or received will appear here."}
            </p>
          </div>
        ) : (
          filteredCalls.map((call) => {
            const isCaller = call.caller?._id === user?._id;
            const otherUser = isCaller ? call.receiver : call.caller;
            const isVideo = call.callType === "video";
            const isMissed = call.status === "missed";
            const isIncomingMissed = !isCaller && isMissed;
            const duration = formatDuration(call.duration);

            return (
              <div
                key={call._id}
                onClick={() => otherUser && onSelectUser?.(otherUser)}
                className="group relative flex items-center justify-between gap-3 rounded-2xl p-2.5 hover:bg-[var(--bg-subtle)] cursor-pointer transition border border-transparent hover:border-[var(--border-color)]"
              >
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-subtle)] overflow-hidden border border-[var(--border-color)]">
                      {otherUser?.avatar ? (
                        <img
                          src={getMediaUrl(otherUser.avatar)}
                          alt={otherUser.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)] text-sm font-bold text-white">
                          {otherUser?.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name, Arrow, Status, Time */}
                  <div className="min-w-0 flex-1">
                    <h3
                      className={`text-xs font-semibold truncate ${
                        isIncomingMissed ? "text-red-500 font-bold" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {otherUser?.name || "Unknown"}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--text-muted)]">
                      {/* Direction Arrow */}
                      {isCaller ? (
                        <ArrowUpRight size={13} className="text-gray-400 shrink-0" />
                      ) : isIncomingMissed ? (
                        <ArrowDownLeft size={13} className="text-red-500 shrink-0" />
                      ) : (
                        <ArrowDownLeft size={13} className="text-emerald-500 shrink-0" />
                      )}

                      {/* Type icon & Duration / Time */}
                      <span className="truncate">
                        {isIncomingMissed
                          ? "Missed"
                          : duration
                          ? `${duration}`
                          : call.status === "rejected"
                          ? "Declined"
                          : "Ended"}
                      </span>
                      <span>•</span>
                      <span className="shrink-0">{formatCallTime(call.startedAt || call.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action: Redial Button */}
                {otherUser && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startCall(otherUser, isVideo ? "video" : "audio");
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500 hover:text-white transition shadow-2xs hover:scale-105 active:scale-95"
                    title={`Call ${otherUser.name} with ${isVideo ? "video" : "voice"}`}
                  >
                    {isVideo ? <Video size={16} /> : <Phone size={16} />}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallsPanel;
