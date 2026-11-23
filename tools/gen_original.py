#!/usr/bin/env python3
"""Grafiken im Stil des Original-Screenshots (Felder, Häfen, Räuber), Pixel für Pixel nachvermessen.
Erzeugt hex-*.svg, ship-*.svg und robber.svg in ../assets. Die Insel mit Küste zeichnet ui.js."""
import math, json, os
NO_TUFT = False
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets')
os.makedirs(OUT, exist_ok=True)
# Ziffern-Umrisse aus Nunito Black (SIL Open Font License), damit die Häfen ohne installierte Schrift gleich aussehen
G = json.load(open(os.path.join(HERE, 'nunito_glyphs.json')))

def svg(vb, body, w=None, h=None):
    x, y, W, H = vb
    w = w or W; h = h or H
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w:g}" height="{h:g}" '
            f'viewBox="{x:g} {y:g} {W:g} {H:g}">\n{body}\n</svg>\n')

def P(pts):
    return ' '.join(f'{x:.2f},{y:.2f}' for x, y in pts)

def text_path(s, size, cx, base, fill, weight='900', extra=''):
    sc = size / 1000
    widths = [G[f'{weight}:{c}']['adv'] for c in s]
    x = cx - sum(widths) * sc / 2
    out = []
    for c, w in zip(s, widths):
        d = G[f'{weight}:{c}']['d']
        out.append(f'<path transform="translate({x:.2f} {base:.2f}) scale({sc:.5f} {-sc:.5f})" d="{d}" fill="{fill}" {extra}/>')
        x += w * sc
    return ''.join(out)

# ---------------------------------------------------------------- hex frame
def vdir(k):
    a = math.radians(-90 + 60 * k); return math.cos(a), math.sin(a)
def mdir(k):
    a = math.radians(-60 + 60 * k); return math.cos(a), math.sin(a)
C30 = math.cos(math.radians(30))
def vpt(k, ap):
    dx, dy = vdir(k); r = ap / C30; return (dx * r, dy * r)
def mpt(k, ap):
    dx, dy = mdir(k); return (dx * ap, dy * ap)
def ring(ap):
    return [vpt(k, ap) for k in range(6)]

# facet keys per edge (near V_k, near V_k+1)
FACETS = [('A', 'B'), ('C', 'D'), ('E', 'F'), ('F', 'E'), ('D', 'C'), ('B', 'A')]
LINE = {'A': 'ab', 'B': 'ab', 'C': 'c', 'D': 'd', 'E': 'ef', 'F': 'ef'}
AP_OUT, AP_F, AP_L, AP_IN = 75.0, 73.8, 69.0, 67.6

def band(a0, a1, colfn):
    s = []
    for k in range(6):
        k2 = (k + 1) % 6
        n1, n2 = FACETS[k]
        q1 = [vpt(k, a0), mpt(k, a0), mpt(k, a1), vpt(k, a1)]
        q2 = [mpt(k, a0), vpt(k2, a0), vpt(k2, a1), mpt(k, a1)]
        for q, n in ((q1, n1), (q2, n2)):
            c = colfn(n)
            s.append(f'<polygon points="{P(q)}" fill="{c}" stroke="{c}" stroke-width="0.35" stroke-linejoin="round"/>')
    return '\n'.join(s)

def hex_tile(pal, gid):
    b = []
    b.append(f'<defs><radialGradient id="{gid}" cx="0" cy="0" r="{AP_IN/C30:.1f}" gradientUnits="userSpaceOnUse">'
             f'<stop offset="0" stop-color="{pal["c0"]}"/><stop offset="1" stop-color="{pal["c1"]}"/></radialGradient></defs>')
    b.append(f'<polygon points="{P(ring(AP_OUT))}" fill="{pal["out"]}"/>')
    b.append(band(AP_F, AP_L, lambda n: pal[n]))
    b.append(band(AP_L, AP_IN, lambda n: pal['l' + LINE[n]]))
    b.append(f'<polygon points="{P(ring(AP_IN))}" fill="url(#{gid})"/>')
    return '\n'.join(b)

