/* Oberfläche: rendert das Brett als SVG und verdrahtet die Bedienelemente */
(function () {
  "use strict";
  var C = window.CatanCore;
  var $ = function (s) { return document.querySelector(s); };

  var HW = C.HEX_W, HH = C.HEX_H;
  var TYPE_IMG = { forest: "hex-forest", pasture: "hex-pasture", fields: "hex-fields", hills: "hex-hills", mountains: "hex-mountains", desert: "hex-desert" };

  var state = { seeds: { t: "", n: "0", h: "" }, opts: { desertCenter: false, randomPorts: false }, board: null };

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
    state.opts.desertCenter = p.get("d") === "1";
    state.opts.randomPorts = p.get("r") === "1";
  }
  function writeHash() {
    var p = new URLSearchParams();
    p.set("t", state.seeds.t); p.set("n", state.seeds.n);
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

  // Ein einziges Rahmenteil: großes Sechseck (Spitzen links/rechts) mit den Steckverbindungen der Rahmenstücke
  var RO = 640, AP = RO * Math.sqrt(3) / 2;
  function frameSvg() {
    var V = [];
    for (var i = 0; i < 6; i++) { var a = (60 * i) * Math.PI / 180; V.push([RO * Math.cos(a), RO * Math.sin(a)]); }
    var outer = V.map(function (v) { return v[0].toFixed(1) + "," + v[1].toFixed(1); }).join(" ");

    // wellige Muster
    var waves = "";
    var seed = 7, rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var k = 0; k < 520; k++) {
      var x = (rnd() * 2 - 1) * RO, y = (rnd() * 2 - 1) * AP;
      if (Math.abs(y) > AP - 10 || Math.abs(x) > RO - Math.abs(y) / Math.sqrt(3) - 18) continue;
      waves += '<path d="M' + (x - 13).toFixed(0) + ',' + y.toFixed(0) + ' q6.5,-7 13,0 t13,0" />';
    }

    // Steckverbindungen: von den Ecken des Außensechsecks leicht versetzt zur Insel
    var seams = "";
    for (var j = 0; j < 6; j++) {
      var ang = (60 * j + 30) * Math.PI / 180;           // zwischen den Ecken
      var ux = Math.cos(ang), uy = Math.sin(ang), px = -uy, py = ux;
      var r0 = AP - 2, r1 = AP - 150;
      var mx = ux * (r0 + r1) / 2, my = uy * (r0 + r1) / 2;
      var p0 = [ux * r0, uy * r0], p1 = [ux * r1, uy * r1];
      var q = function (t, o) { return (ux * t + px * o).toFixed(1) + "," + (uy * t + py * o).toFixed(1); };
      var t0 = r0, tc = (r0 + r1) / 2;
      seams += '<path class="seam" d="M' + p0[0].toFixed(1) + "," + p0[1].toFixed(1) +
        " L" + q(tc + 26, 0) + " C" + q(tc + 26, 16) + " " + q(tc + 8, 16) + " " + q(tc + 8, 7) +
        " L" + q(tc - 8, 7) + " C" + q(tc - 8, 16) + " " + q(tc - 26, 16) + " " + q(tc - 26, 0) +
        " L" + p1[0].toFixed(1) + "," + p1[1].toFixed(1) + '"/>';
    }

    return '<defs>' +
      '<linearGradient id="seaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34b3ee"/><stop offset=".55" stop-color="#1c93da"/><stop offset="1" stop-color="#1678c0"/></linearGradient>' +
      '<filter id="soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter>' +
      '</defs>' +
      '<polygon points="' + outer + '" fill="#0c3a63" stroke="#0c3a63" stroke-width="30" stroke-linejoin="round"/>' +
      '<polygon points="' + outer + '" fill="url(#seaG)" stroke="#5cc3f5" stroke-width="10" stroke-linejoin="round"/>' +
      '<g class="waves">' + waves + '</g>' + seams;
  }

  function render(animate) {
    var b = state.board, g = "";

    // Seichtes Wasser + Strand rund um die Insel (als zusammenhängende Fläche)
    var shallows = "", beach = "";
    C.LAND.forEach(function (c) {
      var p = C.pos(c.q, c.r);
      shallows += '<polygon points="' + hexPoints(p.x, p.y, 132) + '"/>';
      beach += '<polygon points="' + hexPoints(p.x, p.y, 112) + '"/>';
    });
    g += '<g class="shallows" filter="url(#soft)">' + shallows + "</g>";
    g += '<g class="beach" filter="url(#soft)">' + beach + "</g>";

    // Land
    var tileDelay = 0;
    C.LAND.forEach(function (c, i) {
      var p = C.pos(c.q, c.r), t = b.tiles[i], info = C.TYPES[t];
      var n = b.numbers[i];
      var title = info.name + (info.res ? " (" + info.res + ")" : "") + (n ? " · Zahl " + n : " · liefert nichts");
      g += '<g class="tile' + (animate ? " pop" : "") + '" style="--d:' + (tileDelay++ * 55) + 'ms">' +
        "<title>" + title + "</title>" + img(TYPE_IMG[t], p.x, p.y, HW + 0.6, HH + 0.6) + "</g>";
    });

    // Häfen: Stege an den beiden Kreuzungen + Schiff
    C.PORT_EDGES.forEach(function (e, k) {
      var land = C.pos(C.LAND[e.land].q, C.LAND[e.land].r);
      var sea = C.pos(e.sea.q, e.sea.r);
      var th = Math.atan2(sea.y - land.y, sea.x - land.x), nx = Math.cos(th), ny = Math.sin(th);
      var kind = b.ports[k];
      var label = kind === "any" ? "3:1-Hafen (beliebiger Rohstoff)" : "2:1-Hafen (" + C.PORT_RES[kind] + ")";
      var jet = "";
      [-1, 1].forEach(function (s) {
        var vx = land.x + 100 * Math.cos(th + s * Math.PI / 6), vy = land.y + 100 * Math.sin(th + s * Math.PI / 6);
        var ex = vx + nx * 74, ey = vy + ny * 74;
        var d = 'x1="' + vx.toFixed(1) + '" y1="' + vy.toFixed(1) + '" x2="' + ex.toFixed(1) + '" y2="' + ey.toFixed(1) + '"';
        jet += "<line " + d + ' class="jet-o"/><line ' + d + ' class="jet"/><line ' + d + ' class="jet-p"/>';
      });
      var sx = land.x + nx * (86.6 + 98), sy = land.y + ny * (86.6 + 98);
      g += '<g class="port' + (animate ? " pop" : "") + '" style="--d:' + (900 + k * 60) + 'ms"><title>' + label + "</title>" + jet +
        img("ship-" + kind, sx, sy - 6, 132, 122) + "</g>";
    });

    // Zahlenchips
    C.LAND.forEach(function (c, i) {
      var n = b.numbers[i];
      if (n === null) return;
      var p = C.pos(c.q, c.r);
      g += '<g class="chip' + (animate ? " drop" : "") + '" style="--d:' + (700 + i * 45) + 'ms">' + img("chip-" + n, p.x, p.y + 4, 74, 74) + "</g>";
    });

    $("#board").innerHTML = frameSvg() + g;
    renderInfo();
  }

  function renderInfo() {
    var b = state.board, ch = C.check(b);
    var rows = [
      [ch.tilesOk, "19 Landfelder: 4 Wald, 4 Weideland, 4 Ackerland, 3 Hügelland, 3 Gebirge, 1 Wüste"],
      [ch.chipsOk && ch.spiralOk, "18 Zahlenchips in der festen Reihenfolge A–R entlang der Spirale, die Wüste wird übersprungen"],
      [ch.redPairs === 0, "Die roten Zahlen 6 und 8 liegen nie nebeneinander"],
      [ch.portsOk, state.opts.randomPorts ? "9 Häfen (4× 3:1, 5× 2:1), zufällig auf die Hafenplätze gemischt" : "9 Häfen (4× 3:1, 5× 2:1) in der Standard-Anordnung des Rahmens"]
    ];
    $("#checks").innerHTML = rows.map(function (r) {
      return '<li class="' + (r[0] ? "ok" : "bad") + '"><span aria-hidden="true">' + (r[0] ? "✓" : "✗") + "</span>" + r[1] + "</li>";
    }).join("");
    $("#start-corner").textContent = C.CORNER_NAMES[b.corner];
    $("#chip-order").innerHTML = C.CHIP_ORDER.map(function (n, i) {
      return '<span class="' + (n === 6 || n === 8 ? "red" : "") + '"><i>' + String.fromCharCode(65 + i) + "</i>" + n + "</span>";
    }).join("");
  }

  // ---------- Aktionen ----------
  function build(animate) {
    state.board = C.makeBoard(state.seeds, state.opts);
    writeHash();
    render(animate);
    $("#seed").textContent = state.seeds.t + "-" + (Number(state.seeds.n) + 1) + (state.opts.randomPorts ? "-" + state.seeds.h : "");
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
      state.seeds = { t: C.newSeed(), n: String(Math.floor(Math.random() * 6)), h: C.newSeed() };
      rollDie(); build(true);
    });
    $("#btn-tiles").addEventListener("click", function () { state.seeds.t = C.newSeed(); build(true); });
    $("#btn-nums").addEventListener("click", function () { state.seeds.n = otherCorner(); build(true); });
    $("#btn-ports").addEventListener("click", function () { state.seeds.h = C.newSeed(); build(true); });
    $("#opt-desert").addEventListener("change", function (e) { state.opts.desertCenter = e.target.checked; build(true); });
    $("#opt-ports").addEventListener("change", function (e) { state.opts.randomPorts = e.target.checked; build(true); });
    $("#btn-copy").addEventListener("click", function () {
      var done = function () { toast("Link kopiert – schick ihn deinen Mitspielern!"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, function () { toast("Kopiere den Link aus der Adresszeile"); });
      else toast("Kopiere den Link aus der Adresszeile");
    });
    $("#btn-print").addEventListener("click", function () { window.print(); });
    window.addEventListener("hashchange", function () { readHash(); syncControls(); build(true); });
  }

  function syncControls() {
    $("#opt-desert").checked = state.opts.desertCenter;
    $("#opt-ports").checked = state.opts.randomPorts;
  }

  readHash(); syncControls(); bind(); build(true);
})();
