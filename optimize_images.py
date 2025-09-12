#!/usr/bin/env python3
"""
Image Optimization Script for Lockslip Band Website
Optimizes show posters and other images for web use by:
- Converting HEIC/heic files to JPG
- Resizing large images to reasonable web dimensions
- Compressing images for faster loading
- Converting to WebP format for better compression
"""

import os
import sys
from PIL import Image, ImageOps
import pillow_heif
from pathlib import Path
import argparse

# Register HEIF opener
pillow_heif.register_heif_opener()

def optimize_image(input_path, output_path, max_width=1200, max_height=1200, quality=85, convert_to_webp=False):
    """
    Optimize a single image file
    
    Args:
        input_path: Path to input image
        output_path: Path to save optimized image
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: JPEG/WebP quality (1-100)
        convert_to_webp: Whether to convert to WebP format
    """
    try:
        print(f"Processing: {input_path}")
        
        # Open and process image
        with Image.open(input_path) as img:
            # Convert RGBA to RGB if necessary
            if img.mode in ('RGBA', 'LA'):
                background = Image.new('RGB', img.size, (0, 0, 0))  # Black background
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            
            # Auto-orient based on EXIF data
            img = ImageOps.exif_transpose(img)
            
            # Resize if image is too large
            original_size = img.size
            if img.width > max_width or img.height > max_height:
                img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                print(f"  Resized from {original_size} to {img.size}")
            
            # Determine output format
            if convert_to_webp:
                output_path = Path(output_path).with_suffix('.webp')
                img.save(output_path, 'WebP', quality=quality, optimize=True)
            else:
                # Keep original format but ensure it's web-compatible
                if str(input_path).lower().endswith(('.heic', '.heif')):
                    output_path = Path(output_path).with_suffix('.jpg')
                output_path = Path(output_path)
                img.save(output_path, 'JPEG' if output_path.suffix.lower() in ['.jpg', '.jpeg'] else 'PNG', 
                        quality=quality, optimize=True)
            
            # Get file sizes
            input_size = os.path.getsize(input_path) / 1024  # KB
            output_size = os.path.getsize(output_path) / 1024  # KB
            savings = ((input_size - output_size) / input_size) * 100 if input_size > 0 else 0
            
            print(f"  Saved: {input_size:.1f}KB → {output_size:.1f}KB ({savings:.1f}% reduction)")
            
            return True
            
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def optimize_directory(input_dir, output_dir=None, max_width=1200, max_height=1200, 
                      quality=85, convert_to_webp=False, recursive=True):
    """
    Optimize all images in a directory
    
    Args:
        input_dir: Input directory path
        output_dir: Output directory (if None, replaces originals)
        max_width: Maximum width in pixels
        max_height: Maximum height in pixels
        quality: Image quality (1-100)
        convert_to_webp: Whether to convert to WebP
        recursive: Whether to process subdirectories
    """
    input_path = Path(input_dir)
    
    if not input_path.exists():
        print(f"Error: Input directory '{input_dir}' does not exist")
        return
    
    # Supported image extensions
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.heic', '.heif'}
    
    # Get all image files
    if recursive:
        image_files = [f for f in input_path.rglob('*') if f.suffix.lower() in image_extensions]
    else:
        image_files = [f for f in input_path.iterdir() if f.suffix.lower() in image_extensions]
    
    if not image_files:
        print("No image files found to optimize")
        return
    
    print(f"Found {len(image_files)} image files to optimize")
    
    successful = 0
    failed = 0
    
    for image_file in image_files:
        # Determine output path
        if output_dir:
            output_path = Path(output_dir)
            # Maintain directory structure
            relative_path = image_file.relative_to(input_path)
            final_output_path = output_path / relative_path
            
            # Create output directory if it doesn't exist
            final_output_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            # Replace original file
            final_output_path = image_file
        
        if optimize_image(image_file, final_output_path, max_width, max_height, quality, convert_to_webp):
            successful += 1
        else:
            failed += 1
    
    print(f"\nOptimization complete: {successful} successful, {failed} failed")

def main():
    parser = argparse.ArgumentParser(description='Optimize images for web use')
    parser.add_argument('input', help='Input directory containing images')
    parser.add_argument('-o', '--output', help='Output directory (optional, replaces originals if not specified)')
    parser.add_argument('-w', '--max-width', type=int, default=1200, help='Maximum width in pixels (default: 1200)')
    parser.add_argument('--max-height', type=int, default=1200, help='Maximum height in pixels (default: 1200)')
    parser.add_argument('-q', '--quality', type=int, default=85, help='Image quality 1-100 (default: 85)')
    parser.add_argument('--webp', action='store_true', help='Convert images to WebP format')
    parser.add_argument('--no-recursive', action='store_true', help='Don\'t process subdirectories')
    
    args = parser.parse_args()
    
    print("Lockslip Band Website - Image Optimization Script")
    print("=" * 50)
    print(f"Input directory: {args.input}")
    print(f"Output directory: {args.output or 'Replace originals'}")
    print(f"Max dimensions: {args.max_width}x{args.max_height}")
    print(f"Quality: {args.quality}%")
    print(f"Convert to WebP: {args.webp}")
    print(f"Recursive: {not args.no_recursive}")
    print()
    
    optimize_directory(
        args.input,
        args.output,
        args.max_width,
        args.max_height,
        args.quality,
        args.webp,
        not args.no_recursive
    )

if __name__ == '__main__':
    main()