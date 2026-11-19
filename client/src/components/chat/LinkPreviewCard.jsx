import { useState, useEffect } from "react";
import { ExternalLink, Globe } from "lucide-react";
import api from "../../services/api";

const previewMemoryCache = new Map();

const LinkPreviewCard = ({ url }) => {
  const [preview, setPreview] = useState(() => previewMemoryCache.get(url) || null);
  const [loading, setLoading] = useState(!previewMemoryCache.has(url));
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (previewMemoryCache.has(url)) {
      setPreview(previewMemoryCache.get(url));
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    api
      .get(`/utils/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data && res.data.title) {
          previewMemoryCache.set(url, res.data);
          setPreview(res.data);
        } else {
          setPreview(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Link preview fetch error:", err);
        setPreview(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-2 w-full max-w-sm rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/50 p-2.5 animate-pulse">
        <div className="h-28 w-full rounded-xl bg-[var(--bg-subtle)] mb-2" />
        <div className="h-3 w-3/4 rounded-md bg-[var(--bg-subtle)] mb-1.5" />
        <div className="h-2.5 w-1/2 rounded-md bg-[var(--bg-subtle)]" />
      </div>
    );
  }

  if (!preview || !preview.title) {
    return null;
  }

  return (
    <a
      href={preview.url || url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2.5 block w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-sm hover:shadow-md transition-all hover:scale-[1.01] group text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Thumbnail Image Banner */}
      {preview.image && !imageError && (
        <div className="relative h-32 w-full overflow-hidden bg-[var(--bg-subtle)]">
          <img
            src={preview.image}
            alt={preview.title}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}

      {/* Content Container */}
      <div className="p-3">
        {/* Site Header */}
        <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
          <div className="flex items-center gap-1.5 truncate">
            {preview.favicon ? (
              <img
                src={preview.favicon}
                alt=""
                className="h-3.5 w-3.5 rounded-xs shrink-0"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <Globe size={11} className="shrink-0" />
            )}
            <span className="truncate">{preview.siteName || "Web Link"}</span>
          </div>
          <ExternalLink
            size={11}
            className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition shrink-0"
          />
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 group-hover:text-[var(--accent-primary)] transition">
          {preview.title}
        </h4>

        {/* Description */}
        {preview.description && (
          <p className="mt-1 text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};

export default LinkPreviewCard;
