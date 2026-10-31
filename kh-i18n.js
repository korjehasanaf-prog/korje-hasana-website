/* Korje Hasana — সাইটজুড়ে তিন ভাষা: English · বাংলা · العربية (আরবি যোগ: ৩১ অক্টোবর ২০২৬)
 * ডিফল্ট ইংরেজি। পছন্দ localStorage 'kh_lang'-এ থাকে ('en' | 'bn' | 'ar')।
 * কোন লেখা কোন ভাষায় — kh-i18n-data.js-এর জোড়া (বাংলা ↔ ইংরেজি) থেকে; আরবি থাকে আলাদা
 * kh-i18n-ar.js-এ (বাংলা লেখাই চাবি) — কেবল কেউ আরবি বাছলে তবেই নামে, তাই অন্যদের পাতা ভারী হয় না।
 * নতুন DOM (JS দিয়ে তৈরি) MutationObserver ধরে।
 * ব্যবহার: <script src="kh-i18n-data.js?v=N" defer></script><script src="kh-i18n.js?v=N" defer></script>
 * বাটন: <button data-lang-set="en">EN</button> <button data-lang-set="bn">বাং</button> <button data-lang-set="ar">عربي</button>
 *   — কোনো পাতায় শুধু EN/বাং বাটন থাকলে আরবি বাটনটি নিজে থেকেই পাশে বসে।
 * আরবি নেই এমন পাতা (অ্যাডমিন): <body data-kh-langs="bn,en"> — সেখানে আরবি বাছা থাকলে ইংরেজি দেখায়।
 * ⚠️ ভাসমান ভাষা-পিল বাতিল (ব্যবহারকারীর সিদ্ধান্ত, ১ নভেম্বর ২০২৬) — কোনো পাতায় আর বসে না।
 *   ফুটারের ভাষা-বাছাই কেবল যে পাতা চায়: <body data-kh-lang-foot="on"> (এখন শুধু index.html)।
 *   বাছা ভাষা kh_lang-এ মনে থাকে, তাই হোম পেজে একবার বাছলেই সব পাতা সেই ভাষায় খোলে।
 * সিদ্ধান্ত (ব্যবহারকারী, ৩১ অক্টোবর ২০২৬): আরবিতে পাতার সাজ উল্টায় না — কেবল লেখা ডানে
 *   (unicode-bidi: plaintext; dir="rtl" কখনো নয়), আর অঙ্ক ইংরেজিতে (0-9)।
 */
