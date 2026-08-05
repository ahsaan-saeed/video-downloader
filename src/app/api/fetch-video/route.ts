import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';
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

    // 1. YouTube Multi-Source Hybrid Engine
    if (platform === 'youtube') {
      const ytResult = await extractYouTubeHybrid(cleanUrl);
      if (ytResult && ytResult.qualities.length > 0) {
        return NextResponse.json(ytResult);
      }
    }

    // 2. Facebook Direct Scraper
    if (platform === 'facebook') {
      const fbResult = await extractFacebookDirect(cleanUrl);
      if (fbResult && fbResult.qualities.length > 0) {
        return NextResponse.json(fbResult);
      }
    }

    // 3. Instagram Direct Scraper
    if (platform === 'instagram') {
      const igResult = await extractInstagramDirect(cleanUrl);
      if (igResult && igResult.qualities.length > 0) {
        return NextResponse.json(igResult);
      }
    }

    // 4. Backup Cobalt Instance Engine
    const cobaltResult = await extractCobalt(cleanUrl, platform);
    if (cobaltResult && cobaltResult.qualities.length > 0) {
      return NextResponse.json(cobaltResult);
    }

    return NextResponse.json(
      { error: `Unable to extract download links for this ${platform} video. Please check that the post is public.` },
      { status: 422 }
    );

  } catch (error) {
    console.error('Fetch video API error:', error);
    return NextResponse.json(
      { error: 'Failed to process video URL. Please try again.' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// HYBRID YOUTUBE EXTRACTOR (ytdl-core metadata + Piped/Invidious stream links)
// ---------------------------------------------------------------------------
async function extractYouTubeHybrid(url: string): Promise<VideoInfo | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  let title = 'YouTube Video';
  let author = 'YouTube Creator';
  let durationSec = 0;
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const qualities: VideoQuality[] = [];

  // Step A: Extract Metadata using @distube/ytdl-core
  try {
    if (ytdl.validateURL(url)) {
      const info = await ytdl.getInfo(url);
      if (info && info.videoDetails) {
        title = info.videoDetails.title || title;
        author = info.videoDetails.author?.name || author;
        durationSec = parseInt(info.videoDetails.lengthSeconds || '0', 10);
        const thumbs = info.videoDetails.thumbnails || [];
        if (thumbs.length > 0) thumbnail = thumbs[thumbs.length - 1].url;

        // Collect any direct formats ytdl-core decrypted
        (info.formats || []).forEach((fmt, idx) => {
          if (fmt.url && (fmt.hasVideo || fmt.hasAudio)) {
            const qual = fmt.qualityLabel || (fmt.height ? `${fmt.height}p` : '360p');
            qualities.push({
              id: `ytdl-${idx}`,
              label: `${qual} HD`,
              quality: qual,
              format: (fmt.container || 'mp4').toLowerCase(),
              downloadUrl: fmt.url,
              fileSize: calculateBitrateSize(qual, durationSec),
              resolution: fmt.width && fmt.height ? `${fmt.width}x${fmt.height}` : getResolutionDimensions(qual),
            });
          }
        });
      }
    }
  } catch {
    // If ytdl-core throws decipher warning, fallback to oEmbed + Piped
  }

  // Step B: Query Piped API Nodes for 1080p, 720p, 480p, and MP3 streams
  const pipedEndpoints = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.respecialized.com/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
  ];

  for (const ep of pipedEndpoints) {
    try {
      const res = await fetch(ep, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          title = data.title || title;
          author = data.uploader || author;
          if (data.duration > 0) durationSec = data.duration;
          if (data.thumbnailUrl) thumbnail = data.thumbnailUrl;

          // Process Video Streams
          if (Array.isArray(data.videoStreams)) {
            data.videoStreams.forEach((stream: any, idx: number) => {
              if (stream.url) {
                const resLabel = stream.quality || `${stream.height || 720}p`;
                qualities.push({
                  id: `piped-${idx}`,
                  label: `${resLabel} (${stream.format || 'MP4'})`,
                  quality: resLabel,
                  format: (stream.format || 'mp4').toLowerCase(),
                  downloadUrl: stream.url,
                  fileSize: calculateBitrateSize(resLabel, durationSec),
                  resolution: `${stream.width || 1280}x${stream.height || 720}`,
                });
              }
            });
          }

          // Process Audio Stream (MP3)
          if (Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
            const audio = data.audioStreams[0];
            qualities.push({
              id: 'piped-audio-mp3',
              label: 'Audio Only (MP3)',
              quality: 'audio',
              format: 'mp3',
              downloadUrl: audio.url,
              fileSize: calculateBitrateSize('audio', durationSec),
              isAudioOnly: true,
            });
          }

          break; // Stop at first successful piped node
        }
      }
    } catch {
      // Try next node
    }
  }

  // Step C: Fallback to YouTube oEmbed if title still default
  if (title === 'YouTube Video') {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        title = data.title || title;
        author = data.author_name || author;
        thumbnail = data.thumbnail_url || thumbnail;
      }
    } catch {
      // Ignore
    }
  }

  const duration = formatSeconds(durationSec);

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

  return null;
}

