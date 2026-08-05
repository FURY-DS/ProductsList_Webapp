"""Generate a custom yellow notebook favicon for 마켓노트 (MarketNote).

Drawn manually with Pillow (no emoji font dependency) so the color is always yellow.
"""
from PIL import Image, ImageDraw
import os

PROJECT_ROOT = r"C:\Users\DS-NEW-DESKTOP1\Desktop\ProductsList_Webapp"

# Brand-aligned yellow palette (warm, friendly notebook tone)
COVER = (255, 193, 7, 255)         # Amber/yellow notebook cover
COVER_DARK = (255, 160, 0, 255)    # Darker amber for shadow/binding
PAGES = (255, 255, 255, 255)       # White pages
PAGES_SHADOW = (235, 235, 220, 255)  # Soft cream shadow on pages
LINE = (180, 180, 170, 255)        # Lines on the page
TITLE = (108, 92, 231, 255)        # Purple "M" — matches site primary
TITLE_DARK = (90, 74, 209, 255)


def draw_notebook(size: int) -> Image.Image:
    """Draw a yellow notebook icon at the given pixel size (square, transparent background)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    s = size
    # Margins
    pad = int(s * 0.10)
    ring = int(s * 0.10)  # spiral binding ring width

    # Outer notebook cover (rounded rectangle)
    cover_box = (pad, pad, s - pad, s - pad)
    radius = int(s * 0.16)
    d.rounded_rectangle(cover_box, radius=radius, fill=COVER, outline=COVER_DARK, width=max(1, s // 64))

    # Spiral binding rings on the left edge
    ring_count = max(3, size // 12)
    inner_left = cover_box[0]
    inner_right = cover_box[2]
    inner_top = cover_box[1]
    inner_bottom = cover_box[3]
    span = inner_bottom - inner_top
    for i in range(ring_count):
        cy = inner_top + span * (i + 0.5) / ring_count
        d.ellipse(
            (inner_left - ring * 0.3, cy - ring * 0.3,
             inner_left + ring * 0.7, cy + ring * 0.7),
            fill=PAGES,
            outline=COVER_DARK,
            width=max(1, s // 96),
        )

    # White pages peeking out on the right side (subtle 3D effect)
    pages_inset = int(s * 0.05)
    pages_box = (
        inner_left + pages_inset + int(s * 0.02),
        inner_top + pages_inset,
        inner_right - pages_inset,
        inner_bottom - pages_inset,
    )
    d.rounded_rectangle(pages_box, radius=max(2, radius // 2), fill=PAGES, outline=PAGES_SHADOW, width=max(1, s // 96))

    # Lines on the page
    line_left = pages_box[0] + int(s * 0.06)
    line_right = pages_box[2] - int(s * 0.06)
    line_top = pages_box[1] + int(s * 0.12)
    line_step = max(int(s * 0.08), 4)
    for k in range(3):
        y = line_top + k * line_step
        if y > pages_box[3] - int(s * 0.06):
            break
        d.line((line_left, y, line_right, y), fill=LINE, width=max(1, s // 64))

    # Purple "M" letter for 마켓노트 — centered on the cover
    if s >= 32:
        from PIL import ImageFont
        try:
            font = ImageFont.truetype(r"C:\Windows\Fonts\segoeuib.ttf", int(s * 0.42))
        except OSError:
            font = ImageFont.load_default()
        text = "M"
        bbox = d.textbbox((0, 0), text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = (s - tw) / 2 - bbox[0]
        ty = (s - th) / 2 - bbox[1]
        d.text((tx, ty), text, font=font, fill=TITLE)
    return img


def main():
    # 32x32 PNG
    favicon_32 = draw_notebook(32)
    favicon_32.save(os.path.join(PROJECT_ROOT, "favicon-32.png"), "PNG")

    # 16x16 PNG
    favicon_16 = draw_notebook(16)
    favicon_16.save(os.path.join(PROJECT_ROOT, "favicon-16.png"), "PNG")

    # favicon.ico with both sizes
    draw_notebook(32).save(
        os.path.join(PROJECT_ROOT, "favicon.ico"),
        format="ICO",
        sizes=[(32, 32), (16, 16)],
    )

    # Apple touch icon (180x180, white background)
    big = draw_notebook(180)
    apple = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
    apple.alpha_composite(big)
    apple.convert("RGB").save(os.path.join(PROJECT_ROOT, "apple-touch-icon.png"), "PNG")

    print("Yellow notebook favicons generated:")
    for fname in ("favicon.ico", "favicon-32.png", "favicon-16.png", "apple-touch-icon.png"):
        path = os.path.join(PROJECT_ROOT, fname)
        size = os.path.getsize(path)
        print(f"  {fname:25s} {size:6d} bytes")


if __name__ == "__main__":
    main()