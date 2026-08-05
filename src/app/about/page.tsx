import React from 'react';
import { Info, Shield, Zap, Server, Code } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export const metadata = {
  title: 'About — StreamVault Video Downloader',
  description: 'Learn more about StreamVault technology architecture, Vercel serverless integration, and terms.',
};

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
          <Info className="w-3.5 h-3.5 text-purple-400" />
          <span>About StreamVault</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
          High Performance Architecture
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Designed specifically to bypass serverless bottleneck timeouts by leveraging direct client-side stream piping.
        </p>
      </div>

      <div className="space-y-6 pt-4">
        
        <GlassCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Zero Server Bandwidth Architecture</h3>
              <p className="text-xs text-slate-400">Deployed on Vercel Serverless Edge</p>
            </div>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed">
            Unlike traditional video downloaders that download large video binaries onto their own servers before sending them to the user (causing high server costs and execution timeouts), StreamVault extracts direct origin CDN stream URLs. Your browser downloads directly from the source server at maximum speed.
          </p>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Tech Stack</h3>
              <p className="text-xs text-slate-400">Modern Web Standards</p>
            </div>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <li className="p-2 rounded bg-slate-900 border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Next.js 14+ (App Router)
            </li>
            <li className="p-2 rounded bg-slate-900 border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" /> Tailwind CSS (Vanilla Glassmorphism UI)
            </li>
            <li className="p-2 rounded bg-slate-900 border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> TypeScript
            </li>
            <li className="p-2 rounded bg-slate-900 border border-white/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> HTML5 ReadableStream API
            </li>
          </ul>
        </GlassCard>

      </div>

    </div>
  );
}
