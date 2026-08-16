import { Platform } from './types';

export interface PlatformConfig {
  id: Platform;
  name: string;
  domain: string;
  iconColor: string;
  bgGlow: string;
  urlPatterns: RegExp[];
  placeholder: string;
  examples: string[];
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    domain: 'youtube.com',
    iconColor: '#FF0000',
    bgGlow: 'rgba(255, 0, 0, 0.15)',
    urlPatterns: [
      /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i,
    ],
    placeholder: 'Paste YouTube video or Shorts link here (e.g. https://www.youtube.com/watch?v=...)',
    examples: [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ'
    ]
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    domain: 'facebook.com',
    iconColor: '#1877F2',
    bgGlow: 'rgba(24, 119, 242, 0.15)',
    urlPatterns: [
      /^(https?:\/\/)?(www\.|web\.|m\.)?(facebook\.com|fb\.watch)\/.+$/i,
    ],
    placeholder: 'Paste Facebook video or Reel link here (e.g. https://www.facebook.com/watch?v=...)',
    examples: [
      'https://www.facebook.com/watch?v=1015923456789',
      'https://fb.watch/abcd1234/'
    ]
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    domain: 'instagram.com',
    iconColor: '#E4405F',
    bgGlow: 'rgba(228, 64, 95, 0.15)',
    urlPatterns: [
      /^(https?:\/\/)?(www\.)?(instagram\.com)\/(p|reel|tv|reels)\/.+$/i,
    ],
    placeholder: 'Paste Instagram Reel, Video or Post link here (e.g. https://www.instagram.com/reel/...)',
    examples: [
      'https://www.instagram.com/reel/C123456789/',
      'https://www.instagram.com/p/C987654321/'
    ]
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    domain: 'tiktok.com',
    iconColor: '#00F2FE',
    bgGlow: 'rgba(0, 242, 254, 0.15)',
    urlPatterns: [
      /^(https?:\/\/)?(www\.|vt\.|vm\.)?(tiktok\.com)\/.+$/i,
    ],
    placeholder: 'Paste TikTok video link here (e.g. https://www.tiktok.com/@user/video/...)',
    examples: [
      'https://www.tiktok.com/@tiktok/video/7106594312292453675'
    ]
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter / X',
    domain: 'x.com',
    iconColor: '#1DA1F2',
    bgGlow: 'rgba(29, 161, 242, 0.15)',
    urlPatterns: [
      /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/i,
    ],
    placeholder: 'Paste Twitter or X video link here (e.g. https://x.com/.../status/...)',
    examples: [
      'https://x.com/user/status/123456789'
    ]
  },
  other: {
    id: 'other',
    name: 'Web Video',
    domain: 'web',
    iconColor: '#8B5CF6',
    bgGlow: 'rgba(139, 92, 246, 0.15)',
    urlPatterns: [],
    placeholder: 'Paste any video link here...',
    examples: []
  }
};

export const SUPPORTED_QUALITIES = ['2160p (4K)', '1440p (2K)', '1080p Full HD', '720p HD', '480p SD', '360p SD', 'MP3 Audio'];
