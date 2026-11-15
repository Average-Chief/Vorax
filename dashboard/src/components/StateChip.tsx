import React from 'react';

interface StateChipProps {
  state?: string | null;
  className?: string;
}

export function StateChip({ state, className = '' }: StateChipProps) {
  const s = (state || '').toLowerCase();

  let colorClasses = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
  let label = state || 'note';
  let isPulsing = false;

  switch (s) {
    case 'failed':
    case 'rejected':
      colorClasses = 'bg-rose-950/40 text-rose-400 border-rose-800/60';
      label = s;
      break;
    case 'input-required':
      colorClasses = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
      label = 'input-required';
      break;
    case 'working':
      colorClasses = 'bg-blue-950/40 text-blue-400 border-blue-800/60';
      label = 'working';
      isPulsing = true;
      break;
    case 'submitted':
      colorClasses = 'bg-neutral-900 text-neutral-300 border-neutral-700/80';
      label = 'submitted';
      break;
    case 'completed':
      colorClasses = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
      label = 'completed';
      break;
    case 'canceled':
      colorClasses = 'bg-neutral-900 text-neutral-400 border-neutral-800';
      label = 'canceled';
      break;
    default:
      if (!state) {
        colorClasses = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
        label = 'gateway.note';
      }
      break;
  }

  return (
    <span
      className={`inline-flex items-center shrink-0 whitespace-nowrap px-2 py-0.5 text-[11px] font-mono tracking-tight uppercase border ${colorClasses} ${
        isPulsing ? 'animate-pulse' : ''
      } ${className}`}
    >
      {isPulsing && <span className="w-1.5 h-1.5 bg-blue-400 mr-1.5 shrink-0" />}
      {label}
    </span>
  );
}
