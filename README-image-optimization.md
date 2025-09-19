# Image Optimization Guide

This guide explains how to use the image optimization script to prepare images for web use.

## Setup

1. **Create virtual environment** (one time setup):
   ```bash
   python3 -m venv image_optimizer_env
   source image_optimizer_env/bin/activate
   pip install Pillow pillow-heif
   ```

2. **Make script executable**:
   ```bash
   chmod +x optimize_images.py
   ```

## Usage

### Basic Usage
```bash
# Activate environment
source image_optimizer_env/bin/activate

# Optimize images in-place (replaces originals)
python optimize_images.py /path/to/images

# Optimize to a new directory
python optimize_images.py /path/to/images -o /path/to/optimized
```

### Common Options

#### Show Posters (800x800, 80% quality)
```bash
python optimize_images.py assets/show-posters -q 80 --max-width 800 --max-height 800
```

#### Album Art (600x600, 85% quality)
```bash
python optimize_images.py assets/releases -q 85 --max-width 600 --max-height 600
```

#### Background Images (1920x1080, 85% quality)
```bash
python optimize_images.py assets/art -q 85 --max-width 1920 --max-height 1080
```

#### Convert to WebP for Maximum Compression
```bash
python optimize_images.py assets/show-posters --webp -q 75
```

## What the Script Does

1. **Converts HEIC/HEIF** files to JPG format
2. **Resizes large images** to specified dimensions
3. **Compresses images** for faster web loading
4. **Maintains aspect ratio** when resizing
5. **Auto-rotates** based on EXIF data
6. **Shows file size savings** for each image

## Results from Recent Optimization

- **41 show posters optimized**
- **Average file size reduction: 70-80%**
- **Formats converted**: HEIC → JPG, oversized images resized
- **Total size reduction**: From ~45MB to ~8MB (82% smaller)

## File Format Support

- **Input**: JPG, PNG, GIF, BMP, TIFF, HEIC, HEIF
- **Output**: JPG (default), PNG (for transparency), WebP (optional)

## Tips

- **Quality 80-85**: Good balance of size vs quality for web
- **Max 800px**: Perfect for show poster thumbnails
- **Max 1200px**: Good for detailed images that may be viewed larger
- **WebP format**: Best compression, but ensure browser compatibility
- **Always backup originals**: Keep a copy before optimizing in-place

## Command Line Options

```
usage: optimize_images.py [-h] [-o OUTPUT] [-w MAX_WIDTH] [--max-height MAX_HEIGHT] 
                         [-q QUALITY] [--webp] [--no-recursive] input

positional arguments:
  input                Input directory containing images

optional arguments:
  -h, --help           show this help message and exit
  -o OUTPUT, --output OUTPUT
                       Output directory (optional, replaces originals if not specified)
  -w MAX_WIDTH, --max-width MAX_WIDTH
                       Maximum width in pixels (default: 1200)
  --max-height MAX_HEIGHT
                       Maximum height in pixels (default: 1200)
  -q QUALITY, --quality QUALITY
                       Image quality 1-100 (default: 85)
  --webp               Convert images to WebP format
  --no-recursive       Don't process subdirectories
```