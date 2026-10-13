/* Korje Hasana — সাইটজুড়ে EN / বাং ভাষা পরিবর্তন।
 * ডিফল্ট ইংরেজি। পছন্দ localStorage 'kh_lang'-এ থাকে।
 * কোন লেখা কোন ভাষায় — kh-i18n-data.js-এর জোড়া থেকে; নতুন DOM (JS দিয়ে তৈরি) MutationObserver ধরে।
 * ব্যবহার: <script src="kh-i18n-data.js?v=1" defer></script><script src="kh-i18n.js?v=1" defer></script>
 * বাটন: <button data-lang-set="en">EN</button> <button data-lang-set="bn">বাং</button>
 */
(function () {
  'use strict';
  var D = window.KH_I18N;
  if (!D) return;
  var KEY = 'kh_lang';
  var lang = 'en';
  try { lang = localStorage.getItem(KEY) === 'bn' ? 'bn' : 'en'; } catch (e) {}

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, INPUT: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var IDX = D.idx || {};
  /* গতিশীল লেখার প্যাটার্ন (যেমন: "৫টি দান · ৩ জন দাতা") */
  var PATS = (D.patterns || []).map(function (p) { return { re: new RegExp(p[0]), en: p[1] }; });
  var textMap = new WeakMap();   // Text node -> {bn, en, lead, trail, last}
  var attrMap = new WeakMap();   // Element -> {attr: {bn, en, last}}
  var elMap = new WeakMap();     // Element[data-i18n] -> {html, en, bn, lang}

  /* ইংরেজি মোডে বাংলা অঙ্ক → ইংরেজি অঙ্ক */
  function toAscii(x) { return String(x).replace(/[\u09E6-\u09EF]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x09E6 + 48); }); }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  /* বাংলা মাসের নাম (তারিখ/মাস-লেবেল) ইংরেজি মোডে ইংরেজি হয় */
  var MON_EN = { 'জানুয়ারি': 'January', 'ফেব্রুয়ারি': 'February', 'মার্চ': 'March', 'এপ্রিল': 'April', 'মে': 'May', 'জুন': 'June', 'জুলাই': 'July', 'আগস্ট': 'August', 'সেপ্টেম্বর': 'September', 'অক্টোবর': 'October', 'নভেম্বর': 'November', 'ডিসেম্বর': 'December', 'পূর্বাহ্ণ': 'AM', 'অপরাহ্ণ': 'PM' };
  function fixMonths(s) {
    return s.replace(/(^|[^\u0980-\u09FF])(জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর|পূর্বাহ্ণ|অপরাহ্ণ)(?![\u0980-\u09FF])/g,
      function (m, pre, mon) { return pre + MON_EN[mon]; });
  }
  function lookup(t) {
    if (!t) return null;
    /* বাংলা অক্ষর থাকলে বাংলা→ইংরেজি, নাহলে ইংরেজি→বাংলা অভিমুখ আগে দেখা হয় */
    var bnFirst = /[\u0985-\u09B9]/.test(t);
    if (bnFirst && Object.prototype.hasOwnProperty.call(D.bn2en, t)) return { bn: t, en: D.bn2en[t] };
    if (Object.prototype.hasOwnProperty.call(D.en2bn, t)) return { bn: D.en2bn[t], en: t };
    if (!bnFirst && Object.prototype.hasOwnProperty.call(D.bn2en, t)) return { bn: t, en: D.bn2en[t] };
    for (var i = 0; i < PATS.length; i++) {
      if (PATS[i].re.test(t)) return { bn: t, en: fixMonths(t.replace(PATS[i].re, PATS[i].en)) };
    }
    return null;
  }
  function insideManaged(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (SKIP[p.nodeName] || p.hasAttribute('data-no-i18n') ||
          p.hasAttribute('data-i18n') || p.hasAttribute('data-i18n-html')) return true;
    }
    return false;
  }

  /* ---- টেক্সট নোড ---- */
  function trackText(node) {
    var raw = node.nodeValue;
    if (!raw || insideManaged(node)) return null;
    var m = lookup(norm(raw));
    if (!m) return null;
    var st = { bn: m.bn, en: m.en, lead: raw.match(/^\s*/)[0], trail: raw.match(/\s*$/)[0], last: null };
    textMap.set(node, st);
    return st;
  }
  function paintText(node, st) {
    var out = st.lead + (lang === 'en' ? toAscii(st.en) : st.bn) + st.trail;
    if (node.nodeValue !== out) { st.last = out; node.nodeValue = out; }
  }

  /* ---- অ্যাট্রিবিউট (placeholder, title, aria-label, alt) ---- */
  function trackAttrs(el) {
    var rec = attrMap.get(el) || null;
    ATTRS.forEach(function (a) {
      var v = el.getAttribute(a);
      if (!v) return;
      var m = lookup(norm(v));
      if (!m) return;
      rec = rec || {};
      rec[a] = { bn: m.bn, en: m.en, last: null };
    });
    if (rec) attrMap.set(el, rec);
    return rec;
  }
  function paintAttrs(el, rec) {
    for (var a in rec) {
      if (!Object.prototype.hasOwnProperty.call(rec, a)) continue;
      var st = rec[a];
      var v = lang === 'en' ? toAscii(st.en) : st.bn;
      if (el.getAttribute(a) !== v) { st.last = v; el.setAttribute(a, v); }
    }
  }

  /* ---- data-i18n / data-i18n-html উপাদান (পূর্ণ উপাদান একসাথে) ---- */
  function paintEl(el, st) {
    var v = lang === 'en' ? toAscii(st.en) : st.bn;
    if (st.html) el.innerHTML = v; else el.textContent = v;
    st.lang = lang;
  }
  function handleManagedEl(el) {
    var st = elMap.get(el);
    if (!st) {
      var k = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-html');
      var e = IDX[k];
      if (!e) return;
      st = { html: el.hasAttribute('data-i18n-html'), en: e.en, bn: e.bn, lang: null };
      elMap.set(el, st);
    }
    if (st.lang !== lang) paintEl(el, st);   /* একই ভাষায় আগে বসানো থাকলে আর ছোঁয় না — লুপ এড়াতে */
  }

  /* ---- পুরো ট্রি স্ক্যান ও রঙ করা ---- */
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var st0 = textMap.get(root) || trackText(root);
      if (st0) paintText(root, st0);
      else if (lang === 'en' && /[\u09E6-\u09EF]/.test(root.nodeValue) && !insideManaged(root)) root.nodeValue = toAscii(root.nodeValue);
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    var els = [];
    if (root.nodeType === 1) els.push(root);
    if (root.querySelectorAll) els = els.concat([].slice.call(root.querySelectorAll('*')));
    els.forEach(function (el) {
      if (el.hasAttribute && (el.hasAttribute('data-i18n') || el.hasAttribute('data-i18n-html'))) {
        handleManagedEl(el);
        return;
      }
      var rec = attrMap.get(el) || trackAttrs(el);
      if (rec) paintAttrs(el, rec);
    });
    var base = root.nodeType === 9 ? root.body : root;
    if (!base) return;
    var w = document.createTreeWalker(base, NodeFilter.SHOW_TEXT, null, false);
    var list = [], n;
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (node) {
      var st = textMap.get(node) || trackText(node);
      if (st) paintText(node, st);
      else if (lang === 'en' && /[\u09E6-\u09EF]/.test(node.nodeValue) && !insideManaged(node)) node.nodeValue = toAscii(node.nodeValue);
    });
  }

  /* ---- বাটন সমন্বয় ---- */
  function syncButtons() {
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      var on = b.getAttribute('data-lang-set') === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.documentElement.setAttribute('lang', lang === 'bn' ? 'bn' : 'en');
  }

  function setLang(l) {
    lang = l === 'bn' ? 'bn' : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    if (document.body) scan(document.body);
    syncButtons();
    try { document.dispatchEvent(new CustomEvent('khlangchange', { detail: { lang: lang } })); } catch (e) {}
  }

  /* ---- DOM পরিবর্তন ধরা (পরে JS দিয়ে বসানো নতুন লেখা) ---- */
  var mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(function (n) { scan(n); });
      } else if (m.type === 'characterData') {
        var node = m.target, st = textMap.get(node);
        if (st && node.nodeValue === st.last) return;      /* আমাদের নিজের বসানো */
        textMap.delete(node);
        st = trackText(node);
        if (st) paintText(node, st);
        else if (lang === 'en' && /[\u09E6-\u09EF]/.test(node.nodeValue) && !insideManaged(node)) node.nodeValue = toAscii(node.nodeValue);
      } else if (m.type === 'attributes') {
        var el = m.target, a = m.attributeName, rec = attrMap.get(el);
        if (rec && rec[a] && el.getAttribute(a) === rec[a].last) return;
        if (ATTRS.indexOf(a) >= 0) {
          if (rec) delete rec[a];
          var r2 = trackAttrs(el);
          if (r2) paintAttrs(el, r2);
        }
      }
    });
    syncButtons();
  });

  /* যে পেজে নিজস্ব EN/বাং বাটন নেই, সেখানে একটি ছোট ভাসমান বাটন */
  function mountPill() {
    if (document.querySelector('[data-lang-set]')) return;
    var st = document.createElement('style');
    st.textContent = '.kh-lang-pill{position:fixed;left:12px;bottom:12px;z-index:1040;display:flex;gap:2px;padding:3px;border-radius:999px;background:rgba(22,13,38,.92);border:1px solid rgba(255,255,255,.22);box-shadow:0 6px 18px rgba(0,0,0,.25);font-family:"Hind Siliguri",system-ui,sans-serif}' +
      '.kh-lang-pill button{border:0;background:transparent;color:rgba(255,255,255,.72);font-size:12.5px;font-weight:600;line-height:1;padding:7px 11px;border-radius:999px;cursor:pointer}' +
      '.kh-lang-pill button.active{background:#f08c28;color:#160d26}' +
      '.kh-lang-pill button:focus-visible{outline:2px solid #f08c28;outline-offset:2px}' +
      '@media (max-width:768px){.kh-lang-pill{bottom:92px}}';
    document.head.appendChild(st);
    var wrap = document.createElement('div');
    wrap.className = 'kh-lang-pill';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Language · ভাষা');
    wrap.innerHTML = '<button type="button" data-lang-set="en">EN</button><button type="button" data-lang-set="bn">বাং</button>';
    document.body.appendChild(wrap);
  }

  function init() {
    mountPill();
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-lang-set]') : null;
      if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang-set')); }
    });
    scan(document.body);
    syncButtons();
    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
  }

  window.KHI18N = { getLang: function () { return lang; }, setLang: setLang, scan: scan };
  /* পুরোনো index.html-এর onclick="setLang('en',this)" টিকিয়ে রাখা */
  window.setLang = function (l) { setLang(l); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
