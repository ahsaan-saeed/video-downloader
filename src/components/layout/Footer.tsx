import React from 'react';
import Link from 'next/link';
import { Download, Heart, Shield, Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-24 border-t border-white/10 bg-slate-950/80 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-cyan-400 p-0.5">
                <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                  <Download className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-bold text-white text-lg">StreamVault</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              High-speed multi-platform video downloader for YouTube, Facebook, and Instagram. Extract videos in 4K, 1080p, and MP3 audio with live progress tracking and zero server bandwidth limits.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-500 pt-2">
              <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5 text-yellow-400" /> Ultra-Fast CDN</span>
              <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-emerald-400" /> 100% Secure</span>
            </div>
          </div>

          {/* Col 2: Supported Platforms */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Supported Platforms</h4>
            <ul className="space-y-2 text-xs">
              <li className="hover:text-cyan-400 transition-colors">YouTube Videos & Shorts</li>
              <li className="hover:text-cyan-400 transition-colors">Facebook Public Videos & Watch</li>
              <li className="hover:text-cyan-400 transition-colors">Instagram Reels & Posts</li>
              <li className="hover:text-cyan-400 transition-colors">MP3 Audio Extractor</li>
            </ul>
          </div>

          {/* Col 3: Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-white transition-colors">Home Downloader</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">Frequently Asked Questions</Link></li>
              <li><Link href="/about" className="hover:text-white transition-colors">About & Terms</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} StreamVault. For personal and educational use only.</p>
          <p className="flex items-center gap-1">
            Built with Next.js, Tailwind CSS & Vercel
          </p>
        </div>
      </div>
    </footer>
  );
};
