/* 미니게임 영어 모드 (사이트가 EN 일 때 게임 주소에 ?lang=en 이 붙으면 켜짐)
   - 게임 코드는 그대로 두고, 화면에 나오는 한국어 글자를 영어로 바꿔 줌
   - 사전(번역 목록)은 게임마다 따로: komi-brawl.en.js, komi-island.en.js, komi-idle.en.js
     window.GAME_EN = { exact: { "한국어": "English", "남은 #명": "# left" }, frag: [["조각", "piece"]] }
     · exact: 글자 전체가 똑같을 때. 숫자는 # 로 적으면 아무 숫자나 맞음
     · frag : 긴 글 속의 일부 조각을 바꿀 때 (이름 등)
   - 번역이 없는 글자는 한국어 그대로 나옴 → 해당 .en.js 에 한 줄 추가하면 됨 */
(function () {
  "use strict";
  var D = window.GAME_EN || { exact: {}, frag: [] };
  var exact = D.exact || {};
  var KO = /[가-힣]/;
  var NUM = /\d+(?:[.,]\d+)*[KMBT]?/g; // 숫자 (1.2K 같은 단위 포함)
  // 조각 목록: 직접 적은 frag + 두 글자 이상인 exact (긴 것부터 바꿈). # 가 든 조각은 숫자 자리로 맞춤
  var frags = (D.frag || []).slice();
  Object.keys(exact).forEach(function (k) {
    if (k.replace(/#/g, "").length >= 2) frags.push([k, exact[k]]);
  });
  frags.sort(function (a, b) { return b[0].length - a[0].length; });
  frags = frags.map(function (f) {
    if (f[0].indexOf("#") < 0) return f;
    var re = new RegExp(f[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/#/g, "(\\d+(?:[.,]\\d+)*[KMBT]?)"), "g");
    var n = 0, rep = String(f[1]).replace(/\$/g, "$$$$").replace(/#/g, function () { return "$" + ++n; });
    return [re, rep];
  });

  var cache = new Map();
  function run(s) {
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], core = s.trim();
    if (exact[core] != null) return lead + exact[core] + trail;
    var nums = core.match(NUM);
    if (nums) {
      var v = exact[core.replace(NUM, "#")];
      if (v != null) { var i = 0; return lead + v.replace(/#/g, function () { return nums[i++] || ""; }) + trail; }
    }
    var out = s;
    for (var j = 0; j < frags.length && KO.test(out); j++) {
      var k = frags[j][0];
      if (typeof k === "string") { if (out.indexOf(k) >= 0) out = out.split(k).join(frags[j][1]); }
      else { k.lastIndex = 0; out = out.replace(k, frags[j][1]); }
    }
    return out;
  }
  function tr(s) {
    if (typeof s !== "string" || !KO.test(s)) return s;
    var r = cache.get(s);
    if (r !== undefined) return r;
    r = run(s);
    if (cache.size > 8000) cache.clear();
    cache.set(s, r);
    return r;
  }
  window.trEN = tr;

  // 캔버스 글자: 영어가 원래 한국어보다 너무 길면 살짝 좁혀서 자리에 맞춤
  var CP = CanvasRenderingContext2D.prototype, oFill = CP.fillText, oStroke = CP.strokeText, oMeasure = CP.measureText;
  function draw(ctx, fn, s, x, y, mw) {
    var t = tr(s);
    if (t !== s) {
      var w0 = oMeasure.call(ctx, String(s)).width, w1 = oMeasure.call(ctx, t).width;
      var lim = Math.max(w0 * 1.3, w0 + 20);
      if (w0 > 16 && w1 > lim) mw = mw == null ? lim : Math.min(mw, lim);
    }
    return mw == null ? fn.call(ctx, t, x, y) : fn.call(ctx, t, x, y, mw);
  }
  CP.fillText = function (s, x, y, mw) { return draw(this, oFill, s, x, y, mw); };
  CP.strokeText = function (s, x, y, mw) { return draw(this, oStroke, s, x, y, mw); };

  // 알림창
  ["alert", "confirm", "prompt"].forEach(function (k) {
    var o = window[k];
    if (o) window[k] = function (m, d) { return o.call(window, tr(m), d); };
  });

  // 화면(HTML) 글자
  var ATTRS = ["placeholder", "title", "aria-label"];
  function node(n) {
    if (n.nodeType === 3) {
      // 게임 프로그램 글(script·style) 안은 절대 건드리지 않음
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === "SCRIPT" || p === "STYLE" || p === "TEXTAREA") return;
      var v = n.nodeValue, t = tr(v);
      if (t !== v) n.nodeValue = t;
    } else if (n.nodeType === 1) {
      var tag = n.tagName;
      if (tag === "SCRIPT" || tag === "STYLE") return;
      for (var i = 0; i < ATTRS.length; i++) {
        var a = n.getAttribute(ATTRS[i]);
        if (a && KO.test(a)) n.setAttribute(ATTRS[i], tr(a));
      }
      if (tag === "INPUT" && (n.type === "button" || n.type === "submit") && KO.test(n.value)) n.value = tr(n.value);
      for (var c = n.firstChild; c; c = c.nextSibling) node(c);
    }
  }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) {
      var m = ms[i];
      if (m.type === "childList") for (var j = 0; j < m.addedNodes.length; j++) node(m.addedNodes[j]);
      else node(m.target);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.documentElement.lang = "en";
  document.addEventListener("DOMContentLoaded", function () {
    // html: [[선택자, 영어 HTML]] — 굵은 글씨 등으로 쪼개져 어순이 꼬이는 문장은 통째로 바꿈
    (D.html || []).forEach(function (h) {
      document.querySelectorAll(h[0]).forEach(function (el) { el.innerHTML = h[1]; });
    });
    node(document.body);
    document.title = tr(document.title);
    // 꾸미기(style) 안의 content:"한국어" 글자만 바꿈 (예: 음식 칩의 "먹기")
    document.querySelectorAll("style").forEach(function (st) {
      var css = st.textContent, out = css.replace(/content\s*:\s*"([^"]*[가-힣][^"]*)"/g, function (m, s) { return 'content:"' + tr(s).replace(/"/g, '\\"') + '"'; });
      if (out !== css) st.textContent = out;
    });
  });
})();
