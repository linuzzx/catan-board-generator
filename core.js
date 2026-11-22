/* Catan Brettgenerator – Regel-Logik (ohne Abhängigkeiten, auch in Node testbar) */
(function (root) {
  "use strict";

  var HEX_W = Math.sqrt(3) * 100, HEX_H = 200, ROW_H = 150;
  // Nachbarn in Einheiten (halbe Feldbreite, Reihe): O, SO, SW, W, NW, NO
  var DIRS = [[2, 0], [1, 1], [-1, 1], [-2, 0], [-1, -1], [1, -1]];

  function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
  function pips(n) { return 6 - Math.abs(7 - n); }

  // ---------- Spielmaterial ----------
  var TYPES = {
    forest:    { name: "Wald",      res: "Holz" },
    pasture:   { name: "Weideland", res: "Wolle" },
    fields:    { name: "Ackerland", res: "Getreide" },
    hills:     { name: "Hügelland", res: "Lehm" },
    mountains: { name: "Gebirge",   res: "Erz" },
    desert:    { name: "Wüste",     res: null }
  };
  var PORT_RES = { wood: "Holz", brick: "Lehm", wool: "Wolle", grain: "Getreide", ore: "Erz" };
  var CORNER_NAMES = ["oben links", "links", "unten links", "unten rechts", "rechts", "oben rechts"];

  var MODES = {
    // Standardspiel für 3–4 Spieler
    "34": {
      label: "3–4 Spieler",
      rows: [3, 4, 5, 4, 3],
      deck: [].concat(rep("forest", 4), rep("pasture", 4), rep("fields", 4), rep("hills", 3), rep("mountains", 3), ["desert"]),
      // Chips A..R in der festen Reihenfolge der Spielregel
      chips: [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11],
      portDeck: rep("any", 4).concat(["wood", "brick", "wool", "grain", "ore"]),
      // Standard-Rahmen im Uhrzeigersinn ab oben links
      portStandard: ["any", "grain", "ore", "any", "wool", "any", "any", "brick", "wood"],
      portEdgeIdx: [0, 3, 7, 10, 13, 17, 20, 23, 27]
    },
    // Erweiterung für 5–6 Spieler
    "56": {
      label: "5–6 Spieler",
      rows: [3, 4, 5, 6, 5, 4, 3],
      deck: [].concat(rep("forest", 6), rep("pasture", 6), rep("fields", 6), rep("hills", 5), rep("mountains", 5), rep("desert", 2)),
      // Chips A..Y, Za, Zb, Zc
      chips: [2, 5, 4, 6, 3, 9, 8, 11, 11, 10, 6, 3, 8, 4, 8, 10, 11, 12, 10, 5, 4, 9, 5, 9, 12, 3, 2, 6],
      portDeck: rep("any", 5).concat(["wood", "brick", "wool", "wool", "grain", "ore"]),
      // Grundrahmen + 2 Zusatzstücke (Wolle-2:1 am Stoß 3-3, 3:1 am Stoß 5-5) + 2 reine Meeresstücke
      portStandard: ["any", "grain", "wool", "ore", "any", "wool", "any", "any", "any", "brick", "wood"],
      portEdgeIdx: [0, 3, 7, 10, 13, 17, 20, 24, 27, 31, 34]
    }
  };

  // ---------- Layout ----------
  var layoutCache = {};
  function buildLayout(mode) {
    if (layoutCache[mode]) return layoutCache[mode];
    var rows = MODES[mode].rows, mid = (rows.length - 1) / 2;
    var land = [], map = {};
    rows.forEach(function (n, ri) {
      for (var i = 0; i < n; i++) {
        var ix = 2 * i - (n - 1);
        map[ix + "," + ri] = land.length;
        land.push({ ix: ix, ri: ri, x: HEX_W * ix / 2, y: ROW_H * (ri - mid) });
      }
    });
    var neighbors = land.map(function (c) {
      var out = [];
      DIRS.forEach(function (d) {
        var j = map[(c.ix + d[0]) + "," + (c.ri + d[1])];
        if (j !== undefined) out.push(j);
      });
      return out;
    });

    // Küstenkanten im Uhrzeigersinn, Start: Nordwest-Kante des Eckfelds oben links
    var coast = [];
    land.forEach(function (c, i) {
      DIRS.forEach(function (d, di) {
        if (map[(c.ix + d[0]) + "," + (c.ri + d[1])] === undefined) {
          var sx = c.x + d[0] * HEX_W / 4, sy = c.y + d[1] * ROW_H / 2; // Kantenmitte
          coast.push({ land: i, dir: di, sea: { x: c.x + d[0] * HEX_W / 2, y: c.y + d[1] * ROW_H }, mx: sx, my: sy, ang: Math.atan2(sy, sx) });
        }
      });
    });
    coast.sort(function (a, b) { return a.ang - b.ang; });
    var first = coast.findIndex(function (e) { return e.land === 0 && e.dir === 4; });
    coast = coast.slice(first).concat(coast.slice(0, first));

    // Ringe von außen nach innen
    var remaining = {}; land.forEach(function (_, i) { remaining[i] = true; });
    var rings = [];
    while (Object.keys(remaining).length) {
      var ring = Object.keys(remaining).map(Number).filter(function (i) {
        return neighbors[i].filter(function (j) { return remaining[j]; }).length < 6;
      });
      if (!ring.length) ring = Object.keys(remaining).map(Number);
      rings.push(ring);
      ring.forEach(function (i) { delete remaining[i]; });
    }
    var corners = rings[0].filter(function (i) { return neighbors[i].length === 3; });
    var ang = function (i) { return Math.atan2(-land[i].y, land[i].x) * 180 / Math.PI; };
    corners.sort(function (a, b) {
      var ra = ((ang(a) - 120) % 360 + 720) % 360, rb = ((ang(b) - 120) % 360 + 720) % 360;
      return ra - rb;
    });

    var L = { mode: mode, land: land, neighbors: neighbors, coast: coast, rings: rings, corners: corners, ang: ang };
    L.portEdges = MODES[mode].portEdgeIdx.map(function (i) { return coast[i]; });
    layoutCache[mode] = L;
    return L;
  }

  // Frame: sechs Stützgeraden (Normalen bei -90°, -30°, 30°, 90°, 150°, 210°) um die Insel
  function frameOutline(mode, margin) {
    var L = buildLayout(mode), pts = [];
    var normals = [-90, -30, 30, 90, 150, 210].map(function (a) { return [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]; });
    var ap = normals.map(function (n) {
      var m = -Infinity;
      L.land.forEach(function (c) { m = Math.max(m, n[0] * c.x + n[1] * c.y); });
      return m + 100 + margin;
    });
    for (var k = 0; k < 6; k++) {
      var n1 = normals[k], n2 = normals[(k + 1) % 6], a1 = ap[k], a2 = ap[(k + 1) % 6];
      var det = n1[0] * n2[1] - n1[1] * n2[0];
      pts.push([(a1 * n2[1] - a2 * n1[1]) / det, (n1[0] * a2 - n2[0] * a1) / det]);
    }
    return pts;
  }

  // ---------- Zufall (mit Seed, damit Bretter teilbar sind) ----------
  function hashSeed(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  }
  function rng(seedStr) {
    var a = hashSeed(seedStr);
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function newSeed() {
    var s = "", cs = "abcdefghjkmnpqrstuvwxyz23456789";
    for (var i = 0; i < 5; i++) s += cs[Math.floor(Math.random() * cs.length)];
    return s;
  }

  // ---------- Brett erzeugen ----------
  function makeTiles(mode, seed, opts) {
    var M = MODES[mode], L = buildLayout(mode), rand = rng("t:" + mode + seed);
    if (!opts.desertCenter) return shuffle(M.deck, rand);
    // Wüsten in die Mitte: innerster Ring
    var inner = L.rings[L.rings.length - 1];
    var deserts = M.deck.filter(function (t) { return t === "desert"; }).length;
    var chosen = shuffle(inner, rand).slice(0, deserts);
    var rest = shuffle(M.deck.filter(function (t) { return t !== "desert"; }), rand), k = 0;
    return L.land.map(function (_, i) { return chosen.indexOf(i) >= 0 ? "desert" : rest[k++]; });
  }

  // Offizielle Zahlenverteilung: Spirale mit den Chips A, B, C ...
  // Start auf einem Eckfeld, gegen den Uhrzeigersinn nach innen, Wüsten werden übersprungen.
  function spiralOrder(mode, corner) {
    var L = buildLayout(mode), start = L.corners[corner], order = [];
    var rel = function (i, from) { return ((L.ang(i) - L.ang(from)) % 360 + 720) % 360; };
    var from = start;
    L.rings.forEach(function (ring, k) {
      if (k > 0) {
        var cands = L.neighbors[from].filter(function (j) { return ring.indexOf(j) >= 0; });
        cands.sort(function (a, b) { return rel(a, from) - rel(b, from); });
        from = cands.length ? cands[0] : ring[0];
      }
      var sorted = ring.slice().sort(function (a, b) { return rel(a, from) - rel(b, from); });
      order = order.concat(sorted);
    });
    return order;
  }

  function makeNumbers(mode, corner, tiles) {
    var chips = MODES[mode].chips, res = new Array(tiles.length).fill(null), k = 0;
    spiralOrder(mode, corner).forEach(function (i) {
      if (tiles[i] !== "desert") res[i] = chips[k++];
    });
    return res;
  }

  function makePorts(mode, seed, opts) {
    var M = MODES[mode];
    return opts.randomPorts ? shuffle(M.portDeck, rng("h:" + mode + seed)) : M.portStandard.slice();
  }

  function makeBoard(mode, seeds, opts) {
    var tiles = makeTiles(mode, seeds.t, opts);
    var corner = ((parseInt(seeds.n, 10) % 6) + 6) % 6 || 0;
    return { mode: mode, tiles: tiles, corner: corner, numbers: makeNumbers(mode, corner, tiles), ports: makePorts(mode, seeds.h, opts) };
  }

  // ---------- Regelprüfung ----------
  function check(board) {
    var M = MODES[board.mode], L = buildLayout(board.mode);
    var counts = {}, deckCounts = {};
    board.tiles.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    M.deck.forEach(function (t) { deckCounts[t] = (deckCounts[t] || 0) + 1; });
    var tilesOk = board.tiles.length === M.deck.length && Object.keys(deckCounts).every(function (k) { return counts[k] === deckCounts[k]; });
    var sortNum = function (a, b) { return a - b; };
    var chipsOk = board.numbers.filter(function (n) { return n !== null; }).sort(sortNum).join() === M.chips.slice().sort(sortNum).join() &&
      board.numbers.every(function (n, i) { return (n === null) === (board.tiles[i] === "desert"); });
    var spiralOk = makeNumbers(board.mode, board.corner, board.tiles).join() === board.numbers.join();
    var red = 0;
    L.neighbors.forEach(function (nb, i) {
      nb.forEach(function (j) {
        if (j < i) return;
        var a = board.numbers[i], b = board.numbers[j];
        if (a === null || b === null) return;
        if ((a === 6 || a === 8) && (b === 6 || b === 8)) red++;
      });
    });
    var pc = {}, dc = {};
    board.ports.forEach(function (p) { pc[p] = (pc[p] || 0) + 1; });
    M.portDeck.forEach(function (p) { dc[p] = (dc[p] || 0) + 1; });
    var portsOk = board.ports.length === M.portDeck.length && Object.keys(dc).every(function (k) { return pc[k] === dc[k]; });
    return { tilesOk: tilesOk, chipsOk: chipsOk, spiralOk: spiralOk, redPairs: red, portsOk: portsOk };
  }

  var API = {
    MODES: MODES, TYPES: TYPES, PORT_RES: PORT_RES, CORNER_NAMES: CORNER_NAMES,
    HEX_W: HEX_W, HEX_H: HEX_H, pips: pips, newSeed: newSeed,
    layout: buildLayout, frameOutline: frameOutline, spiralOrder: spiralOrder,
    makeBoard: makeBoard, check: check
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CatanCore = API;
})(typeof window !== "undefined" ? window : globalThis);
