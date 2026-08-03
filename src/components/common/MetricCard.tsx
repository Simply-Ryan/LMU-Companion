import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  badge?: string;
  badgeColorClass?: string;
  className?: string;
  highlighted?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  iconColorClass = 'text-amber-400',
  badge,
  badgeColorClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  className = '',
  highlighted = false,
}) => {
  return (
    <div
      className={`bg-slate-950 p-4 rounded-xl border transition-all ${
        highlighted ? 'border-amber-500/50 shadow-lg shadow-amber-500/10' : 'border-slate-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400 font-mono font-semibold uppercase">{title}</span>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className={`text-[10px] font-mono font-bold border px-2 py-0.5 rounded-full ${badgeColorClass}`}
            >
              {badge}
            </span>
          )}
          {Icon && <Icon className={`w-4 h-4 ${iconColorClass}`} />}
        </div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-xl sm:text-2xl font-mono font-black text-white">{value}</span>
        {unit && <span className="text-xs font-mono font-bold text-slate-400">{unit}</span>}
      </div>
      {subtitle && <p className="text-[11px] font-mono text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};
