import { useEffect, useState, useRef } from "react";
import {
  Info,
  Phone,
  Search,
  Star,
  Users,
  Video,
  Volume2,
  VolumeX,
  FolderArchive,
  ChevronLeft,
  MoreVertical,
  Timer,
  Bell,
  BellOff,
  Ban,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useCall } from "../../context/CallContext";
import GroupInfoModal from "./GroupInfoModal";
import StarredMessagesModal from "./StarredMessagesModal";
import DisappearingMessagesModal from "./DisappearingMessagesModal";
import api from "../../services/api";
import { isSoundEnabled, setSoundEnabled } from "../../utils/soundAndNotification";
import { getMediaUrl } from "../../config/endpoints";

const formatLastSeen = (dateString, hideLastSeen = false) => {
  if (hideLastSeen || !dateString) return "Offline";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Offline";

  const now = new Date();
  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return `Last seen today at ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return `Last seen yesterday at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString([], { day: "numeric", month: "short" });
  return `Last seen ${dateStr} at ${timeStr}`;
};

const ChatHeader = ({
  conversation,
  onGroupUpdated,
  onLeaveGroup,
  onToggleInChatSearch,
  onToggleSharedFiles,
  showSharedFiles = false,
  onScrollToMessage,
  onBack,
}) => {
  const { user, updateProfile } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();

  const [typingName, setTypingName] = useState(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [isDisappearingOpen, setIsDisappearingOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [prevConvId, setPrevConvId] = useState(conversation?._id);
  if (conversation?._id !== prevConvId) {
    setPrevConvId(conversation?._id);
    setTypingName(null);
  }

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
        setTypingName(resolvedName ? resolvedName.split(" ")[0] : "Someone");
      } else {
        setTypingName(null);
      }
    };

    socket.on("userTyping", handleUserTyping);
    return () => {
      socket.off("userTyping", handleUserTyping);
    };
  }, [socket, conversation?._id, conversation?.participants, user._id]);

  if (!conversation) return null;

  const isGroup = Boolean(conversation.isGroup);
  const otherUser = !isGroup
    ? conversation.participants?.find((participant) => participant._id !== user._id)
    : null;

  if (!isGroup && !otherUser) {
    return null;
  }

  const isMuted = Boolean(
    user?.mutedConversations?.some(
      (m) =>
        (m.conversationId?._id || m.conversationId)?.toString() ===
          conversation._id?.toString() &&
        (!m.mutedUntil || new Date(m.mutedUntil) > new Date()),
    ),
  );

  const isBlocked = Boolean(
    !isGroup &&
      otherUser &&
      (user?.blockedUsers || []).includes(otherUser._id?.toString()),
  );

  const handleToggleMute = async () => {
    try {
      const res = await api.put(`/users/conversations/${conversation._id}/mute`);
      updateProfile({ mutedConversations: res.data.mutedConversations });
    } catch (err) {
      console.error("Toggle mute error:", err);
    }
  };

  const handleToggleBlock = async () => {
    if (!otherUser?._id) return;
    try {
      if (isBlocked) {
        const res = await api.delete(`/users/${otherUser._id}/block`);
        updateProfile({ blockedUsers: res.data.blockedUsers });
      } else {
        const res = await api.post(`/users/${otherUser._id}/block`);
        updateProfile({ blockedUsers: res.data.blockedUsers });
      }
    } catch (err) {
      console.error("Toggle block error:", err);
    }
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const getGroupSubtitle = () => {
    if (typingName) {
      return `${typingName} is typing...`;
    }
    return `${conversation.participants?.length || 0} participants`;
  };

  const getUserSubtitle = () => {
    if (typingName) return "typing...";
    if (otherUser?.isOnline) return "online";
    return formatLastSeen(otherUser?.lastSeen, otherUser?.hideLastSeen);
  };

  return (
    <>
      <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] px-3 sm:px-6 transition-colors duration-200 select-none">
        {/* Left: Mobile back button + Conversation Title & Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Mobile Back Button (WhatsApp style) */}
          <button
            type="button"
            onClick={onBack}
            className="md:hidden flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition shrink-0"
            title="Back to conversations"
          >
            <ChevronLeft size={22} />
          </button>

          <div
            onClick={() => {
              if (isGroup) {
                setIsGroupInfoOpen(true);
              } else {
                onToggleSharedFiles?.();
              }
            }}
            className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group"
            title={isGroup ? "View group details" : "View contact details"}
          >
            {/* Small Header Avatar */}
            <div className="relative shrink-0">
              {isGroup ? (
                conversation.groupIcon ? (
                  <img
                    src={getMediaUrl(conversation.groupIcon)}
                    alt={conversation.groupName}
                    className="h-9 w-9 rounded-2xl object-cover shadow-xs"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white shadow-xs text-xs">
                    {conversation.groupName?.charAt(0).toUpperCase() || <Users size={16} />}
                  </div>
                )
              ) : otherUser?.avatar ? (
                <img
                  src={getMediaUrl(otherUser.avatar)}
                  alt={otherUser.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] font-semibold text-white text-xs">
                  {otherUser?.name?.charAt(0).toUpperCase()}
                </div>
              )}

              {!isGroup && otherUser?.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <h2 className="truncate text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition">
                  {isGroup ? conversation.groupName : otherUser?.name}
                </h2>
                {!isGroup && otherUser?.statusEmoji && (
                  <span
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--bg-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] shrink-0 font-normal shadow-2xs"
                    title={otherUser.statusText || otherUser.statusEmoji}
                  >
                    <span>{otherUser.statusEmoji}</span>
                    {otherUser.statusText && (
                      <span className="max-w-[120px] truncate hidden sm:inline text-[9px] font-medium text-[var(--text-muted)]">
                        {otherUser.statusText}
                      </span>
                    )}
                  </span>
                )}

                {/* Disappearing Messages Indicator Badge */}
                {conversation.disappearingMessages?.enabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDisappearingOpen(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:scale-105 transition shrink-0"
                    title="Disappearing messages enabled - click to change"
                  >
                    <Timer size={10} />
                    <span>
                      {conversation.disappearingMessages.duration >= 7776000
                        ? "90d"
                        : conversation.disappearingMessages.duration >= 604800
                        ? "7d"
                        : "24h"}
                    </span>
                  </button>
                )}

                {/* Mute Indicator Badge */}
                {isMuted && (
                  <span
                    className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-red-500/15 text-red-500 shrink-0"
                    title="Notifications muted for this chat"
                  >
                    <BellOff size={10} />
                  </span>
                )}
              </div>
              <p
                className={`truncate text-[10px] sm:text-[11px] ${
                  typingName || (!isGroup && otherUser?.isOnline)
                    ? "font-semibold text-emerald-500"
                    : "text-[var(--text-muted)]"
                }`}
              >
                {isGroup ? getGroupSubtitle() : getUserSubtitle()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Tab Pills (Messages / Files) & Actions (Matching Reference) */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Messages & Shared Files Pill Tabs (hidden on smaller screens) */}
          <div className="hidden lg:flex items-center rounded-full bg-[var(--bg-subtle)] p-1 border border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => {
                if (showSharedFiles) onToggleSharedFiles?.();
              }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                !showSharedFiles
                  ? "bg-[var(--accent-light)] text-[var(--accent-text)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Messages
            </button>

            <button
              type="button"
              onClick={onToggleSharedFiles}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                showSharedFiles
                  ? "bg-[var(--accent-light)] text-[var(--accent-text)] shadow-xs"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              Shared files
            </button>
          </div>

          {/* Action Icons: Always Visible Calls */}
          <button
            type="button"
            onClick={() => {
              if (isGroup) {
                alert("1-on-1 voice calling is supported. Group calling is coming soon.");
                return;
              }
              if (otherUser) {
                startCall(otherUser, "audio");
              }
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-emerald-500"
            title={isGroup ? "Voice call" : `Voice call with ${otherUser?.name || "user"}`}
          >
            <Phone size={17} />
          </button>

          <button
            type="button"
            onClick={() => {
              if (isGroup) {
                alert("1-on-1 video calling is supported. Group calling is coming soon.");
                return;
              }
              if (otherUser) {
                startCall(otherUser, "video");
              }
            }}
            className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-emerald-500"
            title={isGroup ? "Video call" : `Video call with ${otherUser?.name || "user"}`}
          >
            <Video size={17} />
          </button>

          {/* Quick Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition ${
              isMuted
                ? "text-red-500 bg-red-500/10 hover:bg-red-500/20"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
            title={isMuted ? "Unmute chat notifications" : "Mute chat notifications"}
          >
            {isMuted ? <BellOff size={17} /> : <Bell size={17} />}
          </button>

          {/* Search: visible on sm+ screens */}
          <button
            type="button"
            onClick={onToggleInChatSearch}
            className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            title="Search in messages"
          >
            <Search size={17} />
          </button>

          {/* Starred Messages: visible on md+ screens */}
          <button
            type="button"
            onClick={() => setIsStarredOpen(true)}
            className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-amber-500"
            title="Starred messages"
          >
            <Star size={17} />
          </button>

          {/* Shared Files Toggle: visible on sm+ screens */}
          <button
            type="button"
            onClick={onToggleSharedFiles}
            className={`hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl transition ${
              showSharedFiles
                ? "bg-[var(--accent-light)] text-[var(--accent-text)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
            title="Toggle shared files"
          >
            <FolderArchive size={17} />
          </button>

          {/* Group Settings: visible on md+ screens */}
          {isGroup && (
            <button
              type="button"
              onClick={() => setIsGroupInfoOpen(true)}
              className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
              title="Group settings"
            >
              <Info size={17} />
            </button>
          )}

          {/* Overflow More Menu (Both Desktop & Mobile) */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMoreMenu((prev) => !prev)}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
              title="More options"
            >
              <MoreVertical size={17} />
            </button>

            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                {/* Disappearing Messages Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setIsDisappearingOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Timer size={15} className="text-purple-500" />
                    <span>Disappearing Messages</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {conversation.disappearingMessages?.enabled
                      ? conversation.disappearingMessages.duration >= 7776000
                        ? "90d"
                        : conversation.disappearingMessages.duration >= 604800
                        ? "7d"
                        : "24h"
                      : "Off"}
                  </span>
                </button>

                {/* Mute Notifications */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleMute();
                    setShowMoreMenu(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <div className="flex items-center gap-2.5">
                    {isMuted ? (
                      <BellOff size={15} className="text-red-500" />
                    ) : (
                      <Bell size={15} className="text-slate-400" />
                    )}
                    <span>{isMuted ? "Unmute Chat" : "Mute Notifications"}</span>
                  </div>
                </button>

                {/* Block / Unblock User (1-on-1 only) */}
                {!isGroup && otherUser && (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleBlock();
                      setShowMoreMenu(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                      isBlocked
                        ? "text-emerald-500 hover:bg-emerald-500/10"
                        : "text-red-500 hover:bg-red-500/10"
                    }`}
                  >
                    <Ban size={15} />
                    <span>{isBlocked ? "Unblock Contact" : "Block Contact"}</span>
                  </button>
                )}

                <div className="my-1 border-t border-[var(--border-color)]/30" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleInChatSearch();
                  }}
                  className="sm:hidden flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <Search size={15} />
                  <span>Search in chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setIsStarredOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <Star size={15} className="text-amber-400" />
                  <span>Starred Messages</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleSharedFiles?.();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <FolderArchive size={15} />
                  <span>Shared Files</span>
                </button>

                {isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setIsGroupInfoOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                  >
                    <Info size={15} />
                    <span>Group Details</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Disappearing Messages Modal */}
      <DisappearingMessagesModal
        open={isDisappearingOpen}
        onClose={() => setIsDisappearingOpen(false)}
        conversation={conversation}
        onDisappearingUpdated={onGroupUpdated}
      />

      {/* Group Info Modal */}
      {isGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          conversation={conversation}
          onGroupUpdated={onGroupUpdated}
          onLeaveGroup={onLeaveGroup}
        />
      )}

      {/* Starred Messages Modal */}
      <StarredMessagesModal
        isOpen={isStarredOpen}
        onClose={() => setIsStarredOpen(false)}
        conversationId={conversation._id}
        onScrollToMessage={onScrollToMessage}
      />
    </>
  );
};

export default ChatHeader;
