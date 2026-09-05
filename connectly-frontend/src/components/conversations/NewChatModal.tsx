import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, Loader2 } from 'lucide-react';
import type { User } from '../../types/auth';
import { chatService } from '../../services/chat.service';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUsers([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    const fetchUsers = async (query: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await chatService.searchUsers(query);
        setUsers(res.users || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search users');
      } finally {
        setIsLoading(false);
      }
    };

    // Load initial users immediately on open
    if (!searchQuery.trim()) {
      fetchUsers('');
      return;
    }

    // Debounce 500ms when user types
    setIsLoading(true);
    const timer = setTimeout(() => {
      fetchUsers(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200/80 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">New Direct Message</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-500">
          Search for teammates by username or email to start a conversation.
        </p>

        {/* Search input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search username or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#f0f4fd] border border-transparent focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
            autoFocus
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Users list */}
        <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-100">
          {!isLoading && users.length === 0 && (
            <div className="text-center py-6 text-xs text-slate-400">
              {searchQuery ? 'No users found' : 'No other users registered yet.'}
            </div>
          )}

          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onSelectUser(u);
                onClose();
              }}
              className="w-full p-2.5 rounded-2xl flex items-center gap-3 text-left hover:bg-[#edf2fa] transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold ring-2 ring-white flex-shrink-0">
                {u.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                  {u.username}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Chat →
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
