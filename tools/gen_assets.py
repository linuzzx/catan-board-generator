#!/usr/bin/env python3
"""Erzeugt alle SVG-Grafiken für den Catan-Brettgenerator."""
import math, random, os, sys

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
os.makedirs(OUT, exist_ok=True)

R = 100.0
W = math.sqrt(3) * R          # 173.205
H = 2 * R                      # 200
CX, CY = W / 2, H / 2

def hexpts(r, cx=CX, cy=CY):
    return " ".join(f"{cx + r*math.cos(math.radians(60*i-90)):.2f},{cy + r*math.sin(math.radians(60*i-90)):.2f}" for i in range(6))

def write(name, svg):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)

# Farben (am Original orientiert)
C = dict(
    sand="#d9a950", sand_dark="#b98532", outline="#3b2a14",
    forest1="#7aa63c", forest2="#4a7a2a",
    pasture1="#a6d14c", pasture2="#74a935",
    fields1="#f0cb45", fields2="#cc9a22",
    hills1="#cf7436", hills2="#9b4a21",
    mount1="#b9b7c6", mount2="#7d7a8c",
    desert1="#e6cc8d", desert2="#cfae66",
    sea1="#6aaed8", sea2="#3f81b5",
    chip="#f6e6b4", chip_ring="#b78a3c", red="#c4161c", ink="#2a2118",
)

def hex_tile(inner, defs="", gid="t", c1="#fff", c2="#000", extra=""):
    """Sechseckfeld: sandfarbener Rand + Innenfläche mit Motiv."""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.2f} {H:.2f}" width="{W:.0f}" height="{H:.0f}">
