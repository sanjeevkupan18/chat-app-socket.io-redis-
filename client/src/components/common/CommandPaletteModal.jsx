import { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  MessageSquare,
  Users,
  Sun,
  Moon,
  Palette,
  Settings,
  Phone,
  Video,
  Volume2,
  VolumeX,
  LogOut,
  Sparkles,
  Command,
  ArrowRight,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useCall } from "../../context/CallContext";
import { getMediaUrl } from "../../config/endpoints";
import { isSoundEnabled, setSoundEnabled } from "../../utils/soundAndNotification";

const CommandPaletteModal = ({
  open,
  onClose,
  conversations = [],
  onSelectConversation,
  onOpenProfile,
  onOpenCreateGroup,
  selectedConversation,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, palette, setPalette, palettes, isDark } = useTheme();
  const { startCall } = useCall();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Build commands list
  const actions = useMemo(() => {
    const list = [];

    // Navigation & Settings
    list.push({
      id: "action-settings",
      category: "Settings & Profile",
      title: "Open Profile & Preferences",
      subtitle: "Customize avatar, status, theme & privacy",
      icon: <Settings size={16} className="text-blue-500" />,
      run: () => {
        onClose();
        onOpenProfile?.();
      },
    });

    list.push({
      id: "action-create-group",
      category: "Chat Actions",
      title: "Create New Group Chat",
      subtitle: "Start a group with multiple contacts",
      icon: <Users size={16} className="text-emerald-500" />,
      run: () => {
        onClose();
        onOpenCreateGroup?.();
      },
    });

    // Theme Toggle
    list.push({
      id: "action-toggle-theme",
      category: "Appearance",
      title: isDark ? "Switch to Light Theme" : "Switch to Dark Theme",
      subtitle: `Currently using ${theme} mode`,
      icon: isDark ? (
        <Sun size={16} className="text-amber-400" />
      ) : (
        <Moon size={16} className="text-indigo-400" />
      ),
      run: () => {
        toggleTheme();
        onClose();
      },
    });

    // Palette pickers
    if (palettes && palettes.length > 0) {
      palettes.forEach((p) => {
        list.push({
          id: `palette-${p.id}`,
          category: "Color Palettes",
          title: `Palette: ${p.name}`,
          subtitle: `Apply ${p.name} theme accent colors`,
          icon: (
            <div
              className="h-4 w-4 rounded-full border border-white/20 shadow-xs flex items-center justify-center text-[10px] text-white"
              style={{ backgroundColor: p.primary }}
            >
              {palette === p.id && <Check size={10} />}
            </div>
          ),
          run: () => {
            setPalette(p.id);
            onClose();
          },
        });
      });
    }

    // Call active contact
    if (selectedConversation && !selectedConversation.isGroup) {
      const otherUser = selectedConversation.participants?.find(
        (p) => (p._id || p)?.toString() !== user?._id?.toString(),
      );

      if (otherUser) {
        list.push({
          id: "action-voice-call",
          category: "Calls",
          title: `Start Voice Call with ${otherUser.name}`,
          subtitle: "Make an audio call right now",
          icon: <Phone size={16} className="text-emerald-500" />,
          run: () => {
            onClose();
            startCall?.(otherUser, "audio");
          },
        });

        list.push({
          id: "action-video-call",
          category: "Calls",
          title: `Start Video Call with ${otherUser.name}`,
          subtitle: "Make a face-to-face video call",
          icon: <Video size={16} className="text-blue-500" />,
          run: () => {
            onClose();
            startCall?.(otherUser, "video");
          },
        });
      }
    }

    // Sound toggle
    const currentlySound = isSoundEnabled();
    list.push({
      id: "action-sound-toggle",
      category: "Audio",
      title: currentlySound ? "Mute Message & Call Sounds" : "Enable Message & Call Sounds",
      subtitle: currentlySound ? "Audio is currently active" : "Audio is currently muted",
      icon: currentlySound ? (
        <VolumeX size={16} className="text-rose-500" />
      ) : (
        <Volume2 size={16} className="text-emerald-500" />
      ),
      run: () => {
        setSoundEnabled(!currentlySound);
        onClose();
      },
    });

    // Log out
    list.push({
      id: "action-logout",
      category: "Account",
      title: "Log Out of Antigravity Chat",
      subtitle: `Signed in as ${user?.name || user?.email}`,
      icon: <LogOut size={16} className="text-red-500" />,
      run: () => {
        onClose();
        logout();
      },
    });

    return list;
  }, [
    isDark,
    theme,
    toggleTheme,
    palette,
    setPalette,
    palettes,
    selectedConversation,
    user,
    startCall,
    logout,
    onClose,
    onOpenProfile,
    onOpenCreateGroup,
  ]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) return [];
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => {
        if (!q) return true;
        if (c.isGroup) {
          return c.groupName?.toLowerCase().includes(q);
        }
        const other = c.participants?.find(
          (p) => (p._id || p)?.toString() !== user?._id?.toString(),
        );
        return (
          other?.name?.toLowerCase().includes(q) ||
          other?.email?.toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [conversations, query, user?._id]);

  // Filter actions
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Combined flat items list for keyboard traversal
  const allItems = useMemo(() => {
    const convItems = filteredConversations.map((c) => {
      const isGroup = Boolean(c.isGroup);
      const other = !isGroup
        ? c.participants?.find((p) => (p._id || p)?.toString() !== user?._id?.toString())
        : null;
      const title = isGroup ? c.groupName : other?.name || "Direct Chat";
      const subtitle = isGroup
        ? `${c.participants?.length || 0} members`
        : other?.statusText || (other?.isOnline ? "Online" : other?.email || "Offline");

      return {
        id: `conv-${c._id}`,
        type: "conversation",
        category: "Chats & Contacts",
        title,
        subtitle,
        emoji: other?.statusEmoji || "",
        avatar: isGroup ? c.groupIcon : other?.avatar,
        isGroup,
        conversation: c,
        run: () => {
          onSelectConversation?.(c);
          onClose();
        },
      };
    });

    return [...convItems, ...filteredActions];
  }, [filteredConversations, filteredActions, user?._id, onSelectConversation, onClose]);

  // Reset index when items count changes
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (allItems.length === 0) return 0;
      return Math.min(prev, allItems.length - 1);
    });
  }, [allItems.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = document.getElementById(`cmd-item-${selectedIndex}`);
    if (el) {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, allItems.length - 1) : prev - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) {
        current.run();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-[var(--border-color)] px-4 py-3.5 bg-[var(--bg-card)]">
          <Search size={18} className="text-[var(--text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, contact, or theme..."
            className="flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[var(--border-color)]/30"
        >
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <Command size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs font-medium">No results found for "{query}"</p>
              <p className="text-[11px] opacity-70 mt-1">Try searching for contacts, settings, or theme</p>
            </div>
          ) : (
            allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  id={`cmd-item-${idx}`}
                  key={item.id}
                  type="button"
                  onClick={item.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition cursor-pointer select-none ${
                    isSelected
                      ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)] ring-1 ring-[var(--accent-primary)]/30"
                      : "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Item Avatar or Action Icon */}
                    {item.type === "conversation" ? (
                      <div className="relative shrink-0">
                        {item.avatar ? (
                          <img
                            src={getMediaUrl(item.avatar)}
                            alt={item.title}
                            className="h-8 w-8 rounded-full object-cover shadow-2xs"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-light)] text-[var(--accent-text)] text-xs font-bold">
                            {item.title?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                        {item.emoji && (
                          <span className="absolute -bottom-1 -right-1 text-xs">
                            {item.emoji}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-color)] shrink-0">
                        {item.icon}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate">
                          {item.title}
                        </span>
                        {item.category && (
                          <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.2 rounded-md bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-color)] hidden sm:inline-block">
                            {item.category}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[var(--text-muted)] shrink-0 ml-2">
                    {isSelected && (
                      <ArrowRight size={14} className="text-[var(--accent-primary)] animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-2 bg-[var(--bg-subtle)] text-[11px] text-[var(--text-muted)] select-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-card)] px-1 py-0.5 text-[9px] font-bold">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-card)] px-1 py-0.5 text-[9px] font-bold">
                ↵
              </kbd>{" "}
              Select
            </span>
          </div>

          <span className="flex items-center gap-1 opacity-70">
            <Command size={11} /> Global Command Palette
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CommandPaletteModal;
