import sys
import json
import math
import yt_dlp

def format_bytes(size):
    if not size or size <= 0:
        return ""
    units = ["B", "KB", "MB", "GB"]
    i = int(math.floor(math.log(size, 1024)))
    p = math.pow(1024, i)
    s = round(size / p, 1)
    return f"{s} {units[i]}"

def format_seconds(seconds):
    if not seconds or seconds <= 0:
        return ""
    sec = int(seconds)
    hrs = sec // 3600
    mins = (sec % 3600) // 60
    secs = sec % 60
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"

def extract(url):
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

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            raise Exception("Unable to extract video metadata.")

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

        qualities = []
        seen_keys = set()
        raw_formats = info.get("formats", [])

        # 1. Combined audio+video formats
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
                    qualities.append({
                        "id": f"fmt-{fmt.get('format_id', 'audio')}",
                        "label": label,
                        "quality": "audio",
                        "format": ext if ext != "m4a" else "mp3",
                        "downloadUrl": dl_url,
                        "fileSize": file_size,
                        "isAudioOnly": True
                    })
            elif is_combined and height:
                qual_str = f"{height}p"
                qual_key = f"video-{qual_str}-{ext}"
                if qual_key not in seen_keys:
                    seen_keys.add(qual_key)
                    qualities.append({
                        "id": f"fmt-{fmt.get('format_id', qual_str)}",
                        "label": f"{qual_str} ({ext.upper()})",
                        "quality": qual_str,
                        "format": ext,
                        "downloadUrl": dl_url,
                        "fileSize": file_size,
                        "resolution": f"{fmt.get('width', '')}x{height}",
                        "isAudioOnly": False
                    })

        # 2. If no direct combined formats, check if direct info url exists
        if not qualities:
            direct_url = info.get("url")
            if direct_url:
                qualities.append({
                    "id": "best",
                    "label": "Best Quality (MP4)",
                    "quality": "1080p",
                    "format": "mp4",
                    "downloadUrl": direct_url,
                    "fileSize": format_bytes(info.get("filesize") or info.get("filesize_approx")),
                    "isAudioOnly": False
                })

        # 3. Include top video-only or audio-only streams if needed
        if not any(not q.get("isAudioOnly") for q in qualities):
            for fmt in raw_formats:
                dl_url = fmt.get("url")
                height = fmt.get("height")
                if dl_url and height:
                    qual_str = f"{height}p"
                    qual_key = f"vonly-{qual_str}"
                    if qual_key not in seen_keys:
                        seen_keys.add(qual_key)
                        qualities.append({
                            "id": f"fmt-{fmt.get('format_id', qual_str)}",
                            "label": f"{qual_str} (MP4)",
                            "quality": qual_str,
                            "format": fmt.get("ext", "mp4"),
                            "downloadUrl": dl_url,
                            "fileSize": format_bytes(fmt.get("filesize") or fmt.get("filesize_approx")),
                            "resolution": f"{fmt.get('width', '')}x{height}",
                            "isAudioOnly": False
                        })

        def get_sort_key(q):
            if q.get("isAudioOnly"):
                return 0
            try:
                return int(str(q.get("quality", "0")).replace("p", ""))
            except ValueError:
                return 1

        qualities.sort(key=get_sort_key, reverse=True)

        return {
            "title": title,
            "thumbnail": thumbnail or "",
            "duration": duration,
            "author": author,
            "platform": platform,
            "originalUrl": url,
            "qualities": qualities[:10]
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL provided"}))
        sys.exit(1)
    
    url = sys.argv[1]
    try:
        data = extract(url)
        # Use stdout with utf-8 encoding
        sys.stdout.reconfigure(encoding='utf-8')
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        sys.stdout.reconfigure(encoding='utf-8')
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)