<defs>
<linearGradient id="{gid}-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient>
<clipPath id="{gid}-c"><polygon points="{hexpts(90)}"/></clipPath>
{defs}
</defs>
<polygon points="{hexpts(R)}" fill="{C['sand']}"/>
<polygon points="{hexpts(R-3)}" fill="none" stroke="{C['sand_dark']}" stroke-width="2" opacity=".55"/>
<g clip-path="url(#{gid}-c)">
<rect width="{W:.2f}" height="{H}" fill="url(#{gid}-g)"/>
{inner}
</g>
<polygon points="{hexpts(90)}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="2"/>
<polygon points="{hexpts(R)}" fill="none" stroke="{C['outline']}" stroke-width="2.5" stroke-linejoin="round"/>
{extra}
</svg>
'''

# ---------- Wald ----------
def tree(x, y, s, shade):
    g1 = ["#3f7226", "#4a8030", "#356624"][shade % 3]
    g2 = ["#5f9e38", "#6cae40", "#528f32"][shade % 3]
    return (f'<g transform="translate({x:.1f} {y:.1f}) scale({s:.2f})">'
            f'<ellipse cx="0" cy="22" rx="13" ry="4" fill="#000" opacity=".22"/>'
            f'<rect x="-2.2" y="14" width="4.4" height="8" fill="#5a3b1c"/>'
            f'<polygon points="0,-26 13,2 -13,2" fill="{g1}"/>'
            f'<polygon points="0,-18 15,10 -15,10" fill="{g2}"/>'
            f'<polygon points="0,-8 17,18 -17,18" fill="{g1}"/>'
            f'<polygon points="0,-26 5,-12 -5,-12" fill="#7fb54d" opacity=".55"/></g>')

def gen_forest():
    rnd = random.Random(11)
    pts = []
    for _ in range(400):
        x, y = rnd.uniform(15, W-15), rnd.uniform(25, H-20)
        if all((x-a)**2 + (y-b)**2 > 24**2 for a, b, _ in pts):
            pts.append((x, y, rnd.random()))
    pts.sort(key=lambda p: p[1])
    inner = "".join(tree(x, y, 0.72 + 0.35*r, int(r*10)) for x, y, r in pts)
    return hex_tile(inner, gid="forest", c1=C["forest1"], c2=C["forest2"])

# ---------- Weide ----------
def sheep(x, y, s, flip=False):
    sx = -s if flip else s
    return (f'<g transform="translate({x:.1f} {y:.1f}) scale({sx:.2f} {s:.2f})">'
            f'<ellipse cx="0" cy="12" rx="13" ry="3.5" fill="#000" opacity=".2"/>'
            f'<rect x="-8" y="6" width="3" height="8" fill="#3a3030"/><rect x="5" y="6" width="3" height="8" fill="#3a3030"/>'
            f'<ellipse cx="0" cy="0" rx="13" ry="9" fill="#fbf8ef" stroke="#d8d2c0" stroke-width="1"/>'
            f'<circle cx="-7" cy="-4" r="6" fill="#fff"/><circle cx="2" cy="-6" r="6" fill="#fff"/><circle cx="8" cy="-1" r="5.5" fill="#fff"/>'
            f'<ellipse cx="-14" cy="-1" rx="5" ry="4.3" fill="#3a3030"/><circle cx="-15.5" cy="-2" r="1" fill="#fff"/></g>')

def gen_pasture():
    rnd = random.Random(5)
    inner = ""
    # Gras-Büschel
    for _ in range(90):
        x, y = rnd.uniform(5, W-5), rnd.uniform(5, H-5)
        inner += f'<path d="M{x:.1f},{y:.1f} l-2,-6 M{x:.1f},{y:.1f} l0,-7 M{x:.1f},{y:.1f} l2,-6" stroke="#4f8a28" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/>'
    # Hügelwellen
    inner += '<path d="M0,150 Q45,125 90,148 T180,135 L180,200 L0,200Z" fill="#5f9b2c" opacity=".35"/>'
    inner += '<path d="M0,60 Q50,40 100,62 T180,50 L180,0 L0,0Z" fill="#c4e57a" opacity=".35"/>'
    spots = [(55, 70, 1, 0), (112, 62, .9, 1), (80, 112, 1.15, 0), (128, 128, .95, 1), (42, 142, 1, 1)]
    for x, y, s, f in spots:
        inner += sheep(x, y, s, bool(f))
    return hex_tile(inner, gid="pasture", c1=C["pasture1"], c2=C["pasture2"])

# ---------- Acker (Getreide) ----------
def wheat_ear(x, y, s, rot):
    ear = ""
    for i in range(5):
        yy = -4 - i*7
        ear += f'<ellipse cx="-4.5" cy="{yy+2}" rx="2.6" ry="5" fill="#f7d65a" stroke="#a87a14" stroke-width=".8" transform="rotate(-28 -4.5 {yy+2})"/>'
        ear += f'<ellipse cx="4.5" cy="{yy+2}" rx="2.6" ry="5" fill="#f7d65a" stroke="#a87a14" stroke-width=".8" transform="rotate(28 4.5 {yy+2})"/>'
    ear += '<ellipse cx="0" cy="-40" rx="2.8" ry="6" fill="#f7d65a" stroke="#a87a14" stroke-width=".8"/>'
    ear += '<line x1="0" y1="0" x2="0" y2="-36" stroke="#a87a14" stroke-width="1.5"/>'
    ear += '<line x1="0" y1="-40" x2="0" y2="-54" stroke="#c99a22" stroke-width="1"/>'
    return f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot}) scale({s:.2f})">{ear}<line x1="0" y1="0" x2="0" y2="34" stroke="#8c6a10" stroke-width="2"/></g>'

def gen_fields():
    inner = ""
    for i in range(-6, 22):
        inner += f'<path d="M{-20+i*16},210 L{60+i*16},-10" stroke="#b9871c" stroke-width="5" opacity=".22"/>'
        inner += f'<path d="M{-12+i*16},210 L{68+i*16},-10" stroke="#fff3a6" stroke-width="3" opacity=".25"/>'
    for x, y, s, r in [(48, 80, .95, -8), (92, 70, 1.0, 6), (128, 92, .9, 12), (68, 130, 1.0, -4), (112, 140, .95, 8), (38, 135, .8, -12)]:
        inner += wheat_ear(x, y, s, r)
    return hex_tile(inner, gid="fields", c1=C["fields1"], c2=C["fields2"])

# ---------- Hügel (Lehm) ----------
def brick(x, y, w=26, h=12, rot=0):
    return (f'<g transform="translate({x:.1f} {y:.1f}) rotate({rot})"><rect x="0" y="0" width="{w}" height="{h}" rx="1.5" fill="#d3652f" stroke="#7d3115" stroke-width="1"/>'
            f'<rect x="1.5" y="1.5" width="{w-3}" height="3" fill="#ee8a52" opacity=".7"/></g>')

def gen_hills():
    inner = ""
    # gewellte Hügelreihen von hinten (hell) nach vorn (dunkel)
    layers = [(70, "#d9834a"), (98, "#c9703a"), (128, "#b35e2e"), (160, "#9b4a22")]
    for i, (y, col) in enumerate(layers):
        inner += f'<path d="M0,{y} Q44,{y-26} 88,{y-6} T180,{y-14} L180,210 L0,210Z" fill="{col}" stroke="#6e3216" stroke-width="1.4"/>'
        inner += f'<path d="M0,{y+8} Q44,{y-18} 88,{y+2} T180,{y-6}" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="3"/>'
    rnd = random.Random(3)
    for _ in range(50):
        x, y = rnd.uniform(10, W-10), rnd.uniform(60, 190)
        inner += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rnd.uniform(.8,2):.1f}" fill="#5e2a12" opacity=".3"/>'
    # Ziegelpyramide (3-2-1), mittig im sicheren Bereich
    bx, by = CX - 48, 77
    rows = [(0, 3), (1, 2), (2, 1)]
    for r_, n in rows:
        for k in range(n):
            x = bx + 7 + (r_ * 14) + k * 28
            y = by + 24 - r_ * 14
            inner += f'<rect x="{x:.1f}" y="{y}" width="26" height="12" rx="1.5" fill="#d9652a" stroke="#6e2a10" stroke-width="1.4"/><rect x="{x+2:.1f}" y="{y+1.8}" width="22" height="3" fill="#f39a60" opacity=".85"/>'
    inner += f'<ellipse cx="{CX}" cy="{by+40}" rx="48" ry="5" fill="#000" opacity=".18"/>'
    return hex_tile(inner, gid="hills", c1=C["hills1"], c2=C["hills2"])

# ---------- Gebirge (Erz) ----------
def peak(x, y, w, h, snow=True):
    p = f'<polygon points="{x-w/2:.1f},{y:.1f} {x:.1f},{y-h:.1f} {x+w/2:.1f},{y:.1f}" fill="#8b889c" stroke="#4f4c60" stroke-width="1.2" stroke-linejoin="round"/>'
    p += f'<polygon points="{x:.1f},{y-h:.1f} {x+w/2:.1f},{y:.1f} {x+w*.08:.1f},{y:.1f} {x+w*.02:.1f},{y-h*.35:.1f}" fill="#5f5c72" opacity=".7"/>'
    if snow:
        sh = h * .38
        p += (f'<polygon points="{x:.1f},{y-h:.1f} {x-w*.19:.1f},{y-h+sh:.1f} {x-w*.07:.1f},{y-h+sh*.78:.1f} {x:.1f},{y-h+sh*1.05:.1f} '
              f'{x+w*.08:.1f},{y-h+sh*.78:.1f} {x+w*.19:.1f},{y-h+sh:.1f}" fill="#fff" opacity=".95"/>')
    return p

def peak2(x, base, w, h, body, shade):
    top = base - h
    we = w * (212 - top) / h      # Flanken bis zum unteren Rand verlängern
    hw = we / 2
    L, Rr = f"{x-hw:.1f},212", f"{x+hw:.1f},212"
    p = f'<polygon points="{L} {x:.1f},{top:.1f} {Rr}" fill="{body}"/>'
    p += f'<polygon points="{x:.1f},{top:.1f} {Rr} {x+we*.12:.1f},212 {x+w*.03:.1f},{top+h*.42:.1f}" fill="{shade}" opacity=".6"/>'
    p += f'<polyline points="{L} {x:.1f},{top:.1f} {Rr}" fill="none" stroke="#4f4c60" stroke-width="1.4" stroke-linejoin="round"/>'
    sh = h * .34
    p += (f'<polygon points="{x:.1f},{top:.1f} {x-w*.17:.1f},{top+sh:.1f} {x-w*.07:.1f},{top+sh*.8:.1f} {x:.1f},{top+sh*1.05:.1f} '
          f'{x+w*.07:.1f},{top+sh*.8:.1f} {x+w*.17:.1f},{top+sh:.1f}" fill="#fff" opacity=".95"/>')
    return p

def gen_mountains():
    inner = ''
    # hinterste Reihe: hoch und hell, bewusst unregelmäßig
    inner += peak2(112, 112, 126, 96, "#a9a6ba", "#7a7790")
    inner += peak2(40, 120, 74, 50, "#a3a0b4", "#7a7790") + peak2(166, 106, 62, 40, "#a3a0b4", "#7a7790")
    # mittlere Reihe
    inner += peak2(72, 148, 104, 64, "#8f8ca1", "#656278") + peak2(142, 144, 64, 38, "#8f8ca1", "#656278")
    # vorderste Reihe: am niedrigsten und dunkelsten
    inner += peak2(30, 170, 60, 26, "#7d7a8f", "#575468") + peak2(108, 172, 92, 42, "#7d7a8f", "#575468")
    for x, y, s_ in [(60, 172, 1.05), (146, 174, .9)]:
        inner += (f'<g transform="translate({x} {y}) scale({s_})"><polygon points="-12,6 -8,-6 2,-9 12,-2 10,7" fill="#6e665a" stroke="#3a342b" stroke-width="1.2"/>'
                  f'<polygon points="-8,-6 2,-9 0,-1" fill="#b3aa97"/><polygon points="2,-9 12,-2 6,0" fill="#8c8372"/></g>')
    return hex_tile(inner, gid="mount", c1=C["mount1"], c2=C["mount2"])

# ---------- Wüste ----------
def cactus(x, y, s):
    return (f'<g transform="translate({x} {y}) scale({s})" stroke="#2d5a22" stroke-width="1.2" stroke-linejoin="round">'
            f'<ellipse cx="0" cy="24" rx="14" ry="3.5" fill="#000" opacity=".15" stroke="none"/>'
            f'<rect x="-5" y="-22" width="10" height="46" rx="5" fill="#4e8a35"/>'
            f'<path d="M-5,2 h-8 v-12 a4,4 0 0 1 8,0" fill="#4e8a35"/>'
            f'<path d="M5,8 h8 v-14 a4,4 0 0 0 -8,0" fill="#4e8a35"/></g>')

def gen_desert():
    inner = ""
    for y, amp, col, op in [(60, 10, "#c79d4f", .35), (95, 14, "#b98b3e", .3), (130, 12, "#c79d4f", .4), (165, 16, "#b98b3e", .35)]:
        inner += f'<path d="M0,{y} Q40,{y-amp} 86,{y} T180,{y-4} L180,200 L0,200Z" fill="{col}" opacity="{op}"/>'
    inner += '<path d="M0,170 Q60,140 110,165 T180,150" stroke="#fff3cf" stroke-width="3" fill="none" opacity=".5"/>'
    rnd = random.Random(9)
    for _ in range(70):
        x, y = rnd.uniform(8, W-8), rnd.uniform(8, H-8)
        inner += f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{rnd.uniform(.6,1.5):.1f}" fill="#9c7630" opacity=".4"/>'
    inner += cactus(60, 85, .9) + cactus(122, 128, .75)
    return hex_tile(inner, gid="desert", c1=C["desert1"], c2=C["desert2"])

# ---------- Meer ----------
def gen_sea():
    inner = ""
    rnd = random.Random(21)
    for row in range(10):
        for col in range(5):
            x = col*42 + (21 if row % 2 else 0) + rnd.uniform(-4, 4)
            y = 18 + row*20 + rnd.uniform(-3, 3)
            inner += f'<path d="M{x-11:.1f},{y:.1f} q5.5,-6 11,0 t11,0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>'
    inner += '<ellipse cx="60" cy="60" rx="70" ry="45" fill="#fff" opacity=".07"/>'
    svg = hex_tile(inner, gid="sea", c1=C["sea1"], c2=C["sea2"])
    # Meer ohne Sandrand: Sand-Polygon durch Blau ersetzen
    svg = svg.replace(f'<polygon points="{hexpts(R)}" fill="{C["sand"]}"/>', f'<polygon points="{hexpts(R)}" fill="#3a78ab"/>')
    svg = svg.replace(f'stroke="{C["sand_dark"]}" stroke-width="2" opacity=".55"', 'stroke="#2c5f8c" stroke-width="2" opacity=".4"')
    return svg

# ---------- Rohstoff-Icons (100x100) ----------
def icon_wrap(body, name, bg):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><circle cx="50" cy="50" r="46" fill="{bg}" stroke="{C["outline"]}" stroke-width="3"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>{body}</svg>\n'

def icon_body(kind):
    if kind == "wood":
        logs = ""
        for cx, cy in [(36, 64), (64, 64), (50, 42)]:
            logs += f'<path d="M{cx-16},{cy-10} H{cx+16} V{cy+10} H{cx-16} A10,10 0 0 1 {cx-16},{cy-10} Z" fill="#9b6a38" stroke="#4d2f14" stroke-width="2" stroke-linejoin="round"/>'
            logs += f'<path d="M{cx-20},{cy-5} h30 M{cx-20},{cy+3} h30" stroke="#6e4620" stroke-width="1.2" opacity=".6"/>'
            logs += f'<ellipse cx="{cx+16}" cy="{cy}" rx="7" ry="10" fill="#e3b878" stroke="#4d2f14" stroke-width="2"/><ellipse cx="{cx+16}" cy="{cy}" rx="3.2" ry="5" fill="none" stroke="#a87b45" stroke-width="1.2"/>'
        return logs
    if kind == "brick":
        b = ""
        for x, y in [(22, 56), (52, 56), (37, 40), (67, 40), (22, 24+0), (52, 24)]:
            pass
        rows = [(30, 62, [18, 48]), (30, 47, [30, 60]), (30, 32, [18, 48])]
        for _, y, xs in rows:
            for x in xs:
                b += f'<rect x="{x}" y="{y}" width="30" height="13" rx="1.5" fill="#d3652f" stroke="#6e2a10" stroke-width="1.6"/><rect x="{x+2}" y="{y+2}" width="26" height="3" fill="#f2965c" opacity=".8"/>'
        return b
    if kind == "wool":
        return ('<rect x="30" y="62" width="5" height="14" fill="#3a3030"/><rect x="60" y="62" width="5" height="14" fill="#3a3030"/>'
                '<ellipse cx="50" cy="52" rx="26" ry="18" fill="#fff" stroke="#8a8372" stroke-width="2"/>'
                '<circle cx="34" cy="44" r="11" fill="#fff" stroke="#8a8372" stroke-width="1.5"/><circle cx="50" cy="38" r="12" fill="#fff" stroke="#8a8372" stroke-width="1.5"/><circle cx="66" cy="44" r="11" fill="#fff" stroke="#8a8372" stroke-width="1.5"/>'
                '<ellipse cx="25" cy="50" rx="10" ry="8.5" fill="#3a3030"/><circle cx="22" cy="48" r="1.8" fill="#fff"/>')
    if kind == "grain":
        e = '<line x1="50" y1="84" x2="50" y2="26" stroke="#8c6a10" stroke-width="3"/>'
        for i in range(5):
            y = 30 + i*10
            e += f'<ellipse cx="40" cy="{y}" rx="5" ry="9" fill="#f7d65a" stroke="#8c6a10" stroke-width="1.5" transform="rotate(-32 40 {y})"/><ellipse cx="60" cy="{y}" rx="5" ry="9" fill="#f7d65a" stroke="#8c6a10" stroke-width="1.5" transform="rotate(32 60 {y})"/>'
        e += '<ellipse cx="50" cy="22" rx="5" ry="10" fill="#f7d65a" stroke="#8c6a10" stroke-width="1.5"/>'
        return e
    if kind == "ore":
        return ('<polygon points="18,76 28,44 46,34 64,46 82,76" fill="#7d7a8c" stroke="#3d3a4c" stroke-width="2.5" stroke-linejoin="round"/>'
                '<polygon points="46,34 64,46 82,76 56,76 52,52" fill="#5b586c"/><polygon points="28,44 46,34 52,52 36,60" fill="#a7a4b8"/>'
                '<polygon points="30,76 38,58 52,56 60,76" fill="#d9d5c8" stroke="#3d3a4c" stroke-width="1.5"/>'
                '<polygon points="62,78 70,64 82,66 86,78" fill="#6e665a" stroke="#3d3a4c" stroke-width="1.5"/>')

BG = dict(wood="#4f8a30", brick="#c4672f", wool="#a6d14c", grain="#f0cb45", ore="#9a97a8")
for k in BG:
    write(f"icon-{k}.svg", icon_wrap(icon_body(k), k, BG[k]))

# ---------- Zahlenchips ----------
def chip(n):
    red = n in (6, 8)
    col = C["red"] if red else C["ink"]
    pips = 6 - abs(7 - n)
    dots = ""
    x0 = 50 - (pips - 1) * 4.2
    for i in range(pips):
        dots += f'<circle cx="{x0 + i*8.4:.1f}" cy="68" r="2.3" fill="{col}"/>'
    size = 34 if n < 10 else 30
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
<defs><radialGradient id="cg{n}" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fdf1c9"/><stop offset="1" stop-color="#e8c97c"/></radialGradient></defs>
<circle cx="50" cy="54" r="44" fill="#000" opacity=".2"/>
<circle cx="50" cy="50" r="44" fill="url(#cg{n})" stroke="{C['outline']}" stroke-width="3"/>
<circle cx="50" cy="50" r="38" fill="none" stroke="{C['chip_ring']}" stroke-width="2" opacity=".8"/>
<text x="50" y="57" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="{size+4}" fill="{col}" stroke="#fff6d8" stroke-width=".6">{n}</text>
{dots}
</svg>
'''
for n in list(range(2, 7)) + list(range(8, 13)):
    write(f"chip-{n}.svg", chip(n))