PAL = {
 'lehm':    dict(c0='#e8782f', c1='#da5623', A='#f9ae46', B='#f6a541', C='#ec8234', D='#d64e2a', E='#ca3626', F='#d14e29',
                 lab='#b9211c', lc='#de5f2a', ld='#ef8337', lef='#f39740', out='#c4452a'),
 'erz':     dict(c0='#b6bbb7', c1='#999e9a', A='#c3c8c4', B='#bbbfbc', C='#aab0ac', D='#898e8c', E='#7a7d7a', F='#8b908c',
                 lab='#676a67', lc='#929793', ld='#a7ada9', lef='#b6bbb7', out='#7d7a72'),
 'getreide':dict(c0='#fdc43c', c1='#e9b00c', A='#fcdf7b', B='#fdd563', C='#fdc641', D='#d6a228', E='#b58215', F='#cf9b25',
                 lab='#9b6902', lc='#dba52b', ld='#f5bf3f', lef='#fcd660', out='#b0821f'),
 'schaf':   dict(c0='#a0b701', c1='#85b313', A='#d3d900', B='#cad100', C='#aebf00', D='#859e00', E='#688801', F='#7e9801',
                 lab='#557600', lc='#819c01', ld='#aabc03', lef='#c6d006', out='#7a8410'),
 'holz':    dict(c0='#1e9e35', c1='#098d3f', A='#81d353', B='#6ec74c', C='#35a83c', D='#1f8530', E='#1d5d29', F='#1f6f2d',
                 lab='#1e5f27', lc='#208530', ld='#31a33c', lef='#6dc650', out='#3a7433'),
 'wueste':  dict(c0='#d9d094', c1='#c4bb7a', A='#d9cb9c', B='#d6c99a', C='#d0c394', D='#b6ab7d', E='#9c9165', F='#aea375',
                 lab='#8f8256', lc='#b2a779', ld='#ccc190', lef='#d3c795', out='#a3925f'),
}

# ---------------------------------------------------------------- icons
def tuft(x, y, light, dark, flip=False):
    if NO_TUFT: return ''
    s = -1 if flip else 1
    return f'''<g transform="translate({x} {y}) scale({1.1*s} 1.1)">
  <path fill="{dark}" d="M-2.6 0.5 C-3.1 -3 -2.6 -6.2 -1.4 -8.4 C-0.7 -5.8 -0.3 -2.6 0.1 0.5 Z"/>
  <path fill="{dark}" d="M-0.6 0.5 C0.5 -2.6 1.9 -5.6 3.6 -7.8 C3.1 -5.1 2.7 -2.5 2.5 0.5 Z"/>
  <path fill="{light}" d="M-1.4 0.4 C-3 -4 -6.2 -8.8 -10.6 -12.2 C-9.6 -8 -7.2 -3.4 -4.6 0.6 Z"/>
  <path fill="{light}" d="M1.4 0.4 C3 -4 5.6 -8.2 9.2 -10.8 C8.2 -7.2 6.6 -3 4.6 0.6 Z"/>
  <path fill="{light}" d="M-3.6 0.8 C-6 -1.3 -8.6 -2.6 -11.2 -3.1 C-9.2 -1.2 -7.2 0.4 -5.6 1.4 Z"/>
  <path fill="{light}" d="M4 0.8 C6.6 -0.9 9.2 -1.9 11.6 -2.1 C9.6 -0.6 7.6 0.6 6 1.4 Z"/>
</g>'''

def pebble(cx, cy, rx, ry, top, side, dy=2.6):
    if NO_TUFT: return ''
    return (f'<ellipse cx="{cx}" cy="{cy+dy}" rx="{rx}" ry="{ry}" fill="{side}"/>'
            f'<rect x="{cx-rx}" y="{cy}" width="{2*rx}" height="{dy}" fill="{side}"/>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{top}"/>')

