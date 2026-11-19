import { useMemo } from "react";
import { Check, BarChart2 } from "lucide-react";
import { getMediaUrl } from "../../config/endpoints";

const PollBubble = ({ message, currentUserId, onVote, isMine }) => {
  const poll = message.poll;

  const totalVotes = useMemo(() => {
    if (!poll?.options) return 0;
    return poll.options.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);
  }, [poll]);

  if (!poll || !poll.options) {
    return <p className="text-xs italic text-[var(--text-muted)]">Poll unavailable</p>;
  }

  return (
    <div className="w-full min-w-[240px] max-w-sm py-1 select-none">
      {/* Poll Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shrink-0">
            <BarChart2 size={13} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)]">
            {poll.allowMultipleAnswers ? "Multiple Choice Poll" : "Poll"}
          </span>
        </div>
        <span className="text-[10px] font-medium text-[var(--text-muted)]">
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </span>
      </div>

      {/* Question */}
      <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 leading-snug">
        {poll.question}
      </h4>

      {/* Options List */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const hasVoted = option.votes?.some(
            (v) => (v?._id || v)?.toString() === currentUserId?.toString(),
          );

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onVote?.(message._id, option.id)}
              className={`relative w-full overflow-hidden rounded-2xl border text-left p-2.5 transition-all cursor-pointer ${
                hasVoted
                  ? "border-[var(--accent-primary)] bg-[var(--accent-light)]/40 shadow-xs"
                  : "border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-primary)]/50"
              }`}
            >
              {/* Background Animated Progress Bar */}
              <div
                className={`absolute inset-y-0 left-0 transition-all duration-300 pointer-events-none rounded-2xl ${
                  hasVoted ? "bg-[var(--accent-primary)]/20" : "bg-[var(--bg-subtle)]"
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Option Text and Stats */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Radio / Checkbox Indicator */}
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border transition ${
                      poll.allowMultipleAnswers ? "rounded-xs" : "rounded-full"
                    } ${
                      hasVoted
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : "border-[var(--border-color)] bg-[var(--bg-card)]"
                    }`}
                  >
                    {hasVoted && <Check size={11} strokeWidth={3} />}
                  </div>

                  <span
                    className={`text-xs truncate ${
                      hasVoted
                        ? "font-bold text-[var(--text-primary)]"
                        : "font-medium text-[var(--text-primary)]"
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                {/* Percentage & Vote Count */}
                <div className="flex items-center gap-1.5 shrink-0 text-right">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Voters Avatars Row */}
              {option.votes && option.votes.length > 0 && (
                <div className="relative z-10 mt-1.5 flex items-center gap-1 pl-6">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {option.votes.slice(0, 4).map((voter, vIdx) => {
                      const voterObj = typeof voter === "object" ? voter : null;
                      return (
                        <div
                          key={vIdx}
                          className="inline-block h-4 w-4 rounded-full ring-1 ring-[var(--bg-card)] bg-[var(--accent-primary)] text-[8px] font-bold text-white flex items-center justify-center overflow-hidden"
                          title={voterObj?.name || "Voter"}
                        >
                          {voterObj?.avatar ? (
                            <img
                              src={getMediaUrl(voterObj.avatar)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            voterObj?.name?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    {voteCount} {voteCount === 1 ? "vote" : "votes"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PollBubble;
