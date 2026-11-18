import { useEffect, useRef, useState } from "react";
import {
  Send,
  Smile,
  X,
  Paperclip,
  Mic,
  Trash2,
  Image,
  FileText,
  Film,
  Loader2,
  Reply,
  PencilLine,
  AtSign,
} from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import ConfirmDialog from "../common/ConfirmDialog";

const EMOJIS = [
  "😀", "😂", "😍", "😊", "😎", "😅", "😉", "😭",
  "🔥", "✨", "👍", "🙏", "🎉", "💬", "💙", "🤍",
  "❤️", "👏", "🙌", "💯", "🚀", "🤔", "👀", "🤝"
];

const MessageInput = ({
  conversation,
  editingMessage,
  onCancelEdit,
  replyingTo,
  onCancelReply,
}) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [text, setText] = useState(() => editingMessage?.text || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Mention state for group chats
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);

  // Custom alert dialog state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "warning",
  });

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const typingTimeout = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const mentionMenuRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const isEditing = Boolean(editingMessage);
  const isGroup = Boolean(conversation?.isGroup);

  const mentionCandidates =
    isGroup && showMentionList
      ? (conversation.participants || []).filter((p) => {
          if (!p) return false;
          if (String(p._id) === String(user?._id)) return false;
          if (!mentionQuery) return true;
          return (
            p.name?.toLowerCase().includes(mentionQuery) ||
            p.email?.toLowerCase().includes(mentionQuery)
          );
        })
      : [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
      if (attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
      if (mentionMenuRef.current && !mentionMenuRef.current.contains(event.target)) {
        setShowMentionList(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getReceiver = () => {
    if (!user || !conversation) return null;
    return conversation.participants.find(
      (participant) => participant._id !== user._id,
    );
  };

  const stopTyping = () => {
    if (!socket || !conversation?._id) return;
    socket.emit("typing", {
      conversationId: conversation._id,
      isTyping: false,
    });
  };

  const selectMention = (participant) => {
    if (!participant) return;
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\s]{0,20})$/);

    let newText = "";
    let newPos = cursor;
    const tag = `@${participant.name} `;

    if (match) {
      const atIndex = cursor - match[1].length - 1;
      newText = text.slice(0, atIndex) + tag + textAfterCursor;
      newPos = atIndex + tag.length;
    } else {
      newText = textBeforeCursor + tag + textAfterCursor;
      newPos = cursor + tag.length;
    }

    setText(newText);
    setShowMentionList(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const triggerMention = () => {
    if (showMentionList) {
      setShowMentionList(false);
      return;
    }
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const textBeforeCursor = text.slice(0, cursor);
    const textAfterCursor = text.slice(cursor);
    const needsAt = !textBeforeCursor.endsWith("@");
    const newText = textBeforeCursor + (needsAt ? "@" : "") + textAfterCursor;
    const newPos = cursor + (needsAt ? 1 : 0);

    setText(newText);
    setShowMentionList(true);
    setMentionQuery("");
    setMentionIndex(0);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Submit Text (or Edit)
  const submitMessage = () => {
    if (!socket || !conversation || !text.trim()) return;
    const receiver = getReceiver();
    if (!isGroup && !receiver) return;

    const trimmedText = text.trim();

    if (isEditing) {
      socket.emit("editMessage", {
        conversationId: conversation._id,
        messageId: editingMessage._id,
        text: trimmedText,
      });

      setText("");
      setShowMentionList(false);
      clearTimeout(typingTimeout.current);
      stopTyping();
      onCancelEdit?.();
      return;
    }

    const mentions = isGroup
      ? (conversation.participants || [])
          .filter((p) => p._id !== user?._id && trimmedText.includes(`@${p.name}`))
          .map((p) => p._id)
      : [];

    socket.emit("sendMessage", {
      conversationId: conversation._id,
      receiverId: isGroup ? null : receiver?._id,
      text: trimmedText,
      messageType: "text",
      replyTo: replyingTo?._id || null,
      mentions,
    });

    setText("");
    setShowMentionList(false);
    setShowEmojiPicker(false);
    clearTimeout(typingTimeout.current);
    stopTyping();
    onCancelReply?.();
  };

  const handleKeyDown = (e) => {
    if (showMentionList && mentionCandidates.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(
          (prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectMention(mentionCandidates[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionList(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart ?? value.length;
    setText(value);

    if (isGroup) {
      const textBeforeCursor = value.slice(0, cursor);
      const mentionMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\s]{0,20})$/);
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1].toLowerCase());
        setShowMentionList(true);
        setMentionIndex(0);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }

    if (!socket || !conversation?._id) return;

    if (!value.trim()) {
      clearTimeout(typingTimeout.current);
      stopTyping();
      return;
    }

    socket.emit("typing", {
      conversationId: conversation._id,
      isTyping: true,
    });

    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      stopTyping();
    }, 1200);
  };

  // File / Media Upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !socket || !conversation) return;
    const receiver = getReceiver();
    if (!isGroup && !receiver) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      setShowAttachmentMenu(false);

      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      socket.emit("sendMessage", {
        conversationId: conversation._id,
        receiverId: isGroup ? null : receiver?._id,
        text: "",
        messageType: res.data.messageType,
        mediaUrl: res.data.url,
        fileName: res.data.fileName,
        fileSize: res.data.fileSize,
        replyTo: replyingTo?._id || null,
      });

      onCancelReply?.();
    } catch (err) {
      console.error("File upload error:", err);
      setAlertModal({
        isOpen: true,
        title: "Upload Failed",
        message: "Failed to upload file. Please check your network and try again.",
        type: "danger",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = (acceptType) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      setAlertModal({
        isOpen: true,
        title: "Microphone Access Required",
        message: "Could not access microphone. Please grant microphone permission in your browser to record voice notes.",
        type: "warning",
      });
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      } catch {
        // stream stop error ignored
      }
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  };

  const sendVoiceNote = () => {
    if (!mediaRecorderRef.current || !socket || !conversation) return;
    const receiver = getReceiver();
    if (!isGroup && !receiver) return;

    const duration = recordingDuration;
    clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      try {
        setUploading(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());

        const formData = new FormData();
        formData.append("file", audioBlob, `voice-${Date.now()}.webm`);

        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        socket.emit("sendMessage", {
          conversationId: conversation._id,
          receiverId: isGroup ? null : receiver?._id,
          text: "",
          messageType: "audio",
          mediaUrl: res.data.url,
          audioDuration: duration,
          replyTo: replyingTo?._id || null,
        });

        onCancelReply?.();
      } catch (err) {
        console.error("Voice note upload failed:", err);
      } finally {
        setUploading(false);
      }
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? "0" : ""}${remainder}`;
  };

  return (
    <footer className="relative bg-transparent p-2 sm:p-3 select-none">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Group Member Mention Autocomplete Popup */}
      {showMentionList && isGroup && (
        <div
          ref={mentionMenuRef}
          className="absolute bottom-full left-2 sm:left-4 z-50 mb-2 w-72 max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            <span>Mention Member</span>
            <button
              type="button"
              onClick={() => setShowMentionList(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={13} />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)] p-1">
            {mentionCandidates.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)]">
                {mentionQuery ? `No members matching "${mentionQuery}"` : "No other group members"}
              </div>
            ) : (
              mentionCandidates.map((candidate, idx) => (
                <button
                  key={candidate._id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectMention(candidate);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
                    idx === mentionIndex
                      ? "bg-[var(--accent-light)] text-[var(--accent-text)] font-semibold"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[10px] font-bold text-white">
                    {candidate.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{candidate.name}</p>
                    <p className="truncate text-[10px] text-[var(--text-muted)]">
                      {candidate.email}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 py-2 shadow-xs animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2.5 overflow-hidden border-l-4 border-[var(--accent-primary)] pl-2.5">
            <Reply size={15} className="shrink-0 text-[var(--accent-primary)]" />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[var(--accent-primary)]">
                Replying to {replyingTo.sender?.name || "Participant"}
              </span>
              <p className="line-clamp-1 text-xs text-[var(--text-muted)]">
                {replyingTo.isDeleted
                  ? "Deleted message"
                  : replyingTo.text ||
                    (replyingTo.messageType === "image"
                      ? "Photo"
                      : replyingTo.messageType === "audio"
                      ? "Voice note"
                      : replyingTo.messageType === "video"
                      ? "Video"
                      : "Attachment")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="rounded-full p-1 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {isEditing && (
        <div className="mb-2 flex items-center justify-between rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <div className="flex items-center gap-2 border-l-4 border-amber-500 pl-2.5">
            <PencilLine size={15} className="text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
              Editing message
            </span>
          </div>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Uploading Indicator */}
      {uploading && (
        <div className="mb-2 flex items-center justify-center gap-2 py-1 text-xs text-[var(--accent-primary)] bg-[var(--accent-light)]/40 rounded-xl">
          <Loader2 size={13} className="animate-spin" />
          <span>Uploading media to Cloudinary...</span>
        </div>
      )}

      <div>
        {isRecording ? (
          /* Voice Recording Mode */
          <div className="flex items-center justify-between rounded-full bg-[var(--bg-card)] px-4 py-2 border border-[var(--border-color)] shadow-md animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-mono text-sm text-red-500 font-semibold">
                {formatTimer(recordingDuration)}
              </span>
              <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                Recording audio...
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancelRecording}
                className="rounded-full p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-red-500"
                title="Cancel recording"
              >
                <Trash2 size={18} />
              </button>

              <button
                type="button"
                onClick={sendVoiceNote}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md transition hover:bg-[var(--accent-hover)]"
                title="Send voice note"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Standard Floating Pill Input Mode (Matches Reference UI) */
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] p-1 sm:p-1.5 pl-3.5 sm:pl-4 shadow-md transition-shadow focus-within:shadow-lg focus-within:border-[var(--accent-primary)]">
            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={
                  isEditing
                    ? "Edit message..."
                    : isGroup
                    ? "Message or @ to mention..."
                    : "Write your message..."
                }
                className="w-full resize-none bg-transparent pt-1 text-xs sm:text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none max-h-28 overflow-y-auto"
              />
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {/* Mention Button (Group Chats) */}
              {isGroup && (
                <button
                  type="button"
                  onClick={triggerMention}
                  className="rounded-full p-1 sm:p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--accent-primary)]"
                  title="Mention member (@)"
                >
                  <AtSign size={17} />
                </button>
              )}

              {/* Emoji Picker Button */}
              <div className="relative" ref={emojiPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                  className="rounded-full p-1 sm:p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  title="Emoji"
                >
                  <Smile size={18} />
                </button>

                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 z-40 w-72 max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <div className="grid grid-cols-8 gap-1.5 max-h-48 overflow-y-auto">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setText((prev) => prev + emoji);
                            setShowEmojiPicker(false);
                            textareaRef.current?.focus();
                          }}
                          className="rounded-lg p-1.5 text-lg transition hover:bg-[var(--bg-subtle)]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment Button */}
              <div className="relative" ref={attachmentMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu((prev) => !prev)}
                  className="rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                  title="Attach file"
                >
                  <Paperclip size={19} />
                </button>

                {showAttachmentMenu && (
                  <div className="absolute bottom-12 right-0 z-40 w-44 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-2 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => triggerFileInput("image/*")}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-xs text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="rounded-lg bg-pink-500/10 p-1.5 text-pink-500">
                        <Image size={15} />
                      </div>
                      <span>Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFileInput("video/*")}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-xs text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="rounded-lg bg-purple-500/10 p-1.5 text-purple-500">
                        <Film size={15} />
                      </div>
                      <span>Video</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => triggerFileInput("*")}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-xs text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                    >
                      <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-500">
                        <FileText size={15} />
                      </div>
                      <span>Document</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Voice Note or Send Button (Solid Accent Circle matching reference) */}
              {text.trim() || isEditing ? (
                <button
                  type="button"
                  onClick={submitMessage}
                  disabled={uploading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md transition hover:bg-[var(--accent-hover)] hover:scale-105 disabled:opacity-50"
                  title="Send message"
                >
                  <Send size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={uploading}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:bg-[var(--accent-primary)] hover:text-white transition shadow-2xs disabled:opacity-50"
                  title="Record voice note"
                >
                  <Mic size={17} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        type={alertModal.type}
        showCancel={false}
      />
    </footer>
  );
};

export default MessageInput;