def icon_lehm():
    s = ['<g fill="#fad4c1" stroke="#a46a4e" stroke-width="1.3">']
    rows = [(-61, [-17.4, 1.3]), (-50.7, [-27.8, -9.1, 9.6]), (-40.4, [-17.4, 1.3])]
    for y, xs in rows:
        for x in xs:
            s.append(f'<rect x="{x+0.65}" y="{y+0.65}" width="16.1" height="8.9" rx="2.3"/>')
    s.append('</g>')
    pt, ps = '#d78d8b', '#9e5a55'
    s.append(pebble(-44.2, -34.8, 5.6, 2.9, pt, ps))
    s.append(pebble(-39.2, -34.2, 2.6, 1.7, pt, ps, 1.8))
    s.append(pebble(-49.6, -30.9, 4.0, 2.4, pt, ps))
    s.append(pebble(43.6, -35.1, 6.0, 3.6, pt, ps, 3.0))
    s.append(pebble(50.8, -29.2, 4.4, 3.0, pt, ps, 2.6))
    return '\n'.join(s)

def rock(pts, shade_clip_y, gid):
    d = 'M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts) + ' Z'
    # smooth closed path via Catmull-Rom
    n = len(pts); sp = f'M{pts[0][0]:.2f} {pts[0][1]:.2f}'
    for i in range(n):
        p0, p1, p2, p3 = pts[i-1], pts[i], pts[(i+1) % n], pts[(i+2) % n]
        c1 = (p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6)
        c2 = (p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6)
        sp += f' C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}'
    sp += ' Z'
    return (f'<clipPath id="{gid}"><path d="{sp}"/></clipPath>'
            f'<path d="{sp}" fill="#e7f2ea"/>'
            f'<g clip-path="url(#{gid})">{shade_clip_y}</g>'
            f'<path d="{sp}" fill="none" stroke="#807265" stroke-width="1.6" stroke-linejoin="round"/>')

def icon_erz():
    sh = '#9da4a4'
    r3 = [(-23.1,-46.5),(-20,-48.2),(-16.9,-47.1),(-14.2,-42.7),(-11.9,-37.3),(-13.6,-34),(-17.5,-33.2),(-21.9,-35.2),(-24.1,-40.3)]
    r2 = [(-0.6,-57.1),(2.5,-59.6),(8.1,-59.3),(12.5,-57.1),(14.4,-52.7),(13.1,-49),(10,-47.1),(5,-46.5),(1.9,-49),(-0.3,-52.7)]
    r1 = [(-16.9,-52.1),(-13.1,-58),(-7.5,-59.3),(-2.5,-57.1),(1.3,-51.5),(3.1,-47.1),(0,-42.7),(-6.2,-39),(-10,-38.4),(-15,-43.4),(-16.9,-47.8)]
    r5 = [(14.4,-45.3),(18.1,-47.8),(23.1,-47.1),(25.6,-44),(25,-39),(22.5,-35.9),(18.7,-35.5),(16.2,-38.4),(14.7,-41.5)]
    r4 = [(-4.4,-40.3),(-1.3,-44),(3.7,-45.9),(10,-45.3),(15,-42.1),(17.5,-37.1),(16.9,-32.1),(13.7,-29.6),(7.5,-29),(2.5,-28.4),(-1.3,-30.3),(-4,-34)]
    s = []
    s.append(rock(r3, f'<path d="M-15.5 -50 C-16 -44 -18 -38 -15 -33 L-9 -33 L-9 -50 Z" fill="{sh}"/>', 'e3'))
    s.append(rock(r2, f'<path d="M-2 -51 C3 -50.5 9 -51 16 -53 L16 -45 L-2 -45 Z" fill="{sh}"/>', 'e2'))
    s.append(rock(r1, f'<path d="M-9 -44.5 C-4 -45.5 0 -47.5 4 -50 L5 -37 L-12 -37 Z" fill="{sh}"/>', 'e1'))
    s.append(rock(r5, f'<path d="M13 -39.8 C17 -39 22 -40 27 -42.5 L27 -34 L13 -34 Z" fill="{sh}"/>', 'e5'))
    s.append(rock(r4, f'<path d="M-5 -33.5 C1 -34 8 -33 14 -35 C16 -36 17 -38 18 -39 L19 -27 L-5 -27 Z" fill="{sh}"/>', 'e4'))
    pt, ps = '#b9c5c9', '#7c6858'
    s.append(pebble(-46.9, -32.3, 4.0, 2.3, pt, ps, 2.2))
    s.append(pebble(-41.6, -32.0, 2.3, 1.5, pt, ps, 1.8))
    s.append(pebble(-51.3, -28.8, 3.2, 2.2, pt, ps, 2.0))
    s.append(pebble(42.4, -33.4, 4.6, 2.6, pt, ps, 2.6))
    s.append(pebble(50.6, -27.3, 4.0, 2.9, pt, ps, 2.6))
    return '\n'.join(s)

