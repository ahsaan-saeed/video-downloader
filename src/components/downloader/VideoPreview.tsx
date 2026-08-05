import React from 'react';
import Image from 'next/image';
import { Play, Clock, User, CheckCircle2, Film } from 'lucide-react';
import { VideoInfo } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoInfo }) => {
  const platformConfig = PLATFORMS[videoInfo.platform];

  return (
    <div className="flex flex-col md:flex-row gap-6 items-start">
      
      {/* Thumbnail Container */}
      <div className="relative w-full md:w-72 aspect-video rounded-xl overflow-hidden bg-slate-900 border border-white/10 shadow-lg group flex-shrink-0">
        {videoInfo.thumbnail ? (
          <img
            src={videoInfo.thumbnail}
            alt={videoInfo.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-500">
            <Film className="w-12 h-12" />
          </div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center group-hover:bg-slate-950/10 transition-colors">
          <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg shadow-purple-600/50 group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        {videoInfo.duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1 border border-white/10">
            <Clock className="w-3 h-3 text-cyan-400" />
            {videoInfo.duration}
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex-1 space-y-3">
        
        {/* Platform Badge */}
        <div className="flex items-center gap-2">
          <span 
            className="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border flex items-center gap-1.5"
            style={{
              backgroundColor: platformConfig ? `${platformConfig.iconColor}20` : 'rgba(255,255,255,0.1)',
              borderColor: platformConfig ? `${platformConfig.iconColor}40` : 'rgba(255,255,255,0.2)',
              color: platformConfig ? platformConfig.iconColor : '#ffffff',
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {platformConfig?.name || videoInfo.platform} Video Ready
          </span>
        </div>

        {/* Video Title */}
        <h3 className="text-lg sm:text-xl font-bold text-white leading-snug line-clamp-2">
          {videoInfo.title}
        </h3>

        {/* Author / Channel */}
        {videoInfo.author && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <User className="w-3.5 h-3.5 text-purple-400" />
            <span>Uploaded by <strong className="text-slate-200">{videoInfo.author}</strong></span>
          </div>
        )}

      </div>

    </div>
  );
};
