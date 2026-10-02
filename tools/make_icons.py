"""Generate original paw icons with Python's standard library (no dependencies)."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]

def chunk(kind, data):
    return struct.pack('!I', len(data)) + kind + data + struct.pack('!I', zlib.crc32(kind + data) & 0xffffffff)

def generate(size):
    background = (49, 94, 72)
    foreground = (245, 241, 222)
    shapes = [(0.5, 0.59, 0.155, 0.123), (0.30, 0.425, 0.065, 0.085),
              (0.425, 0.32, 0.063, 0.082), (0.575, 0.32, 0.063, 0.082),
              (0.70, 0.425, 0.065, 0.085)]
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            coverage = 0
            for dy in (0.25, 0.75):
                for dx in (0.25, 0.75):
                    u, v = (x + dx) / size, (y + dy) / size
                    if any(((u-cx)/rx)**2 + ((v-cy)/ry)**2 <= 1 for cx,cy,rx,ry in shapes):
                        coverage += 1
            rows.extend(round(a+(b-a)*coverage/4) for a,b in zip(background, foreground))
    payload = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('!IIBBBBB',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(rows)) + chunk(b'IEND',b'')
    target = ROOT / 'icons' / f'icon-{size}.png'
    target.parent.mkdir(exist_ok=True)
    target.write_bytes(payload)
    print(target.name, len(payload), 'bytes')

for size in (192, 512):
    generate(size)
