import React, { useState, useEffect } from 'react';
import { Search, Clipboard, X, ArrowRight, Loader2, Play } from 'lucide-react';
import { detectPlatform, isValidUrl } from '@/lib/validators';
import { Platform } from '@/lib/types';
import { PLATFORMS } from '@/lib/constants';

interface URLInputProps {
  onFetch: (url: string) => void;
  isLoading: boolean;
}

export const URLInput: React.FC<URLInputProps> = ({ onFetch, isLoading }) => {
  const [url, setUrl] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    if (url) {
      setDetectedPlatform(detectPlatform(url));
    } else {
      setDetectedPlatform(null);
    }
  }, [url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onFetch(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        const platform = detectPlatform(text.trim());
        setDetectedPlatform(platform);
        if (isValidUrl(text.trim())) {
          onFetch(text.trim());
        }
      }
    } catch {
      // Ignore clipboard permission errors
    }
  };

  const handleClear = () => {
    setUrl('');
    setDetectedPlatform(null);
  };

  const currentConfig = detectedPlatform ? PLATFORMS[detectedPlatform] : null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        
        {/* Glow border container */}
        <div 
          className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 opacity-60 group-hover:opacity-100 blur transition duration-500"
          style={{
            background: currentConfig 
              ? `linear-gradient(90deg, ${currentConfig.iconColor}, #06b6d4)`
              : undefined
          }}
        />

        <div className="relative flex items-center bg-slate-900/90 backdrop-blur-2xl rounded-2xl p-2 sm:p-2.5 border border-white/10 shadow-2xl">
          
          {/* Platform Indicator Icon */}
          <div className="pl-3 pr-2 flex items-center justify-center">
            {detectedPlatform === 'youtube' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold animate-pulse">
                YouTube
              </span>
            )}
            {detectedPlatform === 'facebook' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-semibold animate-pulse">
                Facebook
              </span>
            )}
            {detectedPlatform === 'instagram' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-400 border border-pink-500/30 text-xs font-semibold animate-pulse">
                Instagram
              </span>
            )}
            {!detectedPlatform && (
              <Search className="w-5 h-5 text-slate-400" />
            )}
          </div>

          {/* Input field */}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={
              currentConfig
                ? currentConfig.placeholder
                : "Paste YouTube, Facebook, or Instagram video link here..."
            }
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm sm:text-base px-2 py-2 focus:outline-none"
            required
          />

          {/* Clear & Paste buttons */}
          <div className="flex items-center gap-1.5 pr-2">
            {url ? (
              <button
                type="button"
                onClick={handleClear}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePaste}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard className="w-3.5 h-3.5" /> Paste
              </button>
            )}

            {/* Fetch Button */}
            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Extracting...</span>
                </>
              ) : (
                <>
                  <span>Fetch Video</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </div>
      </form>

      {/* Quick Example Links */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 pt-1">
        <span className="text-slate-500 font-medium">Try Sample:</span>
        <button
          onClick={() => {
            const sampleUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
            setUrl(sampleUrl);
            onFetch(sampleUrl);
          }}
          className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-purple-300 transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3 text-red-400" /> YouTube Sample
        </button>
        <button
          onClick={() => {
            const sampleUrl = 'https://www.facebook.com/watch?v=1015923456789';
            setUrl(sampleUrl);
            onFetch(sampleUrl);
          }}
          className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-blue-300 transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3 text-blue-400" /> Facebook Sample
        </button>
        <button
          onClick={() => {
            const sampleUrl = 'https://www.instagram.com/reel/C123456789/';
            setUrl(sampleUrl);
            onFetch(sampleUrl);
          }}
          className="px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-white/5 text-slate-300 hover:text-pink-300 transition-colors flex items-center gap-1"
        >
          <Play className="w-3 h-3 text-pink-400" /> Instagram Sample
        </button>
      </div>

    </div>
  );
};