def ear(p0, p1, n, col, rx, ry, off, tilt, topgrain=True):
    (x0, y0), (x1, y1) = p0, p1
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0)) + 90  # rotation so ellipse long axis follows stem
    ux, uy = (x1 - x0), (y1 - y0); L = math.hypot(ux, uy); ux /= L; uy /= L
    px, py = -uy, ux
    s = []
    for i in range(n):
        t = 0.1 + 0.8 * i / (n - 1)
        cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        for side in (-1, 1):
            ex, ey = cx + px * off * side, cy + py * off * side
            s.append(f'<ellipse cx="{ex:.2f}" cy="{ey:.2f}" rx="{rx}" ry="{ry}" transform="rotate({ang + side*tilt:.1f} {ex:.2f} {ey:.2f})"/>')
    if topgrain:
        s.append(f'<ellipse cx="{x1:.2f}" cy="{y1:.2f}" rx="{rx*0.95}" ry="{ry*0.95}" transform="rotate({ang:.1f} {x1:.2f} {y1:.2f})"/>')
    return f'<g fill="{col}" stroke="#a46f12" stroke-width="1.25">' + ''.join(reversed(s)) + '</g>'

def icon_getreide():
    s = []
    s.append('<path d="M-2.6 -15 C-2 -22 -1 -27 1.6 -31.5" fill="none" stroke="#a46f12" stroke-width="2.2" stroke-linecap="round"/>')
    s.append(ear((1.5, -31), (16.8, -47.2), 4, '#e8c04c', 2.3, 3.9, 2.9, 28))
    s.append('<path d="M-3.4 -14 C-5 -18 -7 -21.4 -8.6 -25" fill="none" stroke="#a46f12" stroke-width="2.2" stroke-linecap="round"/>')
    s.append(ear((-9.6, -24.4), (-1.2, -55.8), 6, '#e8c04c', 2.8, 4.7, 3.9, 26))
    s.append('<g fill="#e8c04c" stroke="#a46f12" stroke-width="1.25" stroke-linejoin="round">'
             '<path d="M-3.2 -12.4 C-8.6 -19.6 -16 -24.4 -24 -26.2 C-21.6 -20 -13.6 -14.4 -5.6 -11.6 Z"/>'
             '<path d="M-2.4 -12.4 C3.4 -19.8 11 -26 19.6 -28.6 C16.6 -21.4 8.6 -15 -0.4 -11.6 Z"/>'
             '</g>')
    s.append(tuft(-43.6, -11.6, '#e4bc35', '#c99026'))
    s.append(tuft(42.8, -15.6, '#e4bc35', '#c99026', True))
    return '\n'.join(s)

