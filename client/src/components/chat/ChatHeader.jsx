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
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import { useCall } from "../../context/CallContext";
import GroupInfoModal from "./GroupInfoModal";
import StarredMessagesModal from "./StarredMessagesModal";
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
  const { user } = useAuth();
  const { socket } = useSocket();
  const { startCall } = useCall();

  const [typingName, setTypingName] = useState(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isStarredOpen, setIsStarredOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const mobileMoreMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMoreMenuRef.current && !mobileMoreMenuRef.current.contains(e.target)) {
        setShowMobileMoreMenu(false);
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
              <h2 className="truncate text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition">
                {isGroup ? conversation.groupName : otherUser?.name}
              </h2>
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

          {/* Sound Toggle: visible on md+ screens */}
          <button
            type="button"
            onClick={toggleSound}
            className="hidden md:flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            title={soundOn ? "Mute sounds" : "Unmute sounds"}
          >
            {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} className="text-red-400" />}
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

          {/* Mobile / Tablet Overflow More Menu */}
          <div className="relative md:hidden" ref={mobileMoreMenuRef}>
            <button
              type="button"
              onClick={() => setShowMobileMoreMenu((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
              title="More options"
            >
              <MoreVertical size={17} />
            </button>

            {showMobileMoreMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-48 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMoreMenu(false);
                    onToggleInChatSearch();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <Search size={15} />
                  <span>Search in chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMobileMoreMenu(false);
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
                    setShowMobileMoreMenu(false);
                    onToggleSharedFiles?.();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <FolderArchive size={15} />
                  <span>Shared Files</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleSound();
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <div className="flex items-center gap-2.5">
                    {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} className="text-red-400" />}
                    <span>Chimes</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {soundOn ? "On" : "Muted"}
                  </span>
                </button>

                {isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMobileMoreMenu(false);
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
