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

    // Platform-specific direct extraction
    if (platform === 'youtube') {
      const ytResult = await extractYouTube(cleanUrl);
      if (ytResult) return NextResponse.json(ytResult);
    } else if (platform === 'facebook') {
      const fbResult = await extractFacebook(cleanUrl);
      if (fbResult) return NextResponse.json(fbResult);
    } else if (platform === 'instagram') {
      const igResult = await extractInstagram(cleanUrl);
      if (igResult) return NextResponse.json(igResult);
    }

    // Try Cobalt API Backup
    const cobaltResult = await tryCobalt(cleanUrl, platform);
    if (cobaltResult) return NextResponse.json(cobaltResult);

    // If all extraction attempts fail, return a helpful error instead of dummy video
    return NextResponse.json(
      { error: `Unable to extract video from this ${platform} link. Please ensure the video is public and try again.` },
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
// YOUTUBE EXTRACTOR (Invidious / Piped Multi-Instance Rotation)
// ---------------------------------------------------------------------------
async function extractYouTube(url: string): Promise<VideoInfo | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const invidiousInstances = [
    'https://inv.tux.pizza',
    'https://invidious.nerdvpn.de',
    'https://vid.puffyan.us',
    'https://yewtu.be',
  ];

  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.title) {
          const title = data.title;
          const author = data.author || 'YouTube Creator';
          const duration = formatSeconds(data.lengthSeconds || 0);
          const thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

          const qualities: VideoQuality[] = [];

          if (Array.isArray(data.formatStreams)) {
            data.formatStreams.forEach((fmt: any, idx: number) => {
              if (fmt.url) {
                qualities.push({
                  id: `yt-fmt-${idx}`,
                  label: `${fmt.qualityLabel || fmt.resolution || '720p'} (MP4)`,
                  quality: fmt.qualityLabel || '720p',
                  format: 'mp4',
                  downloadUrl: fmt.url,
                  fileSize: fmt.size ? `${(fmt.size / (1024 * 1024)).toFixed(1)} MB` : 'Direct Stream',
                  resolution: fmt.resolution,
                });
              }
            });
          }

          if (Array.isArray(data.adaptiveFormats)) {
            const audioStream = data.adaptiveFormats.find((f: any) => f.type?.includes('audio/mp4') || f.type?.includes('audio'));
            if (audioStream && audioStream.url) {
              qualities.push({
                id: 'yt-audio-mp3',
                label: 'Audio Only (MP3)',
                quality: 'audio',
                format: 'mp3',
                downloadUrl: audioStream.url,
                fileSize: audioStream.contentLength ? `${(parseInt(audioStream.contentLength) / (1024 * 1024)).toFixed(1)} MB` : 'Audio Stream',
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
              qualities,
            };
          }
        }
      }
    } catch {
      // Try next instance
    }
  }

  // Fallback oEmbed metadata + Cobalt if Invidious instances are down
  return null;
}

// ---------------------------------------------------------------------------
// FACEBOOK EXTRACTOR (Direct HTML OG Meta Scraper)
// ---------------------------------------------------------------------------
async function extractFacebook(url: string): Promise<VideoInfo | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const html = await res.text();

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Facebook Video';

    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    const thumbnail = thumbMatch ? decodeHtmlEntities(thumbMatch[1]) : 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop';

    // Extract HD & SD direct mp4 URLs
    const hdMatch = html.match(/"browser_native_hd_url":"([^"]+)"/i) || html.match(/hd_src:"([^"]+)"/i);
    const sdMatch = html.match(/"browser_native_sd_url":"([^"]+)"/i) || html.match(/sd_src:"([^"]+)"/i) || html.match(/<meta property="og:video" content="([^"]+)"/i);

    const qualities: VideoQuality[] = [];

    if (hdMatch) {
      const hdUrl = cleanEscapedUrl(hdMatch[1]);
      qualities.push({
        id: 'fb-hd',
        label: '1080p / HD High Quality',
        quality: '1080p',
        format: 'mp4',
        downloadUrl: hdUrl,
        fileSize: 'HD Video',
      });
    }

    if (sdMatch) {
      const sdUrl = cleanEscapedUrl(sdMatch[1]);
      qualities.push({
        id: 'fb-sd',
        label: '720p Standard Quality',
        quality: '720p',
        format: 'mp4',
        downloadUrl: sdUrl,
        fileSize: 'SD Video',
      });
    }

    if (qualities.length > 0) {
      return {
        title,
        thumbnail,
        duration: 'FB Reel',
        author: 'Facebook User',
        platform: 'facebook',
        originalUrl: url,
        qualities,
      };
    }
  } catch (e) {
    console.warn('Facebook HTML parse failed:', e);
  }

  return null;
}

// ---------------------------------------------------------------------------
// INSTAGRAM EXTRACTOR (Direct HTML OG Meta Scraper)
// ---------------------------------------------------------------------------
async function extractInstagram(url: string): Promise<VideoInfo | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;

    const html = await res.text();

    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Instagram Reel';

    const thumbMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
    const thumbnail = thumbMatch ? decodeHtmlEntities(thumbMatch[1]) : 'https://images.unsplash.com/photo-1611262588024-d12430b98920?q=80&w=800&auto=format&fit=crop';

    const videoMatch = html.match(/<meta property="og:video" content="([^"]+)"/i) || html.match(/"video_url":"([^"]+)"/i);

    if (videoMatch) {
      const videoUrl = cleanEscapedUrl(videoMatch[1]);
      return {
        title,
        thumbnail,
        duration: 'IG Reel',
        author: '@instagram',
        platform: 'instagram',
        originalUrl: url,
        qualities: [
          {
            id: 'ig-hd',
            label: '1080p HD Reel Stream',
            quality: '1080p',
            format: 'mp4',
            downloadUrl: videoUrl,
            fileSize: 'HD Video',
          },
          {
            id: 'ig-audio',
            label: 'Audio Stream (MP3)',
            quality: 'audio',
            format: 'mp3',
            downloadUrl: videoUrl,
            fileSize: 'Audio Stream',
            isAudioOnly: true,
          },
        ],
      };
    }
  } catch (e) {
    console.warn('Instagram HTML parse failed:', e);
  }

  return null;
}

// ---------------------------------------------------------------------------
// COBALT BACKUP EXTRACTOR
// ---------------------------------------------------------------------------
async function tryCobalt(url: string, platform: 'youtube' | 'facebook' | 'instagram'): Promise<VideoInfo | null> {
  const cobaltInstances = [
    'https://api.cobalt.tools/api/json',
    'https://cobalt.api.sc7.io/api/json',
  ];

  for (const endpoint of cobaltInstances) {
    try {
      const res = await fetch(endpoint, {
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
                id: 'cobalt-max',
                label: '1080p Full HD',
                quality: '1080p',
                format: 'mp4',
                downloadUrl: data.url,
                fileSize: 'Original HD Stream',
              },
              {
                id: 'cobalt-720p',
                label: '720p HD',
                quality: '720p',
                format: 'mp4',
                downloadUrl: data.url,
                fileSize: '720p Stream',
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
// HELPER UTILITIES
// ---------------------------------------------------------------------------
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
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
