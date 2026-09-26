"""Build site/index.html from template.html.

Fills in the cat artwork traced from the A1 logo (parts.json), the paw-to-ball
contact table for the three-tap animation (from paw_pts.json), the Indiana map
and its Indianapolis-area inset (indiana.json), and the marquee.

Usage: python3 tools/site/build.py        (writes site/index.html)
"""
import json
import math
import pathlib

HERE = pathlib.Path(__file__).parent
OUT = HERE.parent.parent / 'site' / 'index.html'

parts = json.loads((HERE / 'parts.json').read_text())
geo = json.loads((HERE / 'indiana.json').read_text())
paw = json.loads((HERE / 'paw_pts.json').read_text())

# Arm angle at which the paw first touches the ball perched on the flipper tip at angle phi.
SHOULDER, BALL_R, FLIP = (452, 328), 38, -17.5


def rotate(p, deg):
    a = math.radians(deg)
    x, y = p[0] - SHOULDER[0], p[1] - SHOULDER[1]
    return SHOULDER[0] + x * math.cos(a) - y * math.sin(a), SHOULDER[1] + x * math.sin(a) + y * math.cos(a)


def perch(phi):
    a, b = math.radians(FLIP), math.radians(phi)
    return 502 + 221 * math.cos(a) + 71 * math.cos(b), 502 + 221 * math.sin(a) + 71 * math.sin(b)


def contact(phi, squash=1.5):
    ball = perch(phi)
    th = -30.0
    while th <= 12:
        if min(math.dist(rotate(p, th), ball) for p in paw) <= BALL_R - squash:
            return round(th, 2)
        th += 0.05
    return None


table = {'from': -75, 'step': 0.5, 'th': [contact(-75 + i * 0.5) for i in range(151)]}

# Indianapolis-area inset on the Indiana map
M, C, Z = (207.3, 263), (476, 262), 3.9


def inset(name):
    x, y = geo['pts'][name]
    return round(C[0] + (x - M[0]) * Z, 1), round(C[1] + (y - M[1]) * Z, 1)


W, Ca, Zi, I = inset('Westfield'), inset('Carmel'), inset('Zionsville'), inset('Indianapolis')
ink = '#171614'
inset_svg = f'''<g stroke="{ink}" stroke-width="3">
            <circle cx="{W[0]}" cy="{W[1]}" r="9" fill="{ink}"/>
            <circle cx="{Ca[0]}" cy="{Ca[1]}" r="9" fill="{ink}"/>
            <circle cx="{Zi[0]}" cy="{Zi[1]}" r="9" fill="{ink}"/>
            <circle cx="{I[0]}" cy="{I[1]}" r="15" fill="#FF6420"/>
          </g>
          <g font-size="23" font-weight="700" fill="{ink}">
            <text x="{W[0] - 16}" y="{W[1] + 8}" text-anchor="end">Westfield</text>
            <text x="{Ca[0] + 14}" y="{Ca[1] + 26}">Carmel</text>
            <text x="{Zi[0]}" y="{Zi[1] + 34}" text-anchor="middle">Zionsville</text>
            <text x="{C[0]}" y="{I[1] + 38}" text-anchor="middle" font-size="24" font-weight="800">Indianapolis</text>
          </g>'''

marquee = ''.join('<span>Good people</span><span>Bright lights</span><span>One more game</span>' for _ in range(6))

html = (HERE / 'template.html').read_text()
for key, value in {
    '{{CAT}}': parts['cat'], '{{CATFILL}}': parts['catFill'], '{{DETAILS}}': parts['details'],
    '{{INDIANA}}': geo['d'], '<!--INSET-->': inset_svg, '<!--MARQUEE-->': marquee,
    '/*CONTACT*/': json.dumps(table, separators=(',', ':')),
}.items():
    html = html.replace(key, value)
assert '{{' not in html and '/*CONTACT*/' not in html
OUT.write_text(html)
print('wrote', OUT, len(html), 'bytes')
