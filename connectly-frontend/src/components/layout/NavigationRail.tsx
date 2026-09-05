import React from 'react';
import {
  MessageSquare,
  MessageCircle,
  Users,
  Bell,
  Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavigationRailProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab = 'messages',
  onTabChange,
}) => {
  const { user } = useAuth();

  const navItems = [
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'threads', label: 'Threads', icon: MessageCircle, hasBadge: true },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'notifications', label: 'Notifications', icon: Bell, hasBadge: true },
  ];

  return (
    <aside className="w-[68px] h-screen bg-white border-r border-slate-200/80 flex flex-col items-center justify-between py-4 z-20 flex-shrink-0">
      {/* Top Logo & Navigation Icons */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Brand App Icon */}
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
          <MessageSquare className="w-5 h-5 fill-current" />
        </div>

        {/* Nav Items */}
        <nav className="flex flex-col items-center gap-2 w-full px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange?.(item.id)}
                title={item.label}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-150 ${
                  isActive
                    ? 'bg-[#3f3fe2] text-white shadow-sm shadow-indigo-500/25'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'fill-white/20' : ''}`} />
                {item.hasBadge && !isActive && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Items: Settings & Profile Avatar */}
      <div className="flex flex-col items-center gap-3 w-full px-2.5">
        <button
          type="button"
          title="Settings"
          onClick={() => onTabChange?.('settings')}
          className="w-11 h-11 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-all"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User Profile Avatar with Online Status */}
        <div className="relative cursor-pointer group" title={user?.username || 'Profile'}>
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=120&auto=format&fit=crop"
            alt={user?.username || 'User Avatar'}
            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-indigo-500 transition-all"
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>
      </div>
    </aside>
  );
};
