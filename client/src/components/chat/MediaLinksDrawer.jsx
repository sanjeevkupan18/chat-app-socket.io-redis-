import { useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Film,
  FolderArchive,
  Star,
  Users,
  X,
  ChevronRight,
  ChevronLeft,
  Phone,
  Video,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import { getMediaUrl } from "../../config/endpoints";
import MediaPreviewModal from "./MediaPreviewModal";

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const MediaLinksDrawer = ({
  isOpen,
  onClose,
  conversation,
  onOpenStarred,
  isInline = false,
}) => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [selectedCategory, setSelectedCategory] = useState(null); // null | "docs" | "photos" | "videos" | "links" | "other"
  const [mediaData, setMediaData] = useState({ media: [], docs: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState(null);

  useEffect(() => {
    if (!isOpen || !conversation?._id) return;

    let isMounted = true;
    const fetchMedia = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/messages/${conversation._id}/media`);
        if (isMounted) {
          setMediaData(res.data || { media: [], docs: [], links: [] });
        }
      } catch (err) {
        console.error("Failed to load conversation media:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMedia();
    return () => {
      isMounted = false;
    };
  }, [isOpen, conversation?._id]);

  if (!isOpen || !conversation) return null;

  const isGroup = Boolean(conversation.isGroup);
  const otherUser = !isGroup
    ? conversation.participants?.find((p) => p._id !== user?._id)
    : null;

  // Categorize media
  const allMedia = mediaData.media || [];
  const allDocs = mediaData.docs || [];
  const allLinks = mediaData.links || [];

  const photos = allMedia.filter((m) => m.messageType === "image");
  const videos = allMedia.filter((m) => m.messageType === "video" || m.messageType === "audio");
  const otherFiles = allDocs.filter(
    (d) =>
      !d.fileName?.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/i) &&
      d.messageType !== "image",
  );
  const documents = allDocs.filter(
    (d) => !otherFiles.some((of) => of._id === d._id),
  );

  const totalFilesCount = allMedia.length + allDocs.length;
  const totalLinksCount = allLinks.length;

  const categories = [
    {
      id: "docs",
      name: "Documents",
      count: documents.length,
      size: formatBytes(documents.reduce((acc, d) => acc + (d.fileSize || 0), 0)),
      icon: FileText,
      iconBg: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
      items: documents,
    },
    {
      id: "photos",
      name: "Photos",
      count: photos.length,
      size: formatBytes(photos.reduce((acc, p) => acc + (p.fileSize || 0), 0)),
      icon: ImageIcon,
      iconBg: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
      items: photos,
    },
    {
      id: "videos",
      name: "Movies & Audio",
      count: videos.length,
      size: formatBytes(videos.reduce((acc, v) => acc + (v.fileSize || 0), 0)),
      icon: Film,
      iconBg: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
      items: videos,
    },
    {
      id: "other",
      name: "Other Files",
      count: otherFiles.length,
      size: formatBytes(otherFiles.reduce((acc, o) => acc + (o.fileSize || 0), 0)),
      icon: FolderArchive,
      iconBg: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
      items: otherFiles,
    },
  ];

  const activeCategoryData = categories.find((c) => c.id === selectedCategory);

  const content = (
    <div className="flex h-full flex-col bg-[var(--bg-card)] text-[var(--text-primary)]">
      {/* 1. Header matching reference: > Shared files */}
      <div className="flex h-[68px] items-center justify-between border-b border-[var(--border-color)] px-5 shrink-0">
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)]">
              <span className="text-[var(--text-muted)]">&gt;</span>
              <span>Shared files</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          title="Close panel"
        >
          <X size={17} />
        </button>
      </div>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {selectedCategory ? (
          /* Drill-down File List for Selected Category */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                {activeCategoryData?.name} ({activeCategoryData?.count || 0})
              </h4>
              <span className="text-[10px] text-[var(--text-muted)]">
                {activeCategoryData?.size}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
                <Loader2 size={20} className="animate-spin" />
              </div>
            ) : activeCategoryData?.items.length === 0 ? (
              <p className="py-10 text-center text-xs text-[var(--text-muted)]">
                No files in this category yet.
              </p>
            ) : (
              <div className="space-y-2">
                {activeCategoryData?.items.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-2.5 transition hover:shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.messageType === "image" ? (
                        <img
                          src={getMediaUrl(file.mediaUrl || file.text)}
                          alt="preview"
                          onClick={() => setPreviewMediaUrl(getMediaUrl(file.mediaUrl || file.text))}
                          className="h-10 w-10 rounded-xl object-cover cursor-pointer shrink-0"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent-text)] shrink-0">
                          <FileText size={18} />
                        </div>
                      )}

                      <div className="min-w-0">
                        <p
                          className="truncate text-xs font-semibold text-[var(--text-primary)]"
                          title={file.fileName || "File"}
                        >
                          {file.fileName || (file.messageType === "image" ? "Photo" : "Document")}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {formatBytes(file.fileSize)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <a
                        href={getMediaUrl(file.mediaUrl || file.text)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Open file"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <a
                        href={getMediaUrl(file.mediaUrl || file.text)}
                        download={file.fileName || "download"}
                        className="rounded-lg p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title="Download"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Main Shared Files Overview (Matches Reference Image) */
          <>
            {/* Contact / Group Hero Card */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--bg-subtle)] shadow-md">
                {isGroup ? (
                  conversation.groupIcon ? (
                    <img
                      src={getMediaUrl(conversation.groupIcon)}
                      alt={conversation.groupName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-2xl font-bold text-white">
                      {conversation.groupName?.charAt(0).toUpperCase() || <Users size={28} />}
                    </div>
                  )
                ) : otherUser?.avatar ? (
                  <img
                    src={getMediaUrl(otherUser.avatar)}
                    alt={otherUser.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--accent-primary)] text-2xl font-bold text-white">
                    {otherUser?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>

              <h3 className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                {isGroup ? conversation.groupName : otherUser?.name}
              </h3>

              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                {isGroup
                  ? `${conversation.participants?.length || 0} members`
                  : otherUser?.email}
              </p>

              {!isGroup && otherUser && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startCall(otherUser, "audio")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-emerald-500 hover:text-emerald-500 transition shadow-xs"
                    title={`Voice call with ${otherUser.name}`}
                  >
                    <Phone size={13} className="text-emerald-500" />
                    <span>Audio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(otherUser, "video")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] hover:border-emerald-500 hover:text-emerald-500 transition shadow-xs"
                    title={`Video call with ${otherUser.name}`}
                  >
                    <Video size={13} className="text-emerald-500" />
                    <span>Video</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Stats: All files | All links (Side-by-Side as in Reference) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0 shadow-xs">
                  <FolderArchive size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                    All files
                  </p>
                  <p className="text-xl font-extrabold text-emerald-950 dark:text-emerald-100">
                    {totalFilesCount}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shrink-0 shadow-xs">
                  <LinkIcon size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-blue-800 dark:text-blue-300">
                    All links
                  </p>
                  <p className="text-xl font-extrabold text-blue-950 dark:text-blue-100">
                    {totalLinksCount}
                  </p>
                </div>
              </div>
            </div>

            {/* File type Section Header */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  File type
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  Click to inspect
                </span>
              </div>

              {/* Categorized List (Documents, Photos, Movies, Other) */}
              <div className="space-y-2">
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] p-3 text-left transition hover:shadow-xs hover:border-[var(--accent-primary)] group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl ${cat.iconBg} shrink-0`}
                        >
                          <CatIcon size={18} />
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            {cat.name}
                          </p>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            {cat.count} files, {cat.size}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={15}
                        className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Starred Messages Quick Action */}
            <button
              type="button"
              onClick={() => {
                onOpenStarred?.();
                onClose?.();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-subtle)] py-2.5 text-xs font-semibold text-amber-500 hover:bg-[var(--bg-card)] transition shadow-2xs"
            >
              <Star size={14} className="fill-amber-400" />
              <span>Starred Messages</span>
            </button>
          </>
        )}
      </div>

      <MediaPreviewModal
        isOpen={Boolean(previewMediaUrl)}
        onClose={() => setPreviewMediaUrl(null)}
        mediaUrl={previewMediaUrl}
      />
    </div>
  );

  if (isInline) {
    return (
      <>
        {/* Desktop inline 4th column (>= 1280px) */}
        <aside className="w-80 shrink-0 border-l border-[var(--border-color)] hidden xl:block h-full transition-colors duration-200">
          {content}
        </aside>

        {/* Tablet & Mobile Slide-over Drawer (< 1280px) */}
        <div className="xl:hidden">
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl animate-in slide-in-from-right duration-200">
            {content}
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl animate-in slide-in-from-right duration-200">
        {content}
      </aside>
    </>
  );
};

export default MediaLinksDrawer;
