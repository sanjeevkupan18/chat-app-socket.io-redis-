import { MoreVertical, Phone, Video } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const ChatHeader = ({ conversation }) => {
  const { user } = useAuth();

  const otherUser = conversation?.participants?.find(
    (participant) => participant._id !== user._id,
  );

  if (!otherUser) {
    return null;
  }

  const getLastSeen = () => {
    if (otherUser.isOnline) {
      return "Online";
    }

    if (!otherUser.lastSeen) {
      return "Offline";
    }

    return `Last seen ${new Date(otherUser.lastSeen).toLocaleString([], {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-5">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
            {otherUser.name?.charAt(0).toUpperCase()}
          </div>

          {otherUser.isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-500" />
          )}
        </div>

        <div>
          <h2 className="font-semibold text-white">{otherUser.name}</h2>

          <p
            className={`text-xs ${
              otherUser.isOnline ? "text-green-400" : "text-slate-500"
            }`}
          >
            {getLastSeen()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button className="rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-800 hover:text-white">
          <Phone size={19} />
        </button>

        <button className="rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-800 hover:text-white">
          <Video size={19} />
        </button>

        <button className="rounded-lg p-2.5 text-slate-500 transition hover:bg-slate-800 hover:text-white">
          <MoreVertical size={19} />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
