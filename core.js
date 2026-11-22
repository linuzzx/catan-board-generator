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

  // Meerring (18 Felder)
  var SEA = [];
  for (var rr = -3; rr <= 3; rr++) {
    for (var qq = Math.max(-3, -rr - 3); qq <= Math.min(3, -rr + 3); qq++) {
      if (Math.max(Math.abs(qq), Math.abs(rr), Math.abs(qq + rr)) === 3) SEA.push({ q: qq, r: rr });
    }
  }

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
  var START = -Math.PI * 0.84;
  COAST.sort(function (a, b) {
    var fa = (a.ang - START + 4 * Math.PI) % (2 * Math.PI);
    var fb = (b.ang - START + 4 * Math.PI) % (2 * Math.PI);
    return fa - fb;
  });

  // 9 Hafenplätze: Abstände 3-4-3-3-4-3-3-4-3 Kanten (dreifach symmetrisch, wie auf dem Original-Rahmen)
  var PORT_EDGE_IDX = [0, 3, 7, 10, 13, 17, 20, 23, 27];
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
  var CHIPS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
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
  // opts: { desertCenter: bool, uniqueNumbers: bool }
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

  // Zufällige Verteilung per Backtracking, damit die Regeln garantiert eingehalten werden:
  //  - die roten Zahlen 6 und 8 liegen nie nebeneinander (offizielle Regel)
  //  - optional: gleiche Zahlen liegen nie nebeneinander
  function makeNumbers(seed, tiles, opts) {
    var rand = rng("n:" + seed);
    var spots = [];
    tiles.forEach(function (t, i) { if (t !== "desert") spots.push(i); });

    // Mehrere zufällige Anläufe mit begrenztem Backtracking (verhindert Festfahren)
    for (var attempt = 0; attempt < 400; attempt++) {
      var res = tryPlace(shuffle(spots, rand), opts.uniqueNumbers);
      if (res) return res;
    }
    // Nur wenn die Zusatzregel gar nicht erfüllbar wäre: ohne sie, die 6/8-Regel bleibt immer bestehen
    if (opts.uniqueNumbers) return makeNumbers(seed + "~", tiles, { uniqueNumbers: false });
    throw new Error("Keine gültige Zahlenverteilung gefunden");

    function tryPlace(order, unique) {
      var res = new Array(tiles.length).fill(null);
      var pool = {};
      CHIPS.forEach(function (n) { pool[n] = (pool[n] || 0) + 1; });
      var steps = 0;
      function ok(spot, n) {
        var nb = NEIGHBORS[spot];
        for (var i = 0; i < nb.length; i++) {
          var m = res[nb[i]];
          if (m === null) continue;
          if ((n === 6 || n === 8) && (m === 6 || m === 8)) return false;
          if (unique && m === n) return false;
        }
        return true;
      }
      function place(idx) {
        if (idx === order.length) return true;
        if (++steps > 1500) return false;
        var spot = order[idx];
        var cands = shuffle(Object.keys(pool).filter(function (n) { return pool[n] > 0; }).map(Number), rand);
        for (var c = 0; c < cands.length; c++) {
          var n = cands[c];
          if (!ok(spot, n)) continue;
          res[spot] = n; pool[n]--;
          if (place(idx + 1)) return true;
          res[spot] = null; pool[n]++;
          if (steps > 1500) return false;
        }
        return false;
      }
      return place(0) ? res : null;
    }
  }

  function makePorts(seed) {
    return shuffle(PORT_DECK, rng("h:" + seed));
  }

  function makeBoard(seeds, opts) {
    var tiles = makeTiles(seeds.t, opts);
    return {
      tiles: tiles,
      numbers: makeNumbers(seeds.n, tiles, opts),
      ports: makePorts(seeds.h)
    };
  }

  // ---------- Regelprüfung (wird auch in der Oberfläche angezeigt) ----------
  function check(board, opts) {
    var counts = {};
    board.tiles.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    var tilesOk = counts.forest === 4 && counts.pasture === 4 && counts.fields === 4 &&
      counts.hills === 3 && counts.mountains === 3 && counts.desert === 1 && board.tiles.length === 19;
    var chipsSorted = board.numbers.filter(function (n) { return n !== null; }).sort(function (a, b) { return a - b; });
    var chipsOk = chipsSorted.join() === CHIPS.slice().sort(function (a, b) { return a - b; }).join() &&
      board.numbers.every(function (n, i) { return (n === null) === (board.tiles[i] === "desert"); });
    var redOk = true, sameOk = true;
    NEIGHBORS.forEach(function (nb, i) {
      nb.forEach(function (j) {
        var a = board.numbers[i], b = board.numbers[j];
        if (a === null || b === null) return;
        if ((a === 6 || a === 8) && (b === 6 || b === 8)) redOk = false;
        if (a === b) sameOk = false;
      });
    });
    var pc = {};
    board.ports.forEach(function (p) { pc[p] = (pc[p] || 0) + 1; });
    var portsOk = board.ports.length === 9 && pc.any === 4 && pc.wood === 1 && pc.brick === 1 &&
      pc.wool === 1 && pc.grain === 1 && pc.ore === 1;
    return { tilesOk: tilesOk, chipsOk: chipsOk, redOk: redOk, sameOk: sameOk, portsOk: portsOk };
  }

  function stats(board) {
    var out = {};
    Object.keys(TYPES).forEach(function (k) {
      if (k !== "desert") out[k] = { tiles: 0, pips: 0, numbers: [] };
    });
    board.tiles.forEach(function (t, i) {
      if (t === "desert") return;
      out[t].tiles++;
      out[t].pips += pips(board.numbers[i]);
      out[t].numbers.push(board.numbers[i]);
    });
    Object.keys(out).forEach(function (k) { out[k].numbers.sort(function (a, b) { return a - b; }); });
    return out;
  }

  var API = {
    LAND: LAND, SEA: SEA, COAST: COAST, PORT_EDGES: PORT_EDGES, NEIGHBORS: NEIGHBORS, CENTER: CENTER,
    TYPES: TYPES, PORT_RES: PORT_RES, DIRS: DIRS, HEX_W: HEX_W, HEX_H: HEX_H,
    pos: pos, pips: pips, newSeed: newSeed, makeBoard: makeBoard, check: check, stats: stats
  };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else root.CatanCore = API;
})(typeof window !== "undefined" ? window : globalThis);
