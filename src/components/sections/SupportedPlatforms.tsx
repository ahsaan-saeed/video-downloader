import React from 'react';
import { GlassCard } from '../ui/GlassCard';
import { PlatformIcon } from '../ui/PlatformIcon';

export const SupportedPlatforms: React.FC = () => {
  const platforms = [
    {
      id: 'youtube' as const,
      name: 'YouTube',
      tagline: 'Videos, Shorts & MP3',
      color: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      features: ['4K / 1080p / 720p', 'YouTube Shorts', 'High quality MP3 audio', 'Fast extraction'],
    },
    {
      id: 'facebook' as const,
      name: 'Facebook',
      tagline: 'Reels, Watch & Clips',
      color: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      features: ['HD Public Videos', 'Facebook Reels', 'Watch Feed Clips', 'Original Quality'],
    },
    {
      id: 'instagram' as const,
      name: 'Instagram',
      tagline: 'Reels, Posts & Stories',
      color: 'from-pink-500/20 to-pink-600/10',
      borderColor: 'border-pink-500/30',
      features: ['Instagram Reels', 'Video Posts', 'IGTV Shows', 'Direct MP4 Stream'],
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Supported Platforms
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          One unified downloader for the world's most popular video and social media platforms.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platforms.map((p, i) => (
          <GlassCard 
            key={i} 
            className={`bg-gradient-to-b ${p.color} border ${p.borderColor} space-y-4 hover:scale-[1.02] transition-transform duration-300`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-center">
                <PlatformIcon platform={p.id} className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{p.name}</h3>
                <span className="text-xs text-slate-400 font-medium">{p.tagline}</span>
              </div>
            </div>

            <ul className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
              {p.features.map((feat, fIdx) => (
                <li key={fIdx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  {feat}
                </li>
              ))}
            </ul>
          </GlassCard>
        ))}
      </div>
    </section>
  );
};
