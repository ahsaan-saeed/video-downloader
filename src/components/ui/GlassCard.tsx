import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', glow = false }) => {
  return (
    <div
      className={`
        relative backdrop-blur-xl bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-2xl transition-all duration-300
        ${glow ? 'hover:border-purple-500/30 hover:shadow-purple-500/10' : ''}
        ${className}
      `}
    >
      {glow && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/20 to-cyan-500/20 rounded-2xl blur opacity-30 group-hover:opacity-100 transition duration-500 pointer-events-none -z-10" />
      )}
      {children}
    </div>
  );
};
