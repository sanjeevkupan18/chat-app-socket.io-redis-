import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, BarChart2 } from "lucide-react";

const CreatePollModal = ({ isOpen, onClose, onCreatePoll }) => {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length >= 8) return;
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (validOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }

    onCreatePoll?.({
      question: question.trim(),
      options: validOptions.map((text, idx) => ({
        id: `opt_${Date.now()}_${idx}`,
        text,
        votes: [],
      })),
      allowMultipleAnswers,
    });

    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-150 select-none"
      style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl transition-colors">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <BarChart2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Create a Poll</h2>
              <p className="text-xs text-[var(--text-secondary)]">Ask your team or friends</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-500">
              {error}
            </div>
          )}

          {/* Question Input */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setError("");
              }}
              placeholder="e.g. Which design do you prefer?"
              maxLength={200}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition"
              autoFocus
            />
          </div>

          {/* Options List */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Options (2 to 8)
            </label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={100}
                    className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-subtle)] px-3.5 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition"
                      title="Remove option"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                <Plus size={14} /> Add option
              </button>
            )}
          </div>

          {/* Multiple Answers Checkbox */}
          <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-3">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Allow multiple answers
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Voters can select more than one option
              </p>
            </div>
            <input
              type="checkbox"
              checked={allowMultipleAnswers}
              onChange={(e) => setAllowMultipleAnswers(e.target.checked)}
              className="h-4 w-4 rounded-md accent-[var(--accent-primary)] cursor-pointer"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--accent-primary)] px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-90 active:scale-95 transition"
            >
              Create Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent;
};

export default CreatePollModal;
