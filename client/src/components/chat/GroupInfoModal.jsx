import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  Check,
  Crown,
  Edit2,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../common/ConfirmDialog";
import { getMediaUrl } from "../../config/endpoints";

const GroupInfoModal = ({
  isOpen,
  onClose,
  conversation,
  onGroupUpdated,
  onLeaveGroup,
}) => {
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(conversation?.groupName || "");
  const [description, setDescription] = useState(conversation?.groupDescription || "");
  const [groupIcon, setGroupIcon] = useState(conversation?.groupIcon || "");
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [iconError, setIconError] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const iconInputRef = useRef(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    type: "danger",
    action: null,
  });

  // Add member search
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [prevConvId, setPrevConvId] = useState(conversation?._id);
  if (conversation?._id !== prevConvId) {
    setPrevConvId(conversation?._id);
    setName(conversation?.groupName || "");
    setDescription(conversation?.groupDescription || "");
    setGroupIcon(conversation?.groupIcon || "");
    setIsEditing(false);
    setError("");
    setSuccessMessage("");
  }

  useEffect(() => {
    if (!showAddMember) return;

    let isMounted = true;
    const fetchMembers = async () => {
      try {
        setSearching(true);
        const trimmed = memberQuery.trim();
        const endpoint = trimmed
          ? `/users/search?search=${encodeURIComponent(trimmed)}`
          : "/users/search";

        const res = await api.get(endpoint);
        if (isMounted) {
          // filter out current participants
          const existingIds = new Set((conversation?.participants || []).map((p) => p._id));
          setSearchResults((res.data || []).filter((u) => !existingIds.has(u._id)));
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        if (isMounted) {
          setSearching(false);
        }
      }
    };

    const timer = setTimeout(fetchMembers, memberQuery.trim() ? 250 : 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [memberQuery, showAddMember, conversation?.participants]);

  if (!isOpen || !conversation) return null;

  const isAdmin = (conversation.groupAdmins || []).some(
    (admin) => (admin._id || admin) === user._id,
  );

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAdmin) {
      setError("Only group admins can change the group picture");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingIcon(true);
      setError("");
      setSuccessMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const newUrl = uploadRes.data?.url || uploadRes.data?.fileUrl;
      if (newUrl) {
        const updateRes = await api.put(`/conversations/group/${conversation._id}`, {
          groupIcon: newUrl,
        });
        setGroupIcon(newUrl);
        setIconError(false);
        onGroupUpdated?.(updateRes.data);
        setSuccessMessage("Group profile picture updated!");
        setTimeout(() => setSuccessMessage(""), 3500);
      }
    } catch (err) {
      console.error("Group icon upload error:", err);
      setError(err.response?.data?.message || "Failed to upload group picture");
    } finally {
      setUploadingIcon(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleRemoveIcon = async () => {
    if (!isAdmin) return;
    try {
      setUploadingIcon(true);
      setError("");
      const updateRes = await api.put(`/conversations/group/${conversation._id}`, {
        groupIcon: "",
      });
      setGroupIcon("");
      setIconError(false);
      onGroupUpdated?.(updateRes.data);
      setSuccessMessage("Group profile picture removed");
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove group picture");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      setError("");
      const res = await api.put(`/conversations/group/${conversation._id}`, {
        groupName: name.trim(),
        groupDescription: description.trim(),
      });
      onGroupUpdated?.(res.data);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleMemberAction = async (action, targetUserId) => {
    try {
      setActionLoading(true);
      setError("");
      const res = await api.put(`/conversations/group/${conversation._id}/members`, {
        action,
        memberId: targetUserId,
        userId: targetUserId,
      });
      onGroupUpdated?.(res.data);
      if (action === "add") {
        setShowAddMember(false);
        setMemberQuery("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdminAction = async (action, targetUserId) => {
    try {
      setActionLoading(true);
      setError("");
      const res = await api.put(`/conversations/group/${conversation._id}/admins`, {
        action,
        memberId: targetUserId,
        userId: targetUserId,
      });
      onGroupUpdated?.(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Admin update failed");
    } finally {
      setActionLoading(false);
    }
  };

  const promptLeaveGroup = () => {
    setConfirmModal({
      isOpen: true,
      title: "Leave Group",
      message: `Are you sure you want to leave "${conversation.groupName}"? You won't be able to send or receive messages in this group unless added back.`,
      confirmText: "Leave Group",
      type: "danger",
      action: async () => {
        try {
          setActionLoading(true);
          await api.put(`/conversations/group/${conversation._id}/members`, {
            action: "remove",
            memberId: user._id,
            userId: user._id,
          });
          onLeaveGroup?.(conversation._id);
          onClose();
        } catch (err) {
          setError(err.response?.data?.message || "Failed to leave group");
        } finally {
          setActionLoading(false);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const promptRemoveMember = (participant) => {
    setConfirmModal({
      isOpen: true,
      title: "Remove Participant",
      message: `Are you sure you want to remove ${participant.name} from "${conversation.groupName}"?`,
      confirmText: "Remove",
      type: "danger",
      action: async () => {
        await handleMemberAction("remove", participant._id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card)] px-6 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Group Details</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                {conversation.participants?.length || 0} participants
              </p>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-500 animate-in fade-in">
              <Check size={14} className="text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Group Identity Card with Photo Management for Admin */}
          <div className="flex flex-col items-center text-center">
            {/* Hidden File Picker for Group Picture */}
            <input
              ref={iconInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconUpload}
            />

            <div className="relative group">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-4 border-[var(--bg-subtle)] bg-[var(--bg-card)] shadow-xl transition">
                {groupIcon && !iconError ? (
                  <img
                    src={getMediaUrl(groupIcon)}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={() => setIconError(true)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-700 text-3xl font-bold text-white shadow-xl">
                    {name?.charAt(0).toUpperCase() || <Users size={32} />}
                  </div>
                )}

                {/* Upload Spinner Overlay */}
                {uploadingIcon && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 text-white">
                    <Loader2 size={24} className="animate-spin text-[var(--accent-primary)]" />
                    <span className="mt-1 text-[9px] font-medium text-white">Uploading...</span>
                  </div>
                )}

                {/* Admin Hover Camera Prompt */}
                {isAdmin && !uploadingIcon && (
                  <button
                    type="button"
                    onClick={() => iconInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 text-white cursor-pointer"
                    title="Change group picture"
                  >
                    <Camera size={22} />
                    <span className="mt-1 text-[10px] font-medium">Change</span>
                  </button>
                )}
              </div>

              {/* Admin Camera Badge on Corner */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-lg transition hover:bg-[var(--accent-hover)] disabled:opacity-50 cursor-pointer"
                  title="Change group picture"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>

            {/* Admin Photo Controls */}
            {isAdmin && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition shadow-2xs cursor-pointer"
                >
                  <UploadCloud size={13} className="text-[var(--accent-primary)]" />
                  <span>{groupIcon ? "Change Photo" : "Upload Group Photo"}</span>
                </button>

                {groupIcon && (
                  <button
                    type="button"
                    onClick={handleRemoveIcon}
                    disabled={uploadingIcon}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            )}

            {isEditing ? (
              <div className="mt-4 w-full space-y-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-center text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Group description..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-app)] px-3.5 py-2 text-center text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-[var(--border-color)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInfo}
                    disabled={saving}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
                  >
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{conversation.groupName}</h3>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-lg p-1 text-[var(--text-secondary)] hover:bg-[var(--bg-app)] hover:text-[var(--text-primary)]"
                      title="Edit group details"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
                {conversation.groupDescription && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-sm">
                    {conversation.groupDescription}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Members Header */}
          <div className="border-t border-[var(--border-color)] pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Participants ({conversation.participants?.length || 0})
              </span>
              {isAdmin && !showAddMember && (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80"
                >
                  <Plus size={14} />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            {/* Add Member inline search */}
            {showAddMember && (
              <div className="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)]/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[var(--text-primary)]">Add New Participant</p>
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={memberQuery}
                    onChange={(e) => setMemberQuery(e.target.value)}
                    placeholder="Search user name or email..."
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] py-2 pl-9 pr-3 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)]/60 outline-none focus:border-[var(--accent-primary)]"
                  />
                  {searching && (
                    <Loader2 size={13} className="absolute right-3 top-2.5 animate-spin text-[var(--accent-primary)]" />
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto divide-y divide-[var(--border-color)] rounded-xl bg-[var(--bg-card)] p-1">
                    {searchResults.map((sr) => (
                      <div
                        key={sr._id}
                        className="flex items-center justify-between p-2 text-xs text-[var(--text-primary)]"
                      >
                        <div className="flex items-center gap-2">
                          {sr.avatar ? (
                            <img
                              src={getMediaUrl(sr.avatar)}
                              alt={sr.name}
                              className="h-6 w-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-white shrink-0">
                              {sr.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{sr.name}</p>
                            <p className="text-[10px] text-[var(--text-secondary)]">{sr.email}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleMemberAction("add", sr._id)}
                          className="rounded-lg bg-[var(--accent-primary)] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
                        >
                          + Add
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  !searching && (
                    <p className="py-2 text-center text-xs text-[var(--text-secondary)]">
                      {memberQuery.trim()
                        ? `No users found matching "${memberQuery}"`
                        : "No other users to add"}
                    </p>
                  )
                )}
              </div>
            )}

            {/* Participants List */}
            <div className="divide-y divide-[var(--border-color)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-app)]/60 overflow-hidden">
              {(conversation.participants || []).map((participant) => {
                const isParticipantAdmin = (conversation.groupAdmins || []).some(
                  (a) => (a._id || a) === participant._id,
                );
                const isCurrentUser = participant._id === user._id;

                return (
                  <div
                    key={participant._id}
                    className="flex items-center justify-between p-3 transition hover:bg-[var(--bg-card)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {participant.avatar ? (
                          <img
                            src={getMediaUrl(participant.avatar)}
                            alt={participant.name}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] font-semibold text-white text-xs">
                            {participant.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {participant.isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">
                            {participant.name}
                            {isCurrentUser && " (You)"}
                          </p>
                          {isParticipantAdmin && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--accent-primary)]/15 px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-primary)]">
                              <Crown size={9} />
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {participant.isOnline ? "Online" : "Offline"}
                        </p>
                      </div>
                    </div>

                    {/* Admin management actions */}
                    {isAdmin && !isCurrentUser && (
                      <div className="flex items-center gap-1">
                        {isParticipantAdmin ? (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAdminAction("demote", participant._id)}
                            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-amber-500"
                            title="Dismiss as Admin"
                          >
                            <UserX size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAdminAction("promote", participant._id)}
                            className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--accent-primary)]"
                            title="Make Group Admin"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => promptRemoveMember(participant)}
                          className="rounded-lg p-1.5 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
                          title="Remove from group"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-card)] p-4 shrink-0 flex items-center justify-between">
          <button
            type="button"
            onClick={promptLeaveGroup}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-500/10"
          >
            <LogOut size={14} />
            <span>Leave Group</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-primary)] hover:text-[var(--text-primary)]"
          >
            Close
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        type={confirmModal.type}
        loading={actionLoading}
      />
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default GroupInfoModal;
