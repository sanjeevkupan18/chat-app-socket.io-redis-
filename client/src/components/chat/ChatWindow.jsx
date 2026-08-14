import { MessageCircle } from "lucide-react";

import { useState } from "react";

import ChatHeader from "./ChatHeader";

import MessageList from "./MessageList";

import MessageInput from "./MessageInput";

const ChatWindow = ({ conversation }) => {
  const [editingMessage, setEditingMessage] = useState(null);

  if (!conversation) {
    return (
      <main className="hidden flex-1 items-center justify-center bg-slate-950 md:flex">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-900">
            <MessageCircle size={35} className="text-blue-500" />
          </div>

          <h2 className="text-xl font-semibold text-white">Your messages</h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Select a conversation from the sidebar or search for someone to
            start a new chat.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-slate-950">
      <ChatHeader conversation={conversation} />

      <MessageList
        conversation={conversation}
        onStartEdit={setEditingMessage}
        editingMessageId={editingMessage?._id || null}
        onCancelEdit={() => setEditingMessage(null)}
      />

      <MessageInput
        key={`${conversation._id}-${editingMessage?._id || "new"}`}
        conversation={conversation}
        editingMessage={editingMessage}
        onCancelEdit={() => setEditingMessage(null)}
      />
    </main>
  );
};

export default ChatWindow;
