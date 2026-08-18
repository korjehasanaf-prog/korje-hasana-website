/* ══════════════════════════════════════════════════════════
   কর্জে হাসানা ফাউন্ডেশন — NID OCR ইঞ্জিন  (kh-ocr.js)
   ব্রাউজারেই চলে · কোনো সার্ভার/API কি লাগে না · সম্পূর্ণ গোপনীয়
   (ছবি কোথাও আপলোড হয় না — শুধু ব্যবহারকারীর ডিভাইসে পড়া হয়)

   ব্যবহার:
     const r = await KHOCR.readNID(file, { onProgress: p => ... });
     r → { fields:{nid,dob,name_en,name_bn,father,mother,blood},
           confidence, text, passes:[...], preview:dataURL }

   কৌশল (সর্বোচ্চ মান পেতে বহু-ধাপ):
     ১. স্মার্ট আপস্কেল (লম্বা দিক ২২০০px পর্যন্ত, Lanczos-সদৃশ ধাপে ধাপে)
     ২. ধূসর + পার্সেন্টাইল কনট্রাস্ট স্ট্রেচ + গামা
     ৩. আনশার্প মাস্ক (ঝাপসা লেখা ধারালো করা)
     ৪. Sauvola অভিযোজিত থ্রেশহোল্ড (আলো-ছায়া সামলায়)
     ৫. Tesseract বহু-পাস: (ক) ইংরেজি PSM6 (খ) ইংরেজি PSM4
        (গ) বাংলা+ইংরেজি PSM6 — প্রতিটি ভিন্ন প্রি-প্রসেসড ছবিতে
     ৬. ফলাফল একত্র করে সর্বোচ্চ আস্থার মান বেছে নেওয়া
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KHOCR = {};
  var TESS_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

  /* ── লাইব্রেরি একবারই লোড ── */
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

  /* ধাপে ধাপে রিসাইজ — এক লাফে বড় করলে ঝাপসা হয়, ধাপে করলে ধারালো থাকে */
  function smartResize(img, targetLong) {
    var w = img.width, h = img.height;
    var long = Math.max(w, h);
    var scale = targetLong / long;
    var cv = document.createElement('canvas');
    var ctx = cv.getContext('2d', { willReadFrequently: true });

    if (scale <= 1) {                       /* ছোট করা — এক ধাপে যথেষ্ট */
      cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      return cv;
    }

    /* বড় করা — প্রতি ধাপে সর্বোচ্চ ১.৬ গুণ */
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

  function toGrayData(cv) {
    var ctx = cv.getContext('2d', { willReadFrequently: true });
    var d = ctx.getImageData(0, 0, cv.width, cv.height);
    var px = d.data, gray = new Float32Array(cv.width * cv.height);
    for (var i = 0, j = 0; i < px.length; i += 4, j++) {
      /* চোখের সংবেদনশীলতা অনুযায়ী ওজন */
      gray[j] = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    }
    return { gray: gray, w: cv.width, h: cv.height, imageData: d };
  }

  /* পার্সেন্টাইল কনট্রাস্ট স্ট্রেচ — ছায়া/ঝলক থাকলেও লেখা ফুটে ওঠে */
  function stretch(gray, lowP, highP, gamma) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < gray.length; i++) hist[gray[i] | 0]++;
    var total = gray.length, lowCount = total * lowP, highCount = total * highP;
    var acc = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc >= lowCount) { lo = i; break; } }
    acc = 0;
    for (i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= highCount) { hi = i; break; } }
    if (hi <= lo) { lo = 0; hi = 255; }
    var range = hi - lo, inv = 1 / range;
    for (i = 0; i < gray.length; i++) {
      var v = (gray[i] - lo) * inv;
      v = v < 0 ? 0 : (v > 1 ? 1 : v);
      if (gamma && gamma !== 1) v = Math.pow(v, gamma);
      gray[i] = v * 255;
    }
    return gray;
  }

  /* আনশার্প মাস্ক (৩x৩ বক্স ব্লার থেকে) */
  function unsharp(gray, w, h, amount) {
    var blur = new Float32Array(gray.length);
    var x, y, idx, sum, c;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        sum = 0; c = 0;
        for (var dy = -1; dy <= 1; dy++) {
          var yy = y + dy; if (yy < 0 || yy >= h) continue;
          for (var dx = -1; dx <= 1; dx++) {
            var xx = x + dx; if (xx < 0 || xx >= w) continue;
            sum += gray[yy * w + xx]; c++;
          }
        }
        blur[y * w + x] = sum / c;
      }
    }
    for (idx = 0; idx < gray.length; idx++) {
      var v = gray[idx] + amount * (gray[idx] - blur[idx]);
      gray[idx] = v < 0 ? 0 : (v > 255 ? 255 : v);
    }
    return gray;
  }

  /* Sauvola অভিযোজিত থ্রেশহোল্ড — ইন্টিগ্রাল ইমেজ দিয়ে দ্রুত */
  function sauvola(gray, w, h, win, k) {
    win = win || Math.max(15, Math.round(Math.min(w, h) / 28) | 1);
    if (win % 2 === 0) win++;
    k = k == null ? 0.34 : k;

    var n = (w + 1) * (h + 1);
    var I = new Float64Array(n), I2 = new Float64Array(n);
    var x, y, i;
    for (y = 1; y <= h; y++) {
      var rs = 0, rs2 = 0;
      for (x = 1; x <= w; x++) {
        var g = gray[(y - 1) * w + (x - 1)];
        rs += g; rs2 += g * g;
        I[y * (w + 1) + x]  = I[(y - 1) * (w + 1) + x]  + rs;
        I2[y * (w + 1) + x] = I2[(y - 1) * (w + 1) + x] + rs2;
      }
    }
    var out = new Uint8ClampedArray(gray.length);
    var r = win >> 1, R = 128;

    /* সমতল-এলাকা গার্ড: যেখানে স্থানীয় বৈচিত্র্য খুব কম (ফাঁকা কাগজ বা
       নিরেট কালি), সেখানে Sauvola নয়েজকে লেখা ভেবে ফেলে — তাই ঐসব
       জায়গায় গড় মান দেখে সরাসরি সাদা/কালো ধরা হয়।                    */
    var MIN_STD = 9;

    for (y = 0; y < h; y++) {
      var y1 = Math.max(0, y - r), y2 = Math.min(h - 1, y + r);
      for (x = 0; x < w; x++) {
        var x1 = Math.max(0, x - r), x2 = Math.min(w - 1, x + r);
        var area = (x2 - x1 + 1) * (y2 - y1 + 1);
        var a = I[(y2 + 1) * (w + 1) + (x2 + 1)] - I[y1 * (w + 1) + (x2 + 1)]
              - I[(y2 + 1) * (w + 1) + x1] + I[y1 * (w + 1) + x1];
        var b = I2[(y2 + 1) * (w + 1) + (x2 + 1)] - I2[y1 * (w + 1) + (x2 + 1)]
              - I2[(y2 + 1) * (w + 1) + x1] + I2[y1 * (w + 1) + x1];
        var mean = a / area;
        var varr = b / area - mean * mean;
        var std = varr > 0 ? Math.sqrt(varr) : 0;
        var g = gray[y * w + x];

        if (std < MIN_STD) {
          out[y * w + x] = mean >= 110 ? 255 : (g > mean ? 255 : 0);
        } else {
          var t = mean * (1 + k * (std / R - 1));
          out[y * w + x] = g > t ? 255 : 0;
        }
      }
    }
    return out;
  }

  function grayToCanvas(gray, w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    var d = ctx.createImageData(w, h), px = d.data;
    for (var i = 0, j = 0; j < gray.length; j++, i += 4) {
      var v = gray[j];
      px[i] = px[i + 1] = px[i + 2] = v; px[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    return cv;
  }

  /* তিন রকম প্রি-প্রসেসড সংস্করণ — একেকটা একেক অবস্থায় ভালো কাজ করে */
  KHOCR.prepare = function (img) {
    var base = smartResize(img, 2200);
    var g0 = toGrayData(base);

    /* A · কনট্রাস্ট + শার্প (ধূসর) — ছাপা লেখা ও বাংলা যুক্তাক্ষরে ভালো */
    var a = stretch(Float32Array.from(g0.gray), 0.02, 0.02, 0.95);
    a = unsharp(a, g0.w, g0.h, 0.9);
    var cvA = grayToCanvas(a, g0.w, g0.h);

    /* B · Sauvola বাইনারি — আলো-ছায়া/ছবি তোলা কার্ডে সবচেয়ে ভালো */
    var b = stretch(Float32Array.from(g0.gray), 0.01, 0.01, 1);
    b = unsharp(b, g0.w, g0.h, 0.6);
    var bin = sauvola(b, g0.w, g0.h, 0, 0.34);
    var cvB = grayToCanvas(bin, g0.w, g0.h);

    /* C · উচ্চ কনট্রাস্ট বাইনারি (কড়া) — ঝাপসা/কম আলোর ছবিতে */
    var c = stretch(Float32Array.from(g0.gray), 0.04, 0.04, 1.15);
    c = unsharp(c, g0.w, g0.h, 1.3);
    var binC = sauvola(c, g0.w, g0.h, 0, 0.22);
    var cvC = grayToCanvas(binC, g0.w, g0.h);

    return { base: base, A: cvA, B: cvB, C: cvC, w: g0.w, h: g0.h };
  };

  /* ══════════════════════════════════════════════════════
     তথ্য বের করা (বাংলাদেশি NID / স্মার্ট কার্ড)
     ══════════════════════════════════════════════════════ */

  var BN_DIGITS = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
  function enDigits(s) {
    return String(s || '').replace(/[০-৯]/g, function (d) { return BN_DIGITS[d]; });
  }
  function clean(s) {
    return String(s || '').replace(/[|_~`]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* OCR-এ প্রায়ই যে অক্ষরগুলো সংখ্যার বদলে আসে */
  function fixDigits(s) {
    return String(s || '')
      .replace(/[Oo]/g, '0').replace(/[lI|]/g, '1')
      .replace(/[Ss]/g, '5').replace(/[Bb]/g, '8')
      .replace(/[Zz]/g, '2').replace(/[Gg]/g, '6')
      .replace(/[^\d]/g, '');
  }

  KHOCR.extract = function (rawText) {
    var text = String(rawText || '');
    var en = enDigits(text);
    var lines = text.split(/\r?\n/).map(clean).filter(Boolean);
    var out = {};

    /* ── এনআইডি নম্বর ── ১০, ১৩ বা ১৭ সংখ্যা */
    var nid = null;
    var labelled = en.match(/(?:ID\s*(?:NO|NUMBER)?|NID(?:\s*No)?|জাতীয়\s*পরিচয়|পরিচয়পত্র\s*নম্বর|আইডি\s*ন[ংম])\s*[:.\-]?\s*([0-9OoIlSBZG][0-9OoIlSBZG\s]{8,24})/i);
    if (labelled) {
      var cand = fixDigits(labelled[1]);
      if (/^\d{10}$|^\d{13}$|^\d{17}$/.test(cand)) nid = cand;
      else if (cand.length >= 10) nid = cand.slice(0, cand.length >= 17 ? 17 : (cand.length >= 13 ? 13 : 10));
    }
    if (!nid) {
      var all = en.replace(/[^\d\s]/g, ' ').match(/\b\d[\d\s]{8,20}\d\b/g) || [];
      var best = null;
      all.forEach(function (m) {
        var d = m.replace(/\s/g, '');
        if (d.length === 17 || d.length === 13 || d.length === 10) {
          if (!best || d.length > best.length) best = d;      /* বড়টাই বেশি নির্ভরযোগ্য */
        }
      });
      nid = best;
    }
    if (nid) out.nid = nid;

    /* ── জন্ম তারিখ ── (ইংরেজি ও বাংলা দুই ধরনের লেখা) */
    var dob = null;
    var m1 = en.match(/(?:Date\s*of\s*Birth|Birth|জন্ম\s*তারিখ)[^\S\r\n]*[:.\-]?[^\S\r\n]*(\d{1,2}[^\S\r\n]*[-\/ ][^\S\r\n]*[A-Za-z]{3,9}[^\S\r\n]*[-\/ ][^\S\r\n]*\d{4}|\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{4}|\d{4}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}[^\S\r\n]*[-\/][^\S\r\n]*\d{1,2}|\d{1,2}[^\S\r\n]+[A-Za-z]{3,9}[^\S\r\n]+\d{4})/i);
    if (m1) dob = clean(m1[1]);

    /* বাংলা মাসের নাম — "১৫ জানুয়ারি ১৯৯৫" */
    if (!dob) {
      var BN_MONTHS = 'জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর';
      var reBn = new RegExp('(\\d{1,2})[^\\S\\r\\n]*(' + BN_MONTHS + ')[^\\S\\r\\n]*(\\d{4})');
      var mBnDate = en.match(reBn);
      if (mBnDate) dob = mBnDate[1] + ' ' + mBnDate[2] + ' ' + mBnDate[3];
    }
    if (!dob) {
      var m2 = en.match(/\b(\d{1,2}[^\S\r\n]*[A-Za-z]{3,9}[^\S\r\n]*\d{4})\b/);
      if (m2) dob = clean(m2[1]);
    }
    if (dob) out.dob = dob.replace(/\s*([-\/])\s*/g, '$1');

    /* পরের লেবেল শুরু হলে নাম সেখানেই থামবে */
    var STOP = /\s*(?:Date\s*of\s*Birth|Birth|Father|Mother|ID\s*NO|NID|Blood|জন্ম|পিতা|মাতা|রক্ত|নাম|Name)\b[\s\S]*$/i;
    function cutName(s) {
      return clean(String(s || '').split(/[\r\n]/)[0]).replace(STOP, '').replace(/[:.\-\s]+$/, '').trim();
    }

    /* ── ইংরেজি নাম ── */
    var mEn = text.match(/\bName[^\S\r\n]*[:.\-]?[^\S\r\n]*([A-Z][^\r\n]{2,48})/);
    if (mEn) {
      var nm = cutName(mEn[1]).replace(/[^A-Za-z.\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (nm.length >= 3) out.name_en = nm;
    }
    if (!out.name_en) {
      /* লেবেল না পেলে: বড় হাতের অক্ষরের লম্বা লাইন সাধারণত নাম */
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i];
        if (/^[A-Z][A-Z\s.]{5,40}$/.test(L) && !/BANGLADESH|GOVERNMENT|NATIONAL|IDENTITY|CARD|REPUBLIC/i.test(L)) {
          out.name_en = clean(L); break;
        }
      }
    }

    /* ── বাংলা নাম / পিতা / মাতা ── (প্রতিটি নিজের লাইনেই সীমিত) */
    var mBn = text.match(/(?:^|[\r\n])[^\S\r\n]*নাম[^\S\r\n]*[:.\-]?[^\S\r\n]*([ঀ-৿][^\r\n]{2,45})/);
    if (mBn) {
      var nb = cutName(mBn[1]).replace(/[^ঀ-৿\s.:]/g, ' ').replace(/\s+/g, ' ').trim();
      if (nb.length >= 2) out.name_bn = nb;
    }

    var mF = text.match(/(?:পিতা|Father(?:'s)?[^\S\r\n]*Name)[^\S\r\n]*[:.\-]?[^\S\r\n]*([ঀ-৿A-Za-z][^\r\n]{2,45})/);
    if (mF) { var fa = cutName(mF[1]); if (fa.length >= 2) out.father = fa; }

    var mM = text.match(/(?:মাতা|Mother(?:'s)?[^\S\r\n]*Name)[^\S\r\n]*[:.\-]?[^\S\r\n]*([ঀ-৿A-Za-z][^\r\n]{2,45})/);
    if (mM) { var mo = cutName(mM[1]); if (mo.length >= 2) out.mother = mo; }

    /* ── রক্তের গ্রুপ ── */
    var mB = text.match(/(?:Blood(?:\s*Group)?|রক্তের\s*গ্রুপ)\s*[:.\-]?\s*(A|B|AB|O)\s*([+\-]|POS|NEG)?/i);
    if (mB) out.blood = (mB[1].toUpperCase() + (/-|NEG/i.test(mB[2] || '') ? '-' : '+'));

    return out;
  };

  /* কোন পাসের ফল ভালো — স্কোর দিয়ে বিচার */
  function scoreResult(fields, conf) {
    var s = conf || 0;
    if (fields.nid)     s += fields.nid.length >= 13 ? 45 : 32;
    if (fields.dob)     s += 18;
    if (fields.name_en) s += 14;
    if (fields.name_bn) s += 14;
    if (fields.father)  s += 6;
    if (fields.mother)  s += 6;
    return s;
  }

  /* ══════════════════════════════════════════════════════
     মূল ফাংশন
     ══════════════════════════════════════════════════════ */

  KHOCR.readNID = async function (file, opts) {
    opts = opts || {};
    var report = function (pct, msg) {
      if (typeof opts.onProgress === 'function') opts.onProgress(Math.max(0, Math.min(100, pct)), msg);
    };

    report(3, 'ছবি প্রস্তুত করা হচ্ছে…');
    var img = await loadImage(file);
    var prep = KHOCR.prepare(img);

    report(15, 'OCR ইঞ্জিন লোড হচ্ছে…');
    var T = await loadTesseract();

    /* তিনটি পাস — ভিন্ন ছবি, ভিন্ন ভাষা/লেআউট */
    var passes = [
      { key: 'A-eng',  canvas: prep.B, lang: 'eng',      psm: '6',  label: 'ইংরেজি (বাইনারি)' },
      { key: 'B-eng4', canvas: prep.A, lang: 'eng',      psm: '4',  label: 'ইংরেজি (ধূসর)' },
      { key: 'C-ben',  canvas: prep.A, lang: 'ben+eng',  psm: '6',  label: 'বাংলা + ইংরেজি' }
    ];

    var results = [], merged = {}, bestText = '', bestScore = -1, totalConf = 0, done = 0;

    for (var i = 0; i < passes.length; i++) {
      var p = passes[i];
      var span = 78 / passes.length;
      var base = 18 + i * span;
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
        var out = await worker.recognize(p.canvas);
        var text = (out && out.data && out.data.text) || '';
        var conf = (out && out.data && out.data.confidence) || 0;
        var fields = KHOCR.extract(text);
        var sc = scoreResult(fields, conf);

        results.push({ key: p.key, label: p.label, conf: Math.round(conf), score: Math.round(sc), fields: fields });
        totalConf += conf; done++;

        /* একত্র করা — যে পাসে যেটা প্রথম মিলেছে, সেটিই রাখা (স্কোর অনুযায়ী অগ্রাধিকার) */
        Object.keys(fields).forEach(function (k) {
          if (!merged[k] || (k === 'nid' && fields[k].length > merged[k].length)) merged[k] = fields[k];
        });
        if (sc > bestScore) { bestScore = sc; bestText = text; }
      } catch (e) {
        results.push({ key: p.key, label: p.label, error: String((e && e.message) || e) });
      } finally {
        if (worker) { try { await worker.terminate(); } catch (e2) {} }
      }
    }

    report(99, 'ফলাফল সাজানো হচ্ছে…');

    /* সামগ্রিক আস্থা: গড় OCR কনফিডেন্স + কতগুলো ফিল্ড মিলেছে */
    var got = ['nid', 'dob', 'name_en', 'name_bn'].filter(function (k) { return !!merged[k]; }).length;
    var confidence = Math.round(Math.min(99, (done ? totalConf / done : 0) * 0.55 + got * 11));

    report(100, 'সম্পন্ন');
    return {
      fields: merged,
      confidence: confidence,
      text: bestText,
      passes: results,
      preview: prep.B.toDataURL('image/jpeg', 0.75)
    };
  };

  /* NID নম্বর যাচাই — বাংলাদেশে ১০/১৩/১৭ সংখ্যা */
  KHOCR.validNID = function (v) {
    var d = enDigits(v || '').replace(/\D/g, '');
    return d.length === 10 || d.length === 13 || d.length === 17;
  };
  KHOCR.enDigits = enDigits;

  window.KHOCR = KHOCR;
})();
