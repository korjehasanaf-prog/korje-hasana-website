/* ══════════════════════════════════════════════════════════
   কর্জে হাসানা ফাউন্ডেশন — NID OCR ইঞ্জিন v2  (kh-ocr.js)
   ব্রাউজারেই চলে · কোনো সার্ভার/API কি লাগে না · সম্পূর্ণ গোপনীয়

   v2-তে যা উন্নত হয়েছে (বিশেষত বাংলা পিতা/মাতার নাম):
     ১. তথ্য-এলাকা (ROI) আলাদা করে পড়া — কার্ডের ডানে ছবি/QR নয়েজ তৈরি করত
     ২. বাংলার জন্য আলাদা পাস (`ben` একা) — ben+eng মিশ্রণে বাংলা খারাপ আসে
     ৩. ৫টি প্রি-প্রসেসড সংস্করণ (ধূসর/Sauvola/কড়া/নরম/উঁচু রেজল্যুশন)
     ৪. লেবেল খোঁজা fuzzy — OCR "পিতা"-কে "পিভা/গিতা/পিতাঃ" বানালেও ধরা পড়ে
     ৫. লেবেল একেবারেই না পেলে NID-এর সাধারণ লাইন-ক্রম থেকে অনুমান
     ৬. একাধিক পাসের ফল **ভোটিং** করে সবচেয়ে বিশ্বাসযোগ্য মান বাছাই
     ৭. বাংলা নাম পরিষ্কারকরণ — লেবেলের অবশিষ্ট, ইংরেজি অক্ষর, বিরামচিহ্ন বাদ

   ব্যবহার:
     const r = await KHOCR.readNID(file, { onProgress: p => ... });
     r → { fields:{nid,dob,name_en,name_bn,father,mother,blood,address},
           confidence, text, passes:[...], preview }
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KHOCR = {};
  var TESS_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

  var _tessPromise = null;
  function loadTesseract() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (_tessPromise) return _tessPromise;
    _tessPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = TESS_CDN;
      s.onload = function () { res(window.Tesseract); };
      s.onerror = function () { rej(new Error('OCR ইঞ্জিন লোড করা যায়নি')); };
      document.head.appendChild(s);
    });
    return _tessPromise;
  }

  /* ══════════════════════════════════════════════════════
     ছবি প্রস্তুতি
     ══════════════════════════════════════════════════════ */

  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('ছবিটি পড়া যায়নি')); };
      im.src = url;
    });
  }

  /* ধাপে ধাপে রিসাইজ — এক লাফে বড় করলে ঝাপসা হয় */
  function smartResize(img, targetLong) {
    var w = img.width, h = img.height;
    var scale = targetLong / Math.max(w, h);
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d', { willReadFrequently: true });

    if (scale <= 1) {
      cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      return cv;
    }
    var src = img, cw = w, ch = h;
    while (cw * 1.6 < targetLong * (w >= h ? 1 : w / h)) {
      var tmp = document.createElement('canvas');
      tmp.width = Math.round(cw * 1.6); tmp.height = Math.round(ch * 1.6);
      var tctx = tmp.getContext('2d');
      tctx.imageSmoothingEnabled = true; tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(src, 0, 0, tmp.width, tmp.height);
      src = tmp; cw = tmp.width; ch = tmp.height;
    }
    cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    return cv;
  }

  /* ছবির একটি অংশ কেটে নতুন canvas */
  function cropCanvas(cv, x0, y0, x1, y1) {
    var w = Math.max(1, Math.round((x1 - x0) * cv.width));
    var h = Math.max(1, Math.round((y1 - y0) * cv.height));
    var out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').drawImage(cv,
      Math.round(x0 * cv.width), Math.round(y0 * cv.height),
      w, h, 0, 0, w, h);
    return out;
  }

  function toGray(cv) {
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var d = ctx.getImageData(0, 0, cv.width, cv.height);
    var px = d.data, gray = new Float32Array(cv.width * cv.height);
    for (var i = 0, j = 0; i < px.length; i += 4, j++) {
      gray[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }
    return { gray: gray, w: cv.width, h: cv.height };
  }

  function stretch(gray, lowP, highP, gamma) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < gray.length; i++) hist[gray[i] | 0]++;
    var total = gray.length, acc = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= total * lowP) { lo = i; break; } }
    acc = 0;
    for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= total * highP) { hi = i; break; } }
    if (hi <= lo) { lo = 0; hi = 255; }
    var inv = 1 / (hi - lo);
    for (i = 0; i < gray.length; i++) {
      var v = (gray[i] - lo) * inv;
      v = v < 0 ? 0 : (v > 1 ? 1 : v);
      if (gamma && gamma !== 1) v = Math.pow(v, gamma);
      gray[i] = v * 255;
    }
    return gray;
  }

  function unsharp(gray, w, h, amount) {
    var blur = new Float32Array(gray.length), x, y, dx, dy, sum, c;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        sum = 0; c = 0;
        for (dy = -1; dy <= 1; dy++) {
          var yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (dx = -1; dx <= 1; dx++) {
            var xx = x + dx; if (xx < 0 || xx >= w) continue;
            sum += gray[yy * w + xx]; c++;
          }
        }
        blur[y * w + x] = sum / c;
      }
    }
    for (var i = 0; i < gray.length; i++) {
      var v = gray[i] + amount * (gray[i] - blur[i]);
      gray[i] = v < 0 ? 0 : (v > 255 ? 255 : v);
    }
    return gray;
  }

  /* Sauvola অভিযোজিত থ্রেশহোল্ড (সমতল-এলাকা গার্ডসহ) */
  function sauvola(gray, w, h, win, k) {
    win = win || Math.max(15, Math.round(Math.min(w, h) / 28) | 1);
    if (win % 2 === 0) win++;
    k = k == null ? 0.34 : k;

    var I = new Float64Array((w + 1) * (h + 1)), I2 = new Float64Array((w + 1) * (h + 1)), x, y;
    for (y = 1; y <= h; y++) {
      var rs = 0, rs2 = 0;
      for (x = 1; x <= w; x++) {
        var g = gray[(y - 1) * w + (x - 1)];
        rs += g; rs2 += g * g;
        I[y * (w + 1) + x]  = I[(y - 1) * (w + 1) + x]  + rs;
        I2[y * (w + 1) + x] = I2[(y - 1) * (w + 1) + x] + rs2;
      }
    }
    var out = new Uint8ClampedArray(gray.length), r = win >> 1, R = 128, MIN_STD = 9;
    for (y = 0; y < h; y++) {
      var y1 = Math.max(0, y - r), y2 = Math.min(h - 1, y + r);
      for (x = 0; x < w; x++) {
        var x1 = Math.max(0, x - r), x2 = Math.min(w - 1, x + r);
        var area = (x2 - x1 + 1) * (y2 - y1 + 1);
        var a = I[(y2 + 1) * (w + 1) + (x2 + 1)] - I[y1 * (w + 1) + (x2 + 1)]
              - I[(y2 + 1) * (w + 1) + x1] + I[y1 * (w + 1) + x1];
        var b = I2[(y2 + 1) * (w + 1) + (x2 + 1)] - I2[y1 * (w + 1) + (x2 + 1)]
              - I2[(y2 + 1) * (w + 1) + x1] + I2[y1 * (w + 1) + x1];
        var mean = a / area, varr = b / area - mean * mean;
        var std = varr > 0 ? Math.sqrt(varr) : 0, gg = gray[y * w + x];
        if (std < MIN_STD) out[y * w + x] = mean >= 110 ? 255 : (gg > mean ? 255 : 0);
        else {
          var t = mean * (1 + k * (std / R - 1));
          out[y * w + x] = gg > t ? 255 : 0;
        }
      }
    }
    return out;
  }

  function toCanvas(gray, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var d = ctx.createImageData(w, h), px = d.data;
    for (var i = 0, j = 0; j < gray.length; j++, i += 4) {
      px[i] = px[i + 1] = px[i + 2] = gray[j]; px[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return cv;
  }

  /* এক ছবির কয়েকটি প্রস্তুত সংস্করণ */
  function variants(baseCanvas) {
    var g = toGray(baseCanvas), w = g.w, h = g.h;

    var soft = stretch(Float32Array.from(g.gray), 0.02, 0.02, 0.95);
    soft = unsharp(soft, w, h, 0.8);

    var mid = stretch(Float32Array.from(g.gray), 0.01, 0.01, 1);
    mid = unsharp(mid, w, h, 0.5);
    var binMid = sauvola(mid, w, h, 0, 0.34);

    var hard = stretch(Float32Array.from(g.gray), 0.05, 0.05, 1.2);
    hard = unsharp(hard, w, h, 1.4);
    var binHard = sauvola(hard, w, h, 0, 0.22);

    return {
      gray: toCanvas(soft, w, h),
      bin:  toCanvas(binMid, w, h),
      hard: toCanvas(binHard, w, h)
    };
  }

  KHOCR.prepare = function (img) {
    /* পুরো কার্ড — বড় রেজল্যুশনে */
    var full = smartResize(img, 2400);
    var fullV = variants(full);

    /* তথ্য-এলাকা: বাংলাদেশি NID-এ ছবি বাম দিকে, লেখা ডান দিকে থাকে।
       তাই দুই দিকের ROI-ই আলাদা করে পড়া হয় — যেটিতে ভালো ফল, সেটি জেতে। */
    var roiRight = cropCanvas(full, 0.30, 0.10, 1.00, 0.98);   // সাধারণ বিন্যাস
    var roiLeft  = cropCanvas(full, 0.00, 0.10, 0.72, 0.98);   // উল্টো বিন্যাস
    var rV = variants(smartResize(roiRight, 2000));
    var lV = variants(smartResize(roiLeft, 2000));

    return { full: full, fullV: fullV, roiR: rV, roiL: lV };
  };

  /* ══════════════════════════════════════════════════════
     তথ্য বের করা
     ══════════════════════════════════════════════════════ */

  var BN_D = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
  function enDigits(s) { return String(s || '').replace(/[০-৯]/g, function (d) { return BN_D[d]; }); }
  function tidy(s) { return String(s || '').replace(/[|_~`^*]/g, ' ').replace(/\s+/g, ' ').trim(); }

  function fixDigits(s) {
    return String(s || '')
      .replace(/[Oo০]/g, '0').replace(/[lI|]/g, '1').replace(/[Ss]/g, '5')
      .replace(/[Bb]/g, '8').replace(/[Zz]/g, '2').replace(/[Gg]/g, '6')
      .replace(/[^\d]/g, '');
  }

  /* বাংলা নাম পরিষ্কার — লেবেলের অবশিষ্ট, ইংরেজি, চিহ্ন বাদ */
  var BN_STOP = /(পিতা|মাতা|জন্ম|তারিখ|নাম|ঠিকানা|রক্ত|গ্রুপ|স্বাক্ষর|নম্বর|পরিচয়|Name|Father|Mother|Date|Birth|ID|NO|Blood)/g;
  function cleanBn(s) {
    var t = String(s || '').split(/[\r\n]/)[0];
    t = t.replace(/[:;.,\-–—()\[\]{}<>=+/\\"'`|]/g, ' ');
    t = t.replace(BN_STOP, ' ');
    t = t.replace(/[^ঀ-৿\s]/g, ' ');         /* শুধু বাংলা অক্ষর */
    t = t.replace(/\s+/g, ' ').trim();
    /* একক অক্ষর/মাত্রা-চিহ্নের আবর্জনা ছাঁটা */
    t = t.split(' ').filter(function (w) { return w.length >= 2; }).join(' ');
    return t;
  }
  function cleanEn(s) {
    var t = String(s || '').split(/[\r\n]/)[0];
    t = t.replace(BN_STOP, ' ').replace(/[^A-Za-z.\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
  }

  /* ── fuzzy বাংলা লেবেল (কঠোর) ──
     OCR "পিতা"-কে "পিভা/গিতা/পিতাঃ" বানাতে পারে, তাই ক্রমিক সাদৃশ্য
     (edit distance) মাপা হয় — অক্ষর-উপস্থিতি নয়। এতে "মোঃ" লাইনকে
     ভুল করে "মাতা" ভাবার সমস্যা আর হয় না।                          */
  function editDist(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    var prev = new Array(n + 1), cur = new Array(n + 1), i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      for (j = 0; j <= n; j++) prev[j] = cur[j];
    }
    return prev[n];
  }
  function labelScore(word, target) {
    /* শেষের বিসর্গ/কোলন লেবেলের অংশ নয় — "পিতাঃ" = "পিতা" */
    var w = String(word || '').replace(/[ঃ:।\s]+$/, '').replace(/[^ঀ-৿A-Za-z]/g, '');
    if (!w) return 0;
    /* লেবেল ছোট শব্দ — অনেক লম্বা হলে সেটি লেবেল নয় */
    if (w.length > target.length + 3) return 0;
    var d = editDist(w, target);
    return 1 - d / Math.max(w.length, target.length);
  }

  /* বাংলাদেশি NID-এর ছাপা শিরোনাম ও অপ্রয়োজনীয় লাইন */
  function isJunkLine(line) {
    return /গণপ্রজাতন্ত্রী|বাংলাদেশ\s*সরকার|জাতীয়\s*পরিচয়|পরিচয়\s*পত্র|NATIONAL|GOVERNMENT|REPUBLIC|BANGLADESH|IDENTITY|CARD|PEOPLE/i.test(line);
  }

  /* লাইনের শুরুতে লেবেল থাকলে বাকিটুকু ফেরত দেয়।
     একই লাইনে সব লেবেল পরীক্ষা করে **সবচেয়ে ভালো মিল** বেছে নেওয়া হয়,
     যাতে "নাম" লেবেল "মাতা"-র লাইন দখল করতে না পারে।               */
  var LABELS = {
    name:   ['নাম'],
    father: ['পিতা', 'পিতার', 'পিতারনাম'],
    mother: ['মাতা', 'মাতার', 'মাতারনাম']
  };

  function labelOfLine(line) {
    var t = tidy(line);
    if (!t || isJunkLine(t)) return null;
    /* ঃ (বিসর্গ) দিয়ে ভাঙা হয় না — নাহলে "মোঃ" নামটাই কেটে যায়।
       লেবেল মেলানোর সময় শেষের ঃ/: আপনাআপনি উপেক্ষিত হয়।            */
    var parts = t.split(/[\s:।\-]+/).filter(Boolean);
    if (!parts.length) return null;

    var best = null;
    Object.keys(LABELS).forEach(function (key) {
      LABELS[key].forEach(function (target) {
        for (var take = 1; take <= Math.min(2, parts.length); take++) {
          var head = parts.slice(0, take).join('');
          var sc = labelScore(head, target);
          if (sc >= 0.6 && (!best || sc > best.score)) {
            best = { key: key, score: sc, take: take, rest: parts.slice(take).join(' ') };
          }
        }
      });
    });
    return best;
  }

  KHOCR.extract = function (rawText) {
    var text = String(rawText || '');
    var en = enDigits(text);
    var lines = text.split(/\r?\n/).map(tidy).filter(function (l) { return l.length > 1; });
    var out = {};

    /* ── এনআইডি নম্বর ── */
    var nid = null;
    var lab = en.match(/(?:ID\s*(?:NO|NUMBER)?|NID(?:\s*No)?|জাতীয়\s*পরিচয়|পরিচয়পত্র\s*ন[ংম]?ব?র?|আইডি\s*ন[ংম])\s*[:.\-]?\s*([0-9OoIlSBZG][0-9OoIlSBZG\s]{8,24})/i);
    if (lab) {
      var c = fixDigits(lab[1]);
      if (/^\d{10}$|^\d{13}$|^\d{17}$/.test(c)) nid = c;
      else if (c.length >= 10) nid = c.slice(0, c.length >= 17 ? 17 : (c.length >= 13 ? 13 : 10));
    }
    if (!nid) {
      var best = null;
      (en.replace(/[^\d\s]/g, ' ').match(/\b\d[\d\s]{8,20}\d\b/g) || []).forEach(function (m) {
        var d = m.replace(/\s/g, '');
        if (d.length === 17 || d.length === 13 || d.length === 10) {
          if (!best || d.length > best.length) best = d;
        }
      });
      nid = best;
    }
    if (nid) out.nid = nid;

    /* ── জন্ম তারিখ ── */
    var dob = null;
    var m1 = en.match(/(?:Date\s*of\s*Birth|Birth|জন্ম\s*তারিখ|জন্ম)[^\S\r\n]*[:.\-]?[^\S\r\n]*(\d{1,2}[^\S\r\n]*[-\/ ][^\S\r\n]*[A-Za-z]{3,9}[^\S\r\n]*[-\/ ][^\S\r\n]*\d{4}|\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{4}|\d{4}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}|\d{1,2}[^\S\r\n]+[A-Za-z]{3,9}[^\S\r\n]+\d{4})/i);
    if (m1) dob = tidy(m1[1]);
    if (!dob) {
      var BN_M = 'জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর';
      var mb = en.match(new RegExp('(\\d{1,2})[^\\S\\r\\n]*(' + BN_M + ')[^\\S\\r\\n]*(\\d{4})'));
      if (mb) dob = mb[1] + ' ' + mb[2] + ' ' + mb[3];
    }
    if (!dob) {
      var m2 = en.match(/\b(\d{1,2}[^\S\r\n]*[A-Za-z]{3,9}[^\S\r\n]*\d{4})\b/);
      if (m2) dob = tidy(m2[1]);
    }
    if (dob) out.dob = dob.replace(/\s*([-\/])\s*/g, '$1');

    /* ── ইংরেজি নাম ── */
    var mEn = text.match(/\bName[^\S\r\n]*[:.\-]?[^\S\r\n]*([A-Z][^\r\n]{2,48})/);
    if (mEn) {
      var nm = cleanEn(mEn[1]);
      if (nm.length >= 3) out.name_en = nm;
    }
    if (!out.name_en) {
      for (var i = 0; i < lines.length; i++) {
        if (/^[A-Z][A-Z\s.]{5,40}$/.test(lines[i]) &&
            !/BANGLADESH|GOVERNMENT|NATIONAL|IDENTITY|CARD|REPUBLIC|PEOPLE/i.test(lines[i])) {
          out.name_en = cleanEn(lines[i]); break;
        }
      }
    }

    /* ── বাংলা: নাম · পিতা · মাতা ──
       প্রতিটি লাইনে কোন লেবেল সবচেয়ে ভালো মেলে তা ঠিক করে নেওয়া হয়;
       লেবেলের পরে কিছু না থাকলে পরের লাইনটিই মান (দুই লাইনের বিন্যাস)। */
    for (var li = 0; li < lines.length; li++) {
      var lab = labelOfLine(lines[li]);
      if (!lab) continue;

      var val = cleanBn(lab.rest);
      if ((!val || val.length < 3) && lines[li + 1] && !labelOfLine(lines[li + 1])) {
        val = cleanBn(lines[li + 1]);          /* লেবেল একা লাইনে → পরের লাইন */
      }
      if (!val || val.length < 3) continue;

      if (lab.key === 'father' && !out.father) out.father = val;
      else if (lab.key === 'mother' && !out.mother) out.mother = val;
      else if (lab.key === 'name' && !out.name_bn) out.name_bn = val;
    }

    /* ধাপ ২: লেবেল একেবারেই না পেলে — NID-এর সাধারণ ক্রম:
       (বাংলা নাম) → পিতা → মাতা                                      */
    if (!out.father || !out.mother || !out.name_bn) {
      var bnLines = [];
      lines.forEach(function (ln) {
        if (isJunkLine(ln)) return;
        if (labelOfLine(ln)) return;                  /* লেবেল-লাইন বাদ */
        if (/[A-Za-z]{4,}/.test(ln)) return;          /* ইংরেজি লাইন বাদ */
        var c = cleanBn(ln);
        if (c && c.length >= 4) bnLines.push(c);
      });
      var used = [out.name_bn, out.father, out.mother].filter(Boolean);
      var free = bnLines.filter(function (t) { return used.indexOf(t) === -1; });
      if (!out.name_bn && free.length) out.name_bn = free.shift();
      if (!out.father  && free.length) out.father  = free.shift();
      if (!out.mother  && free.length) out.mother  = free.shift();
    }

    /* একই মান দুই ফিল্ডে বসে গেলে (ভুল ম্যাচ) — পরেরটি বাদ */
    if (out.father && out.father === out.name_bn) delete out.father;
    if (out.mother && (out.mother === out.name_bn || out.mother === out.father)) delete out.mother;

    /* ── রক্তের গ্রুপ ── */
    var mB = text.match(/(?:Blood(?:\s*Group)?|রক্তের\s*গ্রুপ)\s*[:.\-]?\s*(AB|A|B|O)\s*([+\-]|POS|NEG|পজিটিভ|নেগেটিভ)?/i);
    if (mB) out.blood = mB[1].toUpperCase() + (/-|NEG|নেগেটিভ/i.test(mB[2] || '') ? '-' : '+');

    /* ── ঠিকানা (পিছনের পাতায় থাকে) ── */
    var mA = text.match(/(?:ঠিকানা|Address)\s*[:.\-]?\s*([^\r\n]{6,120})/);
    if (mA) {
      var ad = tidy(mA[1]).replace(/[|]/g, ' ');
      if (ad.length >= 6) out.address = ad;
    }

    return out;
  };

  /* একই ফিল্ডের নানা পাসের ফল থেকে সেরাটি বাছাই (ভোটিং) */
  function vote(list) {
    var bag = {}, norm = {};
    list.filter(Boolean).forEach(function (v) {
      var key = String(v).replace(/\s+/g, '');
      bag[key] = (bag[key] || 0) + 1;
      if (!norm[key] || String(v).length > norm[key].length) norm[key] = String(v);
    });
    var bestKey = null, bestScore = -1;
    Object.keys(bag).forEach(function (k) {
      /* বেশি বার আসা + যুক্তিসঙ্গত দৈর্ঘ্য = ভালো */
      var s = bag[k] * 10 + Math.min(norm[k].length, 30);
      if (s > bestScore) { bestScore = s; bestKey = k; }
    });
    return bestKey ? norm[bestKey] : null;
  }

  function scoreFields(f, conf) {
    var s = conf || 0;
    if (f.nid)     s += f.nid.length >= 13 ? 45 : 30;
    if (f.dob)     s += 18;
    if (f.name_en) s += 12;
    if (f.name_bn) s += 14;
    if (f.father)  s += 12;
    if (f.mother)  s += 12;
    return s;
  }

  /* ══════════════════════════════════════════════════════
     মূল ফাংশন — বহু পাস, তারপর ভোটিং
     ══════════════════════════════════════════════════════ */

  KHOCR.readNID = async function (file, opts) {
    opts = opts || {};
    var report = function (pct, msg) {
      if (typeof opts.onProgress === 'function') opts.onProgress(Math.max(0, Math.min(100, pct)), msg);
    };

    report(3, 'ছবি প্রস্তুত করা হচ্ছে…');
    var img = await loadImage(file);
    var prep = KHOCR.prepare(img);

    report(12, 'OCR ইঞ্জিন লোড হচ্ছে…');
    var T = await loadTesseract();

    /* বাংলার জন্য আলাদা পাস (ben একা) — মিশ্রণে বাংলা খারাপ আসে */
    var passes = [
      { key: 'ben-roiR', canvas: prep.roiR.gray, lang: 'ben', psm: '6', label: 'বাংলা (তথ্য এলাকা)' },
      { key: 'ben-roiR2', canvas: prep.roiR.bin, lang: 'ben', psm: '4', label: 'বাংলা (বাইনারি)' },
      { key: 'ben-roiL', canvas: prep.roiL.gray, lang: 'ben', psm: '6', label: 'বাংলা (বিকল্প এলাকা)' },
      { key: 'eng-full', canvas: prep.fullV.bin, lang: 'eng', psm: '6', label: 'ইংরেজি ও সংখ্যা' },
      { key: 'eng-hard', canvas: prep.fullV.hard, lang: 'eng', psm: '4', label: 'ইংরেজি (কড়া)' },
      { key: 'mix-full', canvas: prep.fullV.gray, lang: 'ben+eng', psm: '6', label: 'মিশ্র যাচাই' }
    ];

    var results = [], all = [], bestText = '', bestScore = -1, totalConf = 0, done = 0;

    for (var i = 0; i < passes.length; i++) {
      var p = passes[i];
      var span = 84 / passes.length, base = 14 + i * span;
      report(base, p.label + ' পড়া হচ্ছে…');

      var worker = null;
      try {
        worker = await T.createWorker(p.lang, 1, {
          logger: function (m) {
            if (m && m.status === 'recognizing text') {
              report(base + span * (m.progress || 0) * 0.9, p.label + ' পড়া হচ্ছে…');
            }
          }
        });
        await worker.setParameters({
          tessedit_pageseg_mode: p.psm,
          preserve_interword_spaces: '1',
          user_defined_dpi: '300'
        });
        var o = await worker.recognize(p.canvas);
        var txt = (o && o.data && o.data.text) || '';
        var conf = (o && o.data && o.data.confidence) || 0;
        var f = KHOCR.extract(txt);
        var sc = scoreFields(f, conf);

        /* বাংলা পাস থেকে শুধু বাংলা ফিল্ড, ইংরেজি পাস থেকে সংখ্যা/ইংরেজি — মেশানো নয় */
        if (p.lang === 'ben') { delete f.nid; delete f.name_en; }
        if (p.lang === 'eng') { delete f.name_bn; delete f.father; delete f.mother; }

        all.push(f);
        results.push({ key: p.key, label: p.label, conf: Math.round(conf), score: Math.round(sc), fields: f });
        totalConf += conf; done++;
        if (sc > bestScore) { bestScore = sc; bestText = txt; }
      } catch (e) {
        results.push({ key: p.key, label: p.label, error: String((e && e.message) || e) });
      } finally {
        if (worker) { try { await worker.terminate(); } catch (e2) {} }
      }
    }

    report(97, 'ফলাফল মিলিয়ে দেখা হচ্ছে…');

    /* ভোটিং — প্রতিটি ফিল্ডে সবচেয়ে বিশ্বাসযোগ্য মান */
    var merged = {};
    ['nid', 'dob', 'name_en', 'name_bn', 'father', 'mother', 'blood', 'address'].forEach(function (k) {
      var vals = all.map(function (f) { return f[k]; });
      var v = vote(vals);
      if (v) merged[k] = v;
    });

    /* NID সবচেয়ে লম্বা/বৈধটাই রাখা */
    var nids = all.map(function (f) { return f.nid; }).filter(Boolean);
    if (nids.length) {
      nids.sort(function (a, b) { return b.length - a.length; });
      merged.nid = nids[0];
    }

    var got = ['nid', 'dob', 'name_bn', 'father', 'mother'].filter(function (k) { return !!merged[k]; }).length;
    var confidence = Math.round(Math.min(99, (done ? totalConf / done : 0) * 0.5 + got * 10));

    report(100, 'সম্পন্ন');
    return {
      fields: merged,
      confidence: confidence,
      text: bestText,
      passes: results,
      preview: prep.fullV.bin.toDataURL('image/jpeg', 0.7)
    };
  };

  KHOCR.validNID = function (v) {
    var d = enDigits(v || '').replace(/\D/g, '');
    return d.length === 10 || d.length === 13 || d.length === 17;
  };
  KHOCR.enDigits = enDigits;
  KHOCR.cleanBn = cleanBn;

  window.KHOCR = KHOCR;
})();
