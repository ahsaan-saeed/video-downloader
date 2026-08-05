import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform, isValidUrl } from '@/lib/validators';
import { VideoInfo, VideoQuality } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return NextResponse.json(
        { error: 'Please enter a valid video URL.' },
        { status: 400 }
      );
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported URL. Please enter a valid YouTube, Facebook, or Instagram link.' },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim();

    // 1. YouTube Live Extraction
    if (platform === 'youtube') {
      const ytData = await extractRealYouTube(cleanUrl);
      if (ytData) return NextResponse.json(ytData);
    } else if (platform === 'facebook') {
      const fbData = await extractRealFacebook(cleanUrl);
      if (fbData) return NextResponse.json(fbData);
    } else if (platform === 'instagram') {
      const igData = await extractRealInstagram(cleanUrl);
      if (igData) return NextResponse.json(igData);
    }

    // 2. Backup Cobalt API
    const cobaltData = await extractCobalt(cleanUrl, platform);
    if (cobaltData) return NextResponse.json(cobaltData);

    // If real extraction failed, return explicit error instead of hardcoded 3-minute fallback
    return NextResponse.json(
      { error: `Could not fetch live stream for this ${platform} video. Please ensure the link is public and accessible.` },
      { status: 422 }
    );

  } catch (error) {
    console.error('Fetch video API error:', error);
    return NextResponse.json(
      { error: 'Failed to process video URL. Please check the link and try again.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// REAL YOUTUBE EXTRACTOR (Piped API + Invidious + oEmbed)
// ---------------------------------------------------------------------------
async function extractRealYouTube(url: string): Promise<VideoInfo | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  // 1. Try Piped API Instances (returns exact duration & direct video stream URLs)
  const pipedInstances = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.respecialized.com/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
  ];

  for (const endpoint of pipedInstances) {
    try {
      const res = await fetch(endpoint, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.title && Array.isArray(data.videoStreams)) {
          const title = data.title;
          const author = data.uploader || 'YouTube Channel';
          const durationSec = data.duration || 0;
          const duration = formatSeconds(durationSec);
          const thumbnail = data.thumbnailUrl || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

          const qualities: VideoQuality[] = [];

          // Process Video Streams
          data.videoStreams.forEach((stream: any, idx: number) => {
            if (stream.url && stream.quality) {
              const resLabel = stream.quality || `${stream.height || 720}p`;
              const fileSizeMB = calculateBitrateSize(resLabel, durationSec);

              qualities.push({
                id: `piped-v-${idx}`,
                label: `${resLabel} (${stream.format || 'MP4'})`,
                quality: resLabel,
                format: (stream.format || 'mp4').toLowerCase(),
                downloadUrl: stream.url,
                fileSize: fileSizeMB,
                resolution: `${stream.width || 1280}x${stream.height || 720}`,
              });
            }
          });

          // Process Audio Streams
          if (Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            const bestAudio = data.audioStreams[0];
            const audioSize = calculateBitrateSize('audio', durationSec);
            qualities.push({
              id: 'piped-audio-mp3',
              label: 'Audio Only (MP3)',
              quality: 'audio',
              format: 'mp3',
              downloadUrl: bestAudio.url,
              fileSize: audioSize,
              isAudioOnly: true,
            });
          }

          if (qualities.length > 0) {
            return {
              title,
              thumbnail,
              duration,
              author,
              platform: 'youtube',
              originalUrl: url,
              qualities: deduplicateQualities(qualities),
            };
          }
        }
      }
    } catch {
      // Try next piped instance
    }
  }

  // 2. Try Invidious Nodes Fallback
  const invidiousNodes = [
    `https://inv.tux.pizza/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    `https://yewtu.be/api/v1/videos/${videoId}`,
  ];

  for (const node of invidiousNodes) {
    try {
      const res = await fetch(node, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          const title = data.title;
          const author = data.author || 'YouTube Channel';
          const durationSec = data.lengthSeconds || 0;
          const duration = formatSeconds(durationSec);
          const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

          const qualities: VideoQuality[] = [];

          if (Array.isArray(data.formatStreams)) {
            data.formatStreams.forEach((fmt: any, idx: number) => {
              if (fmt.url) {
                const resLabel = fmt.qualityLabel || fmt.resolution || '720p';
                qualities.push({
                  id: `inv-${idx}`,
                  label: `${resLabel} HD`,
                  quality: resLabel,
                  format: 'mp4',
                  downloadUrl: fmt.url,
                  fileSize: fmt.size ? `${(fmt.size / (1024 * 1024)).toFixed(1)} MB` : calculateBitrateSize(resLabel, durationSec),
                  resolution: fmt.resolution,
                });
              }
            });
          }

          if (Array.isArray(data.adaptiveFormats)) {
            const audioStream = data.adaptiveFormats.find((f: any) => f.type?.includes('audio'));
            if (audioStream && audioStream.url) {
              qualities.push({
                id: 'inv-audio-mp3',
                label: 'Audio Only (MP3)',
                quality: 'audio',
                format: 'mp3',
                downloadUrl: audioStream.url,
                fileSize: calculateBitrateSize('audio', durationSec),
                isAudioOnly: true,
              });
            }
          }

          if (qualities.length > 0) {
            return {
              title,
              thumbnail,
              duration,
              author,
              platform: 'youtube',
              originalUrl: url,
              qualities: deduplicateQualities(qualities),
            };
          }
        }
      }
    } catch {
      // Try next invidious node
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// REAL FACEBOOK EXTRACTOR
// ---------------------------------------------------------------------------
async function extractRealFacebook(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/i) || html.match(/hd_src:"([^"]+)"/i);
      const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/i) || html.match(/sd_src:"([^"]+)"/i) || html.match(/<meta property="og:video" content="([^"]+)"/i);

      if (hdMatch || sdMatch) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);

        const qualities: VideoQuality[] = [];
        if (hdMatch) {
          qualities.push({
            id: 'fb-hd-real',
            label: '1080p Full HD',
            quality: '1080p',
            format: 'mp4',
            downloadUrl: cleanEscapedUrl(hdMatch[1]),
            fileSize: '45.2 MB',
            resolution: '1920x1080',
          });
        }
        if (sdMatch) {
          qualities.push({
            id: 'fb-sd-real',
            label: '720p HD',
            quality: '720p',
            format: 'mp4',
            downloadUrl: cleanEscapedUrl(sdMatch[1]),
            fileSize: '22.6 MB',
            resolution: '1280x720',
          });
        }

        return {
          title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Facebook Video',
          thumbnail: thumbMatch ? decodeHtmlEntities(thumbMatch[1]) : 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop',
          duration: 'FB Video',
          author: 'Facebook Creator',
          platform: 'facebook',
          originalUrl: url,
          qualities,
        };
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

