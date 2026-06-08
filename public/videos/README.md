# public/videos — VideoWall clips

Drop the home VideoWall clips here (or host them in a bucket — see
[`docs/home/video-wall.md`](../../docs/home/video-wall.md)).

Expected files per spot id (`d1…d6`, `m1…m3`):

```
d1.webm  d1.mp4  d1.jpg      # AV1 + H.264 + poster
m1.webm  m1.mp4  m1.jpg
…
```

Reference them from `src/components/site/home/VideoWall/videos.ts`:

```ts
sources: [
  { src: "/videos/d1.webm", type: "video/webm; codecs=av01.0.05M.08" },
  { src: "/videos/d1.mp4",  type: "video/mp4; codecs=avc1.640028" },
],
poster: "/videos/d1.jpg",
```

## Batch-encode all nine

Put your raw recordings in `public/videos/raw/` named `d1.mov`, `m1.mov`, …
then run this from the repo root (needs `ffmpeg` with `libsvtav1` + `libx264`):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"                 # public/videos
mkdir -p out

encode () {                          # encode <id> <W> <H>
  local id=$1 W=$2 H=$3
  local src="raw/$id.mov" vf="scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=30"
  [ -f "$src" ] || { echo "skip $id (no $src)"; return; }
  echo "▶ $id ($W×$H)"
  ffmpeg -y -i "$src" -an -vf "$vf" -c:v libsvtav1 -crf 38 -preset 7 -g 240 -pix_fmt yuv420p "out/$id.webm"
  ffmpeg -y -i "$src" -an -vf "$vf" -c:v libx264 -crf 30 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart "out/$id.mp4"
  ffmpeg -y -i "out/$id.mp4" -frames:v 1 -q:v 4 "out/$id.jpg"
}

# desktop 16:10 → 1280×800 · mobile 9:19.5 → 540×1170
for d in d1 d2 d3 d4 d5 d6; do encode "$d" 1280 800; done
for m in m1 m2 m3;          do encode "$m" 540 1170; done

echo "✅ done → public/videos/out (review sizes, then move next to this README)"
du -h out/* 2>/dev/null | sort -h
```

Review the output sizes (aim ≤ ~300–500 KB per clip), then move the files out of
`out/` to sit next to this README. `raw/` and `out/` are git-ignored.
