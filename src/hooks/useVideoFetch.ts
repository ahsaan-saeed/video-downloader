import { useState, useCallback } from 'react';
import { VideoInfo } from '@/lib/types';
import { fetchVideoInfo } from '@/lib/api';

export function useVideoFetch() {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVideo = useCallback(async (url: string) => {
    setIsLoading(true);
    setError(null);
    setVideoInfo(null);

    try {
      const data = await fetchVideoInfo(url);
      setVideoInfo(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setVideoInfo(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    videoInfo,
    isLoading,
    error,
    fetchVideo,
    reset,
  };
}
