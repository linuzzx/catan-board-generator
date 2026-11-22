// ==UserScript==
// @name         Catan Brett-Würfler: Helfer immer an
// @namespace    https://github.com/linuzzx/catan-board-generator
// @version      1.0
// @description  Hängt &helper=1 an die Adresse an, außer helper=0 ist gesetzt
// @match        https://linuzzx.github.io/catan-board-generator/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  "use strict";
  var p = new URLSearchParams(location.hash.replace(/^#/, ""));
  if (p.has("helper")) return;   // helper=0 oder helper=1 bleibt, wie es ist
  p.set("helper", "1");
  history.replaceState(null, "", location.pathname + location.search + "#" + p.toString());
})();
