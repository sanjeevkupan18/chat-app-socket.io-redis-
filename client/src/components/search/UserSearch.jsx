import { useEffect, useRef, useState } from "react";
import { Search, X, Loader2 } from "lucide-react";
import api from "../../services/api";
import useDebounce from "../../hooks/useDebounce";
import { getMediaUrl } from "../../config/endpoints";

const UserSearch = ({ onSelectUser, onOpenCommandPalette }) => {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const containerRef = useRef(null);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    const searchUsers = async () => {
      if (!debouncedSearch.trim()) {
        setUsers([]);
        setShowResults(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(
          `/users/search?search=${encodeURIComponent(debouncedSearch)}`,
        );
        setUsers(response.data);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (user) => {
    onSelectUser(user);
    setSearch("");
    setUsers([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative px-4 pb-2">
      <div className="relative flex items-center">
        <input
          type="text"
          value={search}
          onFocus={() => {
            if (users.length) setShowResults(true);
          }}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="w-full rounded-full border border-[var(--border-color)] bg-[var(--bg-subtle)] py-2.5 pl-4 pr-16 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition focus:border-[var(--accent-primary)] focus:bg-[var(--bg-card)] shadow-xs"
        />

        <div className="absolute right-3.5 flex items-center gap-1.5 text-[var(--text-muted)]">
          {!search && onOpenCommandPalette && (
            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              title="Open Command Palette (Cmd+K)"
            >
              ⌘K
            </button>
          )}

          {loading ? (
            <Loader2 size={15} className="animate-spin text-[var(--accent-primary)]" />
          ) : search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setUsers([]);
                setShowResults(false);
              }}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X size={15} />
            </button>
          ) : (
            <Search size={16} />
          )}
        </div>
      </div>

      {showResults && (
        <div className="absolute left-4 right-4 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-2xl animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
          {loading && (
            <div className="px-4 py-4 text-center text-xs text-[var(--text-muted)]">
              Searching people...
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-4 py-4 text-center text-xs text-[var(--text-muted)]">
              No users found matching &quot;{search}&quot;
            </div>
          )}

          {!loading &&
            users.map((u) => (
              <button
                key={u._id}
                type="button"
                onClick={() => handleSelect(u)}
                className="flex w-full items-center gap-3 border-b border-[var(--border-subtle)] px-3.5 py-2.5 text-left transition hover:bg-[var(--bg-subtle)]"
              >
                <div className="relative shrink-0">
                  {u.avatar ? (
                    <img
                      src={getMediaUrl(u.avatar)}
                      alt={u.name}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-primary)] text-xs font-semibold text-white">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {u.isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-card)] bg-emerald-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="truncate text-xs font-semibold text-[var(--text-primary)] dark:text-white">
                      {u.name}
                    </p>
                    {u.statusEmoji && (
                      <span className="text-xs" title={u.statusText}>
                        {u.statusEmoji}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-[var(--text-secondary)] dark:text-slate-300">
                    {u.email}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
};

export default UserSearch;
