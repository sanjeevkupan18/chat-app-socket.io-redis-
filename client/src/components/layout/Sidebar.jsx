import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  Settings,
  Plus,
  MoreVertical,
  Pin,
  Star,
  Users,
  Check,
  Shield,
  Filter,
  LogOut,
  Sun,
  Moon,
  Palette,
  BellOff,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import ProfileModal from "./ProfileModal";
import UserSearch from "../search/UserSearch";
import CreateGroupModal from "../chat/CreateGroupModal";
import StarredMessagesModal from "../chat/StarredMessagesModal";
import ConfirmDialog from "../common/ConfirmDialog";
import BrandLogo from "../common/BrandLogo";
import { getMediaUrl } from "../../config/endpoints";

const Sidebar = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onSelectUser,
  onGroupCreated,
  onTogglePinConversation,
  onScrollToMessage,
  onCloseMobileSidebar,
  activeNav = "chat",
  setActiveNav,
  onOpenCommandPalette,
}) => {
  const { user, updateProfile, logout } = useAuth();
  const { isDark, toggleTheme, palette, setPalette, palettes } = useTheme();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGlobalStarredOpen, setIsGlobalStarredOpen] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const statusMenuRef = useRef(null);
  const optionsMenuRef = useRef(null);
  const paletteMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target)) {
        setShowStatusMenu(false);
      }
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(e.target)) {
        setShowPaletteMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getOtherUser = (conversation) => {
    return conversation.participants.find(
      (participant) => participant._id !== user._id,
    );
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleHideLastSeen = async () => {
    try {
      await updateProfile({
        name: user.name,
        hideLastSeen: !user.hideLastSeen,
      });
      setShowStatusMenu(false);
    } catch (err) {
      console.error("Status update error:", err);
    }
  };

  const renderMessagePreview = (conversation) => {
    const msg = conversation.lastMessage;
    if (!msg) {
      return conversation.isGroup ? "Group created" : "Start a conversation";
    }
    if (msg.isDeleted) return "Deleted message";
    if (msg.messageType === "system") return msg.text;

    if (msg.messageType === "call") {
      const isVideo =
        msg.callInfo?.callType === "video" ||
        msg.text?.toLowerCase().includes("video");
      const isMissed =
        msg.callInfo?.status === "missed" ||
        msg.text?.toLowerCase().includes("missed");
      const isMine = msg.sender?._id === user?._id;
      if (!isMine && isMissed) {
        return isVideo ? "📹 Missed video call" : "📞 Missed voice call";
      }
      return isVideo
        ? `📹 ${msg.text || "Video call"}`
        : `📞 ${msg.text || "Voice call"}`;
    }

    const isGroup = Boolean(conversation.isGroup);
    const senderPrefix =
      isGroup && msg.sender
        ? `${msg.sender._id === user._id ? "You" : msg.sender.name?.split(" ")[0] || "Member"}: `
        : "";

    const body =
      msg.messageType === "image"
        ? "📷 Photo"
        : msg.messageType === "video"
        ? "🎥 Video"
        : msg.messageType === "audio"
        ? "🎤 Voice note"
        : msg.messageType === "file"
        ? `📎 ${msg.fileName || "Document"}`
        : msg.text || "Attachment";

    return `${senderPrefix}${body}`;
  };

  const filteredConversations = filterUnreadOnly
    ? conversations.filter((c) => c.unreadCount > 0)
    : conversations;

  return (
    <aside className="flex h-full w-full flex-col border-r border-[var(--border-color)] bg-[var(--bg-card)] transition-colors duration-200 select-none">
      {/* 1. Top Bar: Mobile Brand / Desktop < Chat + Theme, Palette, Settings & Logout */}
      <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2 shrink-0">
        {/* Mobile Header: Brand Logo & Title + Chats/Calls Tab */}
        <div className="flex md:hidden items-center gap-2">
          <BrandLogo size="sm" />
          <div className="flex items-center rounded-xl bg-[var(--bg-subtle)] p-0.5 ml-1">
            <button
              type="button"
              onClick={() => setActiveNav?.("chat")}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition ${
                activeNav === "chat"
                  ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs"
                  : "text-[var(--text-muted)]"
              }`}
            >
              Chats
            </button>
            <button
              type="button"
              onClick={() => setActiveNav?.("calls")}
              className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition ${
                activeNav === "calls"
                  ? "bg-[var(--bg-card)] text-emerald-600 shadow-xs"
                  : "text-[var(--text-muted)]"
              }`}
            >
              Calls
            </button>
          </div>
        </div>

        {/* Desktop Header: < Chat */}
        <div className="hidden md:flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            <ChevronLeft size={16} />
          </div>
          <span>Chat</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Mobile-Only Color Palette Picker */}
          <div className="relative md:hidden" ref={paletteMenuRef}>
            <button
              type="button"
              onClick={() => setShowPaletteMenu((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
              title="Choose Palette"
            >
              <Palette size={17} />
            </button>

            {showPaletteMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-44 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Message Color
                </p>
                <div className="mt-0.5 space-y-0.5">
                  {palettes.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPalette(p.id);
                        setShowPaletteMenu(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium transition cursor-pointer ${
                        palette === p.id
                          ? "bg-[var(--accent-light)] font-bold text-[var(--accent-text)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${p.dot} shadow-xs`} />
                        <span>{p.name}</span>
                      </div>
                      {palette === p.id && <Check size={13} className="text-[var(--accent-primary)]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mobile-Only Theme Light / Dark Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex md:hidden h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>

          {/* Profile & Settings (All Screens) */}
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
            title="Profile & Settings"
          >
            <Settings size={17} />
          </button>

          {/* Log Out (All Screens) */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-500 transition"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* 2. User Identity Card (Matching Reference Layout) */}
      <div className="flex flex-col items-center text-center px-4 py-3 shrink-0">
        <div
          onClick={() => setIsProfileOpen(true)}
          className="relative cursor-pointer group"
          title="Click to edit profile"
        >
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--bg-subtle)] bg-[var(--bg-subtle)] shadow-md group-hover:scale-105 transition-transform">
            {user?.avatar ? (
              <img
                src={getMediaUrl(user.avatar)}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <span className="absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500 shadow-xs" />
        </div>

        <h2 className="mt-2.5 text-sm font-bold text-[var(--text-primary)]">
          {user?.name}
        </h2>

        {/* Status Pill with Dropdown */}
        <div className="relative mt-1" ref={statusMenuRef}>
          <button
            type="button"
            onClick={() => setShowStatusMenu((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-light)] px-3 py-0.5 text-[11px] font-semibold text-[var(--accent-text)] shadow-2xs hover:opacity-90 transition"
          >
            <span>{user?.hideLastSeen ? "offline" : "available"}</span>
            <span className="text-[9px]">▾</span>
          </button>

          {showStatusMenu && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full z-40 mt-1.5 w-44 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={handleToggleHideLastSeen}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Available</span>
                </div>
                {!user?.hideLastSeen && <Check size={13} className="text-emerald-500" />}
              </button>

              <button
                type="button"
                onClick={handleToggleHideLastSeen}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span>Invisible / Offline</span>
                </div>
                {user?.hideLastSeen && <Check size={13} className="text-emerald-500" />}
              </button>

              <div className="my-1 border-t border-[var(--border-subtle)]" />

              <button
                type="button"
                onClick={() => {
                  setShowStatusMenu(false);
                  setIsProfileOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition"
              >
                <Shield size={13} />
                <span>Privacy Settings</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="shrink-0">
        <UserSearch
          onSelectUser={onSelectUser}
          onOpenCommandPalette={onOpenCommandPalette}
        />
      </div>

      {/* 4. Section Header: "Last chats" + (+) + (⋮) */}
      <div className="flex items-center justify-between px-5 pt-3 pb-2 shrink-0">
        <span className="text-xs font-bold text-[var(--text-primary)]">
          Last chats
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCreateGroupOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] hover:scale-105 transition shadow-2xs"
            title="Create Group Chat"
          >
            <Plus size={14} />
          </button>

          <div className="relative" ref={optionsMenuRef}>
            <button
              type="button"
              onClick={() => setShowOptionsMenu((prev) => !prev)}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
              title="More options"
            >
              <MoreVertical size={14} />
            </button>

            {showOptionsMenu && (
              <div className="absolute right-0 top-full z-40 mt-1.5 w-40 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setFilterUnreadOnly((prev) => !prev);
                    setShowOptionsMenu(false);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <div className="flex items-center gap-2">
                    <Filter size={13} />
                    <span>Filter Unread</span>
                  </div>
                  {filterUnreadOnly && <Check size={13} className="text-emerald-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setIsGlobalStarredOpen(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition"
                >
                  <Star size={13} className="text-amber-400" />
                  <span>Starred Messages</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Scrollable Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-4">
        {filteredConversations.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-xs font-medium text-[var(--text-muted)]">
              {filterUnreadOnly ? "No unread chats" : "No conversations yet"}
            </p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              {filterUnreadOnly
                ? "All messages are caught up!"
                : "Search a person or click + to start"}
            </p>
          </div>
        )}

        {filteredConversations.map((conversation) => {
          const isGroup = Boolean(conversation.isGroup);
          const otherUser = !isGroup ? getOtherUser(conversation) : null;
          const isSelected = selectedConversation?._id === conversation._id;
          const conversationTitle = isGroup ? conversation.groupName : otherUser?.name;
          const isPinned = Boolean(conversation.isPinned);
          const isMuted = Boolean(
            user?.mutedConversations?.some(
              (m) =>
                (m.conversationId?._id || m.conversationId)?.toString() ===
                  conversation._id?.toString() &&
                (!m.mutedUntil || new Date(m.mutedUntil) > new Date()),
            ),
          );

          return (
            <div
              key={conversation._id}
              className={`group relative flex w-full items-center rounded-2xl transition duration-150 ${
                isSelected
                  ? "bg-[var(--accent-light)] dark:bg-[var(--accent-primary)]/20 border border-[var(--border-color)] dark:border-[var(--accent-primary)]/30 shadow-xs"
                  : "hover:bg-[var(--bg-subtle)]"
              }`}
            >
              {/* Active selection vertical bar (matching reference) */}
              {isSelected && (
                <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[var(--accent-primary)]" />
              )}

              <button
                type="button"
                onClick={() => onSelectConversation(conversation)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left min-w-0"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {isGroup ? (
                    conversation.groupIcon ? (
                      <img
                        src={getMediaUrl(conversation.groupIcon)}
                        alt={conversation.groupName}
                        className="h-11 w-11 rounded-2xl object-cover shadow-xs"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white shadow-xs text-sm">
                        {conversation.groupName?.charAt(0).toUpperCase() || (
                          <Users size={18} />
                        )}
                      </div>
                    )
                  ) : (
                    <>
                      {otherUser?.avatar ? (
                        <img
                          src={getMediaUrl(otherUser.avatar)}
                          alt={otherUser.name}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-primary)] font-bold text-white text-xs shadow-xs">
                          {otherUser?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}

                      {otherUser?.isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
                      )}
                    </>
                  )}
                </div>

                {/* Info Text */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <p
                        className={`truncate text-xs font-semibold ${
                          isSelected
                            ? "text-[var(--accent-text)] dark:text-[var(--accent-text)] font-bold"
                            : "text-[var(--text-primary)] dark:text-white"
                        }`}
                      >
                        {conversationTitle}
                      </p>
                      {!conversation.isGroup && otherUser?.statusEmoji && (
                        <span
                          className="text-[11px] shrink-0"
                          title={otherUser.statusText || otherUser.statusEmoji}
                        >
                          {otherUser.statusEmoji}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[10px] shrink-0 font-medium ${
                        isSelected
                          ? "text-[var(--accent-text)] dark:text-slate-300"
                          : "text-[var(--text-muted)] dark:text-slate-400"
                      }`}
                    >
                      {formatTime(conversation.lastMessage?.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p
                      className={`truncate text-[11px] ${
                        isSelected
                          ? "text-[var(--text-primary)] dark:text-slate-200 font-medium"
                          : "text-[var(--text-secondary)] dark:text-slate-300"
                      }`}
                    >
                      {renderMessagePreview(conversation)}
                    </p>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isMuted && (
                        <BellOff
                          size={12}
                          className="text-[var(--text-muted)] shrink-0"
                          title="Muted notifications"
                        />
                      )}
                      {conversation.unreadCount > 0 && !isSelected && (
                        <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-xs">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>

              {/* Pin Hover Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePinConversation?.(conversation._id);
                }}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition ${
                  isPinned ? "opacity-100 text-amber-500" : "opacity-0 group-hover:opacity-100"
                }`}
                title={isPinned ? "Unpin chat" : "Pin chat to top"}
              >
                <Pin size={12} className={isPinned ? "fill-amber-500" : ""} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ProfileModal
        key={`${user?._id || "user"}-${isProfileOpen ? "open" : "closed"}`}
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={(newGroup) => {
          onGroupCreated?.(newGroup);
        }}
      />

      <StarredMessagesModal
        isOpen={isGlobalStarredOpen}
        onClose={() => setIsGlobalStarredOpen(false)}
        conversationId={null}
        onScrollToMessage={onScrollToMessage}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Log Out"
        message="Are you sure you want to log out of your account?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </aside>
  );
};

export default Sidebar;
