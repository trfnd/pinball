"""Trace the Paw Tap A1 logo into separate SVG paths for animation."""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage
import potrace

SRC = sys.argv[1]
OUT = sys.argv[2]
S = 3  # supersample factor

im = Image.open(SRC).convert('RGBA')
a = np.array(im).astype(float)[:590] / 255.0
R, G, B, A = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
lum = 0.299 * R + 0.587 * G + 0.114 * B
dark = A * (1 - lum)                      # 1 = black ink
orng = A * np.clip((R - B - 0.25) / 0.45, 0, 1) * (R > 0.6)  # 1 = orange

def up(ch):
    img = Image.fromarray((np.clip(ch, 0, 1) * 255).astype(np.uint8))
    return np.array(img.resize((img.width * S, img.height * S), Image.BICUBIC)) / 255.0

darkU, orngU = up(dark), up(orng)
blackU = darkU > 0.5
orangeU = orngU > 0.5

# flipper (orange body + black outline + pivot dot) is redrawn by hand; remove it from the cat
lab, _ = ndimage.label(orangeU)
flipper = ndimage.binary_fill_holes(lab == lab[470 * S, 600 * S])
region = ndimage.binary_dilation(flipper, iterations=17 * S)
cat = blackU & ~region
# drop thin slivers of flipper outline left on the paw
yy, xx = np.mgrid[-4 * S:4 * S + 1, -4 * S:4 * S + 1]
disk = (xx * xx + yy * yy) <= (4 * S) ** 2
near = np.zeros_like(cat)
near[375 * S: 470 * S, 560 * S: 790 * S] = True
cat = np.where(near, ndimage.binary_opening(cat, structure=disk), cat)
lab, n = ndimage.label(cat)
sizes = ndimage.sum(cat, lab, range(1, n + 1))
cat = lab == (1 + int(np.argmax(sizes)))
cat_filled = ndimage.binary_fill_holes(cat)

# round eye socket so a separate pupil can follow the ball
EYE = (538.6, 219.2, 33.5)
yy, xx = np.mgrid[0:cat.shape[0], 0:cat.shape[1]]
socket = (xx / S - EYE[0]) ** 2 + (yy / S - EYE[1]) ** 2 <= EYE[2] ** 2
cat = cat & ~socket

# orange details inside the head: ears and nose (exclude flipper, ball, motion lines)
head_box = np.zeros_like(orangeU)
head_box[: 300 * S, 440 * S: 620 * S] = True
details = orangeU & head_box

def trace(mask):
    bm = potrace.Bitmap(~mask)  # potracer treats False as ink
    plist = bm.trace(turdsize=4 * S, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
                     alphamax=1.0, opticurve=True, opttolerance=0.25)
    f = lambda p: f"{p.x / S:.1f} {p.y / S:.1f}"
    parts = []
    for curve in plist:
        d = [f"M{f(curve.start_point)}"]
        for seg in curve.segments:
            if seg.is_corner:
                d.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                d.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        d.append("Z")
        parts.append("".join(d))
    return "".join(parts)

out = {
    "cat": trace(cat),
    "catFill": trace(cat_filled),
    "details": trace(details),
}
json.dump(out, open(OUT, "w"))
for k, v in out.items():
    print(k, len(v))
