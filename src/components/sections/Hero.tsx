import React, { useState } from 'react';
import { Sparkles, Shield, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { URLInput } from '../downloader/URLInput';
import { VideoPreview } from '../downloader/VideoPreview';
import { QualitySelector } from '../downloader/QualitySelector';
import { ProgressBar } from '../downloader/ProgressBar';
import { GlassCard } from '../ui/GlassCard';
import { useVideoFetch } from '@/hooks/useVideoFetch';
import { useDownload } from '@/hooks/useDownload';
import { VideoQuality } from '@/lib/types';

export const Hero: React.FC = () => {
  const { videoInfo, isLoading, error, fetchVideo, reset } = useVideoFetch();
  const { downloadState, startDownload, cancelDownload, resetDownload } = useDownload();
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);

  const handleFetch = (url: string) => {
    resetDownload();
    setSelectedQuality(null);
    fetchVideo(url);
  };

  const handleQualitySelect = (quality: VideoQuality) => {
    setSelectedQuality(quality);
  };

  const handleStartDownload = (quality: VideoQuality) => {
    if (!videoInfo) return;
    startDownload(quality, videoInfo.title);
  };

  return (
    <section className="relative pt-12 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      
      {/* Background Decorative Mesh & Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/10 to-cyan-500/20 rounded-full blur-3xl pointer-events-none -z-10" />
      
      <div className="max-w-4xl mx-auto space-y-8 text-center">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>YouTube • Facebook • Instagram • MP3 Supported</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
          Download Any Video in <br />
          <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
            4K, HD & MP3 Fast
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
          Paste any YouTube, Facebook, or Instagram video link below to extract direct CDN download links with real-time progress tracking.
        </p>

        {/* URL Input Form */}
        <div className="pt-4">
          <URLInput onFetch={handleFetch} isLoading={isLoading} />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={reset}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-white transition-colors"
              title="Reset"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Video Download Result Card */}
        {videoInfo && (
          <div className="max-w-3xl mx-auto text-left animate-in fade-in zoom-in-95 duration-300">
            <GlassCard glow className="space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-xs font-semibold text-purple-400 tracking-wider uppercase">
                  Video Extraction Result
                </span>
                <button
                  onClick={reset}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Convert Another
                </button>
              </div>

              {/* Video Metadata Preview */}
              <VideoPreview videoInfo={videoInfo} />

              {/* Quality Options */}
              <QualitySelector
                qualities={videoInfo.qualities}
                selectedQuality={selectedQuality || videoInfo.qualities[0]}
                onSelectQuality={handleQualitySelect}
                onDownload={handleStartDownload}
                isDownloading={downloadState.status === 'downloading'}
              />

              {/* Live Download Progress Bar */}
              <ProgressBar
                progressState={downloadState}
                onCancel={cancelDownload}
              />

            </GlassCard>
          </div>
        )}

      </div>
    </section>
  );
};
