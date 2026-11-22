#!/usr/bin/env python3
"""Flacher Kachel-Stil (nach dem Screenshot eines befreundeten Projekts, von Hand als SVG nachgezeichnet).
Erzeugt hex-*.svg, chip-*.svg und ship-*.svg in ../assets (überschreibt die älteren Varianten)."""
import math, os, random
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
W, H = 173.2, 200
CX, CY = W / 2, H / 2

def hexpts(r, cx=CX, cy=CY):
    return " ".join(f"{cx + r*math.cos(math.radians(60*i-90)):.1f},{cy + r*math.sin(math.radians(60*i-90)):.1f}" for i in range(6))

def tile(inner, gid, c1, c2, rim_l, rim_d, n=0):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs><radialGradient id="g{gid}" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient>
<clipPath id="c{gid}"><polygon points="{hexpts(84)}"/></clipPath></defs>
<polygon points="{hexpts(100)}" fill="#e2b06a"/>
<polygon points="{hexpts(92)}" fill="{rim_d}"/>
<polygon points="{hexpts(92)}" fill="{rim_l}" clip-path="polygon(0 0,100% 0,0 100%)" opacity=".0"/>
<polygon points="{hexpts(90)}" fill="{rim_l}" stroke="{rim_d}" stroke-width="2"/>
<polygon points="{hexpts(83)}" fill="url(#g{gid})" stroke="{rim_d}" stroke-width="1.5" stroke-opacity=".6"/>
<g clip-path="url(#c{gid})">{inner}</g>
</svg>'''

def tuft(x, y, col, k=1):
    return (f'<g transform="translate({x} {y}) scale({k})" fill="none" stroke="{col}" stroke-width="2" stroke-linecap="round">'
            '<path d="M0,0 Q-3,-8 -8,-10 M0,0 Q0,-9 1,-13 M0,0 Q3,-7 8,-9"/></g>')

# ---------- Motive (oberes Drittel, Mitte bei y≈52) ----------
def pine(x, y, k=1):
    return (f'<g transform="translate({x} {y}) scale({k})" stroke="#14591f" stroke-width="2" stroke-linejoin="round">'
            '<rect x="-3.5" y="12" width="7" height="9" fill="#7a4a22"/>'
            '<polygon points="0,-24 14,-6 7,-6 17,8 -17,8 -7,-6 -14,-6" fill="#1d7a2c"/>'
            '<polygon points="0,-24 -14,-6 -7,-6 -17,8 0,8" fill="#2f9a3a" stroke="none"/>'
            '<polygon points="-17,8 17,8 20,14 -20,14" fill="#146326"/></g>')

def sheep(x, y, k=1):
    body = "#fff"
    return (f'<g transform="translate({x} {y}) scale({k})" stroke="#9fa4a8" stroke-width="1.6" stroke-linejoin="round">'
            f'<rect x="-12" y="8" width="5" height="11" rx="2" fill="{body}"/><rect x="5" y="8" width="5" height="11" rx="2" fill="{body}"/>'
            f'<path d="M-20,0 C-22,-12 -10,-16 -2,-14 C8,-18 20,-14 20,-4 C21,6 12,12 0,12 C-10,14 -19,10 -20,0 Z" fill="{body}"/>'
            '<ellipse cx="22" cy="-6" rx="8" ry="7" fill="#8e9398"/><ellipse cx="18" cy="-12" rx="4" ry="3" fill="#fff" stroke="none"/>'
            '<circle cx="24" cy="-8" r="1.3" fill="#2b2f33" stroke="none"/></g>')

def wheat(x, y, k=1):
    g = f'<g transform="translate({x} {y}) scale({k})" stroke="#9a6d12" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">'
    g += '<path d="M0,22 V-6" fill="none" stroke-width="2.4"/>'
    for i in range(5):
        yy = -22 + i * 8
        g += f'<ellipse cx="-6" cy="{yy+5}" rx="4.5" ry="7" transform="rotate(-28 -6 {yy+5})" fill="#fff0b5"/>'
        g += f'<ellipse cx="6" cy="{yy+5}" rx="4.5" ry="7" transform="rotate(28 6 {yy+5})" fill="#fff0b5"/>'
    g += '<ellipse cx="0" cy="-26" rx="4.5" ry="8" fill="#fff0b5"/></g>'
    return g

def bricks(x, y, k=1):
    g = f'<g transform="translate({x} {y}) scale({k})" stroke="#a1503a" stroke-width="1.4">'
    for r_, (n, off) in enumerate([(3, 0), (2, 12), (1, 24)]):
        for i in range(n):
            g += f'<rect x="{-36 + off + i*24:.0f}" y="{12 - r_*13}" width="22" height="11" rx="2" fill="#f4b9a0"/><rect x="{-34 + off + i*24:.0f}" y="{13.5 - r_*13}" width="18" height="3" rx="1" fill="#fbd8c6" stroke="none"/>'
    g += '</g>'
    return g

def rocks(x, y, k=1):
    c = "#eaf0ee"
    return (f'<g transform="translate({x} {y}) scale({k})" stroke="#8a7461" stroke-width="1.8" stroke-linejoin="round">'
            f'<ellipse cx="-14" cy="0" rx="13" ry="10" fill="{c}"/><ellipse cx="4" cy="-8" rx="12" ry="9" fill="{c}"/>'
            f'<ellipse cx="2" cy="6" rx="16" ry="10" fill="{c}"/><ellipse cx="20" cy="2" rx="9" ry="7" fill="{c}"/>'
            '<path d="M-8,10 q10,6 22,0" fill="none" stroke="#b5bfbd" stroke-width="2"/></g>')

def pebbles(x, y, col="#c9a07a", edge="#8a6c50"):
    return (f'<g stroke="{edge}" stroke-width="1.3"><ellipse cx="{x}" cy="{y}" rx="7" ry="4" fill="{col}"/><ellipse cx="{x+8}" cy="{y+3}" rx="5" ry="3" fill="{col}"/></g>')

def cactus_flat(x, y, k=1):
    return (f'<g transform="translate({x} {y}) scale({k})" stroke="#4a6a2c" stroke-width="1.6" stroke-linejoin="round" fill="#8aa95a">'
            '<rect x="-6" y="-22" width="12" height="44" rx="6"/><path d="M-6,0 h-9 v-12 a4.5,4.5 0 0 1 9,0"/><path d="M6,6 h9 v-14 a4.5,4.5 0 0 0 -9,0"/></g>')

# ---------- Kacheln ----------
def make_tiles():
    tiles = {}
    rnd = random.Random(2)
    def speck(col, n=14, op=.25):
        s = ""
        for _ in range(n):
            x, y = rnd.uniform(20, W-20), rnd.uniform(24, H-24)
            s += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rnd.uniform(.8,1.8):.1f}" fill="{col}" opacity="{op}"/>'
        return s
    tiles["forest"] = tile(pine(CX, 52, 1.35) + tuft(36, 84, "#0f5a1c") + tuft(137, 84, "#0f5a1c") + speck("#0b4a15"), "f", "#37a540", "#1f8a2e", "#4fc157", "#146326")
    tiles["pasture"] = tile(sheep(CX - 4, 50, 1.3) + tuft(34, 84, "#4a8a10") + tuft(139, 84, "#4a8a10") + speck("#4a8a10"), "p", "#8cc21c", "#6fa512", "#dfe400", "#4f8a0c")
    tiles["fields"] = tile(wheat(CX, 62, 1.0) + tuft(36, 84, "#c28a14") + tuft(137, 84, "#c28a14") + speck("#b27a0e"), "a", "#fbc93a", "#eba81c", "#fde065", "#c98512")
    tiles["hills"] = tile(bricks(CX, 48, 1.15) + pebbles(30, 84) + pebbles(132, 80) + speck("#8e2f10"), "h", "#ef7437", "#dd5a22", "#f8924a", "#b03e14")
    tiles["mountains"] = tile(rocks(CX, 52, 1.25) + pebbles(30, 84, "#c9c5c0", "#807a74") + pebbles(132, 84, "#c9c5c0", "#807a74") + speck("#6e6e6c"), "m", "#b6b8b6", "#9a9c9a", "#c9cbc9", "#74767a")
    tiles["desert"] = tile(cactus_flat(CX + 6, 52, 1.1) + '<path d="M30,84 q8,-6 16,-2 M40,80 l4,-6" stroke="#a58c58" stroke-width="2" fill="none" stroke-linecap="round"/>' + speck("#a58c58"), "d", "#e0d596", "#cdbf7a", "#e8dfae", "#a99a58")
    return tiles

# ---------- Zahlenplättchen (abgerundetes Quadrat) ----------
def pips(n): return 6 - abs(7 - n)
def chip(n):
    red = n in (6, 8)
    col = "#c40000" if red else "#0c4a10"
    p = pips(n)
    dots = "".join(f'<circle cx="{37 + (i - (p-1)/2)*7.4:.1f}" cy="58" r="2.1" fill="{col}"/>' for i in range(p))
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 74" width="74" height="74">
<rect x="14" y="12" width="48" height="54" rx="8" fill="#000" opacity=".22" transform="translate(1.5 2.5)"/>
<rect x="14" y="12" width="48" height="54" rx="8" fill="#e9e7e2" stroke="#bdbab3" stroke-width="1"/>
<text x="38" y="48" text-anchor="middle" font-family="'Arial Black',Impact,'DejaVu Sans',sans-serif" font-weight="900" font-size="{28 if n < 10 else 25}" fill="{col}" letter-spacing="-1">{n}</text>{dots}
</svg>'''

