import { Platform } from './types';
import { PLATFORMS } from './constants';

export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectPlatform(url: string): Platform | null {
  if (!isValidUrl(url)) return null;
  
  const trimmed = url.trim();
  for (const key of Object.keys(PLATFORMS) as Platform[]) {
    const config = PLATFORMS[key];
    if (config.urlPatterns.some(pattern => pattern.test(trimmed))) {
      return key;
    }
  }
  
  // Fallback keyword search in hostname
  try {
    const hostname = new URL(trimmed).hostname.toLowerCase();
    if (hostname.includes('youtube') || hostname.includes('youtu.be')) return 'youtube';
    if (hostname.includes('facebook') || hostname.includes('fb.watch')) return 'facebook';
    if (hostname.includes('instagram')) return 'instagram';
  } catch {
    // Ignore
  }
  
  return null;
}

export function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-z0-9_\-\. ]/gi, '')
    .trim()
    .replace(/\s+/g, '_') || 'video_download';
}
