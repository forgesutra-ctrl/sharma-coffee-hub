# Video Compression Guide

## Current Video
- **File**: `src/assets/videos/hero-coffee-brewing.mp4`
- **Size**: ~11 MB (10.98 MB)

## Option 1: Using FFmpeg (Recommended)

### Install FFmpeg (if not installed)

**Windows:**
1. Download from: https://ffmpeg.org/download.html
2. Or use Chocolatey: `choco install ffmpeg`
3. Or use winget: `winget install ffmpeg`

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg  # Ubuntu/Debian
sudo yum install ffmpeg       # CentOS/RHEL
```

### Compression Command

Navigate to the videos folder and run:

```bash
cd src/assets/videos

# Compress the video (creates compressed version)
ffmpeg -i hero-coffee-brewing.mp4 \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  hero-coffee-brewing-compressed.mp4

# Or replace the original (backup first!)
ffmpeg -i hero-coffee-brewing.mp4 \
  -c:v libx264 \
  -crf 28 \
  -preset slow \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  hero-coffee-brewing-temp.mp4

# Then replace original
mv hero-coffee-brewing-temp.mp4 hero-coffee-brewing.mp4
```

### Command Explanation:
- `-c:v libx264`: Use H.264 video codec (widely supported)
- `-crf 28`: Quality setting (18-28 is good, lower = better quality but larger file)
- `-preset slow`: Better compression (slower encoding but smaller file)
- `-c:a aac`: Use AAC audio codec
- `-b:a 128k`: Audio bitrate (128k is good for web)
- `-movflags +faststart`: Optimize for web streaming (starts playing while downloading)

### Expected Results:
- **Original**: ~11 MB
- **Compressed**: ~3-5 MB (60-70% reduction)
- **Quality**: Still good for web use

## Option 2: More Aggressive Compression

For even smaller file size (may reduce quality slightly):

```bash
ffmpeg -i hero-coffee-brewing.mp4 \
  -c:v libx264 \
  -crf 30 \
  -preset slow \
  -vf "scale=1920:-2" \
  -c:a aac \
  -b:a 96k \
  -movflags +faststart \
  hero-coffee-brewing-compressed.mp4
```

This will:
- Use CRF 30 (slightly lower quality, smaller file)
- Scale to max width 1920px (if larger)
- Reduce audio bitrate to 96k

## Option 3: WebM Format (Better Compression)

For even better compression (but less browser support):

```bash
ffmpeg -i hero-coffee-brewing.mp4 \
  -c:v libvpx-vp9 \
  -crf 30 \
  -b:v 0 \
  -c:a libopus \
  -b:a 128k \
  hero-coffee-brewing.webm
```

## Option 4: Online Tools (No Installation)

If you can't install ffmpeg, use online tools:
1. **CloudConvert**: https://cloudconvert.com/mp4-compressor
2. **FreeConvert**: https://www.freeconvert.com/mp4-compressor
3. **Clideo**: https://clideo.com/compress-video

Upload your video, compress, and download the result.

## After Compression

1. Check the new file size
2. Test the video in your browser
3. If quality is acceptable, replace the original
4. Update any references in your code if you changed the filename

## Quick PowerShell Command (Once FFmpeg is Installed)

```powershell
cd src/assets/videos
ffmpeg -i hero-coffee-brewing.mp4 -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 128k -movflags +faststart hero-coffee-brewing-compressed.mp4
```

Then check the size:
```powershell
(Get-Item hero-coffee-brewing-compressed.mp4).Length / 1MB
```