def icon_schaf():
    s = []
    leg = 'fill="#e3e3e5" stroke="#979799" stroke-width="1.3"'
    for x0, x1 in ((-20.6, -15.6), (-15.0, -10.4), (4.4, 9.4), (10.4, 14.6)):
        s.append(f'<path {leg} d="M{x0} -28 L{x0} -19.4 Q{x0} -17.4 {(x0+x1)/2:.2f} -17.4 Q{x1} -17.4 {x1} -19.4 L{x1} -28 Z"/>')
    body = ('M-18.6 -49.6 C-16.8 -52.4 -12.6 -53.4 -8.6 -52.6 C-4.6 -53.6 1.4 -53.6 6.6 -52.4 '
            'C9.6 -55.6 14.4 -57.8 19.4 -57.6 C24 -57.8 27.2 -55.6 26.8 -52.2 L22.4 -40.4 '
            'C23.4 -35.6 22.4 -29.6 18.6 -26.8 C15.4 -23.6 10.6 -23.4 6.2 -24.4 '
            'C0.4 -23.8 -6.6 -23.6 -12 -24.8 C-17.4 -23.6 -22.4 -24.6 -23.4 -28 '
            'C-26.2 -29.4 -26.6 -34 -24.6 -36.6 C-26.8 -40.4 -26 -46.4 -21.8 -47.6 '
            'C-21 -48.6 -20 -49.4 -18.6 -49.6 Z')
    s.append(f'<path d="{body}" fill="#fdfdfd" stroke="#b4b5b7" stroke-width="1.7" stroke-linejoin="round"/>')
    s.append('<path d="M-23 -29.4 C-14 -26.8 6 -26.8 20.4 -29.8 C19.4 -27.8 17 -26.2 15 -25.6 C8 -23.8 -10 -23.6 -21.8 -25.8 Z" fill="#e9e9eb" opacity=".8"/>')
    head = ('M17.4 -50.2 C17.6 -53.4 20.8 -54.4 24 -53.8 C27.6 -53.2 29.2 -50.2 28.8 -47.2 '
            'C28.4 -44.2 25.6 -42.4 22.6 -42.8 C19.4 -43.2 17.2 -46.4 17.4 -50.2 Z')
    s.append(f'<path d="{head}" fill="#a6a8ac" stroke="#7f8082" stroke-width="1.4" stroke-linejoin="round"/>')
    s.append('<ellipse cx="13.5" cy="-48.6" rx="1.4" ry="1.9" fill="#a6a8ac" stroke="#7f8082" stroke-width="0.9" transform="rotate(-15 13.5 -48.6)"/>')
    s.append(tuft(-43.4, -17.4, '#99bc1e', '#749012'))
    s.append(tuft(43.4, -22.2, '#99bc1e', '#749012', True))
    return '\n'.join(s)

ICON_TREE = None
def icon_holz():
    global ICON_TREE
    tree = ('M-1.2 -57.4 C-0.6 -57.8 0 -57.6 0.4 -57 L10.8 -44.6 C11.6 -43.6 10.8 -42.4 9.6 -42.4 L6.4 -42.4 '
            'L17.2 -32 C18 -31.2 17.4 -30.2 16.2 -30.2 L12.2 -30.2 L20.8 -24.4 C21.8 -23.6 21.2 -22.2 20 -22.2 '
            'L-21.8 -22.2 C-23 -22.2 -23.6 -23.6 -22.6 -24.4 L-14 -30.2 L-18 -30.2 C-19.2 -30.2 -19.8 -31.2 -19 -32 '
            'L-8.2 -42.4 L-11.4 -42.4 C-12.6 -42.4 -13.4 -43.6 -12.6 -44.6 Z')
    ICON_TREE = tree
    s = []
    s.append('<path d="M-4.2 -23 L-4.2 -15.4 Q-4.2 -13.6 -2.4 -13.6 L2.4 -13.6 Q4.2 -13.6 4.2 -15.4 L4.2 -23 Z" fill="#458231" stroke="#225f29" stroke-width="1.6"/>')
    s.append(f'<clipPath id="tr"><path d="{tree}"/></clipPath>')
    s.append(f'<path d="{tree}" fill="#458230"/>')
    s.append(f'<g clip-path="url(#tr)"><path d="{tree}" fill="#52ad32" transform="translate(-7.4 0)"/><path d="M-30 -60 H0.4 V-20 H-30 Z" fill="#52ad32"/></g>')
    s.append(f'<path d="{tree}" fill="none" stroke="#1c5e27" stroke-width="1.8" stroke-linejoin="round"/>')
    s.append(tuft(-42.6, -9.6, '#3fa236', '#167c33'))
    s.append(tuft(43.4, -14.6, '#3fa236', '#167c33', True))
    return '\n'.join(s)

