import React from 'react';
import { Zap, Sliders, Activity, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const Features: React.FC = () => {
  const featureList = [
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      title: 'Ultra-Fast CDN Speed',
      description: 'Downloads stream directly from origin CDNs to your device. No slow intermediate server proxying.',
    },
    {
      icon: <Sliders className="w-6 h-6 text-cyan-400" />,
      title: 'Multiple Qualities',
      description: 'Choose from 2160p (4K), 1080p Full HD, 720p HD, or extract crisp high-quality MP3 audio.',
    },
    {
      icon: <Activity className="w-6 h-6 text-purple-400" />,
      title: 'Live Progress Bar',
      description: 'Real-time download tracking showing percentage, current download speed (MB/s), and ETA.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: '100% Private & Free',
      description: 'No login, no user tracking, no software installation needed. Works directly in your browser.',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Why Choose StreamVault?
        </h2>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Built for maximum speed, security, and flexibility on Vercel edge infrastructure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {featureList.map((f, i) => (
          <GlassCard key={i} glow className="flex flex-col space-y-3 hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center border border-white/10">
              {f.icon}
            </div>
            <h3 className="font-semibold text-white text-base">
              {f.title}
            </h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              {f.description}
            </p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
};
