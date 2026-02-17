#!/usr/bin/env python3
"""
Create favicon files from SVG using cairosvg and Pillow
"""
import sys
import os

try:
    from cairosvg import svg2png
    from PIL import Image
    import io
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cairosvg", "Pillow", "--quiet"])
    from cairosvg import svg2png
    from PIL import Image
    import io

def create_favicon_from_svg(svg_path, output_dir):
    """Create all favicon formats from SVG"""

    # Read SVG file
    with open(svg_path, 'rb') as f:
        svg_data = f.read()

    # Create different sizes
    sizes = [
        (16, os.path.join(output_dir, "favicon-16x16.png")),
        (32, os.path.join(output_dir, "favicon-32x32.png")),
        (180, os.path.join(output_dir, "apple-touch-icon.png")),
    ]

    png_images = []

    for size, output_path in sizes:
        # Convert SVG to PNG at specific size
        png_data = svg2png(bytestring=svg_data, output_width=size, output_height=size)

        # Save PNG
        with open(output_path, 'wb') as f:
            f.write(png_data)
        print(f"✓ Created {output_path}")

        # Keep 16x16 and 32x32 for ICO
        if size in [16, 32]:
            img = Image.open(io.BytesIO(png_data))
            png_images.append(img)

    # Create multi-resolution ICO file
    if png_images:
        ico_path = os.path.join(output_dir, "favicon.ico")
        png_images[0].save(
            ico_path,
            format='ICO',
            sizes=[(16, 16), (32, 32)]
        )
        print(f"✓ Created {ico_path}")

if __name__ == "__main__":
    svg_file = "static/favicon.svg"
    output_directory = "static"

    print("Creating favicon files from SVG...")
    create_favicon_from_svg(svg_file, output_directory)
    print("\n✅ All favicon files created successfully!")
