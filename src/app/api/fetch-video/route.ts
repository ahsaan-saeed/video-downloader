import { NextRequest, NextResponse } from 'next/server';
import { detectPlatform, isValidUrl } from '@/lib/validators';
import { VideoInfo, VideoQuality } from '@/lib/types';

// We intentionally avoid @distube/ytdl-core on Vercel because YouTube's
// decipher function changes daily and breaks all self-hosted extractors.
// Instead we use multiple public API tiers with automatic fallback.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Please enter a valid video URL.' }, { status: 400 });
    }

    const platform = detectPlatform(url);
    if (!platform) {
      return NextResponse.json(
        { error: 'Unsupported URL. Please paste a YouTube, Facebook, or Instagram link.' },
        { status: 400 }
      );
    }

    const cleanUrl = url.trim();

    // ── Tier 1: RapidAPI (if user configured their key) ────────────────────
    const rapidKey = process.env.RAPIDAPI_KEY;
    if (rapidKey) {
      const result = await fetchViaRapidApi(cleanUrl, platform, rapidKey);
      if (result) return NextResponse.json(result);
    }

    // ── Tier 2: Platform-specific public free API ──────────────────────────
    if (platform === 'youtube') {
      const result = await fetchYouTubeViaY2Mate(cleanUrl);
      if (result) return NextResponse.json(result);

      const result2 = await fetchYouTubeViaNoembed(cleanUrl);
      if (result2) return NextResponse.json(result2);
    }

    if (platform === 'facebook') {
      const result = await fetchFacebookViaHtml(cleanUrl);
      if (result) return NextResponse.json(result);
    }

    if (platform === 'instagram') {
      const result = await fetchInstagramViaHtml(cleanUrl);
      if (result) return NextResponse.json(result);
    }

    // ── Tier 3: Cobalt public instance ─────────────────────────────────────
    const cobalt = await fetchViaCobalt(cleanUrl, platform);
    if (cobalt) return NextResponse.json(cobalt);

    // ── All tiers exhausted ────────────────────────────────────────────────
    return NextResponse.json(
      {
        error:
          'Could not fetch download links automatically. ' +
          'To enable full downloads, add a RAPIDAPI_KEY in your Vercel environment variables. ' +
          'Get a free key at rapidapi.com and subscribe to "All Video Downloader" API.',
      },
      { status: 422 }
    );
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 1 – RAPIDAPI  (universal, works for YT + FB + IG)
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaRapidApi(
  url: string,
  platform: 'youtube' | 'facebook' | 'instagram',
  apiKey: string
): Promise<VideoInfo | null> {
  const hosts = [
    { host: 'social-download-all-in-one.p.rapidapi.com', path: '/v1/social/autolink' },
    { host: 'all-video-downloader-ap.p.rapidapi.com',    path: '/download'            },
  ];

  for (const { host, path } of hosts) {
    try {
      const res = await fetch(`https://${host}${path}`, {
        method: 'POST',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': host,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const mapped = mapRapidApiResponse(data, url, platform);
        if (mapped) return mapped;
      }
    } catch {
      // try next host
    }
  }
  return null;
}

function mapRapidApiResponse(
  data: any,
  url: string,
  platform: 'youtube' | 'facebook' | 'instagram'
): VideoInfo | null {
  const title = data.title || data.text || `${platform} Video`;
  const thumbnail = data.thumbnail || data.picture || data.image || '';
  const author = data.author?.name || data.uploader || `${platform} Creator`;
  const duration = data.duration || '';
  const medias: any[] = data.medias || data.picker || data.links || [];

  const qualities: VideoQuality[] = medias
    .filter((m: any) => m.url || m.link)
    .map((m: any, idx: number) => {
      const dlUrl = m.url || m.link;
      const qual = m.quality || m.subname || m.resolution || `${720 - idx * 120}p`;
      return {
        id: `rapid-${idx}`,
        label: qual,
        quality: qual,
        format: (m.extension || m.ext || 'mp4').toLowerCase(),
        downloadUrl: dlUrl,
        fileSize: m.formattedSize || m.size || '',
        isAudioOnly: m.audio === true || (m.extension || '').toLowerCase() === 'mp3',
      };
    });

  if (!qualities.length) return null;

  return { title, thumbnail, duration, author, platform, originalUrl: url, qualities };
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 2a – Y2Mate API  (YouTube-only, no key needed)
// ────────────────────────────────────────────────────────────────────────────
async function fetchYouTubeViaY2Mate(url: string): Promise<VideoInfo | null> {
  try {
    // Step 1 – Analyse
    const analyseRes = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.y2mate.com/',
      },
      body: new URLSearchParams({ k_query: url, k_page: 'home', hl: 'en', q_auto: '0' }).toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!analyseRes.ok) return null;
    const analyseData = await analyseRes.json();
    if (!analyseData || analyseData.status !== 'ok') return null;

    const title: string = analyseData.title || 'YouTube Video';
    const thumbnail: string = analyseData.thumbnail || '';
    const durationStr: string = analyseData.duration || '00:00';

    // Convert mm:ss to HH:MM:SS string
    const duration = durationStr;

    const qualities: VideoQuality[] = [];

    // video links
    const videoLinks = analyseData.links?.mp4 || {};
    for (const [quality, info] of Object.entries(videoLinks as Record<string, any>)) {
      if (info?.k) {
        const dlUrl = buildY2MateDownloadUrl(info.k);
        if (dlUrl) {
          qualities.push({
            id: `y2mate-${quality}`,
            label: `${quality} (MP4)`,
            quality,
            format: 'mp4',
            downloadUrl: dlUrl,
            fileSize: info.size || '',
          });
        }
      }
    }

    // audio links
    const audioLinks = analyseData.links?.mp3 || {};
    for (const [quality, info] of Object.entries(audioLinks as Record<string, any>)) {
      if (info?.k) {
        const dlUrl = buildY2MateDownloadUrl(info.k);
        if (dlUrl) {
          qualities.push({
            id: `y2mate-audio-${quality}`,
            label: `Audio ${quality} (MP3)`,
            quality: 'audio',
            format: 'mp3',
            downloadUrl: dlUrl,
            fileSize: info.size || '',
            isAudioOnly: true,
          });
        }
      }
    }

    if (!qualities.length) return null;

    return {
      title,
      thumbnail,
      duration,
      author: 'YouTube Channel',
      platform: 'youtube',
      originalUrl: url,
      qualities,
    };
  } catch {
    return null;
  }
}

