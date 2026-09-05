import React, { useState } from 'react';
import { MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TopHeaderProps {
  activeNavTab?: string;
  onNavTabChange?: (tab: string) => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeNavTab = 'all',
  onNavTabChange,
}) => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const tabs = [
    { id: 'all', label: 'All Chats' },
    { id: 'unread', label: 'Unread' },
    { id: 'contacts', label: 'Contacts' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="h-14 w-full bg-white border-b border-slate-200/80 px-6 flex items-center justify-between flex-shrink-0 z-10">
      {/* Left: Brand & Navigation Pills */}
      <div className="flex items-center gap-7">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-4 h-4 fill-current" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
            Connectly
          </span>
        </div>

        {/* Sub-nav Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeNavTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavTabChange?.(tab.id)}
                className={`px-3 py-1.5 text-xs rounded-xl font-semibold transition-all ${
                  isActive
                    ? 'bg-[#edf2fa] text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right: Presence Status & User Avatar */}
      <div className="flex items-center gap-3">
        {/* Online Status Pill */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700 select-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Online</span>
        </div>

        {/* User Profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center focus:outline-none"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop"
              alt={user?.username || 'User'}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 hover:ring-indigo-400 transition-all cursor-pointer"
            />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user?.username || 'User'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
