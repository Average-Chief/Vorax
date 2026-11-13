import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Copy, Check } from 'lucide-react';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
}

export function JsonViewer({ data, initialExpanded = false }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [copied, setCopied] = useState(false);

  const formatted = JSON.stringify(data, null, 2);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 border border-slate-800 rounded bg-black/40 overflow-hidden text-xs font-mono">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 hover:bg-slate-800/60 cursor-pointer select-none text-slate-400"
      >
        <div className="flex items-center space-x-1.5">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>Raw Payload ({typeof data === 'object' && data !== null ? `${Object.keys(data).length} keys` : typeof data})</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800"
          title="Copy JSON"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {expanded && (
        <pre className="p-3 overflow-x-auto text-slate-300 leading-relaxed text-[11px] max-h-96">
          {formatted}
        </pre>
      )}
    </div>
  );
}
