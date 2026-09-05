import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  value: string | number;
  valueColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  iconBg,
  title,
  subtitle,
  value,
  valueColor = 'text-slate-900',
}) => {
  return (
    <div className="p-3 rounded-2xl bg-[#f8fafc] border border-slate-100 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{title}</p>
          <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>
      <span className={`text-base font-bold ${valueColor} flex-shrink-0`}>
        {value}
      </span>
    </div>
  );
};
