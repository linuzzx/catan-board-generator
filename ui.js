/* Oberfläche: rendert das Brett als SVG und verdrahtet die Bedienelemente */
(function () {
  "use strict";
  var C = window.CatanCore;
  var $ = function (s) { return document.querySelector(s); };

  var HW = C.HEX_W, HH = C.HEX_H;
  var TYPE_IMG = { forest: "hex-forest", pasture: "hex-pasture", fields: "hex-fields", hills: "hex-hills", mountains: "hex-mountains", desert: "hex-desert" };

  var state = { mode: "34", seeds: { t: "", n: "0", h: "" }, opts: { desertCenter: false, randomPorts: false }, board: null };
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
  }
  function writeHash() {
    var p = new URLSearchParams();
    p.set("t", state.seeds.t); p.set("n", state.seeds.n);
    if (state.mode === "56") p.set("p", "56");
    if (state.opts.randomPorts) p.set("h", state.seeds.h);
    if (state.opts.desertCenter) p.set("d", "1");
    if (state.opts.randomPorts) p.set("r", "1");
    history.replaceState(null, "", "#" + p.toString());
  }

  // ---------- Rendering ----------
  function img(name, x, y, w, h, extra) {
    return '<image href="assets/' + name + '.svg" x="' + (x - w / 2).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) +
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

    var waves = "";
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var cnt = Math.round((maxX - minX) * (maxY - minY) / 790);
    for (var k = 0; k < cnt; k++) {
      var x = minX + rnd() * (maxX - minX), y = minY + rnd() * (maxY - minY);
      if (!inside(x - 13, y, 18) || !inside(x + 26, y, 18)) continue;
      waves += '<path d="M' + (x - 13).toFixed(0) + ',' + y.toFixed(0) + ' q6.5,-7 13,0 t13,0" />';
    }

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
      '<linearGradient id="seaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34b3ee"/><stop offset=".55" stop-color="#1c93da"/><stop offset="1" stop-color="#1678c0"/></linearGradient>' +
      '<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '</defs>' +
      '<polygon points="' + outer + '" fill="#0c3a63" stroke="#0c3a63" stroke-width="30" stroke-linejoin="round"/>' +
      '<polygon points="' + outer + '" fill="url(#seaG)" stroke="#5cc3f5" stroke-width="10" stroke-linejoin="round"/>' +
      '<g class="waves">' + waves + '</g>' + seams;
  }

  // anim: { tiles: Set-ähnliches Objekt, chips: ..., ports: ... } mit Indizes, die animiert werden
  function render(anim) {
    var b = state.board, L = C.layout(b.mode), g = "";

    var shallows = "", beach = "";
    L.land.forEach(function (c) {
      shallows += '<polygon points="' + hexPoints(c.x, c.y, 132) + '"/>';
      beach += '<polygon points="' + hexPoints(c.x, c.y, 112) + '"/>';
    });
    g += '<g class="shallows" filter="url(#soft)">' + shallows + "</g>";
    g += '<g class="beach" filter="url(#soft)">' + beach + "</g>";

    var d = 0;
    L.land.forEach(function (c, i) {
      var t = b.tiles[i], info = C.TYPES[t], n = b.numbers[i];
      var title = info.name + (info.res ? " (" + info.res + ")" : "") + (n ? " · Zahl " + n : " · liefert nichts");
      g += '<g class="tile' + (anim.tiles[i] ? " pop" : "") + '" style="--d:' + (anim.tiles[i] ? d++ * 45 : 0) + 'ms">' +
        "<title>" + title + "</title>" + img(TYPE_IMG[t], c.x, c.y, HW + 0.6, HH + 0.6) + "</g>";
    });

    var pd = 0, base = d * 45 + 150;
    L.portEdges.forEach(function (e, k) {
      var land = L.land[e.land];
      var th = Math.atan2(e.sea.y - land.y, e.sea.x - land.x), nx = Math.cos(th), ny = Math.sin(th);
      var kind = b.ports[k];
      var label = kind === "any" ? "3:1-Hafen (beliebiger Rohstoff)" : "2:1-Hafen (" + C.PORT_RES[kind] + ")";
      var jet = "";
      [-1, 1].forEach(function (s) {
        var vx = land.x + 100 * Math.cos(th + s * Math.PI / 6), vy = land.y + 100 * Math.sin(th + s * Math.PI / 6);
        var ex = vx + nx * 74, ey = vy + ny * 74;
        var dd = 'x1="' + vx.toFixed(1) + '" y1="' + vy.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '"';
        jet += "<line " + dd + ' class="jet-o"/><line ' + dd + ' class="jet"/><line ' + dd + ' class="jet-p"/>';
      });
      var sx = land.x + nx * (86.6 + 98), sy = land.y + ny * (86.6 + 98);
      g += '<g class="port' + (anim.ports[k] ? " pop" : "") + '" style="--d:' + (anim.ports[k] ? base + pd++ * 60 : 0) + 'ms"><title>' + label + "</title>" + jet +
        img("ship-" + kind, sx, sy - 6, 156, 144) + "</g>";
    });

    var cd = 0, cbase = d * 45 + 250;
    L.land.forEach(function (c, i) {
      var n = b.numbers[i];
      if (n === null) return;
      g += '<g class="chip' + (anim.chips[i] ? " drop" : "") + '" style="--d:' + (anim.chips[i] ? cbase + cd++ * 40 : 0) + 'ms">' + img("chip-" + n, c.x, c.y + 30, 84, 84) + "</g>";
    });

    $("#board").innerHTML = frameSvg(C.frameOutline(b.mode, 154)) + g;
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
