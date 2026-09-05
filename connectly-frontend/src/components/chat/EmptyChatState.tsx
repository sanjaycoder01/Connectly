import React from 'react';
import {
  MessageSquare,
  Check,
  SquarePen,
  Search,
  Network,
  Lock,
} from 'lucide-react';
import { QuickActionCard } from './QuickActionCard';

interface EmptyChatStateProps {
  onStartDirectMessage?: () => void;
  onSearchHistory?: () => void;
  onBrowseChannels?: () => void;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({
  onStartDirectMessage,
  onSearchHistory,
  onBrowseChannels,
}) => {
  return (
    <div className="flex-1 h-full bg-[#f8fafc] flex flex-col justify-between p-6 sm:p-8 overflow-y-auto">
      {/* Centered Hero Content */}
      <div className="max-w-2xl w-full mx-auto my-auto flex flex-col items-center text-center py-6">
        {/* Visual Illustration Badge */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#edf2fa] border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm">
            <MessageSquare className="w-9 h-9 fill-indigo-200/50 text-indigo-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-[#3f3fe2] text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
            <Check className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Headlines */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Select a conversation or start a new chat
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-2 mb-8 leading-relaxed">
          Connect with your teammates in real-time with encrypted messaging, file sharing, and direct audio/video calls.
        </p>

        {/* Quick Action Cards Grid */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <QuickActionCard
            icon={<SquarePen className="w-4 h-4 text-purple-600" />}
            iconBgClass="bg-purple-100"
            title="New Direct Message"
            description="Start a 1:1 conversation with any coworker."
            actionText="Start chat"
            shortcut="⌘N"
            onClick={onStartDirectMessage}
          />
          <QuickActionCard
            icon={<Search className="w-4 h-4 text-emerald-600" />}
            iconBgClass="bg-emerald-100"
            title="Search History"
            description="Query logs, links, audio clips, and sent media."
            actionText="Find text"
            shortcut="⌘F"
            onClick={onSearchHistory}
          />
          <QuickActionCard
            icon={<Network className="w-4 h-4 text-indigo-600" />}
            iconBgClass="bg-indigo-100"
            title="Browse Channels"
            description="Explore public squads, teams, and directories."
            actionText="Command palette"
            shortcut="⌘K"
            onClick={onBrowseChannels}
          />
        </div>
      </div>

      {/* Bottom Status Bar */}
      <div className="w-full pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>End-to-end 256-bit encrypted communication</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Connected to real-time server (18ms ping)</span>
        </div>
      </div>
    </div>
  );
};
