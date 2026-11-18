import { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Phone,
  Compass,
  Video,
  Sun,
  Moon,
  Palette,
  Volume2,
  VolumeX,
  Settings,
  Check,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getMediaUrl } from "../../config/endpoints";
import { isSoundEnabled, setSoundEnabled } from "../../utils/soundAndNotification";
import ConfirmDialog from "../common/ConfirmDialog";
import BrandLogo from "../common/BrandLogo";

const AppRail = ({
  onOpenProfile,
  onOpenStarred,
  onFilterUnread,
  activeNav = "chat",
  setActiveNav,
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, palette, setPalette, palettes, isDark } = useTheme();

  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [showPaletteMenu, setShowPaletteMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const paletteMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (paletteMenuRef.current && !paletteMenuRef.current.contains(e.target)) {
        setShowPaletteMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const navItems = [
    { id: "calls", icon: Phone, label: "Calls" },
    { id: "video", icon: Video, label: "Video Calls" },
    { id: "chat", icon: MessageSquare, label: "Chats" },
    { id: "discover", icon: Compass, label: "Status" },
  ];

  return (
    <aside className="w-16 shrink-0 border-r border-[var(--border-color)] bg-[var(--bg-card)] hidden md:flex flex-col items-center justify-between py-4 select-none z-30 transition-colors duration-200">
      {/* Top: Brand Logo */}
      <div className="flex flex-col items-center gap-6">
        <BrandLogo size="md" />

        {/* Navigation Rail Items */}
        <nav className="flex flex-col items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;

            return (
              <div key={item.id} className="relative group">
                <button
                  type="button"
                  onClick={() => setActiveNav?.(item.id)}
                  className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--accent-light)] text-[var(--accent-text)] shadow-xs"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  }`}
                  title={item.label}
                >
                  <Icon size={20} />
                </button>

                {/* Active Indicator Bar on right edge (matches reference) */}
                {isActive && (
                  <span className="absolute -right-2 top-2.5 bottom-2.5 w-1 rounded-l-full bg-[var(--accent-primary)]" />
                )}

                {/* Tooltip */}
                <div className="absolute left-14 top-1/2 -translate-y-1/2 z-50 pointer-events-none hidden group-hover:block rounded-lg bg-slate-900 text-white text-[11px] font-medium px-2.5 py-1 whitespace-nowrap shadow-xl">
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Theme, Palette, Sound & Profile Controls */}
      <div className="flex flex-col items-center gap-2.5">
        {/* Color Palette Popover Trigger */}
        <div className="relative" ref={paletteMenuRef}>
          <button
            type="button"
            onClick={() => setShowPaletteMenu((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
            title="Choose Color Palette"
          >
            <Palette size={18} />
          </button>

          {showPaletteMenu && (
            <div className="absolute left-14 bottom-0 z-50 w-44 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 backdrop-blur-md p-1.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
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

        {/* Theme Light / Dark Switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        {/* Sound Chimes Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
          title={soundOn ? "Mute Message Sounds" : "Unmute Message Sounds"}
        >
          {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} className="text-red-400" />}
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition"
          title="Profile & Settings"
        >
          <Settings size={18} />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-500/15 hover:text-red-500 transition"
          title="Log Out"
        >
          <LogOut size={18} />
        </button>

        {/* User Avatar with Presence Indicator */}
        <div
          onClick={onOpenProfile}
          className="relative mt-2 cursor-pointer group"
          title={`${user?.name} (Click for Settings)`}
        >
          {user?.avatar ? (
            <img
              src={getMediaUrl(user.avatar)}
              alt={user.name}
              className="h-10 w-10 rounded-2xl object-cover ring-2 ring-[var(--accent-primary)] group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)] font-bold text-white text-sm shadow-md group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
        </div>
      </div>

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

export default AppRail;
