import { createPortal } from "react-dom";
import { AlertTriangle, Info, Loader2, X } from "lucide-react";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger", // "danger" | "warning" | "info"
  loading = false,
  showCancel = true,
}) => {
  if (!isOpen) return null;

  const isDanger = type === "danger";

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={!loading ? onClose : undefined} aria-hidden="true" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shrink-0 ${
              isDanger
                ? "bg-red-500/15 text-red-500"
                : "bg-blue-500/15 text-blue-500"
            }`}
          >
            {isDanger ? <AlertTriangle size={22} /> : <Info size={22} />}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="rounded-xl p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1.5 text-xs leading-5 text-[var(--text-muted)]">{message}</p>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
          {showCancel && cancelText && (
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 sm:flex-initial rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer text-center justify-center"
            >
              {cancelText}
            </button>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm || onClose}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-60 cursor-pointer shadow-sm ${
              isDanger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default ConfirmDialog;
