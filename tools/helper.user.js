// ==UserScript==
// @name         Catan Brett-Würfler: Helfer immer an
// @namespace    https://github.com/linuzzx/catan-board-generator
// @version      1.1
// @description  Hängt &helper=1 an die Adresse an. helper=0 schaltet ihn dauerhaft aus, helper=1 wieder an.
// @match        https://linuzzx.github.io/catan-board-generator/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  "use strict";
  var KEY = "catanHelper";
  var p = new URLSearchParams(location.hash.replace(/^#/, ""));
  var v = p.get("helper");
  try {
    if (v === "0") localStorage.setItem(KEY, "0");      // dauerhaft aus
    else if (v === "1") localStorage.removeItem(KEY);   // wieder an
    else v = localStorage.getItem(KEY) === "0" ? "0" : "1";
  } catch (e) { if (v === null) v = "1"; }
  if (p.get("helper") === v) return;
  p.set("helper", v);
  history.replaceState(null, "", location.pathname + location.search + "#" + p.toString());
})();
