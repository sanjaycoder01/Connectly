import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  Video,
  Search,
  Pin,
  X,
  Paperclip,
  Smile,
  Code2,
  Mic,
  Send,
  Check,
  CheckCheck,
  Lock,
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import type { Message } from '../../types/conversation';

export const ActiveChatRoom: React.FC = () => {
  const { user } = useAuth();
  const {
    activeConversation,
    setActiveConversation,
    messages,
    sendMessage,
    isUserOnline,
    isLoadingMessages,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const rawParticipant =
    activeConversation?.participants?.find((p) => {
      const pId = typeof p === 'string' ? p : p?._id || p?.id;
      return pId !== user?.id;
    }) || activeConversation?.participants?.[0];

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
  const online = isUserOnline(participantId);

  // Auto scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderStatusTicks = (status: Message['status']) => {
    if (status === 'read') {
      return <CheckCheck className="w-3.5 h-3.5 text-blue-200" />;
    }
    if (status === 'delivered') {
      return <CheckCheck className="w-3.5 h-3.5 text-white/70" />;
    }
    return <Check className="w-3.5 h-3.5 text-white/70" />;
  };

  return (
    <div className="flex-1 h-full bg-[#f8fafc] flex flex-col justify-between overflow-hidden">
      {/* 1. Header */}
      <div className="h-16 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-sm ring-2 ring-white">
              {initials}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                online ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                {displayName}
              </h2>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                Team Member
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {online ? (
                <span className="text-emerald-600 font-medium">Active now</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            type="button"
            className="w-8 h-8 rounded-xl hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            title="Call"
          >
            <Phone className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-xl hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            title="Video call"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-xl hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            title="Search in chat"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="w-8 h-8 rounded-xl hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            title="Pinned messages"
          >
            <Pin className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-4 bg-slate-200 mx-1" />
          <button
            type="button"
            onClick={() => setActiveConversation(null)}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            title="Close conversation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Message Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center py-12 text-xs text-slate-400">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-900">
              Encrypted direct conversation with {displayName}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Messages are end-to-end encrypted and synced in real-time. Say hello! 👋
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.id;
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            return (
              <div
                key={msg._id || msg.clientMessageId}
                className={`flex gap-3 max-w-[75%] ${
                  isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs ring-1 ring-white flex-shrink-0 mt-1">
                    {initials}
                  </div>
                )}

                <div className="space-y-1">
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-[#3f3fe2] text-white rounded-tr-xs shadow-sm shadow-indigo-600/20'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>

                  {/* Message footer: time & ticks */}
                  <div
                    className={`flex items-center gap-1 text-[10px] text-slate-400 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span>{timeStr}</span>
                    {isMe && renderStatusTicks(msg.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Message Input Area */}
      <div className="p-4 bg-white border-t border-slate-200/80">
        <form onSubmit={handleSend} className="border border-slate-200/80 rounded-2xl p-3 focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all bg-white shadow-2xs">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Write a message to ${displayName}... (Enter to send, Shift+Enter for new line)`}
            rows={2}
            className="w-full text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 resize-none outline-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {/* Rich Action Icons */}
            <div className="flex items-center gap-2 text-slate-400">
              <button
                type="button"
                className="hover:text-slate-600 transition-colors p-1"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="hover:text-slate-600 transition-colors p-1"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="hover:text-slate-600 transition-colors p-1"
                title="Code block"
              >
                <Code2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                className="hover:text-slate-600 transition-colors p-1"
                title="Voice note"
              >
                <Mic className="w-4 h-4" />
              </button>
              <span className="text-[11px] text-slate-300 hidden sm:inline ml-1">
                Markdown supported
              </span>
            </div>

            {/* Send Button */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                End-to-end encrypted
              </span>
              <button
                type="submit"
                disabled={!inputText.trim() || isSending}
                className="px-4 py-2 rounded-xl bg-[#3f3fe2] hover:bg-[#3232cf] active:bg-[#2b2bc3] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-600/20"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
