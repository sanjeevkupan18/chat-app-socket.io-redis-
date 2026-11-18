import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Check,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  Mail,
  User,
  X,
  Loader2,
  Save,
  Trash2,
  Shield,
  Settings,
  UploadCloud,
  Palette,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getMediaUrl } from "../../config/endpoints";
import ConfirmDialog from "../common/ConfirmDialog";
import api from "../../services/api";
import {
  isSoundEnabled,
  setSoundEnabled,
  isNotificationEnabled,
  setNotificationEnabled,
  requestNotificationPermission,
} from "../../utils/soundAndNotification";

const ProfileModal = ({ open, onClose }) => {
  const { user, updateProfile, logout } = useAuth();
  const { theme, toggleTheme, palette, setPalette, palettes, isDark } = useTheme();

  const [name, setName] = useState(() => user?.name || "");
  const [avatar, setAvatar] = useState(() => user?.avatar || "");
  const [hideLastSeen, setHideLastSeen] = useState(() => Boolean(user?.hideLastSeen));
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [notifEnabled, setNotifEnabled] = useState(() => isNotificationEnabled());
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default",
  );

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  const fileInputRef = useRef(null);

  // Synchronize state when modal is opened or user updates
  useEffect(() => {
    if (open && user) {
      setName(user.name || "");
      setAvatar(user.avatar || "");
      setHideLastSeen(Boolean(user.hideLastSeen));
      setSoundOn(isSoundEnabled());
      setNotifEnabled(isNotificationEnabled());
      setNotifPermission(
        typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "default"
      );
      setError("");
      setSuccess("");
    }
  }, [open, user]);

  if (!open || !user) {
    return null;
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";
  const hasAvatar = Boolean(avatar?.trim()) && !avatarError;

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, JPEG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size should not exceed 5MB.");
      return;
    }

    try {
      setUploadingAvatar(true);
      setError("");
      setSuccess("");

      const formData = new FormData();
      formData.append("file", file);

      // Uploads directly through the shared /upload endpoint to Cloudinary
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.url) {
        setAvatar(res.data.url);
        setAvatarError(false);
        setSuccess("Profile picture uploaded successfully!");
        setTimeout(() => setSuccess(""), 3500);
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to upload profile picture. Please try again.",
      );
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar("");
    setAvatarError(false);
    setSuccess("Profile picture removed. Initials will be displayed.");
    setTimeout(() => setSuccess(""), 3500);
  };

  const handleToggleHideLastSeen = async () => {
    const nextVal = !hideLastSeen;
    setHideLastSeen(nextVal);
    try {
      await updateProfile({
        name: name.trim() || user.name,
        hideLastSeen: nextVal,
      });
      setSuccess(
        nextVal
          ? "Last seen is now hidden from other contacts."
          : "Last seen is now visible to other contacts.",
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Error updating hideLastSeen:", err);
    }
  };

  const handleToggleNotifications = async () => {
    if (notifEnabled && notifPermission === "granted") {
      setNotifEnabled(false);
      setNotificationEnabled(false);
      setSuccess("Browser notifications disabled.");
      setTimeout(() => setSuccess(""), 3000);
      return;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setError("This browser does not support desktop notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      setNotifEnabled(true);
      setNotificationEnabled(true);
      setNotifPermission("granted");
      setSuccess("Browser notifications enabled!");
      setTimeout(() => setSuccess(""), 3000);
    } else if (Notification.permission === "denied") {
      setError(
        "Notifications are blocked in your browser site permissions. Please allow notifications from your browser address bar settings.",
      );
      setNotifPermission("denied");
    } else {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotifEnabled(true);
        setNotificationEnabled(true);
        setNotifPermission("granted");
        setSuccess("Browser notifications enabled!");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setNotifEnabled(false);
        setNotificationEnabled(false);
        setNotifPermission("denied");
        setError("Notification permission was not granted.");
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedAvatar = avatar.trim();

    if (trimmedName.length < 2) {
      setError("Display name must be at least 2 characters long.");
      return;
    }
    if (trimmedName.length > 50) {
      setError("Display name cannot exceed 50 characters.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await updateProfile({
        name: trimmedName,
        avatar: trimmedAvatar,
        hideLastSeen,
      });

      setSoundEnabled(soundOn);
      setNotificationEnabled(notifEnabled);
      onClose();
    } catch (updateError) {
      setError(
        updateError?.response?.data?.message ||
          "Unable to update your profile right now.",
      );
    } finally {
      setSaving(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Hidden file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Modal Dialog Card */}
      <div className="relative flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header - Fixed & Pinned */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent-text)]">
              <Settings size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Profile & Settings
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Manage your identity, theme, and chat preferences
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400 animate-in fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-500 animate-in fade-in">
              <Check size={14} className="text-emerald-500 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Section 1: Profile Picture (Center-stage WhatsApp Style) */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-5 text-center">
            <div className="relative group">
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--bg-card)] bg-[var(--bg-card)] shadow-xl transition group-hover:border-[var(--accent-primary)]">
                {hasAvatar ? (
                  <img
                    src={getMediaUrl(avatar)}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)] text-3xl font-bold text-white">
                    {initials}
                  </div>
                )}

                {/* Upload Spinner Overlay */}
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
                    <span className="mt-1 text-[10px] font-medium text-white">
                      Uploading to Cloudinary...
                    </span>
                  </div>
                )}

                {/* Hover Camera Prompt */}
                {!uploadingAvatar && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 text-white cursor-pointer"
                    title="Change profile picture"
                  >
                    <Camera size={22} />
                    <span className="mt-1 text-[11px] font-medium">Change</span>
                  </button>
                )}
              </div>

              {/* Quick Camera Corner Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
                title="Upload new photo"
              >
                <Camera size={16} />
              </button>
            </div>

            {/* Photo Action Buttons */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)] disabled:opacity-50 shadow-2xs"
              >
                <UploadCloud size={14} className="text-[var(--accent-primary)]" />
                <span>Upload Photo</span>
              </button>

              {hasAvatar && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Stored securely on Cloudinary CDN • Max 5MB
            </p>
          </div>

          {/* Section 2: Appearance & Color Palette */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Appearance & Colors
            </h3>

            {/* Mode Toggle */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent-text)] shrink-0">
                  {isDark ? <Moon size={16} /> : <Sun size={16} />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Theme Mode
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {isDark ? "Dark Mode: Clean slate & deep navy" : "Light Mode: Soft modern dashboard layout"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition shadow-2xs"
              >
                {isDark ? "Switch to Light" : "Switch to Dark"}
              </button>
            </div>

            {/* Color Palette Picker */}
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Palette size={15} className="text-[var(--accent-primary)] shrink-0" />
                <span className="text-xs font-semibold text-[var(--text-primary)]">
                  Message Box Color Palette
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mb-3">
                Select accent tint for chat bubbles, highlights, and buttons.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {palettes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPalette(p.id)}
                    className={`flex items-center justify-between gap-1.5 rounded-xl px-2.5 py-2 text-left border transition cursor-pointer min-w-0 ${
                      palette === p.id
                        ? "border-[var(--accent-primary)] bg-[var(--bg-card)] font-bold text-[var(--text-primary)] shadow-xs ring-1 ring-[var(--accent-primary)]/30"
                        : "border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`h-3 w-3 rounded-full ${p.dot} shadow-xs shrink-0`} />
                      <span className="truncate text-[11px] font-medium leading-none">{p.name}</span>
                    </div>
                    {palette === p.id && (
                      <Check size={13} className="text-[var(--accent-primary)] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Personal Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Account Information
            </h3>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">
                Display Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={50}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] py-2.5 pl-10 pr-4 text-xs font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]"
                />
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                Visible to all your contacts and group members.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Email Address
                </label>
                <span className="rounded-md bg-[var(--bg-subtle)] border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] font-mono">
                  Primary ID
                </span>
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-[var(--text-muted)]" />
                <input
                  type="email"
                  value={user.email || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)]/60 py-2.5 pl-10 pr-4 text-xs text-[var(--text-muted)] outline-none select-all"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Privacy & Presence */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Privacy & Presence
            </h3>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Hide Last Seen
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {hideLastSeen
                      ? "Enabled: Other contacts will only see you as 'Offline' when disconnected."
                      : "Disabled: Contacts can see when you were last online."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={hideLastSeen}
                onClick={handleToggleHideLastSeen}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  hideLastSeen ? "bg-[var(--accent-primary)]" : "bg-slate-300 dark:bg-slate-700"
                }`}
                title={hideLastSeen ? "Click to show last seen" : "Click to hide last seen"}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hideLastSeen ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section 5: Sound & Notifications */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Sound & Notifications
            </h3>

            {/* Sound Chimes */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
                  {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Message Sound Chimes
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Play pleasant audio cues when sending and receiving messages.
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={soundOn}
                onClick={() => setSoundOn((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundOn ? "bg-[var(--accent-primary)]" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    soundOn ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Desktop Web Push Notifications */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500 shrink-0">
                  {notifEnabled && notifPermission === "granted" ? (
                    <Bell size={16} />
                  ) : (
                    <BellOff size={16} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Browser Notifications
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {notifPermission === "denied"
                      ? "Notifications blocked by browser site permissions. Please allow notifications in site settings."
                      : notifEnabled && notifPermission === "granted"
                      ? "Enabled: You will receive alerts when the tab is in background."
                      : "Disabled: You will not receive desktop notifications."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={notifEnabled && notifPermission === "granted"}
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  notifEnabled && notifPermission === "granted"
                    ? "bg-[var(--accent-primary)]"
                    : "bg-slate-300 dark:bg-slate-700"
                }`}
                title={
                  notifEnabled && notifPermission === "granted"
                    ? "Disable notifications"
                    : "Enable notifications"
                }
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    notifEnabled && notifPermission === "granted"
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-2" />
        </form>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4 sm:px-6 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/20 transition cursor-pointer"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-initial rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || uploadingAvatar}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              <span>Save Changes</span>
            </button>
          </div>
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
          onClose();
          await logout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ProfileModal;
