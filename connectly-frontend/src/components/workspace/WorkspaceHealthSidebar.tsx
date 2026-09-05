import React from 'react';
import {
  MessageSquare,
  Mail,
  Star,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { MetricCard } from './MetricCard';

import { useChat } from '../../context/ChatContext';

export const WorkspaceHealthSidebar: React.FC = () => {
  const { conversations } = useChat();

  const directChatsCount = conversations.length;
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <aside className="w-72 lg:w-80 h-full bg-white border-l border-slate-200/80 p-5 flex flex-col justify-between overflow-y-auto flex-shrink-0">
      <div className="space-y-6">
        {/* Section 1: Workspace Health Header & Metrics */}
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Workspace Health
          </span>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Acme Headquarters
            </h2>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>

          <div className="space-y-2">
            <MetricCard
              icon={<MessageSquare className="w-4 h-4 text-indigo-600" />}
              iconBg="bg-indigo-50"
              title="Direct chats"
              subtitle="Active channels"
              value={directChatsCount}
            />
            <MetricCard
              icon={<Mail className="w-4 h-4 text-red-500" />}
              iconBg="bg-red-50"
              title="Unread messages"
              subtitle="Requires review"
              value={unreadCount}
              valueColor={unreadCount > 0 ? "text-red-500" : "text-slate-900"}
            />
            <MetricCard
              icon={<Star className="w-4 h-4 text-emerald-600" />}
              iconBg="bg-emerald-50"
              title="Starred messages"
              subtitle="Bookmarked notes"
              value="0"
            />
          </div>
        </div>

        {/* Section 2: Keyboard Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Keyboard Shortcuts
            </span>
            <button
              type="button"
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Fast Key
            </button>
          </div>

          {/* Group 1: Navigation */}
          <div className="mb-3">
            <span className="text-[11px] font-semibold text-indigo-600 block mb-1.5">
              Navigation
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Quick jump channel</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">K</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Next unread thread</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">⌥</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">↓</kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Group 2: Formatting */}
          <div className="mb-3">
            <span className="text-[11px] font-semibold text-emerald-600 block mb-1.5">
              Formatting
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Inline code snippet</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">`code`</kbd>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Quote block</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">&gt; text</kbd>
              </div>
            </div>
          </div>

          {/* Group 3: Search & Actions */}
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              Search &amp; Actions
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">In-thread search</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">F</kbd>
                </div>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-[11px]">Toggle thread inspector</span>
                <div className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono">.</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Bottom Huddle Lounge Widget */}
      <div className="mt-6 p-3 rounded-2xl bg-[#edf4ff] border border-blue-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900">Huddle Lounge</span>
        </div>
        <button
          type="button"
          className="px-2.5 py-1 rounded-lg bg-[#3f3fe2] hover:bg-[#3232cf] text-white text-[11px] font-semibold transition-colors"
        >
          Join (3)
        </button>
      </div>
    </aside>
  );
};