# ---------- Hafen: Fass auf Boot ----------
def port_icon(kind, cx, cy):
    if kind == "wood":
        return f'<g transform="translate({cx} {cy}) scale(.78)" stroke="#2c7a2a" stroke-width="1.2"><polygon points="0,-16 11,-3 5,-3 13,8 -13,8 -5,-3 -11,-3" fill="#b4f08a"/><rect x="-2.5" y="8" width="5" height="6" fill="#b4f08a"/></g>'
    if kind == "brick":
        return f'<g transform="translate({cx} {cy})" stroke="#8a3a22" stroke-width="1" fill="#f6c9b3"><rect x="-13" y="2" width="12" height="7" rx="1.5"/><rect x="1" y="2" width="12" height="7" rx="1.5"/><rect x="-6" y="-6" width="12" height="7" rx="1.5"/></g>'
    if kind == "wool":
        return f'<g transform="translate({cx} {cy}) scale(.62)" stroke="#8c9a3a" stroke-width="1.4"><path d="M-16,2 C-18,-10 -6,-14 0,-12 C8,-16 18,-10 17,0 C18,8 8,12 0,10 C-8,12 -15,8 -16,2Z" fill="#fff"/><ellipse cx="19" cy="-3" rx="6" ry="5.5" fill="#8e9398" stroke="none"/></g>'
    if kind == "grain":
        return f'<g transform="translate({cx} {cy}) scale(.5)" stroke="#b07a12" stroke-width="1.4" stroke-linecap="round"><path d="M0,18 V-4" stroke-width="2.4" fill="none"/>' + "".join(f'<ellipse cx="{s*6}" cy="{-14+i*8+5}" rx="4.5" ry="7" transform="rotate({s*28} {s*6} {-14+i*8+5})" fill="#fff0b5"/>' for i in range(4) for s in (-1, 1)) + '<ellipse cx="0" cy="-20" rx="4.5" ry="8" fill="#fff0b5"/></g>'
    if kind == "ore":
        return f'<g transform="translate({cx} {cy}) scale(.55)" stroke="#6b6560" stroke-width="2"><ellipse cx="-8" cy="2" rx="12" ry="9" fill="#eaf0ee"/><ellipse cx="8" cy="-4" rx="11" ry="9" fill="#eaf0ee"/><ellipse cx="4" cy="8" rx="14" ry="8" fill="#eaf0ee"/></g>'
    return ""

