import { useState } from "react";

import { MessageCircle, LogOut, Settings, User } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

import ProfileModal from "./ProfileModal";

import UserSearch from "../search/UserSearch";

const Sidebar = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onSelectUser,
}) => {
  const { user, logout } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getOtherUser = (conversation) => {
    return conversation.participants.find(
      (participant) => participant._id !== user._id,
    );
  };

  const formatTime = (date) => {
    if (!date) {
      return "";
    }

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-900 md:w-80">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <MessageCircle size={21} className="text-white" />
          </div>

          <div>
            <h1 className="font-bold text-white">ChatApp</h1>

            <p className="text-xs text-slate-500">Messages</p>
          </div>
        </div>

        
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-slate-500 transition hover:bg-slate-800 hover:text-red-400"
        >
          <LogOut size={19} />

          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

      {/* Current User */}

      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}

              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-500" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.name}
              </p>

              <p className="truncate text-xs text-green-400">Online</p>
            </div>
          </div>

          <button
            onClick={() => setIsProfileOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-blue-500 hover:text-white"
          >
            <User size={14} />

            <span>Profile</span>
          </button>
        </div>
      </div>

      {/* Search */}

      <div className="pt-4">
        <UserSearch onSelectUser={onSelectUser} />
      </div>

      {/* Conversations */}

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pb-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Conversations
          </p>
        </div>

        {conversations.length === 0 && (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-slate-500">No conversations yet</p>

            <p className="mt-1 text-xs text-slate-600">
              Search for someone to start chatting
            </p>
          </div>
        )}

        {conversations.map((conversation) => {
          const otherUser = getOtherUser(conversation);

          const isSelected = selectedConversation?._id === conversation._id;

          return (
            <button
              key={conversation._id}
              onClick={() => onSelectConversation(conversation)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                isSelected ? "bg-blue-600/10" : "hover:bg-slate-800/70"
              }`}
            >
              {/* Avatar */}

              <div className="relative shrink-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-700 font-semibold text-white">
                  {otherUser?.name?.charAt(0).toUpperCase()}
                </div>

                {otherUser?.isOnline && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-500" />
                )}
              </div>

              {/* Info */}

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`truncate text-sm font-medium ${
                      isSelected ? "text-blue-400" : "text-white"
                    }`}
                  >
                    {otherUser?.name}
                  </p>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-600">
                      {formatTime(conversation.lastMessage?.createdAt)}
                    </span>

                    {conversation.unreadCount > 0 && !isSelected && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {conversation.unreadCount > 99
                          ? "99+"
                          : conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {conversation.lastMessage
                    ? conversation.lastMessage.messageType === "image"
                      ? "GIF"
                      : conversation.lastMessage.text
                    : "Start a conversation"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}

      <div className="border-t border-slate-800 p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-slate-500 transition hover:bg-slate-800 hover:text-white">
          <Settings size={18} />

          <span className="text-sm">Settings</span>
        </button>
      </div>

      <ProfileModal
        key={`${user?._id || "user"}-${isProfileOpen ? "open" : "closed"}`}
        open={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;