# ---------- Häfen als Schiffe (wie auf dem Original-Rahmen) ----------
def ship(kind):
    ratio = "3:1" if kind == "any" else "2:1"
    if kind == "any":
        sail_icon = '<text x="64" y="47" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="40" fill="#2f6fb5">?</text>'
    else:
        sail_icon = f'<g transform="translate(46 17) scale(.37)">{icon_body(kind)}</g>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 120" width="130" height="120">
<ellipse cx="66" cy="104" rx="52" ry="9" fill="#0b3d66" opacity=".28"/>
<path d="M8,84 Q66,112 122,80 L110,98 Q66,118 22,100 Z" fill="#8f5d2c" stroke="{C['outline']}" stroke-width="3" stroke-linejoin="round"/>
<path d="M14,86 Q66,108 118,82" fill="none" stroke="#c28a4c" stroke-width="3" stroke-linecap="round"/>
<line x1="64" y1="6" x2="64" y2="90" stroke="{C['outline']}" stroke-width="5" stroke-linecap="round"/>
<line x1="64" y1="6" x2="64" y2="90" stroke="#9b6a38" stroke-width="2.4" stroke-linecap="round"/>
<path d="M68,12 C112,24 114,68 70,82 L28,82 C14,52 28,22 68,12 Z" fill="#fff3d6" stroke="{C['outline']}" stroke-width="3" stroke-linejoin="round"/>
<path d="M68,12 C104,22 108,50 98,66" fill="none" stroke="#fff" stroke-width="3" opacity=".7" stroke-linecap="round"/>
{sail_icon}
<text x="66" y="72" text-anchor="middle" font-family="Georgia,serif" font-weight="800" font-size="18" fill="#2a2118">{ratio}</text>
<path d="M64,6 L84,12 L64,18 Z" fill="{C['red']}" stroke="{C['outline']}" stroke-width="1.5" stroke-linejoin="round"/>
</svg>
'''
for k in ["any", "wood", "brick", "wool", "grain", "ore"]:
    write(f"ship-{k}.svg", ship(k))

for name, fn in [("hex-forest", gen_forest), ("hex-pasture", gen_pasture), ("hex-fields", gen_fields), ("hex-hills", gen_hills), ("hex-mountains", gen_mountains), ("hex-desert", gen_desert)]:
    write(name + ".svg", fn())

print("fertig:", len(os.listdir(OUT)), "Dateien")
