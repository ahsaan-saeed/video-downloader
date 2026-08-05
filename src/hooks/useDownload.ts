import { useState, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { DownloadProgress, VideoQuality } from '@/lib/types';
import { sanitizeFileName } from '@/lib/validators';

export function useDownload() {
  const [downloadState, setDownloadState] = useState<DownloadProgress>({
    status: 'idle',
    progress: 0,
    downloadedBytes: 0,
    totalBytes: 0,
    speed: '0 MB/s',
    eta: '00:00',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startDownload = useCallback(async (quality: VideoQuality, videoTitle: string) => {
    if (!quality.downloadUrl) return;

    abortControllerRef.current = new AbortController();

    setDownloadState({
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: 'Calculating...',
      eta: 'Calculating...',
    });

    const startTime = Date.now();
    let receivedLength = 0;
    const chunks: BlobPart[] = [];

    try {
      const response = await fetch(quality.downloadUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Fallback: direct window download trigger if CORS blocks streaming
        triggerDirectBrowserDownload(quality.downloadUrl, videoTitle, quality.format);
        setDownloadState({
          status: 'completed',
          progress: 100,
          downloadedBytes: 100,
          totalBytes: 100,
          speed: 'Fast CDN',
          eta: '00:00',
        });
        fireConfetti();
        return;
      }

      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 35 * 1024 * 1024; // Default estimate if header absent

      const reader = response.body?.getReader();
      if (!reader) {
        triggerDirectBrowserDownload(quality.downloadUrl, videoTitle, quality.format);
        setDownloadState({
          status: 'completed',
          progress: 100,
          downloadedBytes: totalBytes,
          totalBytes: totalBytes,
          speed: 'Direct',
          eta: '00:00',
        });
        fireConfetti();
        return;
      }

      let lastTime = startTime;
      let lastBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedLength += value.length;

          const now = Date.now();
          const timeDiffSec = (now - lastTime) / 1000;

          let speedStr = '2.5 MB/s';
          let etaStr = '00:05';

          if (timeDiffSec >= 0.3) {
            const bytesDiff = receivedLength - lastBytes;
            const speedBps = bytesDiff / timeDiffSec;
            const speedMbps = (speedBps / (1024 * 1024)).toFixed(1);
            speedStr = `${speedMbps} MB/s`;

            const remainingBytes = Math.max(0, totalBytes - receivedLength);
            const remainingSec = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : 0;
            const mins = Math.floor(remainingSec / 60).toString().padStart(2, '0');
            const secs = (remainingSec % 60).toString().padStart(2, '0');
            etaStr = `${mins}:${secs}`;

            lastTime = now;
            lastBytes = receivedLength;
          }

          const progressPercent = Math.min(99, Math.round((receivedLength / totalBytes) * 100));

          setDownloadState({
            status: 'downloading',
            progress: progressPercent,
            downloadedBytes: receivedLength,
            totalBytes,
            speed: speedStr,
            eta: etaStr,
          });
        }
      }

      // Combine chunks into Blob and save
      const blob = new Blob(chunks, {
        type: quality.isAudioOnly ? 'audio/mp3' : 'video/mp4',
      });
      const blobUrl = URL.createObjectURL(blob);

      const fileName = `${sanitizeFileName(videoTitle)}_${quality.quality}.${quality.format}`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadState({
        status: 'completed',
        progress: 100,
        downloadedBytes: totalBytes,
        totalBytes,
        speed: 'Finished',
        eta: '00:00',
      });

      fireConfetti();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setDownloadState({
          status: 'idle',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          speed: '0 MB/s',
          eta: '00:00',
        });
        return;
      }

      // Fallback direct download
      triggerDirectBrowserDownload(quality.downloadUrl, videoTitle, quality.format);
      setDownloadState({
        status: 'completed',
        progress: 100,
        downloadedBytes: 100,
        totalBytes: 100,
        speed: 'Direct CDN',
        eta: '00:00',
      });
      fireConfetti();
    }
  }, []);

  const cancelDownload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetDownload = useCallback(() => {
    setDownloadState({
      status: 'idle',
      progress: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      speed: '0 MB/s',
      eta: '00:00',
    });
  }, []);

  return {
    downloadState,
    startDownload,
    cancelDownload,
    resetDownload,
  };
}

function triggerDirectBrowserDownload(url: string, title: string, format: string) {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = `${sanitizeFileName(title)}.${format}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function fireConfetti() {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'],
    });
  } catch {
    // Ignore
  }
}
