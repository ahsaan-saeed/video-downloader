import React from 'react';
import { ClipboardCopy, Settings2, Download } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: <ClipboardCopy className="w-6 h-6 text-purple-400" />,
      title: 'Copy & Paste Link',
      description: 'Copy the URL of any video or Reel from YouTube, Facebook, or Instagram and paste it in the box.',
    },
    {
      step: '02',
      icon: <Settings2 className="w-6 h-6 text-cyan-400" />,
      title: 'Select Resolution',
      description: 'Choose your desired resolution (4K, 1080p, 720p) or select MP3 if you only need the audio stream.',
    },
    {
      step: '03',
      icon: <Download className="w-6 h-6 text-emerald-400" />,
      title: 'Fast Download',
      description: 'Click download and watch the live progress bar as your file downloads at maximum CDN speed.',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-white/5">
      <div className="text-center space-y-3 mb-12">
        <span className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">Simple 3-Step Process</span>
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          How to Download Videos
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        {steps.map((s, i) => (
          <GlassCard key={i} className="relative space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center border border-white/10">
                {s.icon}
              </div>
              <span className="text-3xl font-extrabold text-slate-700 font-mono">
                {s.step}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">
              {s.title}
            </h3>

            <p className="text-slate-400 text-xs leading-relaxed">
              {s.description}
            </p>
          </GlassCard>
        ))}
      </div>
    </section>
  );
};
