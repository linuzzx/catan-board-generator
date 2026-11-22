/* Catan Brettgenerator – Logik + Rendering (ohne Abhängigkeiten) */
(function (root) {
  "use strict";

  // ---------- Geometrie (Sechsecke mit Spitze oben, wie die SVG-Felder) ----------
  var HEX_W = Math.sqrt(3) * 100, HEX_H = 200, ROW_H = 150;
  var DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]]; // O, SO, SW, W, NW, NO

  function pos(q, r) { return { x: HEX_W * (q + r / 2), y: ROW_H * r }; }
  function key(q, r) { return q + "," + r; }

  // Landfelder: Reihen 3-4-5-4-3
  var LAND = [];
  for (var r = -2; r <= 2; r++) {
    for (var q = Math.max(-2, -r - 2); q <= Math.min(2, -r + 2); q++) LAND.push({ q: q, r: r });
  }
  var LAND_SET = {};
  LAND.forEach(function (c, i) { LAND_SET[key(c.q, c.r)] = i; });

  var NEIGHBORS = LAND.map(function (c) {
    var out = [];
    DIRS.forEach(function (d) {
      var i = LAND_SET[key(c.q + d[0], c.r + d[1])];
      if (i !== undefined) out.push(i);
    });
    return out;
  });
  var CENTER = LAND_SET[key(0, 0)];

  // Küstenkanten (30) im Uhrzeigersinn, beginnend oben links
  var COAST = [];
  LAND.forEach(function (c, i) {
    DIRS.forEach(function (d, di) {
      var nq = c.q + d[0], nr = c.r + d[1];
      if (LAND_SET[key(nq, nr)] === undefined) {
        var a = pos(c.q, c.r), b = pos(nq, nr);
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        COAST.push({ land: i, dir: di, sea: { q: nq, r: nr }, mx: mx, my: my, ang: Math.atan2(my, mx) });
      }
    });
  });
  var START = -125 * Math.PI / 180; // knapp vor der Kante oben links (NW des obersten linken Feldes)
  COAST.sort(function (a, b) {
    var fa = (a.ang - START + 4 * Math.PI) % (2 * Math.PI);
    var fb = (b.ang - START + 4 * Math.PI) % (2 * Math.PI);
    return fa - fb;
  });

  // 9 Hafenplätze: Abstände 3-4-3-3-4-3-3-4-3 Kanten (dreifach symmetrisch, wie auf dem Original-Rahmen)
  var PORT_EDGE_IDX = [0, 3, 7, 10, 13, 17, 20, 23, 27];
  // Standard-Rahmen (vom Original-Spielplan abgelesen, im Uhrzeigersinn ab oben links)
  var PORT_STANDARD = ["any", "grain", "ore", "any", "wool", "any", "any", "brick", "wood"];
  var PORT_EDGES = PORT_EDGE_IDX.map(function (i) { return COAST[i]; });

  // ---------- Spielmaterial (Standardspiel 3–4 Spieler) ----------
  var TYPES = {
    forest:    { name: "Wald",       res: "Holz",     icon: "wood" },
    pasture:   { name: "Weideland",  res: "Wolle",    icon: "wool" },
    fields:    { name: "Ackerland",  res: "Getreide", icon: "grain" },
    hills:     { name: "Hügelland",  res: "Lehm",     icon: "brick" },
    mountains: { name: "Gebirge",    res: "Erz",      icon: "ore" },
    desert:    { name: "Wüste",      res: null,       icon: null }
  };
  var TILE_DECK = [].concat(
    rep("forest", 4), rep("pasture", 4), rep("fields", 4),
    rep("hills", 3), rep("mountains", 3), ["desert"]
  );
    var PORT_DECK = rep("any", 4).concat(["wood", "brick", "wool", "grain", "ore"]);
  var PORT_RES = { wood: "Holz", brick: "Lehm", wool: "Wolle", grain: "Getreide", ore: "Erz" };

  function rep(v, n) { var a = []; for (var i = 0; i < n; i++) a.push(v); return a; }
  function pips(n) { return 6 - Math.abs(7 - n); }

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
    var s = "";
    var cs = "abcdefghjkmnpqrstuvwxyz23456789";
    for (var i = 0; i < 5; i++) s += cs[Math.floor(Math.random() * cs.length)];
    return s;
  }

  // ---------- Brett erzeugen ----------
  function makeTiles(seed, opts) {
    var rand = rng("t:" + seed);
    if (opts.desertCenter) {
      var rest = shuffle(TILE_DECK.filter(function (t) { return t !== "desert"; }), rand);
      var out = [], k = 0;
      for (var i = 0; i < LAND.length; i++) out.push(i === CENTER ? "desert" : rest[k++]);
      return out;
    }
    return shuffle(TILE_DECK, rand);
  }

  // ---------- Offizielle Zahlenverteilung: Spirale mit den Chips A bis R ----------
  // Start auf einer der 6 Eckfelder, gegen den Uhrzeigersinn nach innen, die Wüste wird übersprungen.
  var CHIP_ORDER = [5, 2, 6, 3, 8, 10, 9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11]; // A..R
  var CORNER_NAMES = ["oben links", "links", "unten links", "unten rechts", "rechts", "oben rechts"];

  function hexDist(c) { return Math.max(Math.abs(c.q), Math.abs(c.r), Math.abs(c.q + c.r)); }
  function angleCCW(i) { var p = pos(LAND[i].q, LAND[i].r); return Math.atan2(-p.y, p.x) * 180 / Math.PI; }
  function ringSorted(dist, startAngle) {
    var ids = [];
    LAND.forEach(function (c, i) { if (hexDist(c) === dist) ids.push(i); });
    var rel = function (i) { return ((angleCCW(i) - startAngle) % 360 + 720) % 360; };
    return ids.sort(function (a, b) { return rel(a) - rel(b); });
  }
  // Eckfelder im Gegenuhrzeigersinn, beginnend oben links
  var CORNERS = (function () {
    var ids = [];
    LAND.forEach(function (c, i) { if (hexDist(c) === 2 && NEIGHBORS[i].length === 3) ids.push(i); });
    var rel = function (i) { return ((angleCCW(i) - 120) % 360 + 720) % 360; };
    return ids.sort(function (a, b) { return rel(a) - rel(b); });
  })();

  // Reihenfolge aller 19 Felder entlang der Spirale für Startecke 0..5
  function spiralOrder(corner) {
    var start = CORNERS[corner];
    var outer = ringSorted(2, angleCCW(start));
    var innerStart = NEIGHBORS[start].filter(function (j) { return hexDist(LAND[j]) === 1; })[0];
    var inner = ringSorted(1, angleCCW(innerStart));
    return outer.concat(inner, [CENTER]);
  }

  function makeNumbers(corner, tiles) {
    var res = new Array(tiles.length).fill(null), k = 0;
    spiralOrder(corner).forEach(function (i) {
      if (tiles[i] !== "desert") res[i] = CHIP_ORDER[k++];
    });
    return res;
  }

  function makePorts(seed, opts) {
    return opts.randomPorts ? shuffle(PORT_DECK, rng("h:" + seed)) : PORT_STANDARD.slice();
  }

  function makeBoard(seeds, opts) {
    var tiles = makeTiles(seeds.t, opts);
    var corner = ((parseInt(seeds.n, 10) % 6) + 6) % 6 || 0;
    return { tiles: tiles, corner: corner, numbers: makeNumbers(corner, tiles), ports: makePorts(seeds.h, opts) };
  }

  // ---------- Regelprüfung (wird auch in der Oberfläche angezeigt) ----------
  function check(board) {
    var counts = {};
    board.tiles.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    var tilesOk = counts.forest === 4 && counts.pasture === 4 && counts.fields === 4 &&
      counts.hills === 3 && counts.mountains === 3 && counts.desert === 1 && board.tiles.length === 19;
    var chipsSorted = board.numbers.filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; });
    var chipsOk = chipsSorted.join() === CHIP_ORDER.slice().sort(function (a, b) { return a - b; }).join() &&
      board.numbers.every(function (n, i) { return (n === null) === (board.tiles[i] === "desert"); });
    var expected = makeNumbers(board.corner, board.tiles);
    var spiralOk = expected.join() === board.numbers.join();
    var red = 0;
    NEIGHBORS.forEach(function (nb, i) {
      nb.forEach(function (j) {
        if (j < i) return;
        var a = board.numbers[i], b = board.numbers[j];
        if (a === null || b === null) return;
        if ((a === 6 || a === 8) && (b === 6 || b === 8)) red++;
      });
    });
    var pc = {};
    board.ports.forEach(function (p) { pc[p] = (pc[p] || 0) + 1; });
    var portsOk = board.ports.length === 9 && pc.any === 4 && pc.wood === 1 && pc.brick === 1 &&
      pc.wool === 1 && pc.grain === 1 && pc.ore === 1;
    return { tilesOk: tilesOk, chipsOk: chipsOk, spiralOk: spiralOk, redPairs: red, portsOk: portsOk };
  }

  var API = {
    LAND: LAND, COAST: COAST, PORT_EDGES: PORT_EDGES, PORT_STANDARD: PORT_STANDARD, NEIGHBORS: NEIGHBORS, CENTER: CENTER,
    TYPES: TYPES, PORT_RES: PORT_RES, CHIP_ORDER: CHIP_ORDER, CORNER_NAMES: CORNER_NAMES,
    HEX_W: HEX_W, HEX_H: HEX_H, pos: pos, pips: pips, newSeed: newSeed, spiralOrder: spiralOrder,
    makeBoard: makeBoard, check: check
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CatanCore = API;
})(typeof window !== "undefined" ? window : globalThis);
