import React from 'react';

type BadgeVariant = 'active' | 'vacant' | 'expiring' | 'terminated' | 'draft' | 'maintenance' | 'pending' | 'completed' | 'assigned' | 'residential' | 'office' | 'retail' | 'mall' | 'neutral' | 'success' | 'error' | 'warning' | 'info' | 'default';

const variantStyles: Record<BadgeVariant, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  vacant: 'bg-slate-100 text-slate-600 border-slate-200',
  expiring: 'bg-amber-50 text-amber-700 border-amber-200',
  terminated: 'bg-red-50 text-red-600 border-red-200',
  draft: 'bg-blue-50 text-blue-600 border-blue-200',
  maintenance: 'bg-orange-50 text-orange-700 border-orange-200',
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  assigned: 'bg-violet-50 text-violet-700 border-violet-200',
  residential: 'bg-sky-50 text-sky-700 border-sky-200',
  office: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  retail: 'bg-pink-50 text-pink-700 border-pink-200',
  mall: 'bg-purple-50 text-purple-700 border-purple-200',
  neutral: 'bg-gray-50 text-gray-600 border-gray-200',
  success: 'bg-green-50 text-green-700 border-green-200',
  error: 'bg-red-50 text-red-600 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-600 border-blue-200',
  default: 'bg-gray-50 text-gray-600 border-gray-200',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export default function Badge({ variant, children, className = '', size = 'md' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md font-500 border ${size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'} ${variantStyles[variant] || variantStyles.default} ${className}`}
    >
      {children}
    </span>
  );
}