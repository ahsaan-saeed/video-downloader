import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { detectPlatform, isValidUrl } from '@/lib/validators';
import { VideoInfo, VideoQuality } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return NextResponse.json({ error: 'Please enter a valid video URL.' }, { status: 400 });
    }

    const platform = detectPlatform(url) || 'video';
    const cleanUrl = url.trim();

    // ── Tier 0: Direct Local Python yt-dlp Engine (Instant & Guaranteed) ────
    const localResult = await fetchViaLocalPythonEngine(cleanUrl);
    if (localResult && localResult.qualities && localResult.qualities.length > 0) {
      return NextResponse.json(localResult);
    }

    // ── Tier 1: Self-Hosted Python yt-dlp Backend (Render.com / Custom VPS) ────
    const backendUrl = process.env.BACKEND_URL;
    if (backendUrl) {
      const selfHostedResult = await fetchViaSelfHostedBackend(cleanUrl, backendUrl);
      if (selfHostedResult) return NextResponse.json(selfHostedResult);
    }

    // ── Tier 2: RapidAPI (if configured) ───────────────────────────────────
    const rapidKey = process.env.RAPIDAPI_KEY;
    if (rapidKey) {
      const result = await fetchViaRapidApi(cleanUrl, platform as any, rapidKey);
      if (result) return NextResponse.json(result);
    }

    // ── Tier 3: Facebook via Snapsave Unpacker ──────────────────────────────
    if (platform === 'facebook') {
      const fbResult = await fetchFacebookViaSnapsave(cleanUrl);
      if (fbResult) return NextResponse.json(fbResult);
    }

    // ── Tier 4: TikTok via TikWM ───────────────────────────────────────────
    if (platform === 'tiktok' || cleanUrl.includes('tiktok.com')) {
      const tikResult = await fetchTikTokViaTikWM(cleanUrl);
      if (tikResult) return NextResponse.json(tikResult);
    }

    // ── Tier 5: Cobalt v10 Instances ───────────────────────────────────────
    const cobalt = await fetchViaCobalt(cleanUrl, platform);
    if (cobalt) return NextResponse.json(cobalt);

    // ── All tiers exhausted ────────────────────────────────────────────────
    return NextResponse.json(
      {
        error:
          'Could not fetch video download links. ' +
          'Please ensure the link is public and accessible, or try another video URL.',
      },
      { status: 422 }
    );
  } catch (err: any) {
    console.error('API error:', err);
    return NextResponse.json({ error: err.message || 'Server error. Please try again.' }, { status: 500 });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 0 – Local Python yt-dlp Engine
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaLocalPythonEngine(url: string): Promise<VideoInfo | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.join(process.cwd(), 'backend', 'extractor.py');
      const pyProcess = spawn('python', [scriptPath, url], {
        windowsHide: true,
      });

      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      const timer = setTimeout(() => {
        try {
          pyProcess.kill();
        } catch {}
        resolve(null);
      }, 15000);

      pyProcess.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0 && stdoutData) {
          try {
            // Find json string in stdout in case of warnings before json
            const jsonStart = stdoutData.indexOf('{');
            const jsonEnd = stdoutData.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = stdoutData.substring(jsonStart, jsonEnd + 1);
              const data = JSON.parse(jsonStr);
              if (data && data.qualities && data.qualities.length > 0) {
                resolve(data as VideoInfo);
                return;
              }
            }
          } catch (e) {
            console.warn('Failed to parse local python output:', e);
          }
        }
        resolve(null);
      });

      pyProcess.on('error', () => {
        clearTimeout(timer);
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 1 – Self-Hosted Python yt-dlp Backend (Render / VPS)
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaSelfHostedBackend(url: string, backendUrl: string): Promise<VideoInfo | null> {
  try {
    const endpoint = `${backendUrl.replace(/\/$/, '')}/api/info`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.qualities && data.qualities.length > 0) {
        return data as VideoInfo;
      }
    }
  } catch (err) {
    console.warn('Self-hosted backend call failed:', err);
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 2 – RAPIDAPI
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaRapidApi(
  url: string,
  platform: 'youtube' | 'facebook' | 'instagram' | string,
  apiKey: string
): Promise<VideoInfo | null> {
  const hosts = [
    { host: 'social-download-all-in-one.p.rapidapi.com', path: '/v1/social/autolink' },
    { host: 'all-video-downloader-ap.p.rapidapi.com', path: '/download' },
  ];

  for (const { host, path: apiPath } of hosts) {
    try {
      const res = await fetch(`https://${host}${apiPath}`, {
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

function mapRapidApiResponse(data: any, url: string, platform: string): VideoInfo | null {
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

  return { title, thumbnail, duration, author, platform: platform as any, originalUrl: url, qualities };
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 3 – Facebook via Snapsave Unpacker
// ────────────────────────────────────────────────────────────────────────────
async function fetchFacebookViaSnapsave(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch('https://snapsave.app/action.php?lang=en', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://snapsave.app/',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ url }).toString(),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const text = await res.text();
    let html = decodeSnapScript(text);
    if (!html) return null;

    // Unescape quotes and slashes from JS innerHTML
    html = html.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\n/g, '').replace(/\\t/g, '');

    const qualities: VideoQuality[] = [];
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i][1];
      const qualMatch = row.match(/class="video-quality"[^>]*>([^<]+)</i);
      const urlMatch = row.match(/href="([^"]+)"/i);

      if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('#')) {
        const qualText = qualMatch ? qualMatch[1].trim() : `${720 - i * 240}p`;
        const cleanQual = qualText.includes('1080') ? '1080p' : qualText.includes('720') ? '720p' : '480p';
        qualities.push({
          id: `fb-snap-${i}`,
          label: `${qualText} (MP4)`,
          quality: cleanQual,
          format: 'mp4',
          downloadUrl: urlMatch[1],
          fileSize: qualText.includes('HD') ? '~35 MB' : '~15 MB',
          isAudioOnly: false,
        });
      }
    }

    // Direct link fallback
    if (!qualities.length) {
      const directLinks = [...html.matchAll(/href="(https:\/\/[^"]+)"/g)].map((m) => m[1]);
      if (directLinks.length > 0) {
        qualities.push({
          id: 'fb-snap-0',
          label: '720p HD (MP4)',
          quality: '720p',
          format: 'mp4',
          downloadUrl: directLinks[0],
          fileSize: '',
          isAudioOnly: false,
        });
      }
    }

    if (!qualities.length) return null;

    const thumbMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    const titleMatch = html.match(/<strong>([^<]+)<\/strong>/i);

    return {
      title: titleMatch ? titleMatch[1] : 'Facebook Video',
      thumbnail: thumbMatch ? thumbMatch[1] : '',
      duration: '',
      author: 'Facebook Creator',
      platform: 'facebook',
      originalUrl: url,
      qualities,
    };
  } catch {
    return null;
  }
}

function decodeSnapScript(script: string): string | null {
  try {
    const argsMatch = script.match(
      /\}\s*\(\s*("[\s\S]*?"|'[\s\S]*?')\s*,\s*(\d+|"[\s\S]*?")\s*,\s*("[\s\S]*?"|'[\s\S]*?')\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*\)/
    );
    if (!argsMatch) return null;

    const func = new Function(
      `return (function(h,u,n,t,e,r){
        r="";
        for(var i=0,len=h.length;i<len;i++){
          var s="";
          while(h[i]!==n[e]){
            s+=h[i];
            i++;
          }
          for(var j=0;j<n.length;j++)
            s=s.replace(new RegExp(n[j],"g"),j.toString());
          r+=String.fromCharCode(_0xe51c(s,e,10)-t);
        }
        function _0xe51c(d,e,f){
          var g="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/";
          var h=g.slice(0,e);
          var i=g.slice(0,f);
          var j=d.split("").reverse().reduce(function(a,b,c){
            if(h.indexOf(b)!==-1)return a+=h.indexOf(b)*(Math.pow(e,c));
          },0);
          var k="";
          while(j>0){
            k=i[j%f]+k;
            j=(j-(j%f))/f;
          }
          return parseInt(k)||0;
        }
        return decodeURIComponent(escape(r));
      })(${argsMatch[1]}, ${argsMatch[2]}, ${argsMatch[3]}, ${argsMatch[4]}, ${argsMatch[5]}, ${argsMatch[6]})`
    );
    return func();
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 4 – TikTok via TikWM
// ────────────────────────────────────────────────────────────────────────────
async function fetchTikTokViaTikWM(url: string): Promise<VideoInfo | null> {
  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data || !data.play) return null;

    const qualities: VideoQuality[] = [];
    if (data.hdplay) {
      qualities.push({
        id: 'tiktok-hd',
        label: '1080p HD (No Watermark)',
        quality: '1080p',
        format: 'mp4',
        downloadUrl: data.hdplay,
        fileSize: data.hd_size ? `${(data.hd_size / 1024 / 1024).toFixed(1)} MB` : '',
        isAudioOnly: false,
      });
    }

    qualities.push({
      id: 'tiktok-sd',
      label: '720p (No Watermark)',
      quality: '720p',
      format: 'mp4',
      downloadUrl: data.play,
      fileSize: data.size ? `${(data.size / 1024 / 1024).toFixed(1)} MB` : '',
      isAudioOnly: false,
    });

    if (data.music) {
      qualities.push({
        id: 'tiktok-audio',
        label: 'Audio Only (MP3)',
        quality: 'audio',
        format: 'mp3',
        downloadUrl: data.music,
        fileSize: '~3 MB',
        isAudioOnly: true,
      });
    }

    return {
      title: data.title || 'TikTok Video',
      thumbnail: data.cover || '',
      duration: data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : '',
      author: data.author?.nickname || data.author?.unique_id || 'TikTok Creator',
      platform: 'tiktok' as any,
      originalUrl: url,
      qualities,
    };
  } catch {
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// TIER 5 – Cobalt
// ────────────────────────────────────────────────────────────────────────────
async function fetchViaCobalt(url: string, platform: string): Promise<VideoInfo | null> {
  const instances = ['https://api.cobalt.tools', 'https://cobalt-api.kwiatekm.tokyo'];
  for (const ep of instances) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const d = await res.json();
        if (d?.url) {
          return {
            title: d.filename || `${platform} Video`,
            thumbnail: '',
            duration: '',
            author: `${platform} Creator`,
            platform: platform as any,
            originalUrl: url,
            qualities: [
              {
                id: 'cobalt-hd',
                label: 'HD Quality (MP4)',
                quality: '1080p',
                format: 'mp4',
                downloadUrl: d.url,
                fileSize: 'Direct Stream',
              },
            ],
          };
        }
      }
    } catch {
      // try next
    }
  }
  return null;
}
