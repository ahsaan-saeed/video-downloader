import React from 'react';
import { HelpCircle, ChevronDown, ShieldCheck, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export const metadata = {
  title: 'FAQ — StreamVault Video Downloader',
  description: 'Frequently asked questions about downloading videos from YouTube, Facebook, and Instagram.',
};

export default function FAQPage() {
  const faqs = [
    {
      q: 'Which video platforms are supported?',
      a: 'StreamVault supports YouTube (videos, Shorts), Facebook (public videos, Reels, Watch feed), and Instagram (Reels, posts, IGTV). You can also extract MP3 audio streams from supported videos.',
    },
    {
      q: 'Do I need to install software or register an account?',
      a: 'No! StreamVault is 100% web-based. You do not need to register, create an account, or install any browser extensions or software.',
    },
    {
      q: 'How does the live progress bar work?',
      a: 'When you select a quality option, StreamVault streams the binary data directly from the origin content delivery network (CDN) into your browser using HTML5 ReadableStreams. The progress bar updates in real-time with exact percentage, download speed (MB/s), and estimated time remaining (ETA).',
    },
    {
      q: 'Is this service free to use?',
      a: 'Yes, StreamVault is completely free for personal use.',
    },
    {
      q: 'Can I download videos in 4K or 1080p Full HD?',
      a: 'Yes, if the original video on YouTube, Facebook, or Instagram was uploaded in 4K (2160p) or 1080p, StreamVault will provide direct download links for those resolutions.',
    },
    {
      q: 'Is it legal to download videos?',
      a: 'Downloading public domain, creative commons, or your own content is generally permitted. Always respect content creators copyright and terms of service when downloading online videos.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
          <span>Knowledge Base</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
          Everything you need to know about downloading videos, qualities, and speed optimization.
        </p>
      </div>

      <div className="space-y-4 pt-6">
        {faqs.map((faq, idx) => (
          <GlassCard key={idx} className="space-y-2">
            <h3 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
              <span className="text-purple-400 font-mono">Q:</span>
              {faq.q}
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed pl-6">
              {faq.a}
            </p>
          </GlassCard>
        ))}
      </div>

    </div>
  );
}
