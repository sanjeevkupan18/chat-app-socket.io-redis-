import { useState } from "react";

import { Camera, Loader2, Save, X } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const ProfileModal = ({ open, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(() => user?.name || "");

  const [avatar, setAvatar] = useState(() => user?.avatar || "");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [avatarError, setAvatarError] = useState(false);

  if (!open || !user) {
    return null;
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";

  const hasAvatar = Boolean(avatar?.trim()) && !avatarError;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedAvatar = avatar.trim();

    if (trimmedName.length < 2) {
      setError("Name must be at least 2 characters long.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await updateProfile({
        name: trimmedName,
        avatar: trimmedAvatar,
      });

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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-blue-950 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                Profile
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Edit your details
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Update your display name and avatar so people can recognize you
                in chat.
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border border-slate-700 p-2 text-slate-400 transition hover:border-slate-500 hover:text-white"
              aria-label="Close profile editor"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid gap-6 md:grid-cols-[140px_1fr]">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-slate-800">
                {hasAvatar ? (
                  <img
                    src={avatar}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-500 text-4xl font-semibold text-white">
                    {initials}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-400">
                <Camera size={14} />
                Avatar preview
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  value={user.email || ""}
                  readOnly
                  className="w-full cursor-not-allowed rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Avatar URL
                </label>
                <input
                  value={avatar}
                  onChange={(event) => {
                    setAvatar(event.target.value);
                    setAvatarError(false);
                  }}
                  placeholder="https://example.com/avatar.png"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                />
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Paste a direct image URL. Leave it empty to use your initials.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileModal;
