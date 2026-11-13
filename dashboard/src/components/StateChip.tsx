import React from 'react';

interface StateChipProps {
  state?: string | null;
  className?: string;
}

export function StateChip({ state, className = '' }: StateChipProps) {
  const s = (state || '').toLowerCase();

  let colorClasses = 'bg-orange-500/20 text-orange-400 border-orange-500/30'; // default / null
  let label = state || 'note';
  let isPulsing = false;

  switch (s) {
    case 'failed':
    case 'rejected':
      colorClasses = 'bg-red-500/20 text-red-400 border-red-500/30';
      label = s;
      break;
    case 'input-required':
      colorClasses = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      label = 'input-required';
      break;
    case 'working':
      colorClasses = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      label = 'working';
      isPulsing = true;
      break;
    case 'submitted':
      colorClasses = 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      label = 'submitted';
      break;
    case 'completed':
      colorClasses = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      label = 'completed';
      break;
    case 'canceled':
      colorClasses = 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
      label = 'canceled';
      break;
    default:
      if (!state) {
        colorClasses = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
        label = 'gateway.note';
      }
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colorClasses} ${
        isPulsing ? 'animate-pulse' : ''
      } ${className}`}
    >
      {isPulsing && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-ping" />}
      {label}
    </span>
  );
}
