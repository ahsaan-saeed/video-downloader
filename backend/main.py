import os
import math
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

app = FastAPI(title="Video Downloader API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class VideoRequest(BaseModel):
    url: str

class VideoQuality(BaseModel):
    id: str
    label: str
    quality: str
    format: str
    downloadUrl: str
    fileSize: str = ""
    resolution: Optional[str] = None
    isAudioOnly: bool = False

class VideoInfo(BaseModel):
    title: str
    thumbnail: str
    duration: str
    author: str
    platform: str
    originalUrl: str
    qualities: List[VideoQuality]

def format_bytes(size: Optional[int]) -> str:
    if not size or size <= 0:
        return ""
    units = ["B", "KB", "MB", "GB"]
    i = int(math.floor(math.log(size, 1024)))
    p = math.pow(1024, i)
    s = round(size / p, 1)
    return f"{s} {units[i]}"

def format_seconds(seconds: Optional[float]) -> str:
    if not seconds or seconds <= 0:
        return ""
    sec = int(seconds)
    hrs = sec // 3600
    mins = (sec % 3600) // 60
    secs = sec % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

@app.get("/")
def health_check():
    return {"status": "ok", "service": "yt-dlp video extractor"}

@app.post("/api/info", response_model=VideoInfo)
def extract_video_info(req: VideoRequest):
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'format': 'bestvideo+bestaudio/best',
        'extract_flat': False,
        'skip_download': True,
        'ignoreerrors': True,
        'extractor_args': {
            'youtube': {
                'player_client': ['android', 'ios', 'web_creator', 'tv_embedded', 'mweb']
            }
        },
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract video info: {str(e)}")

    if not info:
        raise HTTPException(status_code=422, detail="Unable to fetch video information.")

    title = info.get("title") or "Downloaded Video"
    thumbnail = info.get("thumbnail") or (info.get("thumbnails", [{}])[-1].get("url") if info.get("thumbnails") else "")
    author = info.get("uploader") or info.get("channel") or info.get("creator") or "Content Creator"
    duration = format_seconds(info.get("duration"))
    extractor = (info.get("extractor_key") or info.get("extractor") or "video").lower()

    if "youtube" in extractor or "youtu.be" in url:
        platform = "youtube"
    elif "facebook" in extractor or "fb.watch" in url:
        platform = "facebook"
    elif "instagram" in extractor or "instagr" in url:
        platform = "instagram"
    elif "tiktok" in extractor or "tiktok" in url:
        platform = "tiktok"
    elif "twitter" in extractor or "x.com" in url:
        platform = "twitter"
    else:
        platform = extractor

    qualities: List[VideoQuality] = []
    seen_keys = set()

    raw_formats = info.get("formats", [])
    if not raw_formats:
        # Fallback to single direct url if formats list is empty
        direct_url = info.get("url")
        if direct_url:
            qualities.append(VideoQuality(
                id="default",
                label="Direct Stream",
                quality="HD",
                format="mp4",
                downloadUrl=direct_url,
                fileSize=format_bytes(info.get("filesize") or info.get("filesize_approx")),
                isAudioOnly=False
            ))

    for fmt in raw_formats:
        dl_url = fmt.get("url")
        if not dl_url:
            continue

        vcodec = fmt.get("vcodec", "none")
        acodec = fmt.get("acodec", "none")
        height = fmt.get("height")
        ext = fmt.get("ext", "mp4").lower()
        file_size = format_bytes(fmt.get("filesize") or fmt.get("filesize_approx"))

        is_audio = vcodec == "none" and acodec != "none"
        is_combined = vcodec != "none" and acodec != "none"

        if is_audio:
            label = f"Audio ({fmt.get('abr', 128):.0f}kbps {ext.upper()})" if fmt.get('abr') else f"Audio ({ext.upper()})"
            qual_key = f"audio-{ext}-{fmt.get('abr', 0)}"
            if qual_key not in seen_keys:
                seen_keys.add(qual_key)
                qualities.append(VideoQuality(
                    id=f"fmt-{fmt.get('format_id', 'audio')}",
                    label=label,
                    quality="audio",
                    format=ext if ext != "m4a" else "mp3",
                    downloadUrl=dl_url,
                    fileSize=file_size,
                    isAudioOnly=True
                ))
        elif is_combined and height:
            qual_str = f"{height}p"
            qual_key = f"video-{qual_str}-{ext}"
            if qual_key not in seen_keys:
                seen_keys.add(qual_key)
                qualities.append(VideoQuality(
                    id=f"fmt-{fmt.get('format_id', qual_str)}",
                    label=f"{qual_str} ({ext.upper()})",
                    quality=qual_str,
                    format=ext,
                    downloadUrl=dl_url,
                    fileSize=file_size,
                    resolution=f"{fmt.get('width', '')}x{height}",
                    isAudioOnly=False
                ))

    # If no combined formats found (YouTube often separates audio/video), fallback to best direct url or info['url']
    if not qualities:
        direct_url = info.get("url")
        if direct_url:
            qualities.append(VideoQuality(
                id="best",
                label="Best Quality (MP4)",
                quality="1080p",
                format="mp4",
                downloadUrl=direct_url,
                fileSize=format_bytes(info.get("filesize") or info.get("filesize_approx")),
                isAudioOnly=False
            ))

    # Sort qualities so highest resolution is first
    def get_sort_key(q: VideoQuality):
        if q.isAudioOnly:
            return 0
        try:
            return int(q.quality.replace("p", ""))
        except ValueError:
            return 1

    qualities.sort(key=get_sort_key, reverse=True)

    return VideoInfo(
        title=title,
        thumbnail=thumbnail or "",
        duration=duration,
        author=author,
        platform=platform,
        originalUrl=url,
        qualities=qualities[:10]  # Return top 10 relevant formats
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
