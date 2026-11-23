/* Oberfläche: rendert das Brett als SVG und verdrahtet die Bedienelemente */
(function () {
  "use strict";
  var C = window.CatanCore;
  var $ = function (s) { return document.querySelector(s); };

  var HW = C.HEX_W, HH = C.HEX_H;
  var ASSET_V = "9"; // bei neuen Grafiken hochzählen, damit Browser nicht die alten aus dem Cache nehmen
  var TYPE_IMG = { forest: "hex-forest", pasture: "hex-pasture", fields: "hex-fields", hills: "hex-hills", mountains: "hex-mountains", desert: "hex-desert" };

  var state = { mode: "34", seeds: { t: "", n: "0", h: "" }, opts: { desertCenter: false, randomPorts: false }, helper: false, board: null };
  var prev = null; // zuletzt gerendertes Brett, damit nur Neues animiert wird

  // ---------- URL <-> Zustand ----------
  function readHash() {
    var p = new URLSearchParams(location.hash.replace(/^#/, ""));
    var ok = /^[a-z0-9]{3,12}$/;
    ["t", "h"].forEach(function (k) {
      var v = p.get(k);
      state.seeds[k] = v && ok.test(v) ? v : C.newSeed();
    });
    var n = parseInt(p.get("n"), 10);
    state.seeds.n = String(n >= 0 && n < 6 ? n : Math.floor(Math.random() * 6));
    state.mode = p.get("p") === "56" ? "56" : "34";
    state.opts.desertCenter = p.get("d") === "1";
    state.opts.randomPorts = p.get("r") === "1";
    state.helperRaw = p.get("helper");
    state.helper = state.helperRaw === "1";
  }
  function writeHash() {
    var p = new URLSearchParams();
    p.set("t", state.seeds.t); p.set("n", state.seeds.n);
    if (state.mode === "56") p.set("p", "56");
    if (state.opts.randomPorts) p.set("h", state.seeds.h);
    if (state.opts.desertCenter) p.set("d", "1");
    if (state.opts.randomPorts) p.set("r", "1");
    if (state.helperRaw === "1" || state.helperRaw === "0") p.set("helper", state.helperRaw);
    history.replaceState(null, "", "#" + p.toString());
  }

  // ---------- Rendering ----------
  function img(name, x, y, w, h, extra) {
    return '<image href="assets/' + name + '.svg?v=' + ASSET_V + '" x="' + (x - w / 2).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) +
      '" width="' + w + '" height="' + h + '" ' + (extra || "") + "/>";
  }
  function hexPoints(cx, cy, r) {
    var pts = [];
    for (var i = 0; i < 6; i++) {
      var a = (60 * i - 90) * Math.PI / 180;
      pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }
  function chipLetter(i) { return i < 25 ? String.fromCharCode(65 + i) : "Z" + String.fromCharCode(97 + i - 25); }

  // Ein einziges Rahmenteil: Sechseck mit Steckverbindungen, passend um die Insel gelegt
  function frameSvg(pts) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function (p) { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); });
    var outer = pts.map(function (v) { return v[0].toFixed(1) + "," + v[1].toFixed(1); }).join(" ");
    var inside = function (x, y, m) {
      for (var k = 0; k < 6; k++) {
        var a = pts[k], b = pts[(k + 1) % 6], ex = b[0] - a[0], ey = b[1] - a[1];
        var cross = (ex * (y - a[1]) - ey * (x - a[0])) / Math.sqrt(ex * ex + ey * ey);
        if (cross < m) return false;
      }
      return true;
    };

    var seams = "";
    for (var j = 0; j < 6; j++) {
      var a0 = pts[(j + 5) % 6], a1 = pts[j];
      var mx = (a0[0] + a1[0]) / 2, my = (a0[1] + a1[1]) / 2, len = Math.sqrt(mx * mx + my * my);
      // Kantennormale zeigt vom Zentrum weg (Kante liegt zwischen zwei Ecken)
      var ex = a1[0] - a0[0], ey = a1[1] - a0[1], el = Math.sqrt(ex * ex + ey * ey);
      var ux = ey / el, uy = -ex / el; if (ux * mx + uy * my < 0) { ux = -ux; uy = -uy; }
      var px = -uy, py = ux, d0 = ux * mx + uy * my - 2, d1 = d0 - 148, tc = (d0 + d1) / 2;
      var q = function (t, o) { return (ux * t + px * o + (mx - ux * (ux * mx + uy * my)) ).toFixed(1) + "," + (uy * t + py * o + (my - uy * (ux * mx + uy * my))).toFixed(1); };
      seams += '<path class="seam" d="M' + q(d0, 0) + " L" + q(tc + 26, 0) + " C" + q(tc + 26, 16) + " " + q(tc + 8, 16) + " " + q(tc + 8, 7) +
        " L" + q(tc - 8, 7) + " C" + q(tc - 8, 16) + " " + q(tc - 26, 16) + " " + q(tc - 26, 0) + " L" + q(d1, 0) + '"/>';
    }

    $("#board").setAttribute("viewBox", [minX - 20, minY - 21, maxX - minX + 40, maxY - minY + 42].map(function (v) { return v.toFixed(0); }).join(" "));
    return '<defs>' +
      '<linearGradient id="seaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0966a5"/><stop offset="1" stop-color="#0966a5"/></linearGradient>' +
      '<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '</defs>' +
      '<polygon points="' + outer + '" fill="#0c3a63" stroke="#0c3a63" stroke-width="30" stroke-linejoin="round"/>' +
      '<polygon points="' + outer + '" fill="url(#seaG)" stroke="#2e86c4" stroke-width="10" stroke-linejoin="round"/>' + seams;
  }

  // ---------- Insel mit Küste (vom Original-Screenshot vermessen) ----------
  // Jedes Landfeld trägt denselben welligen Umriss; die Vereinigung aller Umrisse ergibt die Küste.
  // Radien in Pixeln des Originals (Feldabstand 156 px), alle 2° ab 0° (Osten) im Uhrzeigersinn.
  var COAST = {
    wave: [109.4,108.6,108.8,109.5,110.2,109.9,109.9,110.9,111.9,113.0,113.8,113.2,112.1,110.7,109.4,108.6,108.9,110.1,111.5,112.9,113.8,113.7,112.7,111.8,111.0,112.0,112.4,113.4,113.5,112.5,111.2,110.7,110.9,111.7,111.9,112.0,112.0,113.0,114.2,115.7,115.8,115.2,114.0,112.8,111.1,108.6,110.2,111.8,113.3,114.6,115.3,113.5,112.0,111.0,111.5,112.3,112.2,112.3,111.6,110.8,110.7,111.2,111.2,112.0,112.1,113.0,110.9,111.7,113.1,114.1,114.3,113.4,112.4,110.9,109.7,108.6,109.4,110.6,112.1,113.3,113.8,112.5,111.8,110.9,110.4,110.9,110.8,111.8,110.8,110.5,109.5,109.5,109.6,110.1,110.6,110.3,110.0,111.0,112.4,113.9,114.2,113.4,112.4,110.9,109.8,108.8,109.3,109.9,111.0,112.7,113.4,113.3,111.9,110.9,109.9,109.8,110.1,110.3,110.2,112.2,110.9,110.2,110.7,111.7,111.5,111.2,111.5,112.5,113.8,115.0,115.3,114.0,112.8,111.7,110.2,108.6,110.2,111.9,113.1,114.5,115.1,114.2,113.4,112.3,111.9,111.6,111.3,111.8,111.0,109.9,110.5,110.3,110.9,111.7,111.6,111.2,110.7,111.7,113.1,114.0,114.1,113.2,111.6,110.5,109.4,108.6,109.3,110.4,111.8,113.0,113.5,113.0,111.9,110.7,109.7,109.5,109.6,109.1,108.8,109.5],
    foam: [102.7,102.6,102.7,103.1,103.6,103.4,103.3,103.6,104.7,106.7,107.4,107.7,106.6,104.8,96.8,95.9,96.4,104.3,106.1,107.5,107.5,106.9,105.8,105.1,105.8,105.4,104.7,105.1,104.6,103.7,103.4,103.8,104.3,105.1,105.3,105.3,105.9,106.8,107.3,108.9,108.2,107.9,106.7,104.8,96.8,95.9,96.4,104.4,106.2,107.5,107.3,107.1,105.2,105.8,107.0,105.3,105.7,105.6,105.0,104.3,104.1,104.4,105.2,105.6,105.5,105.8,107.6,105.5,106.2,107.5,108.0,107.9,106.7,104.8,96.8,95.9,96.9,105.6,106.8,107.9,107.4,106.2,104.8,104.3,104.1,104.1,104.6,104.4,104.7,104.0,102.7,102.6,102.8,103.6,104.1,103.7,103.8,104.2,105.6,106.7,107.9,107.9,106.8,105.0,96.8,95.9,96.4,103.7,105.6,107.0,107.2,106.8,105.2,104.0,103.7,103.2,103.6,105.0,106.6,105.4,104.1,103.5,104.3,104.9,105.1,104.8,104.8,105.9,106.9,108.3,109.0,108.6,107.0,104.8,96.8,95.9,96.4,104.9,107.7,108.9,108.5,107.7,106.4,105.8,105.6,104.8,105.1,104.8,104.3,103.5,104.1,104.0,104.4,105.1,105.1,104.9,105.3,105.1,106.2,107.5,108.1,107.7,106.0,104.6,96.8,95.9,95.9,103.8,106.2,107.2,106.9,105.7,104.6,103.6,102.9,103.2,103.6,103.0,103.1,103.6],
    pale: [96.6,96.3,96.0,97.0,97.4,97.3,97.0,97.4,98.4,99.4,100.6,101.7,101.7,95.5,93.4,93.6,93.6,99.0,101.3,102.1,101.6,100.3,99.9,100.0,99.1,98.5,98.8,99.0,98.3,97.6,97.3,97.5,98.1,98.8,99.2,98.8,99.0,101.0,102.5,100.9,101.7,102.2,101.8,95.5,93.4,93.6,93.6,99.0,101.6,101.8,101.2,101.6,101.8,101.3,99.6,99.2,99.7,99.2,98.5,97.8,97.7,98.2,98.8,99.4,99.4,99.1,100.5,102.1,102.2,100.6,101.7,102.2,101.8,95.5,93.4,93.6,93.6,99.0,101.9,101.6,101.0,99.4,98.5,98.4,97.9,98.0,98.0,99.0,98.6,97.5,96.6,96.6,96.7,97.0,97.4,97.6,97.7,97.5,99.1,100.2,101.6,102.3,101.9,95.5,93.4,93.6,93.6,99.0,101.1,101.7,101.2,100.2,98.6,98.0,97.4,97.8,100.1,100.5,100.3,99.1,97.8,97.4,97.8,98.7,99.2,98.8,98.5,99.2,100.3,101.7,102.7,103.5,102.7,95.5,93.4,93.6,93.6,99.1,103.0,103.3,102.2,101.1,100.1,99.8,98.8,98.6,98.7,98.7,97.8,97.4,97.7,97.8,98.1,99.1,99.0,99.0,98.8,99.6,100.4,100.9,101.8,102.2,101.5,95.4,93.4,93.6,93.6,99.0,101.6,101.7,100.6,99.4,98.4,97.4,97.0,97.0,97.5,98.5,98.4,97.5],
    sand: [89.9,89.6,89.7,90.0,90.4,90.8,90.6,91.2,92.1,93.1,94.1,94.4,94.2,93.1,74.2,66.7,76.6,94.4,95.2,95.2,95.1,94.9,95.3,94.1,92.5,92.3,92.6,92.7,92.5,91.1,89.9,90.0,90.6,90.7,91.7,91.6,91.7,92.5,94.7,96.6,97.3,94.9,94.6,93.2,74.2,66.7,76.6,94.4,95.2,94.9,95.9,95.9,95.7,93.8,93.3,93.2,93.3,92.3,92.0,90.9,89.9,90.5,91.3,92.0,92.0,91.9,92.2,93.8,95.9,97.7,95.4,94.5,94.3,93.2,74.2,66.7,76.6,94.4,95.2,95.1,94.2,93.1,92.2,92.2,91.5,91.6,91.8,92.0,91.7,90.7,89.9,89.6,89.7,90.0,90.4,90.9,91.0,92.1,93.1,94.1,94.7,95.3,94.7,93.4,74.2,66.7,76.6,94.4,95.2,94.8,93.9,93.4,92.4,92.3,92.3,92.7,93.0,93.5,93.1,92.5,91.7,90.5,90.5,91.9,92.2,92.2,92.3,92.4,94.0,96.9,96.2,94.9,94.6,93.2,74.2,66.7,76.6,94.4,95.2,94.9,97.2,97.4,92.7,92.2,92.8,92.9,93.2,93.3,92.3,92.1,91.1,91.0,91.3,91.8,92.0,92.0,92.0,93.5,94.7,95.8,95.2,95.2,94.7,93.2,74.2,66.7,76.6,94.3,95.2,94.4,93.1,92.5,92.1,91.2,91.4,91.3,91.4,91.9,91.6,90.6]
  };
  var COAST_S = HW / 156;
  function blobPoints(c, radii) {
    var pts = [];
    for (var k = 0; k < radii.length; k++) {
      var a = k * 2 * Math.PI / 180, r = radii[k] * COAST_S;
      pts.push((c.x + r * Math.cos(a)).toFixed(1) + "," + (c.y + r * Math.sin(a)).toFixed(1));
    }
    return pts.join(" ");
  }
  function islandSvg(L) {
    var layer = function (radii, fill) {
      return '<g fill="' + fill + '">' + L.land.map(function (c) { return '<polygon points="' + blobPoints(c, radii) + '"/>'; }).join("") + "</g>";
    };
    var sandPolys = L.land.map(function (c) { return '<polygon points="' + blobPoints(c, COAST.sand) + '"/>'; }).join("");
    var base = L.land.map(function (c) { return '<polygon points="' + hexPoints(c.x, c.y, 96 * COAST_S) + '"/>'; }).join("");
    return '<defs><clipPath id="sandClip">' + sandPolys + base + '</clipPath>' +
      '<filter id="sandGlow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter></defs>' +
      '<g class="island">' +
      layer(COAST.wave, "#57aed4") + layer(COAST.foam, "#7fcdf2") + layer(COAST.pale, "#f0e6be") +
      '<g fill="#dfb367">' + sandPolys + base + "</g>" +
      '<g clip-path="url(#sandClip)" fill="none" stroke="#ead6a6" stroke-width="16" filter="url(#sandGlow)">' + sandPolys + "</g>" +
      '<g fill="#dfb367">' + base + "</g>" +
      "</g>";
  }

  // anim: { tiles: Set-ähnliches Objekt, chips: ..., ports: ... } mit Indizes, die animiert werden
  function render(anim) {
    var b = state.board, L = C.layout(b.mode), g = "";

    g += islandSvg(L);

    var d = 0;
    L.land.forEach(function (c, i) {
      var t = b.tiles[i], info = C.TYPES[t], n = b.numbers[i];
      var title = info.name + (info.res ? " (" + info.res + ")" : "") + (n ? " · Zahl " + n : " · liefert nichts");
      g += '<g class="tile' + (anim.tiles[i] ? " pop" : "") + '" style="--d:' + (anim.tiles[i] ? d++ * 45 : 0) + 'ms">' +
        "<title>" + title + "</title>" + img(TYPE_IMG[t], c.x, c.y, HW + 0.6, HH + 0.6) + "</g>";
    });

    var pd = 0, base = d * 45 + 150, SS = C.SHIP_S;
    L.portEdges.forEach(function (e, k) {
      var pp = L.portPlace[k], kind = b.ports[k];
      var label = kind === "any" ? "3:1-Hafen (beliebiger Rohstoff)" : "2:1-Hafen (" + C.PORT_RES[kind] + ")";
      var jet = "";
      pp.jets.forEach(function (j) {
        var dd = 'x1="' + j.x1.toFixed(1) + '" y1="' + j.y1.toFixed(1) + '" x2="' + j.x2.toFixed(1) + '" y2="' + j.y2.toFixed(1) + '"';
        jet += "<line " + dd + ' class="jet-o"/><line ' + dd + ' class="jet"/><line ' + dd + ' class="jet-p"/>';
      });
      g += '<g class="port' + (anim.ports[k] ? " pop" : "") + '" style="--d:' + (anim.ports[k] ? base + pd++ * 60 : 0) + 'ms"><title>' + label + "</title>" + jet +
        img("ship-" + kind, pp.x, pp.y - 34 * SS, 130 * SS, 120 * SS) + "</g>";
    });

    // Räuber steht zu Beginn auf der (ersten) Wüste, wie im Original links neben der Feldmitte
    var di = b.tiles.indexOf("desert");
    if (di >= 0) {
      var dc = L.land[di];
      g += '<g class="robber' + (anim.tiles[di] ? " pop" : "") + '" style="--d:' + (anim.tiles[di] ? d * 45 : 0) + 'ms"><title>Räuber</title>' +
        img("robber", dc.x - 51, dc.y - 5.5 - 0 , 40, 77.7) + "</g>";
    }

    var cd = 0, cbase = d * 45 + 250;
    L.land.forEach(function (c, i) {
      var n = b.numbers[i];
      if (n === null) return;
      g += '<g class="chip' + (anim.chips[i] ? " drop" : "") + '" style="--d:' + (anim.chips[i] ? cbase + cd++ * 40 : 0) + 'ms">' + img("chip-" + n, c.x, c.y + 30, 84, 84) + "</g>";
    });

    if (state.helper) {
      // Geheimer Helfer: Kreuzungen mit mehr als 10 Augen, je näher an 12, desto röter
      var hs = "";
      C.vertexSpots(b).forEach(function (v) {
        if (v.sum <= 10) return;
        var dist = Math.min(2, Math.abs(v.sum - 12)), col = ["#e0101a", "#f06a24", "#f5b52e"][dist];
        hs += '<g class="spot"><circle cx="' + v.x.toFixed(1) + '" cy="' + v.y.toFixed(1) + '" r="' + (19 - dist * 2) + '" fill="' + col + '" fill-opacity=".88" stroke="#fff" stroke-width="3"/>' +
          '<text x="' + v.x.toFixed(1) + '" y="' + (v.y + 6).toFixed(1) + '" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-weight="900" font-size="17" fill="#fff" stroke="#3b2a14" stroke-width=".8" paint-order="stroke">' + v.sum + "</text></g>";
      });
      g += hs;
    }
    $("#board").innerHTML = frameSvg(C.frameOutline(b.mode, 60)) + g;
    renderInfo();
  }

  function renderInfo() {
    var b = state.board, ch = C.check(b), M = C.MODES[b.mode], big = b.mode === "56";
    var rows = [
      [ch.tilesOk, big ? "30 Landfelder: 6 Wald, 6 Weideland, 6 Ackerland, 5 Hügelland, 5 Gebirge, 2 Wüsten" : "19 Landfelder: 4 Wald, 4 Weideland, 4 Ackerland, 3 Hügelland, 3 Gebirge, 1 Wüste"],
      [ch.chipsOk && ch.spiralOk, (big ? "28" : "18") + " Zahlenchips in der festen Reihenfolge " + chipLetter(0) + "–" + chipLetter(M.chips.length - 1) + " entlang der Spirale, Wüsten werden übersprungen"],
      [ch.redPairs === 0, "Die roten Zahlen 6 und 8 liegen nie nebeneinander"],
      [ch.portsOk, (big ? "11 Häfen (5× 3:1, 6× 2:1, Wolle doppelt)" : "9 Häfen (4× 3:1, 5× 2:1)") + (state.opts.randomPorts ? ", zufällig auf die Hafenplätze gemischt" : " in der Standard-Anordnung des Rahmens")]
    ];
    $("#checks").innerHTML = rows.map(function (r) {
      return '<li class="' + (r[0] ? "ok" : "bad") + '"><span aria-hidden="true">' + (r[0] ? "✓" : "✗") + "</span>" + r[1] + "</li>";
    }).join("");
    $("#start-corner").textContent = C.CORNER_NAMES[b.corner];
    $("#chip-order").innerHTML = M.chips.map(function (n, i) {
      return '<span class="' + (n === 6 || n === 8 ? "red" : "") + '"><i>' + chipLetter(i) + "</i>" + n + "</span>";
    }).join("");
    $("#rule-count").textContent = big ? "30 Landfelder werden gemischt und im Muster 3-4-5-6-5-4-3 ausgelegt." : "Die 19 Landfelder werden gemischt und im Muster 3-4-5-4-3 ausgelegt.";
    $("#rule-ports").textContent = big
      ? "Die 11 Häfen (5× 3:1, 2:1 für Holz, Lehm, Getreide, Erz und zweimal Wolle) sitzen standardmäßig auf dem erweiterten Rahmen. Die genauen Plätze sind näherungsweise nachgebaut."
      : "Die 9 Häfen (4× 3:1, je 1× 2:1 für Holz, Lehm, Wolle, Getreide, Erz) sitzen standardmäßig an den festen Plätzen des Rahmens. Wer mag, mischt sie zufällig.";
    $("#rule-players").textContent = big ? "Gespielt wird mit 5–6 Spielern und der Erweiterung." : "Gespielt wird mit 3–4 Spielern und dem Standardbrett.";
    $("#rule-perm").style.display = big ? "none" : "";
  }

  // ---------- Aktionen ----------
  // force: Felder und Zahlen komplett neu animieren (großer Würfel / Moduswechsel)
  function build(force) {
    var old = prev;
    state.board = C.makeBoard(state.mode, state.seeds, state.opts);
    var b = state.board, n = b.tiles.length, anim = { tiles: {}, chips: {}, ports: {} };
    var same = old && old.mode === b.mode;
    for (var i = 0; i < n; i++) {
      var tChanged = !same || old.tiles[i] !== b.tiles[i];
      anim.tiles[i] = force === "all" || tChanged;
      anim.chips[i] = force === "all" || tChanged || old.numbers[i] !== b.numbers[i];
    }
    b.ports.forEach(function (p, k) { anim.ports[k] = !same || old.ports[k] !== p; });
    prev = b;
    writeHash();
    render(anim);
    $("#seed").textContent = state.seeds.t + "-" + (Number(state.seeds.n) + 1) + (state.opts.randomPorts ? "-" + state.seeds.h : "") + (state.mode === "56" ? "-56" : "");
    $("#btn-ports").disabled = !state.opts.randomPorts;
  }

  function rollDie() {
    var d = $("#die");
    d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll");
  }

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function otherCorner() {
    var cur = Number(state.seeds.n), n;
    do { n = Math.floor(Math.random() * 6); } while (n === cur);
    return String(n);
  }

  function bind() {
    $("#btn-new").addEventListener("click", function () {
      state.seeds = { t: C.newSeed(), n: String(Math.floor(Math.random() * 6)), h: state.opts.randomPorts ? C.newSeed() : state.seeds.h };
      rollDie(); build("all");
    });
    $("#btn-tiles").addEventListener("click", function () { state.seeds.t = C.newSeed(); build("all"); });
    $("#btn-nums").addEventListener("click", function () { state.seeds.n = otherCorner(); build(); });
    $("#btn-ports").addEventListener("click", function () { state.seeds.h = C.newSeed(); build(); });
    $("#opt-desert").addEventListener("change", function (e) { state.opts.desertCenter = e.target.checked; build(); });
    $("#opt-ports").addEventListener("change", function (e) { state.opts.randomPorts = e.target.checked; build(); });
    document.querySelectorAll('input[name="players"]').forEach(function (r) {
      r.addEventListener("change", function (e) { state.mode = e.target.value; build("all"); });
    });
    $("#btn-copy").addEventListener("click", function () {
      var done = function () { toast("Link kopiert – schick ihn deinen Mitspielern!"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { toast("Kopiere den Link aus der Adresszeile"); });
      else toast("Kopiere den Link aus der Adresszeile");
    });
    $("#btn-print").addEventListener("click", function () { window.print(); });
    window.addEventListener("hashchange", function () { readHash(); syncControls(); build("all"); });
  }

  function syncControls() {
    $("#opt-desert").checked = state.opts.desertCenter;
    $("#opt-ports").checked = state.opts.randomPorts;
    document.querySelectorAll('input[name="players"]').forEach(function (r) { r.checked = r.value === state.mode; });
  }

  readHash(); syncControls(); bind(); build("all");
})();
