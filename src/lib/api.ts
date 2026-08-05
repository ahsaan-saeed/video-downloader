import { VideoInfo } from './types';

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const response = await fetch('/api/fetch-video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch video details.');
  }

  return data as VideoInfo;
}