def icon_wueste():
    cactus = ('M-9.4 -49 C-9.4 -53 -6.4 -56 -2.5 -56 C1.4 -56 4.4 -53 4.4 -49 L4.4 -41 L5.2 -41 L5.2 -45.4 '
              'C5.2 -47.6 7 -49.4 9.2 -49.4 C11.4 -49.4 13.2 -47.6 13.2 -45.4 L13.2 -39.4 C13.2 -37.4 11.8 -35.8 9.6 -35.8 '
              'L4.4 -35.8 L4.4 -16.6 C4.4 -15.2 3.2 -14 1.8 -14 L-6.8 -14 C-8.2 -14 -9.4 -15.2 -9.4 -16.6 L-9.4 -26.6 '
              'L-13.4 -26.6 C-15.4 -26.6 -16.9 -28.2 -16.9 -30.2 L-16.9 -33.6 C-16.9 -35.2 -15.6 -36.5 -14 -36.5 '
              'C-12.4 -36.5 -11.1 -35.2 -11.1 -33.6 L-11.1 -31.6 L-9.4 -31.6 Z')
    s = []
    s.append(f'<clipPath id="ca"><path d="{cactus}"/></clipPath>')
    s.append(f'<path d="{cactus}" fill="#8c8957"/>')
    s.append('<g clip-path="url(#ca)" fill="none" stroke-width="1.1">'
             '<path d="M-6.4 -54 V-15 M-0.6 -54 V-15" stroke="#b1b179"/>'
             '<path d="M-3.5 -55 V-15 M2.3 -54 V-15" stroke="#6f6c3b"/>'
             '<path d="M8.2 -48 V-38.6 H4" stroke="#b1b179"/>'
             '<path d="M10.6 -47.4 V-37.6" stroke="#6f6c3b"/>'
             '<path d="M-14 -35 V-29.4 H-9.6" stroke="#b1b179"/>'
             '</g>')
    s.append(f'<path d="{cactus}" fill="none" stroke="#635f2f" stroke-width="1.6" stroke-linejoin="round"/>')
    st, ss = '#d0b785', '#936037'
    s.append('<path d="M31 -11 C30 -13.4 33 -15 37 -15.6 L44 -15.4 L52 -17 C55.6 -17 57 -14.6 55.6 -12.6 C54 -10.6 49 -10.8 45 -10.6 '
             'C41 -9.4 36 -7.6 33 -8.2 C31.4 -8.6 30.6 -9.6 31 -11 Z" fill="#936037"/>')
    s.append(f'<ellipse cx="42" cy="-18.6" rx="6.2" ry="3.9" fill="{st}"/>')
    s.append(f'<ellipse cx="51.8" cy="-16.6" rx="3.4" ry="2.3" fill="{st}"/>')
    s.append(f'<ellipse cx="35.2" cy="-14.2" rx="4.1" ry="2.6" fill="{st}"/>')
    return '\n'.join(s)

HEXNAME = dict(lehm='hills', erz='mountains', getreide='fields', schaf='pasture', holz='forest', wueste='desert')
ICONS = dict(lehm=icon_lehm, erz=icon_erz, getreide=icon_getreide, schaf=icon_schaf, holz=icon_holz, wueste=icon_wueste)
# Feldabstand im Original 156 px -> Grafik 173.2 x 200 wie die übrigen Felder des Generators
VB_HEX = (-78, -78 / C30, 156, 156 / C30)
for n, pal in PAL.items():
    body = hex_tile(pal, 'f') + '\n' + ICONS[n]()
    open(f'{OUT}/hex-{HEXNAME[n]}.svg', 'w').write(svg(VB_HEX, body, 173.2, 200))

