import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, Loader2, Plus, Search, Trash2, UploadCloud, Users, X } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { getMediaUrl } from "../../config/endpoints";

const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const { user } = useAuth();

  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIcon, setGroupIcon] = useState("");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const iconInputRef = useRef(null);

  // Load contacts and search dynamically
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const trimmed = searchQuery.trim();
        const endpoint = trimmed
          ? `/users/search?search=${encodeURIComponent(trimmed)}`
          : "/users/search";

        const res = await api.get(endpoint);
        if (isMounted) {
          setAvailableUsers((res.data || []).filter((u) => u._id !== user._id));
        }
      } catch (err) {
        console.error("Fetch users error:", err);
      } finally {
        if (isMounted) {
          setLoadingUsers(false);
        }
      }
    };

    const timer = setTimeout(fetchUsers, searchQuery.trim() ? 250 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, searchQuery, user._id]);

  if (!isOpen) return null;

  const toggleSelectUser = (participant) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((u) => u._id === participant._id);
      if (exists) {
        return prev.filter((u) => u._id !== participant._id);
      }
      return [...prev, participant];
    });
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file");
      return;
    }

    try {
      setUploadingIcon(true);
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrl = res.data?.url || res.data?.fileUrl;
      if (newUrl) {
        setGroupIcon(newUrl);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.message || "Failed to upload group photo");
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setError("Please provide a group name");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Please select at least 1 other participant");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const response = await api.post("/conversations/group", {
        groupName: trimmedName,
        groupDescription: groupDescription.trim(),
        groupIcon: groupIcon.trim(),
        memberIds: selectedUsers.map((u) => u._id),
      });

      onGroupCreated?.(response.data);
      onClose();
    } catch (err) {
      console.error("Create group error:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Create New Group</h2>
              <p className="text-xs text-[var(--text-secondary)]">Start a group conversation with contacts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
              {error}
            </div>
          )}

          {/* Group Picture Picker */}
          <div className="flex flex-col items-center justify-center pb-1">
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconUpload}
            />

            <div className="relative group cursor-pointer" onClick={() => iconInputRef.current?.click()}>
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--border-color)] bg-[var(--bg-subtle)] shadow-sm">
                {groupIcon ? (
                  <img
                    src={getMediaUrl(groupIcon)}
                    alt="Group icon"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-xl font-bold text-white">
                    {groupName ? groupName.charAt(0).toUpperCase() : <Users size={24} />}
                  </div>
                )}

                {uploadingIcon ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white">
                    <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white">
                    <Camera size={18} />
                  </div>
                )}
              </div>

              <button
                type="button"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md text-xs"
                title="Add group photo"
              >
                <Camera size={12} />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-[var(--text-muted)] font-medium">
              {groupIcon ? "Group photo added" : "Add group picture (optional)"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Group Name *
            </label>
            <input
              type="text"
              required
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Real estate deals"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 outline-none transition focus:border-[var(--accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              Description (Optional)
            </label>
            <input
              type="text"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 outline-none transition focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Member Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Select Participants ({selectedUsers.length} selected)
              </label>
            </div>

            {/* Selected pills */}
            {selectedUsers.length > 0 && (
              <div className="mb-2.5 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedUsers.map((u) => (
                  <span
                    key={u._id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 px-2.5 py-1 text-xs text-[var(--text-primary)]"
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectUser(u)}
                      className="rounded-full hover:opacity-80"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-3 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] py-2.5 pl-9 pr-3.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 outline-none transition focus:border-[var(--accent-primary)]"
              />
              {loadingUsers && (
                <Loader2 size={14} className="absolute right-3 top-3 animate-spin text-[var(--accent-primary)]" />
              )}
            </div>

            {/* Participants Selection List */}
            <div className="mt-2.5 max-h-44 overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)] p-1 divide-y divide-[var(--border-color)]">
              {loadingUsers && availableUsers.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-[var(--text-secondary)]">
                  <Loader2 size={14} className="animate-spin text-[var(--accent-primary)]" />
                  <span>Loading contacts...</span>
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-[var(--text-secondary)]">
                  {searchQuery.trim()
                    ? `No contacts found matching "${searchQuery}"`
                    : "No other contacts registered yet"}
                </div>
              ) : (
                availableUsers.map((participant) => {
                  const isSelected = selectedUsers.some((u) => u._id === participant._id);
                  return (
                    <button
                      key={participant._id}
                      type="button"
                      onClick={() => toggleSelectUser(participant)}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                        isSelected
                          ? "bg-[var(--accent-primary)]/15 text-[var(--text-primary)]"
                          : "text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {participant.avatar ? (
                          <img
                            src={getMediaUrl(participant.avatar)}
                            alt={participant.name}
                            className="h-7 w-7 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] font-semibold text-white text-[11px]">
                            {participant.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--text-primary)]">{participant.name}</p>
                          <p className="truncate text-[10px] text-[var(--text-secondary)]">{participant.email}</p>
                        </div>
                      </div>

                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                          isSelected
                            ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                            : "border-[var(--border-color)] bg-[var(--bg-card)]"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim() || selectedUsers.length === 0}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {creating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Create Group ({selectedUsers.length})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default CreateGroupModal;
