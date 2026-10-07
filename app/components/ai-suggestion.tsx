'use client';

import { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, Copy, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { AISuggestion } from '../lib/ai-engine';

export function AISuggestionPanel({
  suggestion,
  onAccept,
  onDismiss,
  onCopy,
}: {
  suggestion: AISuggestion;
  onAccept?: () => void;
  onDismiss?: () => void;
  onCopy?: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(suggestion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onCopy?.();
  };

  return (
    <div className="rounded-2xl border border-sage/20 bg-gradient-to-br from-mint/30 to-white shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-mint/50 border-b border-sage/10">
        <div className="w-7 h-7 rounded-lg bg-sage/15 text-sage flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink truncate">{suggestion.title}</div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] text-sage font-medium">AI Suggestion</span>
            <span className="text-[10px] text-ink/30">·</span>
            <span className="text-[10px] text-ink/50">{(suggestion.confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-7 h-7 rounded-lg hover:bg-white/60 text-ink/40 hover:text-ink flex items-center justify-center transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Review-required banner */}
      {suggestion.requiresReview && expanded && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200/60">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] text-amber-800 font-medium">
            AI-generated content — professional review required before saving or sending
          </span>
        </div>
      )}

      {/* Content */}
      {expanded && (
        <>
          <div className="px-4 py-3 max-h-80 overflow-y-auto">
            <pre className="text-xs text-ink/70 whitespace-pre-wrap font-mono leading-relaxed">
              {suggestion.content}
            </pre>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-sage/10 bg-white/40">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-ink/70 hover:bg-canvas transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-sage" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {onAccept && (
              <button
                onClick={onAccept}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium bg-sage text-white hover:bg-sage/90 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Accept &amp; Save
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-ink/50 hover:bg-canvas transition-colors ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                Dismiss
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AISuggestionButton({
  onClick,
  label = 'AI Suggest',
  size = 'sm',
}: {
  onClick: () => void;
  label?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium bg-mint text-sage hover:bg-sage hover:text-white transition-all ${
        size === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-9 px-3.5 text-sm'
      }`}
    >
      <Sparkles className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {label}
    </button>
  );
}

export function AIDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        AI suggestions require professional review
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-xs text-amber-800">
        <span className="font-semibold">AI-Generated Content Notice:</span> All suggestions produced by the AI Assistant are drafts for professional review. They must be reviewed and approved by a qualified veterinarian or staff member before being saved to records, sent to clients, or used in clinical decision-making.
      </div>
    </div>
  );
}
