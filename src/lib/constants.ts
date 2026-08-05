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
      /^(https?:\/\/)?(www\.)?(instagram\.com)\/(p|reel|tv)\/.+$/i,
    ],
    placeholder: 'Paste Instagram Reel, Video or Post link here (e.g. https://www.instagram.com/reel/...)',
    examples: [
      'https://www.instagram.com/reel/C123456789/',
      'https://www.instagram.com/p/C987654321/'
    ]
  }
};

export const SUPPORTED_QUALITIES = ['2160p (4K)', '1440p (2K)', '1080p Full HD', '720p HD', '480p SD', '360p SD', 'MP3 Audio'];
