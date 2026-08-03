import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatBadgeProps {
  label: string;
  variant?: 'emerald' | 'amber' | 'sky' | 'purple' | 'red' | 'slate';
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  variant = 'amber',
  icon: Icon,
  size = 'md',
  className = '',
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 rounded',
    md: 'text-xs px-2.5 py-1 rounded-lg',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-bold border transition-colors ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${className}`}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{label}</span>
    </span>
  );
};
