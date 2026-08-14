const TypingIndicator = () => {
  return (
    <div className="flex items-center gap-2 px-5 py-2">
      <div className="rounded-2xl rounded-bl-sm bg-slate-800 px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
            style={{
              animationDelay: "0.15s",
            }}
          />

          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500"
            style={{
              animationDelay: "0.3s",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