// ---------------------------------------------------------------------------
// FACEBOOK DIRECT EXTRACTOR
// ---------------------------------------------------------------------------
async function extractFacebookDirect(url: string): Promise<VideoInfo | null> {
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
            id: 'fb-hd',
            label: '1080p Full HD',
            quality: '1080p',
            format: 'mp4',
            downloadUrl: cleanEscapedUrl(hdMatch[1]),
            fileSize: '42.5 MB',
            resolution: '1920x1080',
          });
        }
        if (sdMatch) {
          qualities.push({
            id: 'fb-sd',
            label: '720p HD',
            quality: '720p',
            format: 'mp4',
            downloadUrl: cleanEscapedUrl(sdMatch[1]),
            fileSize: '21.2 MB',
            resolution: '1280x720',
          });
        }

        return {
          title: titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Facebook Video',
          thumbnail: thumbMatch ? decodeHtmlEntities(thumbMatch[1]) : 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop',
          duration: 'FB Reel',
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
// INSTAGRAM DIRECT EXTRACTOR
// ---------------------------------------------------------------------------
async function extractInstagramDirect(url: string): Promise<VideoInfo | null> {
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
              id: 'ig-1080p',
              label: '1080p Full HD Reel',
              quality: '1080p',
              format: 'mp4',
              downloadUrl: videoUrl,
              fileSize: '32.4 MB',
              resolution: '1080x1920',
            },
            {
              id: 'ig-mp3',
              label: 'Audio Stream (MP3)',
              quality: 'audio',
              format: 'mp3',
              downloadUrl: videoUrl,
              fileSize: '3.8 MB',
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
        signal: AbortSignal.timeout(5000),
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
      // Ignore
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// UTILITY HELPERS
// ---------------------------------------------------------------------------
function calculateBitrateSize(qualityStr: string, durationSec: number): string {
  if (durationSec <= 0) return 'Stream MB';

  let bitrateBps = 2500000;
  if (qualityStr.includes('2160') || qualityStr.includes('4K')) bitrateBps = 12000000;
  else if (qualityStr.includes('1080')) bitrateBps = 5500000;
  else if (qualityStr.includes('720')) bitrateBps = 2800000;
  else if (qualityStr.includes('480')) bitrateBps = 1400000;
  else if (qualityStr.includes('360')) bitrateBps = 800000;
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

function getResolutionDimensions(qualityStr: string): string {
  if (qualityStr.includes('2160') || qualityStr.includes('4K')) return '3840x2160';
  if (qualityStr.includes('1080')) return '1920x1080';
  if (qualityStr.includes('720')) return '1280x720';
  if (qualityStr.includes('480')) return '854x480';
  if (qualityStr.includes('360')) return '640x360';
  return '1280x720';
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
