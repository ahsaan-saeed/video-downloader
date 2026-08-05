import React from 'react';
import { DownloadProgress } from '@/lib/types';
import { CheckCircle2, Zap, Clock, XCircle, Loader2 } from 'lucide-react';

interface ProgressBarProps {
  progressState: DownloadProgress;
  onCancel: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progressState, onCancel }) => {
  const { status, progress, speed, eta, error } = progressState;

  if (status === 'idle') return null;

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'downloading' && (
            <div className="flex items-center gap-2 text-purple-400 text-sm font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Downloading Video...</span>
            </div>
          )}
          {status === 'completed' && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Download Complete! File Saved.</span>
            </div>
          )}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-rose-400 text-sm font-semibold">
              <XCircle className="w-5 h-5" />
              <span>Download Failed</span>
            </div>
          )}
        </div>

        {status === 'downloading' && (
          <button
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-rose-400 transition-colors px-2 py-1 rounded bg-slate-800 hover:bg-slate-700"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/10">
        <div
          className={`
            h-full rounded-full transition-all duration-300 relative
            ${
              status === 'completed'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : status === 'error'
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 animate-pulse'
            }
          `}
          style={{ width: `${progress}%` }}
        >
          {status === 'downloading' && (
            <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] -skew-x-12" />
          )}
        </div>
      </div>

      {/* Progress Metrics Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span className="font-bold text-white text-sm">{progress}%</span>
          {status === 'downloading' && (
            <span className="flex items-center gap-1 text-cyan-300">
              <Zap className="w-3.5 h-3.5" /> {speed}
            </span>
          )}
        </div>

        {status === 'downloading' && (
          <div className="flex items-center gap-1 text-purple-300">
            <Clock className="w-3.5 h-3.5" /> ETA: {eta}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-rose-400 pt-1">
          {error}
        </p>
      )}

    </div>
  );
};
