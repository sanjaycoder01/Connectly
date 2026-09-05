import React from 'react';

interface QuickActionCardProps {
  icon: React.ReactNode;
  iconBgClass: string;
  title: string;
  description: string;
  actionText: string;
  shortcut: string;
  onClick?: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon,
  iconBgClass,
  title,
  description,
  actionText,
  shortcut,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between text-left h-44 group cursor-pointer"
    >
      <div>
        <div
          className={`w-9 h-9 rounded-xl ${iconBgClass} flex items-center justify-center mb-3 shadow-2xs group-hover:scale-105 transition-transform`}
        >
          {icon}
        </div>
        <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
          {title}
        </h3>
        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
          {actionText}
        </span>
        <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-500">
          {shortcut}
        </kbd>
      </div>
    </button>
  );
};
