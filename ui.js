/* Oberfläche: rendert das Brett als SVG und verdrahtet die Bedienelemente */
(function () {
  "use strict";
  var C = window.CatanCore;
  var $ = function (s) { return document.querySelector(s); };

  var HW = C.HEX_W, HH = C.HEX_H;
  var TYPE_IMG = { forest: "hex-forest", pasture: "hex-pasture", fields: "hex-fields", hills: "hex-hills", mountains: "hex-mountains", desert: "hex-desert" };
  var ORDER = ["forest", "pasture", "fields", "hills", "mountains"];

  var state = { seeds: { t: "", n: "", h: "" }, opts: { desertCenter: false, uniqueNumbers: false }, board: null };

  // ---------- URL <-> Zustand ----------
  function readHash() {
    var p = new URLSearchParams(location.hash.replace(/^#/, ""));
    var ok = /^[a-z0-9]{3,12}$/;
    ["t", "n", "h"].forEach(function (k) {
      var v = p.get(k);
      state.seeds[k] = v && ok.test(v) ? v : C.newSeed();
    });
    state.opts.desertCenter = p.get("d") === "1";
    state.opts.uniqueNumbers = p.get("u") === "1";
  }
  function writeHash() {
    var p = new URLSearchParams();
    p.set("t", state.seeds.t); p.set("n", state.seeds.n); p.set("h", state.seeds.h);
    if (state.opts.desertCenter) p.set("d", "1");
    if (state.opts.uniqueNumbers) p.set("u", "1");
    history.replaceState(null, "", "#" + p.toString());
  }

  // ---------- Rendering ----------
  function img(name, x, y, w, h, extra) {
    return '<image href="assets/' + name + '.svg" x="' + (x - w / 2).toFixed(1) + '" y="' + (y - h / 2).toFixed(1) +
      '" width="' + w + '" height="' + h + '" ' + (extra || "") + "/>";
  }

  function render(animate) {
    var b = state.board, g = "";

    // Meer
    C.SEA.forEach(function (c) {
      var p = C.pos(c.q, c.r);
      g += '<g class="sea">' + img("hex-sea", p.x, p.y, HW + 0.6, HH + 0.6) + "</g>";
    });

    // Land
    var tileDelay = 0;
    C.LAND.forEach(function (c, i) {
      var p = C.pos(c.q, c.r), t = b.tiles[i], info = C.TYPES[t];
      var n = b.numbers[i];
      var title = info.name + (info.res ? " (" + info.res + ")" : "") + (n ? " · Zahl " + n + " · " + C.pips(n) + " von 36 Würfen" : " · liefert nichts");
      g += '<g class="tile' + (animate ? " pop" : "") + '" data-type="' + t + '" style="--d:' + (tileDelay++ * 55) + 'ms">' +
        "<title>" + title + "</title>" + img(TYPE_IMG[t], p.x, p.y, HW + 0.6, HH + 0.6) + "</g>";
    });

    // Häfen: Stege + Plaketten
    var ports = "";
    C.PORT_EDGES.forEach(function (e, k) {
      var land = C.pos(C.LAND[e.land].q, C.LAND[e.land].r);
      var sea = C.pos(e.sea.q, e.sea.r);
      var th = Math.atan2(sea.y - land.y, sea.x - land.x);
      var v1 = { x: land.x + 100 * Math.cos(th - Math.PI / 6), y: land.y + 100 * Math.sin(th - Math.PI / 6) };
      var v2 = { x: land.x + 100 * Math.cos(th + Math.PI / 6), y: land.y + 100 * Math.sin(th + Math.PI / 6) };
      // Plakette etwas aus dem Land heraus, Stege laufen zu den beiden Kreuzungen
      var bx = land.x + (sea.x - land.x) * 0.98, by = land.y + (sea.y - land.y) * 0.98;
      var kind = b.ports[k];
      var label = kind === "any" ? "3:1-Hafen (beliebiger Rohstoff)" : "2:1-Hafen (" + C.PORT_RES[kind] + ")";
      ports += '<g class="port' + (animate ? " pop" : "") + '" data-port="' + kind + '" style="--d:' + (900 + k * 60) + 'ms"><title>' + label + "</title>" +
        [v1, v2].map(function (v) {
          return '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + v.x.toFixed(1) + '" y2="' + v.y.toFixed(1) + '" class="plank-o"/>' +
                 '<line x1="' + bx.toFixed(1) + '" y1="' + by.toFixed(1) + '" x2="' + v.x.toFixed(1) + '" y2="' + v.y.toFixed(1) + '" class="plank"/>';
        }).join("") +
        img("port-" + kind, bx, by + 3, 112, 112) + "</g>";
    });
    g += ports;

    // Zahlenchips
    C.LAND.forEach(function (c, i) {
      var n = b.numbers[i];
      if (n === null) return;
      var p = C.pos(c.q, c.r);
      g += '<g class="chip' + (animate ? " drop" : "") + '" data-type="' + b.tiles[i] + '" style="--d:' + (700 + i * 45) + 'ms">' + img("chip-" + n, p.x, p.y + 4, 74, 74) + "</g>";
    });

    var svg = $("#board");
    svg.innerHTML = g;
    renderStats();
  }

  function renderStats() {
    var b = state.board, s = C.stats(b), maxPips = 0;
    ORDER.forEach(function (k) { maxPips = Math.max(maxPips, s[k].pips); });
    $("#stats").innerHTML = ORDER.map(function (k) {
      var info = C.TYPES[k], v = s[k];
      return '<li data-type="' + k + '" tabindex="0">' +
        '<img src="assets/icon-' + info.icon + '.svg" alt="" width="40" height="40">' +
        '<div class="srow"><div class="sname"><b>' + info.res + "</b><span>" + v.tiles + "× " + info.name + "</span></div>" +
        '<div class="bar"><i style="width:' + Math.round(v.pips / maxPips * 100) + '%"></i></div>' +
        '<div class="snums">' + v.numbers.map(function (n) { return '<em class="' + (n === 6 || n === 8 ? "red" : "") + '">' + n + "</em>"; }).join("") + "</div></div>" +
        '<div class="spips">' + v.pips + "<small>Punkte</small></div></li>";
    }).join("");

    var ch = C.check(b, state.opts);
    var rows = [
      [ch.tilesOk, "19 Landfelder: 4 Wald, 4 Weideland, 4 Ackerland, 3 Hügelland, 3 Gebirge, 1 Wüste"],
      [ch.chipsOk, "18 Zahlenchips, die Wüste bleibt ohne Zahl"],
      [ch.redOk, "Die roten Zahlen 6 und 8 liegen nie nebeneinander"],
      [ch.portsOk, "9 Häfen: 4× 3:1 und je 1× 2:1 für jeden Rohstoff"]
    ];
    if (state.opts.uniqueNumbers) rows.push([ch.sameOk, "Gleiche Zahlen liegen nie nebeneinander"]);
    $("#checks").innerHTML = rows.map(function (r) {
      return '<li class="' + (r[0] ? "ok" : "bad") + '"><span aria-hidden="true">' + (r[0] ? "✓" : "✗") + "</span>" + r[1] + "</li>";
    }).join("");
  }

  // ---------- Aktionen ----------
  function build(animate) {
    state.board = C.makeBoard(state.seeds, state.opts);
    writeHash();
    render(animate);
    $("#seed").textContent = state.seeds.t + "-" + state.seeds.n + "-" + state.seeds.h;
  }

  var shaking;
  function rollDie() {
    var d = $("#die");
    d.classList.remove("roll"); void d.offsetWidth; d.classList.add("roll");
    clearTimeout(shaking);
  }

  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function bind() {
    $("#btn-new").addEventListener("click", function () {
      state.seeds = { t: C.newSeed(), n: C.newSeed(), h: C.newSeed() };
      rollDie(); build(true);
    });
    $("#btn-tiles").addEventListener("click", function () { state.seeds.t = C.newSeed(); build(true); });
    $("#btn-nums").addEventListener("click", function () { state.seeds.n = C.newSeed(); build(true); });
    $("#btn-ports").addEventListener("click", function () { state.seeds.h = C.newSeed(); build(true); });
    $("#opt-desert").addEventListener("change", function (e) { state.opts.desertCenter = e.target.checked; build(true); });
    $("#opt-unique").addEventListener("change", function (e) { state.opts.uniqueNumbers = e.target.checked; build(true); });
    $("#btn-copy").addEventListener("click", function () {
      var url = location.href;
      var done = function () { toast("Link kopiert – schick ihn deinen Mitspielern!"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast("Kopiere den Link aus der Adresszeile"); });
      else toast("Kopiere den Link aus der Adresszeile");
    });
    $("#btn-print").addEventListener("click", function () { window.print(); });

    // Rohstoff in der Liste anfassen = passende Felder hervorheben
    var list = $("#stats"), board = $("#board");
    function focusType(t) {
      if (t) board.setAttribute("data-focus", t); else board.removeAttribute("data-focus");
    }
    list.addEventListener("mouseover", function (e) { var li = e.target.closest("li"); if (li) focusType(li.getAttribute("data-type")); });
    list.addEventListener("mouseleave", function () { focusType(null); });
    list.addEventListener("focusin", function (e) { var li = e.target.closest("li"); if (li) focusType(li.getAttribute("data-type")); });
    list.addEventListener("focusout", function () { focusType(null); });
    window.addEventListener("hashchange", function () {
      var before = location.hash;
      readHash(); syncControls(); build(true);
    });
  }

  function syncControls() {
    $("#opt-desert").checked = state.opts.desertCenter;
    $("#opt-unique").checked = state.opts.uniqueNumbers;
  }

  readHash(); syncControls(); bind(); build(true);
})();
