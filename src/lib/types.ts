export type Platform = 'youtube' | 'facebook' | 'instagram';

export interface VideoQuality {
  id: string;
  label: string;          // e.g. "1080p Full HD", "720p HD", "480p", "MP3 Audio"
  quality: string;        // e.g. "1080p", "720p", "360p", "audio"
  format: string;         // e.g. "mp4", "mp3", "webm"
  downloadUrl: string;    // Direct CDN URL
  fileSize?: string;      // e.g. "45.2 MB"
  resolution?: string;    // e.g. "1920x1080"
  isAudioOnly?: boolean;
}

export interface VideoInfo {
  title: string;
  thumbnail: string;
  duration?: string;
  author?: string;
  platform: Platform;
  originalUrl: string;
  qualities: VideoQuality[];
}

export type DownloadStatus = 
  | 'idle'
  | 'fetching'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'error';

export interface DownloadProgress {
  status: DownloadStatus;
  progress: number;            // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed: string;               // e.g. "2.4 MB/s"
  eta: string;                 // e.g. "00:15"
  error?: string;
}
