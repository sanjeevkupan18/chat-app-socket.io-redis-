import { useEffect, useRef, useState } from "react";

import { Search, User, X } from "lucide-react";

import api from "../../services/api";

import useDebounce from "../../hooks/useDebounce";

const UserSearch = ({ onSelectUser }) => {
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
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (user) => {
    onSelectUser(user);

    setSearch("");
    setUsers([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="relative px-3 pb-3">
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />

        <input
          type="text"
          value={search}
          onFocus={() => {
            if (users.length) {
              setShowResults(true);
            }
          }}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search people..."
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
        />

        {search && (
          <button
            onClick={() => {
              setSearch("");
              setUsers([]);
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute left-3 right-3 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
          {loading && (
            <div className="px-4 py-5 text-center text-sm text-slate-400">
              Searching...
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="px-4 py-5 text-center text-sm text-slate-400">
              No users found
            </div>
          )}

          {!loading &&
            users.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelect(user)}
                className="flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left transition hover:bg-slate-800"
              >
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>

                  {user.isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 bg-green-500" />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {user.name}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {user.email}
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
