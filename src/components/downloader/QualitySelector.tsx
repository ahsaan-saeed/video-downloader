import React from 'react';
import { Download, Music, Video, Zap, HardDrive, Sparkles } from 'lucide-react';
import { VideoQuality } from '@/lib/types';

interface QualitySelectorProps {
  qualities: VideoQuality[];
  selectedQuality: VideoQuality | null;
  onSelectQuality: (quality: VideoQuality) => void;
  onDownload: (quality: VideoQuality) => void;
  isDownloading: boolean;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  selectedQuality,
  onSelectQuality,
  onDownload,
  isDownloading,
}) => {
  return (
    <div className="space-y-4 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Select Quality & File Size:
        </h4>
        <span className="text-xs text-slate-400">
          {qualities.length} qualities available
        </span>
      </div>

      {/* Grid of quality cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {qualities.map((item) => {
          const isSelected = selectedQuality?.id === item.id;
          const isAudio = item.isAudioOnly;

          return (
            <div
              key={item.id}
              onClick={() => onSelectQuality(item)}
              className={`
                relative cursor-pointer rounded-xl p-3.5 border transition-all duration-200 flex flex-col justify-between gap-3
                ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500/80 shadow-lg shadow-purple-600/20 ring-1 ring-purple-500'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/30 hover:bg-slate-800/60'
                }
              `}
            >
              {/* Top row: Format badge + File size badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isAudio ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase flex items-center gap-1">
                      <Music className="w-3 h-3" /> MP3
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase flex items-center gap-1">
                      <Video className="w-3 h-3" /> {item.format.toUpperCase()}
                    </span>
                  )}

                  {item.quality === '2160p' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      4K
                    </span>
                  )}
                  {item.quality === '1080p' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      FHD
                    </span>
                  )}
                </div>

                {/* Prominent File Size Pill Badge */}
                {item.fileSize && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1 shadow-inner">
                    <HardDrive className="w-3 h-3 text-cyan-400" />
                    {item.fileSize}
                  </span>
                )}
              </div>

              {/* Label & Resolution */}
              <div>
                <div className="font-bold text-white text-base leading-tight">
                  {item.label}
                </div>
                {item.resolution && (
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {item.resolution}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectQuality(item);
                  onDownload(item);
                }}
                disabled={isDownloading}
                className={`
                  w-full mt-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
                  ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }
                `}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save to Disk ({item.fileSize || item.quality})</span>
              </button>

            </div>
          );
        })}
      </div>
    </div>
  );
};
