import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Search,
  X,
  Plus,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import type { User } from '../../types/auth';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { chatService } from '../../services/chat.service';
import { ConversationListItem } from './ConversationListItem';

interface ConversationsSidebarProps {
  onStartNewChat?: () => void;
  activeFilterTab?: string;
}

export const ConversationsSidebar: React.FC<ConversationsSidebarProps> = ({
  onStartNewChat,
  activeFilterTab = 'all',
}) => {
  const { user } = useAuth();
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    startConversationWithUser,
    isLoadingConversations,
    isUserOnline,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [matchedUsers, setMatchedUsers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search registered users when search query is present with 500ms debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setMatchedUsers([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const searchTimer = setTimeout(async () => {
      try {
        const res = await chatService.searchUsers(searchQuery);
        setMatchedUsers(res.users || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [searchQuery]);

  // Filter conversations matching query and unread filter
  const filteredConversations = conversations.filter((c) => {
    if (activeFilterTab === 'unread' && (!c.unreadCount || c.unreadCount <= 0)) {
      return false;
    }
    if (!searchQuery.trim()) return true;
    const other = c.participants?.find((p) => {
      const pId = typeof p === 'string' ? p : p?._id || p?.id;
      return pId !== user?.id;
    }) || c.participants?.[0];
    const username = (typeof other === 'object' ? other?.username : '') || '';
    const email = (typeof other === 'object' ? other?.email : '') || '';
    const query = searchQuery.toLowerCase();
    return (
      username.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      c.lastMessage?.content?.toLowerCase().includes(query)
    );
  });

  const handleSelectUser = async (u: User) => {
    setSearchQuery('');
    await startConversationWithUser(u.id);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200/80 flex flex-col justify-between flex-shrink-0">
      {/* Top Header & Search Area */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Conversations</h2>
            {conversations.length > 0 && (
              <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {conversations.length}
              </span>
            )}
          </div>
          <button
            type="button"
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
            title="Filter conversations"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations or users..."
            className="w-full pl-9 pr-8 py-2 bg-[#f0f4fd] border border-transparent focus:border-indigo-400 focus:bg-white rounded-xl text-xs text-slate-800 placeholder:text-slate-400 transition-all outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content Area: Search Results or Real Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* If user is searching and found matching people */}
        {searchQuery.trim() && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                People ({matchedUsers.length})
              </span>
              {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
            </div>

            {matchedUsers.length === 0 && !isSearching ? (
              <p className="px-2 text-xs text-slate-400 py-2">No matching users</p>
            ) : (
              <div className="space-y-1">
                {matchedUsers.map((person) => {
                  const online = isUserOnline(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      onClick={() => handleSelectUser(person)}
                      className="w-full p-2.5 rounded-2xl flex items-center gap-3 text-left hover:bg-[#f0f4fd] transition-all group"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center ring-1 ring-slate-200">
                          {person.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                            online ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            {person.username}
                          </span>
                          <span className="text-[10px] text-indigo-600 font-medium">
                            Start Chat
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{person.email}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Real Conversations List */}
        <div>
          {searchQuery.trim() && (
            <div className="px-2 mb-2">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Conversations ({filteredConversations.length})
              </span>
            </div>
          )}

          {isLoadingConversations ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-xs">Loading chats...</span>
            </div>
          ) : filteredConversations.length === 0 && !searchQuery ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">
                {activeFilterTab === 'unread' ? 'No unread messages' : 'No conversations yet'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 mb-4">
                {activeFilterTab === 'unread'
                  ? "You're all caught up with your direct messages! 🎉"
                  : 'Search for a colleague or start a new chat below.'}
              </p>
              {activeFilterTab !== 'unread' && (
                <button
                  type="button"
                  onClick={onStartNewChat}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                >
                  + Start your first chat
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conv) => {
                const isSelected = Boolean(
                  activeConversation &&
                  (activeConversation._id === conv._id || activeConversation.id === conv.id)
                );

                return (
                  <ConversationListItem
                    key={conv._id || conv.id}
                    conversation={conv}
                    isActive={isSelected}
                    onClick={() => setActiveConversation(conv)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Start New Conversation Button */}
      <div className="p-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onStartNewChat}
          className="w-full py-3 px-4 rounded-xl bg-[#3f3fe2] hover:bg-[#3232cf] active:bg-[#2b2bc3] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Start new conversation</span>
        </button>
      </div>
    </div>
  );
};
