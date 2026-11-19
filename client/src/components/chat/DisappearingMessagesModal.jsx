import { useState } from "react";
import { createPortal } from "react-dom";
import { Timer, Check, X, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import api from "../../services/api";

const DURATIONS = [
  { label: "24 hours", seconds: 86400, desc: "Messages vanish after 1 day" },
  { label: "7 days", seconds: 604800, desc: "Messages vanish after 1 week" },
  { label: "90 days", seconds: 7776000, desc: "Messages vanish after ~3 months" },
  { label: "Off", seconds: 0, desc: "Messages remain permanently in chat" },
];

const DisappearingMessagesModal = ({
  open,
  onClose,
  conversation,
  onDisappearingUpdated,
}) => {
  const isEnabled = Boolean(conversation?.disappearingMessages?.enabled);
  const currentDuration = isEnabled
    ? conversation.disappearingMessages.duration || 86400
    : 0;

  const [selectedDuration, setSelectedDuration] = useState(currentDuration);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open || !conversation) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const enabled = selectedDuration > 0;
      const res = await api.put(`/conversations/${conversation._id}/disappearing`, {
        enabled,
        duration: selectedDuration,
      });

      if (res.data?.disappearingMessages) {
        onDisappearingUpdated?.({
          ...conversation,
          disappearingMessages: res.data.disappearingMessages,
        });
      }
      onClose();
    } catch (err) {
      console.error("Save disappearing error:", err);
      setError(err.response?.data?.message || "Failed to update disappearing messages");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-sm rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4 bg-[var(--bg-card)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-500 shadow-2xs">
              <Timer size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Disappearing Messages
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Self-destructing messages timer
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

        {/* Info card */}
        <div className="p-4 bg-[var(--bg-subtle)]/50 border-b border-[var(--border-color)]/50">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            When turned on, new messages sent in this chat will automatically self-destruct for everyone after the chosen time. Existing messages won't be deleted.
          </p>
        </div>

        {/* Options list */}
        <div className="p-4 space-y-2">
          {DURATIONS.map((opt) => {
            const isSelected = selectedDuration === opt.seconds;
            return (
              <button
                key={opt.seconds}
                type="button"
                onClick={() => setSelectedDuration(opt.seconds)}
                className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-left transition cursor-pointer ${
                  isSelected
                    ? "border-[var(--accent-primary)] bg-[var(--accent-light)]/20 ring-1 ring-[var(--accent-primary)]"
                    : "border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {opt.desc}
                  </p>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                      : "border-[var(--border-color)] bg-[var(--bg-subtle)]"
                  }`}
                >
                  {isSelected && <Check size={12} className="stroke-[3]" />}
                </div>
              </button>
            );
          })}

          {error && (
            <p className="text-[11px] font-semibold text-red-500 pt-1 text-center">
              {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] p-4 bg-[var(--bg-card)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[var(--accent-hover)] transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Apply Timer</span>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DisappearingMessagesModal;
