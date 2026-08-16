import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');
  const filename = searchParams.get('filename') || 'video.mp4';

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL parameter is required.' }, { status: 400 });
  }

  try {
    const rangeHeader = req.headers.get('range');
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': '*/*',
    };

    if (targetUrl.includes('tiktok') || targetUrl.includes('tikwm') || targetUrl.includes('tiktokcdn')) {
      fetchHeaders['Referer'] = 'https://www.tikwm.com/';
    } else if (targetUrl.includes('rapidcdn') || targetUrl.includes('snapsave')) {
      fetchHeaders['Referer'] = 'https://snapsave.app/';
    } else if (targetUrl.includes('fbcdn') || targetUrl.includes('facebook')) {
      fetchHeaders['Referer'] = 'https://www.facebook.com/';
    } else if (targetUrl.includes('instagram') || targetUrl.includes('cdninstagram')) {
      fetchHeaders['Referer'] = 'https://www.instagram.com/';
    } else if (targetUrl.includes('googlevideo') || targetUrl.includes('youtube')) {
      fetchHeaders['Referer'] = 'https://www.youtube.com/';
    }

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(targetUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      // Fallback: redirect directly to the URL if proxy fails
      return NextResponse.redirect(targetUrl);
    }

    const contentType = response.headers.get('content-type') || (filename.endsWith('.mp3') ? 'audio/mpeg' : 'video/mp4');
    const contentLength = response.headers.get('content-length');
    const contentRange = response.headers.get('content-range');

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type');

    if (contentLength) headers.set('Content-Length', contentLength);
    if (contentRange) headers.set('Content-Range', contentRange);
    headers.set('Accept-Ranges', 'bytes');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (err: any) {
    console.error('Download proxy error:', err);
    // If proxy failed, redirect directly to original media url
    return NextResponse.redirect(targetUrl);
  }
}