(function () {
  'use strict';
  var D = window.KH_I18N;
  if (!D) return;
  var KEY = 'kh_lang';
  var AR_VER = '4';                       /* kh-i18n-ar.js বদলালে এই সংখ্যা বাড়াতে হবে */
  var LANGS = { en: 1, bn: 1, ar: 1 };
  var lang = 'en';
  try { var saved = localStorage.getItem(KEY); if (LANGS[saved]) lang = saved; } catch (e) {}
  var AR = window.KH_I18N_AR || null, ARPATS = [], arLoading = false, arWait = [];

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, PRE: 1, INPUT: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  var IDX = D.idx || {};
  var has = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  /* গতিশীল লেখার প্যাটার্ন (যেমন: "৫টি দান · ৩ জন দাতা") */
  var PATS = (D.patterns || []).map(function (p) { return { re: new RegExp(p[0]), en: p[1] }; });
  var textMap = new WeakMap();   // Text node -> {bn, en, pat, ar, lead, trail, last}
  var attrMap = new WeakMap();   // Element -> {attr: {bn, en, pat, ar, last}}
  var elMap = new WeakMap();     // Element[data-i18n] -> {html, k, en, bn, lang}

  function pageHasAr() {
    var b = document.body, v = b && b.getAttribute('data-kh-langs');
    return !v || /(^|[\s,])ar([\s,]|$)/.test(v);
  }
  /* যা আসলে দেখানো হয়: আরবি বাছা থাকলেও পাতা আরবি না নিলে বা আরবি ফাইল তখনো না এলে ইংরেজি */
  function eff() { return lang === 'ar' && (!pageHasAr() || !AR) ? 'en' : lang; }

  /* ইংরেজি ও আরবি মোডে বাংলা অঙ্ক → ইংরেজি অঙ্ক */
  function toAscii(x) { return String(x).replace(/[০-৯]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x09E6 + 48); }); }
  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }
  /* বাংলা মাসের নাম (তারিখ/মাস-লেবেল) ইংরেজি ও আরবি মোডে বদলায় */
  var MON_RE = /(^|[^ঀ-৿])(জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর|পূর্বাহ্ণ|অপরাহ্ণ)(?![ঀ-৿])/g;
  var MON_EN = { 'জানুয়ারি': 'January', 'ফেব্রুয়ারি': 'February', 'মার্চ': 'March', 'এপ্রিল': 'April', 'মে': 'May', 'জুন': 'June', 'জুলাই': 'July', 'আগস্ট': 'August', 'সেপ্টেম্বর': 'September', 'অক্টোবর': 'October', 'নভেম্বর': 'November', 'ডিসেম্বর': 'December', 'পূর্বাহ্ণ': 'AM', 'অপরাহ্ণ': 'PM' };
  var MON_AR = { 'জানুয়ারি': 'يناير', 'ফেব্রুয়ারি': 'فبراير', 'মার্চ': 'مارس', 'এপ্রিল': 'أبريل', 'মে': 'مايو', 'জুন': 'يونيو', 'জুলাই': 'يوليو', 'আগস্ট': 'أغسطس', 'সেপ্টেম্বর': 'سبتمبر', 'অক্টোবর': 'أكتوبر', 'নভেম্বর': 'نوفمبر', 'ডিসেম্বর': 'ديسمبر', 'পূর্বাহ্ণ': 'ص', 'অপরাহ্ণ': 'م' };
  function fixMonths(s) { return s.replace(MON_RE, function (m, pre, mon) { return pre + MON_EN[mon]; }); }
  function fixMonthsAr(s) { return s.replace(MON_RE, function (m, pre, mon) { return pre + MON_AR[mon]; }); }

  function lookup(t) {
    if (!t) return null;
    /* বাংলা অক্ষর থাকলে বাংলা→ইংরেজি, নাহলে ইংরেজি→বাংলা অভিমুখ আগে দেখা হয় */
    var bnFirst = /[অ-হ]/.test(t);
    if (bnFirst && has(D.bn2en, t)) return { bn: t, en: D.bn2en[t] };
    if (has(D.en2bn, t)) return { bn: D.en2bn[t], en: t };
    if (!bnFirst && has(D.bn2en, t)) return { bn: t, en: D.bn2en[t] };
    /* কেবল আরবি জোড়া আছে (বাংলা চাবি) — ইংরেজি না থাকলে বাংলাই ফলব্যাক */
    if (bnFirst && AR && has(AR.bn2ar, t)) return { bn: t, en: t };
    /* একাধিক প্যাটার্ন একই লেখায় থাকলে সবগুলো ক্রমানুসারে প্রয়োগ হয় */
    var out = t, hit = false;
    for (var i = 0; i < PATS.length; i++) {
      if (PATS[i].re.test(out)) { out = out.replace(PATS[i].re, PATS[i].en); hit = true; }
    }
    if (hit) return { bn: t, en: fixMonths(out), pat: true };
    if (bnFirst && ARPATS.length) {
      for (var j = 0; j < ARPATS.length; j++) if (ARPATS[j].re.test(t)) return { bn: t, en: t, pat: true };
    }
    return bnFirst ? compLookup(t) : null;
  }
  /* "·" দিয়ে জোড়া লেখা (যেমন "— কার্যনির্বাহী কমিটি · সভাপতি", "অনুমোদিত · ৳৫০০") — প্রতিটি
     টুকরো আলাদা করে মেলানো হয়; বাংলা অক্ষরওয়ালা প্রতিটি টুকরো জানা থাকলে তবেই অনুবাদ হয় */
  var PART_RE = /^([\s—–\-(\[«"'“]*)([\s\S]*?)([\s)\]»"'”.,:;!?।]*)$/;
  function compLookup(t) {
    if (t.indexOf('·') < 0) return null;
    var parts = t.split(/\s*·\s*/), comp = [], en = [], any = false;
    for (var i = 0; i < parts.length; i++) {
      var m = parts[i].match(PART_RE) || ['', '', parts[i], ''];
      var core = m[2];
      if (!/[অ-হ]/.test(core)) { comp.push([m[1], core, m[3], false]); en.push(parts[i]); continue; }
      if (!has(D.bn2en, core) && !(AR && has(AR.bn2ar, core))) return null;
      any = true;
      comp.push([m[1], core, m[3], true]);
      en.push(m[1] + (has(D.bn2en, core) ? D.bn2en[core] : core) + m[3].replace(/\u0964/g, '.'));
    }
    return any ? { bn: t, en: en.join(' · '), comp: comp } : null;
  }
  /* আরবি: বাংলা চাবি → আরবি; না পেলে ইংরেজি চাবি; তারপর আরবি প্যাটার্ন; কিছু না মিললে ইংরেজি */
  function arOf(st) {
    if (!AR) return st.en;
    if (st.ar !== undefined) return st.ar;
    var a = null;
    if (st.comp) {
      a = st.comp.map(function (c) {
        if (!c[3]) return c[0] + c[1] + c[2];
        var core = has(AR.bn2ar, c[1]) ? AR.bn2ar[c[1]] : (has(D.bn2en, c[1]) ? D.bn2en[c[1]] : c[1]);
        return c[0] + core + c[2].replace(/।/g, '.');
      }).join(' · ');
    } else if (has(AR.bn2ar, st.bn)) a = AR.bn2ar[st.bn];
    else if (st.en && has(AR.en2ar, st.en)) a = AR.en2ar[st.en];
    else if (st.pat || ARPATS.length) {
      var out = st.bn, hit = false;
      for (var i = 0; i < ARPATS.length; i++) {
        if (ARPATS[i].re.test(out)) { out = out.replace(ARPATS[i].re, ARPATS[i].ar); hit = true; }
      }
      if (hit) a = fixMonthsAr(out);
    }
    st.ar = a == null ? st.en : a;
    return st.ar;
  }
  function txt(st) {
    var L = eff();
    if (L === 'bn') return st.bn;
    return toAscii(L === 'ar' ? arOf(st) : st.en);
  }
  function insideManaged(node) {
    for (var p = node.parentNode; p && p.nodeType === 1; p = p.parentNode) {
      if (SKIP[p.nodeName] || p.hasAttribute('data-no-i18n') ||
          p.hasAttribute('data-i18n') || p.hasAttribute('data-i18n-html')) return true;
    }
    return false;
  }
  function bareDigits(node) {
    if (eff() !== 'bn' && /[০-৯]/.test(node.nodeValue) && !insideManaged(node)) node.nodeValue = toAscii(node.nodeValue);
  }

  /* ---- টেক্সট নোড ---- */
  function trackText(node) {
    var raw = node.nodeValue;
    if (!raw || insideManaged(node)) return null;
    var m = lookup(norm(raw));
    if (!m) return null;
    var st = { bn: m.bn, en: m.en, pat: !!m.pat, comp: m.comp, lead: raw.match(/^\s*/)[0], trail: raw.match(/\s*$/)[0], last: null };
    textMap.set(node, st);
    return st;
  }
  function paintText(node, st) {
    var out = st.lead + txt(st) + st.trail;
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
      rec[a] = { bn: m.bn, en: m.en, pat: !!m.pat, comp: m.comp, last: null };
    });
    if (rec) attrMap.set(el, rec);
    return rec;
  }
  function paintAttrs(el, rec) {
    for (var a in rec) {
      if (!has(rec, a)) continue;
      var st = rec[a], v = txt(st);
      if (el.getAttribute(a) !== v) { st.last = v; el.setAttribute(a, v); }
    }
  }

  /* ---- data-i18n / data-i18n-html উপাদান (পূর্ণ উপাদান একসাথে) ---- */
  function paintEl(el, st) {
    var L = eff(), v;
    if (L === 'bn') v = st.bn;
    else if (L === 'ar') v = toAscii((has(AR.idx, st.k) && AR.idx[st.k]) || (has(AR.bn2ar, st.bn) && AR.bn2ar[st.bn]) || st.en);
    else v = toAscii(st.en);
    if (st.html) el.innerHTML = v; else el.textContent = v;
    st.lang = L;
  }
  function handleManagedEl(el) {
    var st = elMap.get(el);
    if (!st) {
      var k = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-html');
      var e = IDX[k];
      if (!e) return;
      st = { html: el.hasAttribute('data-i18n-html'), k: k, en: e.en, bn: e.bn, lang: null };
      elMap.set(el, st);
    }
    if (st.lang !== eff()) paintEl(el, st);   /* একই ভাষায় আগে বসানো থাকলে আর ছোঁয় না — লুপ এড়াতে */
  }

  /* ---- পুরো ট্রি স্ক্যান ও রঙ করা ---- */
  function scan(root) {
    if (!root) return;
    if (root.nodeType === 3) {
      var st0 = textMap.get(root) || trackText(root);
      if (st0) paintText(root, st0); else bareDigits(root);
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
      if (st) paintText(node, st); else bareDigits(node);
    });
  }

  /* ---- পাতার শিরোনাম (<title>) ---- */
  var titleSt;
  function paintTitle() {
    if (titleSt === undefined) titleSt = lookup(norm(document.title)) || null;
    if (titleSt) { var v = txt(titleSt); if (document.title !== v) document.title = v; }
  }

  /* ---- বাটন সমন্বয় ---- */
  function syncButtons() {
    var L = eff(), ar = pageHasAr();
    document.querySelectorAll('[data-lang-set]').forEach(function (b) {
      var v = b.getAttribute('data-lang-set');
      if (v === 'ar') b.hidden = !ar;
      var on = v === L;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.documentElement.setAttribute('lang', L);
  }
  /* আগের EN/বাং জোড়ার পাশে আরবি বাটন — HTML ছুঁতে হয় না */
  function addArButtons() {
    if (!pageHasAr()) return;
    document.querySelectorAll('[data-lang-set="bn"]').forEach(function (b) {
      var g = b.parentNode;
      if (!g || g.querySelector('[data-lang-set="ar"]')) return;
      var a = b.cloneNode(false);
      a.removeAttribute('id');
      a.classList.remove('active');
      a.setAttribute('data-lang-set', 'ar');
      a.setAttribute('lang', 'ar');
      a.setAttribute('title', 'العربية');
      a.textContent = 'عربي';
      g.appendChild(a);
      g.setAttribute('data-no-i18n', '');
    });
  }

  function loadAr(cb) {
    if (AR) { if (cb) cb(); return; }
    if (cb) arWait.push(cb);
    if (arLoading) return;
    arLoading = true;
    var s = document.createElement('script');
    s.src = 'kh-i18n-ar.js?v=' + AR_VER;
    s.async = true;
    var done = function () {
      arLoading = false;
      AR = window.KH_I18N_AR || null;
      if (AR) {
        AR.bn2ar = AR.bn2ar || {}; AR.en2ar = AR.en2ar || {}; AR.idx = AR.idx || {};
        ARPATS = (AR.patterns || []).map(function (p) { return { re: new RegExp(p[0]), ar: p[1] }; });
      }
      var w = arWait; arWait = [];
      w.forEach(function (f) { try { f(); } catch (e) {} });
    };
    s.onload = done;
    s.onerror = done;            /* ফাইল না এলে ইংরেজিই থাকে — কিছু ভাঙে না */
    document.head.appendChild(s);
  }

  function repaint() {
    if (document.body) scan(document.body);
    paintTitle();
    syncButtons();
    try { document.dispatchEvent(new CustomEvent('khlangchange', { detail: { lang: eff(), pref: lang } })); } catch (e) {}
  }
  function setLang(l) {
    lang = LANGS[l] ? l : 'en';
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    if (lang === 'ar' && !AR && pageHasAr()) loadAr(repaint);
    repaint();
    savePref();
  }
  /* লগইন থাকলে পছন্দ প্রোফাইলেও (রশিদ ও ই-মেইল সেই ভাষায় যায়) — কেবল সদস্যের নিজের ক্লিকে, পেজ লোডে নয়।
     RPC না থাকলে বা লগইন না থাকলে চুপচাপ কিছু হয় না। */
  function savePref() {
    try {
      var db = (window.KHUI && KHUI.db && KHUI.db()) || window._db;
      if (!db || !db.auth || !db.rpc) return;
      db.auth.getSession().then(function (r) {
        if (!r || !r.data || !r.data.session) return;
        var q = db.rpc('set_my_pref_lang', { p_lang: lang });
        if (q && q.then) q.then(function () {}, function () {});
      }, function () {});
    } catch (e) {}
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
        if (st) paintText(node, st); else bareDigits(node);
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
    addArButtons();
    syncButtons();
  });

  /* ---- স্টাইল: আরবি ফন্ট, ডান-ঘেঁষা লেখা, ভাষার পিল ও ফুটারের বাছাই ---- */
  function mountStyle() {
    if (document.getElementById('khI18nCss')) return;
    /* আরবি অক্ষর কেবল এই ফন্ট থেকে আসে — সাইটের পরিবারের নামেই (unicode-range), তাই প্রতিটি
       উপাদানের font-family বদলাতে হয় না; বাংলা/ইংরেজি অক্ষর আগের ফন্টেই থাকে। */
    var AR_FONT = 'url(https://fonts.gstatic.com/s/notosansarabic/v33/nwpCtLGrOAZMl5nJ_wfgRg3DrWFZWsnVBJ_sS6tlqHHFlj4wv4r4xA.woff2) format("woff2")';
    var RANGE = 'U+0600-06FF, U+0750-077F, U+0870-089F, U+08A0-08FF, U+200C-200E, U+FB50-FDFF, U+FE70-FEFF';
    var fams = ['Hind Siliguri', 'Inter', 'Oswald', 'Cormorant Garamond', 'Noto Sans Arabic'];
    var css = fams.map(function (f) {
      return '@font-face{font-family:"' + f + '";src:' + AR_FONT + ';font-weight:100 900;font-style:normal;font-display:swap;unicode-range:' + RANGE + '}';
    }).join('') +
      /* লেখা ডানে, সাজ অপরিবর্তিত — :where() তাই নির্বাচকের ওজন ০, কোনো উপাদানের নিজের নিয়ম থাকলে সেটিই জেতে */
      ':where(html[lang="ar"]) body, :where(html[lang="ar"]) body *{unicode-bidi:plaintext}' +
      ':where(html[lang="ar"]) body{font-family:"Hind Siliguri","Noto Sans Arabic",system-ui,sans-serif}' +
      /* আরবি জোড়া-অক্ষর — letter-spacing দিলে অক্ষর ছিঁড়ে যায় (ভাউচারের ছবিতে html2canvas অক্ষরে অক্ষরে আঁকে) */
      'html[lang="ar"] body *{letter-spacing:0!important}' +
      '[data-lang-set][hidden]{display:none!important}' +
      /* বাংলা নামের নিচের ইংরেজি লাইন (data-en-sub) — ইংরেজি মোডে মূল নামটিই ইংরেজি, তাই দ্বিতীয়বার নয় */
      'html[lang="en"] [data-en-sub]{display:none!important}' +
      '.kh-lang-foot button:focus-visible{outline:2px solid #f08c28;outline-offset:2px}' +
      '@media print{.kh-lang-foot{display:none!important}}' +
      /* ফুটারের বাছাই */
      '.kh-lang-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 14px;margin:18px auto 6px;padding:10px 14px;max-width:560px;border-radius:14px;background:#241539;border:1px solid rgba(255,255,255,.14);font-family:"Hind Siliguri",system-ui,sans-serif}' +
      '.kh-lang-foot .kh-lf-lbl{display:inline-flex;align-items:center;gap:6px;color:#e4dafa;font-size:13px;font-weight:600}' +
      '.kh-lang-foot .kh-lf-btns{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}' +
      '.kh-lang-foot button{border:1px solid rgba(255,255,255,.28);background:transparent;color:#fff;font:600 13.5px "Hind Siliguri",system-ui,sans-serif;padding:7px 14px;border-radius:999px;cursor:pointer;min-height:36px;line-height:1.1}' +
      '.kh-lang-foot button:hover{background:rgba(255,255,255,.08)}' +
      '.kh-lang-foot button.active{background:#f08c28;border-color:#f08c28;color:#160d26}';
    var st = document.createElement('style');
    st.id = 'khI18nCss';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ফুটারে তিন ভাষার বাছাই — কেবল <body data-kh-lang-foot="on"> পাতায় (এখন শুধু হোম পেজ;
     ব্যবহারকারীর সিদ্ধান্ত, ১ নভেম্বর ২০২৬: বাকি পাতার ফুটারে আর আলাদা ভাষা-বাছাই নয়) */
  function mountFooter() {
    if (document.body.getAttribute('data-kh-lang-foot') !== 'on') return;
    var f = document.querySelector('footer, .footer, .site-footer');
    if (!f || f.querySelector('.kh-lang-foot')) return;
    var w = document.createElement('div');
    w.className = 'kh-lang-foot';
    w.setAttribute('role', 'group');
    w.setAttribute('aria-label', 'Language · ভাষা · اللغة');
    w.setAttribute('data-no-i18n', '');
    w.innerHTML = '<span class="kh-lf-lbl"><i class="ti ti-world" aria-hidden="true"></i> Language · ভাষা · <span lang="ar">اللغة</span></span>' +
      '<div class="kh-lf-btns"><button type="button" data-lang-set="en" lang="en">English</button>' +
      '<button type="button" data-lang-set="bn" lang="bn">বাংলা</button>' +
      '<button type="button" data-lang-set="ar" lang="ar">العربية</button></div>';
    var bottom = f.querySelector('.footer-bottom, .ft-bottom, .footer-bot, .copyright, .ft-copy');
    if (bottom && bottom.parentNode) bottom.parentNode.insertBefore(w, bottom);
    else f.appendChild(w);
  }

  /* JS থেকে লেখা বানানোর সময়: KHI18N.t('বাংলা লেখা') → বর্তমান ভাষায় অনুবাদ (না থাকলে মূল লেখা);
     KHI18N.pick({bn, en, ar}) → বর্তমান ভাষারটি (আরবি না থাকলে ইংরেজি) */
  function t(s) {
    var m = lookup(norm(s));
    return m ? txt(m) : (eff() === 'bn' ? s : toAscii(s));
  }
  function pick(o) {
    o = o || {};
    var L = eff();
    if (L === 'ar') return o.ar || o.en || o.bn || '';
    if (L === 'bn') return o.bn || o.en || '';
    return o.en || o.bn || '';
  }

  function init() {
    mountStyle();
    mountFooter();
    addArButtons();
    document.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-lang-set]') : null;
      if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang-set')); }
    });
    scan(document.body);
    paintTitle();
    syncButtons();
    mo.observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    if (lang === 'ar' && pageHasAr()) loadAr(repaint);
  }

  window.KHI18N = {
    getLang: function () { return eff(); },      /* যা দেখানো হচ্ছে: 'en' | 'bn' | 'ar' */
    getPref: function () { return lang; },       /* যা বাছা হয়েছে */
    setLang: setLang, scan: scan, t: t, pick: pick
  };
  /* পুরোনো index.html-এর onclick="setLang('en',this)" টিকিয়ে রাখা */
  window.setLang = function (l) { setLang(l); };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
