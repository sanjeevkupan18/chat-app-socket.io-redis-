const TypingIndicator = ({ typingName = "" }) => {
  return (
    <div className="flex items-center gap-2 px-5 py-2 animate-in fade-in duration-200">
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-3.5 py-1.5 shadow-xs">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)]" />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)]"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent-primary)]"
            style={{ animationDelay: "0.3s" }}
          />
        </div>
        <span className="text-[11px] font-medium text-[var(--text-muted)]">
          {typingName ? `${typingName} is typing...` : "Someone is typing..."}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;
