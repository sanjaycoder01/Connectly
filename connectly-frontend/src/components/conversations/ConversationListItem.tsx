import React from 'react';
import type { Conversation } from '../../types/conversation';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';

interface ConversationListItemProps {
  conversation: Conversation;
  isActive?: boolean;
  onClick?: () => void;
}

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  isActive = false,
  onClick,
}) => {
  const { user } = useAuth();
  const { isUserOnline, typingUsers } = useChat();

  const rawParticipant =
    conversation.participants?.find((p) => {
      const pId = typeof p === 'string' ? p : p?._id || p?.id;
      return pId !== user?.id;
    }) || conversation.participants?.[0];

  const otherParticipant =
    rawParticipant && typeof rawParticipant === 'object'
      ? rawParticipant
      : {
          _id: typeof rawParticipant === 'string' ? rawParticipant : '',
          id: typeof rawParticipant === 'string' ? rawParticipant : '',
          username: 'Teammate',
          email: '',
        };

  const displayName = otherParticipant.username || otherParticipant.email || 'Teammate';
  const initials = displayName.slice(0, 2).toUpperCase();
  const participantId = otherParticipant._id || otherParticipant.id || '';
  const online = isUserOnline(participantId) || !!otherParticipant.isOnline;
  const isTyping = participantId ? !!typingUsers[participantId] : false;

  const formattedTime = conversation.updatedAt
    ? new Date(conversation.updatedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full p-2.5 rounded-2xl flex items-center gap-3 text-left transition-all duration-150 ${
        isActive ? 'bg-[#edf2fa] shadow-2xs' : 'hover:bg-slate-50'
      }`}
    >
      {/* Avatar with live presence indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white">
          {initials}
        </div>
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
            online ? 'bg-emerald-500' : 'bg-slate-300'
          }`}
        />
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-xs font-bold text-slate-900 truncate">
            {displayName}
          </span>
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {formattedTime}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs text-slate-500 truncate">
            {isTyping ? (
              <span className="text-indigo-600 font-semibold italic animate-pulse">
                typing...
              </span>
            ) : (
              conversation.lastMessage?.content || 'No messages yet'
            )}
          </p>
          {conversation.unreadCount > 0 && (
            <span className="min-w-4 h-4 px-1 rounded-full bg-[#3f3fe2] text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">
              {conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};