# ---------------------------------------------------------------- boats
CYL = ('M-23.5 -22 Q-23.5 -26.6 -19 -27.5 Q0 -35.5 19 -27.5 Q23.5 -26.6 23.5 -22 '
       'L23.5 22.5 Q0 33.5 -23.5 22.5 Z')
def boat(top, icon, label):
    s = []
    s.append('<ellipse cx="0.8" cy="35.8" rx="29" ry="8" fill="#58afd6"/>')
    # back inside of hull (visible behind cylinder at tips)
    s.append('<path d="M-28.2 21 C-18 15.5 18 14 30.9 17.8 L27.5 21 C14 19 -14 20 -24 24 Z" fill="#8c5e3b"/>')
    # cylinder
    s.append(f'<clipPath id="cy"><path d="{CYL}"/></clipPath>')
    s.append(f'<path d="{CYL}" fill="#f6f6f6"/>')
    s.append(f'<g clip-path="url(#cy)"><path d="M-30 -40 L30 -40 L30 1.5 Q0 10.5 -30 1.5 Z" fill="{top}"/></g>')
    s.append(icon)
    s.append(label)
    s.append(f'<path d="{CYL}" fill="none" stroke="#1d4673" stroke-width="1.3" stroke-linejoin="round"/>')
    # hull front
    hull = ('M-28.2 21 C-24.6 22.8 -21 24.2 -16 25.6 C-6 28.4 8 28.6 18 26.4 L22.2 25.4 L22.2 20.2 L30.9 17.8 '
            'L28.4 31 C27.8 33.6 26.4 35.4 24 36.4 C16 39.6 6 40.6 -2 40.4 C-10 40.2 -16 38.8 -19.4 36.4 '
            'C-23.4 33.6 -26.6 27.6 -28.2 21 Z')
    s.append(f'<clipPath id="hu"><path d="{hull}"/></clipPath>')
    s.append(f'<path d="{hull}" fill="#b88a5f"/>')
    s.append('<g clip-path="url(#hu)">'
             '<path d="M-32 18 C-20 27 10 31 34 22 L34 14 L-32 14 Z" fill="#d6a97f"/>'
             '<path d="M-32 30.4 C-18 36.6 8 37.4 34 30 L34 44 L-32 44 Z" fill="#a3754f"/>'
             '<path d="M-27 24.6 C-14 32.4 6 34 22.4 29.6" fill="none" stroke="#8a5d3b" stroke-width="1.1"/>'
             '<path d="M-23 31.2 C-12 37 6 37.6 22 34" fill="none" stroke="#8a5d3b" stroke-width="1.1"/>'
             '<path d="M22.2 20.2 L30.9 17.8 L28.4 31 C27.8 33.6 26.4 35.4 24 36.4 L20.6 37.4 Z" fill="#b28259"/>'
             '<path d="M22.2 20.6 L20.8 37" fill="none" stroke="#8a5d3b" stroke-width="1.1"/>'
             '</g>')
    s.append(f'<path d="{hull}" fill="none" stroke="#7b5233" stroke-width="1.2" stroke-linejoin="round"/>')
    return '\n'.join(s)

LBL = lambda t: text_path(t, 16.4, 0.4, 22.6, '#5b2b2b', '900')
QM = ('<path d="M-3.9 -16.4 C-3.9 -21.2 -0.4 -23.6 2.6 -23.6 C6.2 -23.6 8.6 -21.2 8.6 -18 C8.6 -14.8 6 -13.6 4 -12 '
      'C2.4 -10.8 1.7 -9.6 1.7 -7.6" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
      '<circle cx="1.6" cy="-2" r="{r}" fill="{c}"/>')
