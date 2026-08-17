#!/usr/bin/env python3
"""Erzeugt die PWA-Icons (192/512 px) ohne externe Abhaengigkeiten.

Nur zlib/struct aus der Standardbibliothek — laeuft also auch in einer
minimalen Umgebung. Neu ausfuehren, wenn sich das Icon-Design aendert:

    python3 tools/gen_icons.py
"""

import struct
import zlib
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets"

BG_TOP = (0x2A, 0x22, 0x1A)
BG_BOTTOM = (0x12, 0x10, 0x0E)
GEM_LIGHT = (0xA8, 0xEC, 0xF6)
GEM_MID = (0x6F, 0xD8, 0xE8)
GEM_DARK = (0x2E, 0x8F, 0xA6)
GOLD = (0xE8, 0xB4, 0x4A)


def lerp(a, b, t):
    return tuple(round(x + (y - x) * t) for x, y in zip(a, b))


def render(size):
    """Gibt Zeilen aus RGBA-Bytes zurueck: dunkler Grund + geschliffener Kristall."""
    px = bytearray()
    cx, cy = size / 2, size * 0.52
    radius = size * 0.30          # halbe Diagonale des Rhombus
    corner = size * 0.18          # Eckenrundung des Hintergrunds

    for y in range(size):
        px.append(0)  # PNG-Filterbyte pro Zeile (0 = None)
        for x in range(size):
            # Hintergrund mit abgerundeten Ecken
            dx = max(corner - x, x - (size - corner), 0)
            dy = max(corner - y, y - (size - corner), 0)
            if (dx * dx + dy * dy) ** 0.5 > corner:
                px.extend((0, 0, 0, 0))
                continue

            r, g, b = lerp(BG_TOP, BG_BOTTOM, y / size)

            # Rhombus: |x| + |y| <= radius (Manhattan-Distanz)
            ox, oy = x - cx, y - cy
            dist = abs(ox) + abs(oy * 1.15)
            if dist <= radius:
                if oy < -radius * 0.15:
                    # Oberer Schliff, nach aussen heller
                    t = min(1.0, abs(ox) / (radius * 0.8))
                    r, g, b = lerp(GEM_LIGHT, GEM_MID, t)
                elif ox < 0:
                    r, g, b = GEM_MID
                else:
                    r, g, b = lerp(GEM_MID, GEM_DARK, 0.7)
                # Kante andunkeln, damit die Form Kontur bekommt
                if dist > radius * 0.93:
                    r, g, b = lerp((r, g, b), GEM_DARK, 0.6)

            # Goldener Bogen unten als Anspielung auf die Mine
            ring = ((ox / (size * 0.40)) ** 2 + ((oy - size * 0.02) / (size * 0.40)) ** 2) ** 0.5
            if 0.95 <= ring <= 1.03 and oy > 0:
                r, g, b = GOLD

            px.extend((r, g, b, 255))
    return bytes(px)


def png(size, path):
    raw = render(size)

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c))

    header = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    blob = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    path.write_bytes(blob)
    print(f"{path.name}: {len(blob)} bytes")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    png(192, OUT / "icon-192.png")
    png(512, OUT / "icon-512.png")
