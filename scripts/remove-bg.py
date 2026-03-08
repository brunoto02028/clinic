#!/usr/bin/env python3
"""
Remove background from a body assessment photo using rembg.
Replaces background with white (#FFFFFF).

Usage: python3 remove-bg.py <input_path> <output_path>

Requires: pip install rembg[cpu] Pillow
On VPS: /root/rembg-env/bin/python3 remove-bg.py ...
"""

import sys
from pathlib import Path

def main():
    if len(sys.argv) < 3:
        print("Usage: remove-bg.py <input_path> <output_path>", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    from rembg import remove
    from PIL import Image
    import io

    # Read input image
    with open(input_path, "rb") as f:
        input_data = f.read()

    # Remove background (returns RGBA PNG with transparent bg)
    output_data = remove(input_data)

    # Convert transparent background to white
    img = Image.open(io.BytesIO(output_data)).convert("RGBA")
    white_bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white_bg.paste(img, mask=img.split()[3])  # paste using alpha channel as mask
    
    # Save as JPEG (no alpha channel needed)
    rgb_img = white_bg.convert("RGB")
    rgb_img.save(output_path, "JPEG", quality=95)
    
    print(f"OK: Background removed, saved to {output_path}")

if __name__ == "__main__":
    main()