TOP = {"any": "#2f6fe0", "wood": "#229a35", "brick": "#e8642a", "wool": "#8cc21c", "grain": "#f2b72b", "ore": "#a5a7a5"}
def ship(kind):
    top = TOP[kind]
    if kind == "any":
        body = f'<rect x="38" y="16" width="54" height="22" fill="{top}"/><text x="65" y="63" text-anchor="middle" font-family="Georgia,serif" font-weight="800" font-size="25" fill="#5a2a2a">3:1</text>'
        lbl = ""
    else:
        body = f'<rect x="38" y="16" width="54" height="40" fill="{top}"/>{port_icon(kind, 65, 40)}'
        lbl = '<text x="65" y="73" text-anchor="middle" font-family="Georgia,serif" font-weight="800" font-size="15" fill="#5a2a2a">2:1</text>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 120" width="130" height="120">
<ellipse cx="65" cy="106" rx="52" ry="8" fill="#6cc3f0" opacity=".85"/>
<path d="M18,84 C22,98 40,104 65,104 C90,104 108,98 112,84 L104,80 L26,80Z" fill="#b57a45" stroke="#7a4a22" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M26,80 L104,80 L110,86 C100,94 84,97 65,97 C46,97 30,94 20,86Z" fill="#c98f58"/>
<path d="M92,76 L112,76 L116,88 L104,84Z" fill="#b57a45" stroke="#7a4a22" stroke-width="2"/>
<clipPath id="barrel"><path d="M38,20 V84 Q38,92 65,92 Q92,92 92,84 V20Z"/></clipPath>
<g clip-path="url(#barrel)"><rect x="38" y="10" width="54" height="90" fill="#f8f6f1"/>{body}</g>
<path d="M38,20 V84 Q38,92 65,92 Q92,92 92,84 V20" fill="none" stroke="#3a3a3a" stroke-opacity=".55" stroke-width="2"/>
<ellipse cx="65" cy="19" rx="27" ry="6" fill="{top}" stroke="#3a3a3a" stroke-opacity=".55" stroke-width="2"/>
{lbl}
</svg>'''

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for k, v in make_tiles().items(): open(f"{OUT}/hex-{k}.svg", "w").write(v)
    for n in [2,3,4,5,6,8,9,10,11,12]: open(f"{OUT}/chip-{n}.svg", "w").write(chip(n))
    for k in TOP: open(f"{OUT}/ship-{k}.svg", "w").write(ship(k))
    print("flacher Stil erzeugt")
