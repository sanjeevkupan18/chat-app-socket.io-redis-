import { useEffect, useRef, useState } from "react";

import { Check, Send, Smile, X } from "lucide-react";

import { useSocket } from "../../context/SocketContext";

const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "😊",
  "😎",
  "😅",
  "😉",
  "😭",
  "🔥",
  "✨",
  "👍",
  "🙏",
  "🎉",
  "💬",
  "💙",
  "🤍",
];

const MessageInput = ({ conversation, editingMessage, onCancelEdit }) => {
  const { socket } = useSocket();

  const [text, setText] = useState(() => editingMessage?.text || "");

  const [showPicker, setShowPicker] = useState(false);

  const [pickerTab, setPickerTab] = useState("emoji");

  const [gifUrl, setGifUrl] = useState("");

  const [pickerStyle, setPickerStyle] = useState(null);

  const typingTimeout = useRef(null);

  const pickerRef = useRef(null);

  const emojiButtonRef = useRef(null);

  const textareaRef = useRef(null);

  const isEditing = Boolean(editingMessage);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!showPicker) {
      return;
    }

    const updatePickerPosition = () => {
      const buttonRect = emojiButtonRef.current?.getBoundingClientRect();

      if (!buttonRect) {
        return;
      }

      const viewportPadding = 12;
      const preferredWidth = 320;
      const availableWidth = window.innerWidth - viewportPadding * 2;
      const width = Math.min(preferredWidth, availableWidth);

      let left = buttonRect.left;

      if (left + width > window.innerWidth - viewportPadding) {
        left = window.innerWidth - viewportPadding - width;
      }

      if (left < viewportPadding) {
        left = viewportPadding;
      }

      setPickerStyle({
        left,
        bottom: Math.max(window.innerHeight - buttonRect.top + 12, viewportPadding),
        width,
      });
    };

    updatePickerPosition();

    window.addEventListener("resize", updatePickerPosition);
    window.addEventListener("scroll", updatePickerPosition, true);

    return () => {
      window.removeEventListener("resize", updatePickerPosition);
      window.removeEventListener("scroll", updatePickerPosition, true);
    };
  }, [showPicker]);

  const stopTyping = () => {
    if (!socket || !conversation?._id) {
      return;
    }

    socket.emit("typing", {
      conversationId: conversation._id,
      isTyping: false,
    });
  };

  const sendTextMessage = () => {
    if (!socket || !conversation || !text.trim()) {
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser) {
      return;
    }

    const receiver = conversation.participants.find(
      (participant) => participant._id !== currentUser._id,
    );

    if (!receiver) {
      return;
    }

    socket.emit("sendMessage", {
      conversationId: conversation._id,
      receiverId: receiver._id,
      text: text.trim(),
    });

    setText("");
    setShowPicker(false);
    setPickerStyle(null);

    clearTimeout(typingTimeout.current);
    stopTyping();
  };

  const sendGifMessage = () => {
    if (!socket || !conversation || !gifUrl.trim()) {
      return;
    }

    const currentUser = JSON.parse(localStorage.getItem("user"));

    if (!currentUser) {
      return;
    }

    const receiver = conversation.participants.find(
      (participant) => participant._id !== currentUser._id,
    );

    if (!receiver) {
      return;
    }

    socket.emit("sendMessage", {
      conversationId: conversation._id,
      receiverId: receiver._id,
      text: gifUrl.trim(),
      messageType: "image",
    });

    setGifUrl("");
    setShowPicker(false);
    setPickerStyle(null);

    clearTimeout(typingTimeout.current);
    stopTyping();
  };

  const submitMessage = () => {
    if (!socket || !conversation || !text.trim()) {
      return;
    }

    const trimmedText = text.trim();

    if (isEditing) {
      socket.emit("editMessage", {
        conversationId: conversation._id,
        messageId: editingMessage._id,
        text: trimmedText,
      });

      setText("");
      setShowPicker(false);
      setPickerStyle(null);

      clearTimeout(typingTimeout.current);
      stopTyping();
      onCancelEdit?.();
      return;
    }

    sendTextMessage();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitMessage();
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;

    setText(value);

    if (!socket || !conversation?._id) {
      return;
    }

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
    }, 1000);
  };

  const appendEmoji = (emoji) => {
    const nextValue = `${text}${emoji}`;
    setText(nextValue);
    setShowPicker(false);
    setPickerStyle(null);

    textareaRef.current?.focus();

    if (socket && conversation?._id && nextValue.trim()) {
      socket.emit("typing", {
        conversationId: conversation._id,
        isTyping: true,
      });

      clearTimeout(typingTimeout.current);

      typingTimeout.current = setTimeout(() => {
        stopTyping();
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeout.current);
    };
  }, []);

  if (!conversation) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-4">
      <div className="mx-auto max-w-4xl">
        {isEditing && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-blue-300" />
              <span>Edit message</span>
            </div>

            <button
              type="button"
              onClick={() => {
                setText("");
                setShowPicker(false);
                setPickerStyle(null);
                clearTimeout(typingTimeout.current);
                stopTyping();
                onCancelEdit?.();
              }}
              className="rounded-lg p-1 text-blue-200 transition hover:bg-blue-500/15 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="relative overflow-visible" ref={pickerRef}>
          {showPicker && pickerStyle && (
            <div
              className="fixed px-5 z-50 max-h-[calc(100vh-9rem)] overflow-y-auto overflow-x-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40"
              style={{
                left: `${pickerStyle.left}px`,
                bottom: `${pickerStyle.bottom}px`,
                width: `${pickerStyle.width}px`,
              }}
            >
              <div className="flex items-center gap-2 border-b border-slate-800 px-2.5 py-2.5">
                <button
                  type="button"
                  onClick={() => setPickerTab("emoji")}
                  className={`rounded-full px-5 py-1.5 text-[11px] font-semibold transition ${
                    pickerTab === "emoji"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Emoji
                </button>

                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setPickerTab("gif")}
                    className={`rounded-full px-5 py-1.5 text-[11px] font-semibold transition ${
                      pickerTab === "gif"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    GIF
                  </button>
                )}
              </div>

              {pickerTab === "emoji" && (
                <div className="max-h-64 overflow-y-auto overflow-x-hidden p-3">
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => appendEmoji(emoji)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl transition hover:bg-slate-700"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pickerTab === "gif" && !isEditing && (
                <div className="space-y-2.5 p-2.5">
                  <div className="rounded-2xl border border-slate-700 bg-slate-800 p-2.5">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      GIF URL
                    </label>

                    <input
                      value={gifUrl}
                      onChange={(event) => setGifUrl(event.target.value)}
                      placeholder="Paste a gif image URL..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                    />

                    {gifUrl.trim() && (
                      <div className="mt-2 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                        <img
                          src={gifUrl.trim()}
                          alt="GIF preview"
                          className="max-h-40 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={sendGifMessage}
                    disabled={!gifUrl.trim()}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={16} />
                    Send GIF
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              type="button"
              ref={emojiButtonRef}
              onClick={() => {
                setPickerTab("emoji");
                setShowPicker((current) => {
                  const next = !current;

                  if (!next) {
                    setPickerStyle(null);
                  }

                  return next;
                });
              }}
              className={`mb-1 rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 ${
                showPicker ? "bg-slate-800 text-slate-200" : ""
              }`}
            >
              <Smile size={20} />
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={
                isEditing ? "Edit your message..." : "Type a message..."
              }
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />

            <button
              type="button"
              onClick={submitMessage}
              disabled={!text.trim()}
              className="mb-0.5 flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={18} />
              <span className="text-sm font-medium">
                {isEditing ? "Save" : "Send"}
              </span>
            </button>
          </div>
        </div>

        <p className="mx-auto mt-2 max-w-4xl text-[10px] text-slate-600">
          Press Enter to send • Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
};

export default MessageInput;
