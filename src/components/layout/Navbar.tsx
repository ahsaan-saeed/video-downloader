import React from 'react';
import Link from 'next/link';
import { Download, Sparkles, Shield, HelpCircle, Info } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/70 border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Download className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
              StreamVault
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full">
                PRO
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Fast Multi-Platform Downloader</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link 
            href="/" 
            className="text-slate-200 hover:text-cyan-400 transition-colors flex items-center gap-1.5 py-1"
          >
            <Sparkles className="w-4 h-4 text-purple-400" /> Downloader
          </Link>
          <Link 
            href="/faq" 
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 py-1"
          >
            <HelpCircle className="w-4 h-4" /> FAQ
          </Link>
          <Link 
            href="/about" 
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 py-1"
          >
            <Info className="w-4 h-4" /> About
          </Link>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Server Online
          </div>

          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 transition-all duration-200 active:scale-95"
          >
            Deploy Free
          </a>
        </div>

      </div>
    </header>
  );
};