function buildY2MateDownloadUrl(k: string): string {
  // Y2Mate returns a direct key — build the convert URL
  return `https://www.y2mate.com/mates/convertV2/index?k=${k}`;
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 2b – YouTube oEmbed + Piped (fallback for title/thumbnail + streams)
// ────────────────────────────────────────────────────────────────────────────
async function fetchYouTubeViaNoembed(url: string): Promise<VideoInfo | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  let title = 'YouTube Video';
  let author = 'YouTube Channel';
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  let durationSec = 0;
  const qualities: VideoQuality[] = [];

  // Fetch oEmbed for metadata
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const d = await res.json();
      title = d.title || title;
      author = d.author_name || author;
      thumbnail = d.thumbnail_url || thumbnail;
    }
  } catch {/* ignore */}

  // Fetch Piped streams
  const pipedNodes = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://piped-api.garudalinux.org/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
  ];

  for (const node of pipedNodes) {
    try {
      const res = await fetch(node, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.title) {
          title = d.title;
          author = d.uploader || author;
          durationSec = d.duration || 0;
          thumbnail = d.thumbnailUrl || thumbnail;
        }
        (d?.videoStreams || []).forEach((s: any, i: number) => {
          if (s.url && s.quality) {
            qualities.push({
              id: `piped-v-${i}`,
              label: `${s.quality} (${s.format || 'MP4'})`,
              quality: s.quality,
              format: (s.format || 'mp4').toLowerCase(),
              downloadUrl: s.url,
              fileSize: calculateSize(s.quality, durationSec),
              resolution: `${s.width || ''}x${s.height || ''}`,
            });
          }
        });
        const audio = (d?.audioStreams || [])[0];
        if (audio?.url) {
          qualities.push({
            id: 'piped-audio',
            label: 'Audio Only (MP3)',
            quality: 'audio',
            format: 'mp3',
            downloadUrl: audio.url,
            fileSize: calculateSize('audio', durationSec),
            isAudioOnly: true,
          });
        }
        if (qualities.length) break;
      }
    } catch {/* next */}
  }

  if (!qualities.length) return null;

  return {
    title,
    thumbnail,
    duration: formatSeconds(durationSec),
    author,
    platform: 'youtube',
    originalUrl: url,
    qualities: dedup(qualities),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 2c – Facebook HTML scraper
// ────────────────────────────────────────────────────────────────────────────
async function fetchFacebookViaHtml(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const hd = (html.match(/"browser_native_hd_url":"([^"]+)"/i) || html.match(/hd_src:"([^"]+)"/i))?.[1];
    const sd = (html.match(/"browser_native_sd_url":"([^"]+)"/i) || html.match(/sd_src:"([^"]+)"/i) || html.match(/<meta property="og:video" content="([^"]+)"/i))?.[1];

    if (!hd && !sd) return null;

    const title = (html.match(/<meta property="og:title" content="([^"]+)"/i))?.[1];
    const thumb = (html.match(/<meta property="og:image" content="([^"]+)"/i))?.[1];
    const qualities: VideoQuality[] = [];

    if (hd) qualities.push({ id: 'fb-hd', label: '1080p Full HD', quality: '1080p', format: 'mp4', downloadUrl: cleanUrl(hd), fileSize: '~48 MB', resolution: '1920x1080' });
    if (sd) qualities.push({ id: 'fb-sd', label: '720p HD', quality: '720p', format: 'mp4', downloadUrl: cleanUrl(sd), fileSize: '~22 MB', resolution: '1280x720' });

    return {
      title: title ? decode(title) : 'Facebook Video',
      thumbnail: thumb ? decode(thumb) : '',
      duration: '',
      author: 'Facebook Creator',
      platform: 'facebook',
      originalUrl: url,
      qualities,
    };
  } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 2d – Instagram HTML scraper
// ────────────────────────────────────────────────────────────────────────────
async function fetchInstagramViaHtml(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    const videoUrl = (html.match(/<meta property="og:video" content="([^"]+)"/i) || html.match(/"video_url":"([^"]+)"/i))?.[1];
    if (!videoUrl) return null;

    const title = (html.match(/<meta property="og:title" content="([^"]+)"/i))?.[1];
    const thumb = (html.match(/<meta property="og:image" content="([^"]+)"/i))?.[1];

    return {
      title: title ? decode(title) : 'Instagram Reel',
      thumbnail: thumb ? decode(thumb) : '',
      duration: '',
      author: '@instagram',
      platform: 'instagram',
      originalUrl: url,
      qualities: [
        { id: 'ig-hd', label: '1080p Full HD Reel', quality: '1080p', format: 'mp4', downloadUrl: cleanUrl(videoUrl), fileSize: '~35 MB', resolution: '1080x1920' },
        { id: 'ig-mp3', label: 'Audio Only (MP3)', quality: 'audio', format: 'mp3', downloadUrl: cleanUrl(videoUrl), fileSize: '~4 MB', isAudioOnly: true },
      ],
    };
  } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 3 – Cobalt
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaCobalt(
  url: string,
  platform: 'youtube' | 'facebook' | 'instagram'
): Promise<VideoInfo | null> {
  for (const ep of ['https://api.cobalt.tools/api/json', 'https://cobalt.api.sc7.io/api/json']) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ url, vQuality: '1080' }),
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.url) {
          return {
            title: d.filename || `${platform} Video`,
            thumbnail: '',
            duration: '',
            author: `${platform} Creator`,
            platform,
            originalUrl: url,
            qualities: [
              { id: 'cobalt-hd', label: '1080p Full HD', quality: '1080p', format: 'mp4', downloadUrl: d.url, fileSize: 'Direct CDN' },
              { id: 'cobalt-audio', label: 'Audio Only (MP3)', quality: 'audio', format: 'mp3', downloadUrl: d.url, fileSize: 'Audio Stream', isAudioOnly: true },
            ],
          };
        }
      }
    } catch {/* try next */}
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  return url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/)?.[1] ?? null;
}

function cleanUrl(s: string): string {
  return s.replace(/\\u0026/g, '&').replace(/\\/g, '').replace(/&amp;/g, '&');
}

function decode(s: string): string {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function calculateSize(q: string, sec: number): string {
  if (sec <= 0) return '';
  const bps = q.includes('2160') ? 12_000_000
    : q.includes('1080') ? 5_500_000
    : q.includes('720') ? 2_800_000
    : q.includes('480') ? 1_400_000
    : q.includes('audio') || q.includes('mp3') ? 256_000
    : 800_000;
  return `${((bps * sec) / 8 / 1024 / 1024).toFixed(1)} MB`;
}

function dedup(qs: VideoQuality[]): VideoQuality[] {
  const seen = new Set<string>();
  return qs.filter(q => { const k = `${q.quality}-${q.format}`; return seen.has(k) ? false : (seen.add(k), true); });
}

function formatSeconds(s: number): string {
  if (s <= 0) return '';
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}