qmark = '<g transform="translate(0.2 -10.2) scale(0.88) translate(-1.6 9.4)">' + QM.format(c='#5d86bd', w=6.2, r=3.9) + QM.format(c='#c4e9ff', w=4.6, r=3.1) + '</g>'
# Schiffsgrafik 130 x 120 wie bisher: Zylindermitte bei (65, 51.4), Maßstab 173.2/156
SB = 173.2 / 156
VB_BOAT = (-65 / SB, -51.4 / SB, 130 / SB, 120 / SB)
open(f'{OUT}/ship-any.svg', 'w').write(svg(VB_BOAT, boat('#336fe8', qmark, LBL('3:1')), 130, 120))

def mini(name):
    global NO_TUFT
    NO_TUFT = True
    spec = dict(holz=(0.58, 0, -35), schaf=(0.5, 2, -38), erz=(0.55, 0, -44), lehm=(0.54, 0, -45.5), getreide=(0.56, -2.5, -35.5))
    sc, cx, cy = spec[name]
    if name == 'holz':
        tree = ICON_TREE
        inner = (f'<path d="M-4.2 -23 L-4.2 -15.4 Q-4.2 -13.6 -2.4 -13.6 L2.4 -13.6 Q4.2 -13.6 4.2 -15.4 L4.2 -23 Z" fill="#8bd660" stroke="#2e7d32" stroke-width="2"/>'
                 f'<path d="{tree}" fill="#8bd660" stroke="#2e7d32" stroke-width="2" stroke-linejoin="round"/>')
    elif name == 'erz':
        inner = icon_erz().replace('id="e', 'id="be').replace('url(#e', 'url(#be')
    else:
        inner = ICONS[name]()
    NO_TUFT = False
    return f'<g transform="translate(0 -11.5) scale({sc}) translate({-cx} {-cy})">{inner}</g>'

icon_holz()
SHIPNAME = dict(lehm='brick', erz='ore', getreide='grain', schaf='wool', holz='wood')
TOPS = dict(lehm='#e46a2a', erz='#b7bcb8', getreide='#f0b81b', schaf='#8eb50b', holz='#179838')
for n, c in TOPS.items():
    open(f'{OUT}/ship-{SHIPNAME[n]}.svg', 'w').write(svg(VB_BOAT, boat(c, mini(n), LBL('2:1')), 130, 120))

# ---------------------------------------------------------------- robber
def robber():
    o = '#3d4a5c'; base = '#bababa'; shade = '#9b9b9b'
    parts = [
        ('M-16.6 0 C-16.6 -4.4 -9.2 -8.1 0 -8.1 C9.2 -8.1 16.6 -4.4 16.6 0 C16.6 4.6 9.2 8.1 0 8.1 C-9.2 8.1 -16.6 4.6 -16.6 0 Z', 0.4, 20),
        ('M-15.8 -4 C-16.4 -12.4 -11.6 -18.2 0 -18.2 C11.6 -18.2 16.4 -12.4 15.8 -4 L15.6 8.4 C15.4 14.6 9 18 0 18 C-9 18 -15.4 14.6 -15.6 8.4 Z', -0.5, 0),
        ('M-13.6 0 C-13.6 -8 -7.6 -14.4 0 -14.4 C7.6 -14.4 13.6 -8 13.6 0 C13.6 8 7.6 14.4 0 14.4 C-7.6 14.4 -13.6 8 -13.6 0 Z', 0.1, -24.4),
    ]
    s = []
    for i, (d, dx, dy) in enumerate(parts):
        g = f'translate({dx} {dy})'
        s.append(f'<g transform="{g}"><clipPath id="r{i}"><path d="{d}"/></clipPath>'
                 f'<path d="{d}" fill="{shade}"/>'
                 f'<path d="{d}" fill="{base}" transform="translate(-3.2 -1.6)" clip-path="url(#r{i})"/>'
                 f'<path d="{d}" fill="none" stroke="{o}" stroke-width="1.5"/></g>')
    return '\n'.join(s)
open(f'{OUT}/robber.svg', 'w').write(svg((-18, -40, 36, 70), robber(), 36 * SB, 70 * SB))

print('fertig')