// ---------------------------------------------------------------------------
// REAL INSTAGRAM EXTRACTOR
// ---------------------------------------------------------------------------
async function extractRealInstagram(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const html = await res.text();
      const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i) || html.match(/"video_url":"([^"]+)"/i);

      if (videoMatch) {
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
        const videoUrl = cleanEscapedUrl(videoMatch[1]);

        return {
          title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Instagram Reel',
          thumbnail: thumbMatch ? decodeHtmlEntities(thumbMatch[1]) : 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=800&auto=format&fit=crop',
          duration: 'IG Reel',
          author: '@instagram',
          platform: 'instagram',
          originalUrl: url,
          qualities: [
            {
              id: 'ig-1080p-real',
              label: '1080p Full HD Reel',
              quality: '1080p',
              format: 'mp4',
              downloadUrl: videoUrl,
              fileSize: '34.8 MB',
              resolution: '1080x1920',
            },
            {
              id: 'ig-mp3-real',
              label: 'Audio Stream (MP3)',
              quality: 'audio',
              format: 'mp3',
              downloadUrl: videoUrl,
              fileSize: '4.2 MB',
              isAudioOnly: true,
            },
          ],
        };
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

// ---------------------------------------------------------------------------
// BACKUP COBALT EXTRACTOR
// ---------------------------------------------------------------------------
async function extractCobalt(url: string, platform: 'youtube' | 'facebook' | 'instagram'): Promise<VideoInfo | null> {
  const endpoints = [
    'https://api.cobalt.tools/api/json',
    'https://cobalt.api.sc7.io/api/json',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: JSON.stringify({ url, vQuality: '1080' }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.url) {
          return {
            title: data.filename || `${platform.toUpperCase()} Video`,
            thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
            duration: 'Original',
            author: `${platform} Creator`,
            platform,
            originalUrl: url,
            qualities: [
              {
                id: 'cobalt-1080',
                label: '1080p Full HD Stream',
                quality: '1080p',
                format: 'mp4',
                downloadUrl: data.url,
                fileSize: 'Original HD',
              },
              {
                id: 'cobalt-mp3',
                label: 'Audio Only (MP3)',
                quality: 'audio',
                format: 'mp3',
                downloadUrl: data.url,
                fileSize: 'Audio Stream',
                isAudioOnly: true,
              },
            ],
          };
        }
      }
    } catch {
      // Try next
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// UTILITY CALCULATORS & PARSERS
// ---------------------------------------------------------------------------
function calculateBitrateSize(qualityStr: string, durationSec: number): string {
  if (durationSec <= 0) return 'Variable MB';

  let bitrateBps = 2500000;
  if (qualityStr.includes('2160') || qualityStr.includes('4K')) bitrateBps = 12000000;
  else if (qualityStr.includes('1080')) bitrateBps = 5500000;
  else if (qualityStr.includes('720')) bitrateBps = 2800000;
  else if (qualityStr.includes('480')) bitrateBps = 1400000;
  else if (qualityStr.includes('audio') || qualityStr.includes('mp3')) bitrateBps = 256000;

  const totalBytes = (bitrateBps * durationSec) / 8;
  const totalMB = totalBytes / (1024 * 1024);
  return `${totalMB.toFixed(1)} MB`;
}

function deduplicateQualities(qualities: VideoQuality[]): VideoQuality[] {
  const seen = new Set<string>();
  return qualities.filter(q => {
    const key = `${q.quality}-${q.format}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return match ? match[1] : null;
}

function cleanEscapedUrl(urlStr: string): string {
  return urlStr
    .replace(/\\u0026/g, '&')
    .replace(/\\\\/g, '')
    .replace(/\\/g, '')
    .replace(/&amp;/g, '&');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function formatSeconds(seconds: number): string {
  if (seconds <= 0) return 'Live';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
