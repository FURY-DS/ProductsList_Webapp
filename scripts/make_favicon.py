"""Generate a colored favicon using the 📒 (ledger) emoji from Microsoft emoji font."""
from PIL import Image, ImageDraw, ImageFont
import os

PROJECT_ROOT = r"C:\Users\DS-NEW-DESKTOP1\Desktop\ProductsList_Webapp"
EMOJI = "\U0001F4D3"  # 📒 ledger
EMOJI_FONT = r"C:\Windows\Fonts\seguiemj.ttf"


def render(size: int, background=None) -> Image.Image:
    """Render the ledger emoji at `size`x`size` on a transparent (or solid) canvas."""
    img = Image.new("RGBA", (size, size), background or (0, 0, 0, 0))
    # Use a font scaled so the glyph fills ~80% of the canvas
    font_size = int(size * 0.85)
    font = ImageFont.truetype(EMOJI_FONT, font_size)
    draw = ImageDraw.Draw(img)

    # Measure & center the glyph
    bbox = draw.textbbox((0, 0), EMOJI, font=font)
    glyph_w = bbox[2] - bbox[0]
    glyph_h = bbox[3] - bbox[1]
    x = (size - glyph_w) / 2 - bbox[0]
    y = (size - glyph_h) / 2 - bbox[1]
    draw.text((x, y), EMOJI, font=font, embedded_color=True)
    return img


def main():
    # 32x32 PNG: standard favicon
    favicon_32 = render(32)
    favicon_32.save(os.path.join(PROJECT_ROOT, "favicon-32.png"), "PNG")

    # 16x16 PNG: legacy small size used by some tab/toolbar UIs
    favicon_16 = render(16)
    favicon_16.save(os.path.join(PROJECT_ROOT, "favicon-16.png"), "PNG")

    # Default `favicon.ico` at 32x32 — works as `<link rel="icon">` fallback
    render(32).save(
        os.path.join(PROJECT_ROOT, "favicon.ico"),
        format="ICO",
        sizes=[(32, 32), (16, 16)],
    )

    # Apple touch icon (180x180)
    render(180, background=(255, 255, 255, 0)).save(
        os.path.join(PROJECT_ROOT, "apple-touch-icon.png"), "PNG"
    )

    print("Favicons generated:")
    for fname in ("favicon.ico", "favicon-32.png", "favicon-16.png", "apple-touch-icon.png"):
        path = os.path.join(PROJECT_ROOT, fname)
        size = os.path.getsize(path)
        print(f"  {fname:25s} {size:6d} bytes")


if __name__ == "__main__":
    main()
