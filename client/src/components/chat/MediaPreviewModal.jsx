import { X, Download } from "lucide-react";

const MediaPreviewModal = ({ url, fileName, onClose }) => {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={url}
          download={fileName || "image"}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-slate-800/80 p-2.5 text-white transition hover:bg-slate-700"
          title="Download"
        >
          <Download size={18} />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-slate-800/80 p-2.5 text-white transition hover:bg-slate-700"
          aria-label="Close preview"
        >
          <X size={18} />
        </button>
      </div>

      <img
        src={url}
        alt={fileName || "Image preview"}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default MediaPreviewModal;
