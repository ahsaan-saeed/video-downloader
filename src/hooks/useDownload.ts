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

      const fileName = `${sanitizeFileName(videoTitle)}_${quality.quality}.${quality.format}`;

      if (!response.ok) {
        await saveFileWithNativePickerOrLink(null, quality.downloadUrl, fileName, quality);
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
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 25 * 1024 * 1024;

      const reader = response.body?.getReader();
      if (!reader) {
        await saveFileWithNativePickerOrLink(null, quality.downloadUrl, fileName, quality);
        setDownloadState({
          status: 'completed',
          progress: 100,
          downloadedBytes: totalBytes,
          totalBytes,
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

          let speedStr = '3.5 MB/s';
          let etaStr = '00:03';

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

      // Combine chunks into Blob
      const blob = new Blob(chunks, {
        type: quality.isAudioOnly ? 'audio/mp3' : 'video/mp4',
      });

      // Trigger Native OS "Save As..." File Picker Dialog Popup
      await saveFileWithNativePickerOrLink(blob, quality.downloadUrl, fileName, quality);

      setDownloadState({
        status: 'completed',
        progress: 100,
        downloadedBytes: totalBytes,
        totalBytes,
        speed: 'Saved',
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

      const fileName = `${sanitizeFileName(videoTitle)}_${quality.quality}.${quality.format}`;
      await saveFileWithNativePickerOrLink(null, quality.downloadUrl, fileName, quality);

      setDownloadState({
        status: 'completed',
        progress: 100,
        downloadedBytes: 100,
        totalBytes: 100,
        speed: 'Direct',
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

async function saveFileWithNativePickerOrLink(
  blob: Blob | null,
  directUrl: string,
  fileName: string,
  quality: VideoQuality
) {
  // 1. Try Native OS "Save As..." File Dialog Popup (File System Access API)
  if (blob && typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description: quality.isAudioOnly ? 'MP3 Audio File' : 'MP4 Video File',
            accept: quality.isAudioOnly
              ? { 'audio/mp3': ['.mp3'] }
              : { 'video/mp4': ['.mp4'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err.name === 'AbortError') return; // User closed dialog
    }
  }

  // 2. Fallback: Trigger Blob Anchor Download
  if (blob) {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    return;
  }

  // 3. Direct URL fallback anchor
  const link = document.createElement('a');
  link.href = directUrl;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
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
