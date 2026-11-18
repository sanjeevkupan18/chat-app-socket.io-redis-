import { Trash2, X } from "lucide-react";

const DeleteModal = ({ isOpen, isMine, isDeleted, onClose, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2 text-red-400">
            <Trash2 size={20} />
            <h3 className="font-semibold text-white">Delete Message?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-slate-400">
          Choose whether to delete this message just for yourself or for everyone in the chat.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {isMine && !isDeleted && (
            <button
              type="button"
              onClick={() => {
                onDelete("everyone");
                onClose();
              }}
              className="w-full rounded-xl bg-red-600/90 py-2.5 text-sm font-medium text-white transition hover:bg-red-600"
            >
              Delete for everyone
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDelete("me");
              onClose();
            }}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Delete for me
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2 text-sm text-slate-400 transition hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
