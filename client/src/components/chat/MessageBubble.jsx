import { useEffect, useRef, useState } from "react";

import { Check, CheckCheck, MoreVertical, PencilLine, Trash2 } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const MessageBubble = ({ message, onEdit, onDelete }) => {
  const { user } = useAuth();

  const menuRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);

  const isMine = message.sender?._id === user._id;

  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isDeleted = Boolean(message.isDeleted);

  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[75%] ${
          isMine ? "items-end" : "items-start"
        } flex flex-col`}
      >
        <div
          className={`relative rounded-2xl px-4 py-2.5 ${
            isMine
              ? "rounded-br-sm bg-blue-600 text-white"
              : "rounded-bl-sm bg-slate-800 text-slate-100"
          } ${isMine && !isDeleted ? "pr-10" : ""}`}
        >
          {!isDeleted ? (
            message.messageType === "image" ? (
              <img
                src={message.text}
                alt="GIF message"
                className="max-h-64 max-w-full rounded-xl object-cover"
              />
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.text}
              </p>
            )
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm italic leading-6 text-slate-400">
              Message deleted
            </p>
          )}

          {isMine && !isDeleted && (
            <div className="absolute right-1 top-1" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu((current) => !current)}
                className={`rounded-full p-1.5 text-white/80 transition hover:bg-white/10 ${
                  showMenu
                    ? "opacity-100"
                    : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                }`}
                aria-label="Message actions"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 z-20 w-32 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      onEdit?.(message);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800"
                  >
                    <PencilLine size={13} />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDelete?.(message);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div
          className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-slate-600`}
        >
          <span>{time}</span>

          {message.editedAt && !isDeleted && (
            <span className="text-slate-500">edited</span>
          )}

          {isMine &&
            (message.isRead ? (
              <CheckCheck size={13} className="text-blue-500" />
            ) : (
              <Check size={13} />
            ))}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
