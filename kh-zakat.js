/* ════════════════════════════════════════════════════════════════════
   kh-zakat.js — জাকাত পাতা (zakat.html) · ২ নভেম্বর ২০২৬

   • ক্যালকুলেটর: নিসাব ও দর আসে `app_settings.zakat_nisab` থেকে
     (সুপার অ্যাডমিন সাপ্তাহিক হালনাগাদ করেন — বাজুসের দর)
   • প্রদান: অনলাইনে `KHUI.payPicker` (purpose 'donation' +
     donation_for 'zakat' + দেশ) — নিজে পাঠালে `record_zakat` RPC
   • স্বচ্ছতা: public_zakat_summary · public_zakat_ledger ·
     public_zakat_approval · public_shariah_documents (সবই anon-যোগ্য)
   ⚠️ কোনো দাতা/প্রাপকের নাম, মোবাইল বা ঋণ নম্বর এই পাতায় আসে না —
      RPC-গুলো সেগুলো ফেরতই দেয় না।
   ⚠️ সংখ্যা আলাদা <b>-তে, লেবেল আলাদা নোডে — kh-i18n বাংলা লেখা
      চাবি হিসেবে অনুবাদ করে, সংখ্যা মেশালে অনুবাদ মেলে না।
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VORI = 11.664;                 /* ১ ভরি = ১১.৬৬৪ গ্রাম */
  var BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  var MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var CAT = {
    parental_care: 'অবহেলিত পিতা-মাতা সেবা',
    debt_relief:   'অক্ষম ঋণগ্রস্তের ঋণ মওকুফ',
    relief:        'জরুরি ত্রাণ',
    livelihood:    'স্বাবলম্বীকরণ',
    policy:        'নীতিগত সিদ্ধান্ত'
  };
  var DOCKIND = { fatwa: 'ফতোয়া', resolution: 'রেজুলেশন', audit: 'অডিট', certificate: 'সনদ' };
  /* দেশ — ISO-3166 alpha-2; বাংলাদেশি প্রবাসীদের সবচেয়ে বেশি যেসব দেশে */
  var COUNTRIES = [
    ['BD', 'বাংলাদেশ'], ['SA', 'সৌদি আরব'], ['AE', 'সংযুক্ত আরব আমিরাত'], ['QA', 'কাতার'], ['KW', 'কুয়েত'],
    ['OM', 'ওমান'], ['BH', 'বাহরাইন'], ['MY', 'মালয়েশিয়া'], ['SG', 'সিঙ্গাপুর'], ['GB', 'যুক্তরাজ্য'],
    ['US', 'যুক্তরাষ্ট্র'], ['CA', 'কানাডা'], ['AU', 'অস্ট্রেলিয়া'], ['IT', 'ইতালি'], ['DE', 'জার্মানি'],
    ['FR', 'ফ্রান্স'], ['ES', 'স্পেন'], ['PT', 'পর্তুগাল'], ['SE', 'সুইডেন'], ['JP', 'জাপান'],
    ['KR', 'দক্ষিণ কোরিয়া'], ['MV', 'মালদ্বীপ'], ['JO', 'জর্ডান'], ['LB', 'লেবানন'], ['TR', 'তুরস্ক'],
    ['IN', 'ভারত'], ['NZ', 'নিউজিল্যান্ড'], ['IE', 'আয়ারল্যান্ড'], ['NL', 'নেদারল্যান্ডস'], ['ZA', 'দক্ষিণ আফ্রিকা']
  ];

  var S = { nisab: null, policy: null, summary: null, offset: 0, total: 0, pay: null, busy: false };

  function $(id) { return document.getElementById(id); }
  function db() { return (window.KHUI && KHUI.db && KHUI.db()) || window._db || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function bn(v) { return String(v).replace(/[0-9]/g, function (d) { return BN[+d]; }); }
  function tr(s) { return (window.KHI18N && KHI18N.t) ? KHI18N.t(s) : s; }
  /* ইনপুট থেকে সংখ্যা — বাংলা অঙ্ক, কমা ও ফাঁকা সামলায় */
  function num(v) {
    var s = String(v == null ? '' : v).replace(/[০-৯]/g, function (c) { return String(BN.indexOf(c)); })
      .replace(/[,\s৳]/g, '');
    var n = parseFloat(s);
    return isFinite(n) && n > 0 ? n : 0;
  }
  function money(n) {
    n = Number(n) || 0;
    var r = Math.round(n * 100) / 100;
    return '৳' + bn(r.toLocaleString('en-IN', { maximumFractionDigits: 2 }));
  }
  function count(n) { return bn((Number(n) || 0).toLocaleString('en-IN')); }
  function dateLabel(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? bn(+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + bn(m[1]) : '—';
  }
  function monthLabel(ym) {
    var m = String(ym || '').match(/^(\d{4})-(\d{2})/);
    return m ? MON[+m[2] - 1] + ' ' + bn(m[1]) : '—';
  }
  function daysSince(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var then = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    var today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((today - then) / 86400000);
  }

  /* ── সেটিংস ও সারসংক্ষেপ ───────────────────────────────────────── */
  async function loadSettings() {
    var c = db();
    if (!c) return;
    try {
      var r = await c.from('app_settings').select('key,value').in('key', ['zakat_nisab', 'zakat_policy']);
      (r.data || []).forEach(function (row) {
        if (row.key === 'zakat_nisab') S.nisab = row.value || {};
        if (row.key === 'zakat_policy') S.policy = row.value || {};
      });
    } catch (e) { /* দর না পেলে ব্যবহারকারী নিজে দর লিখতে পারেন */ }
    paintPrice();
    paintPolicy();
    calc();
  }

  function paintPrice() {
    var box = $('zkPrice');
    var n = S.nisab || {};
    var sp = Number(n.silver_bdt_per_gram) || 0, gp = Number(n.gold_bdt_per_gram) || 0;
    if (sp && !$('zkSilverP').value) $('zkSilverP').value = String(sp);
    if (gp && !$('zkGoldP').value) $('zkGoldP').value = String(gp);
    if (!sp) {
      box.classList.add('is-stale');
      box.innerHTML = '<i class="ti ti-alert-triangle" aria-hidden="true"></i>' +
        '<span>রুপার দর এখনো বসানো হয়নি — নিচে আপনার এলাকার দর লিখে নিন।</span>';
      return;
    }
    var stale = Number((S.policy || {}).nisab_stale_days) || 7;
    var age = daysSince(n.as_of);
    var old = age != null && age > stale;
    box.classList.toggle('is-stale', old);
    box.innerHTML = '<i class="ti ti-scale" aria-hidden="true"></i>' +
      '<span>রুপার নিসাব</span> <b>' + esc(money(sp * (Number(n.silver_grams) || 612.36))) + '</b>' +
      '<span>·</span><span>দর</span> <b>' + esc(money(sp)) + '</b><span>প্রতি গ্রাম</span>' +
      '<span>·</span><span>' + esc(n.source || 'বাজুস') + '</span>' +
      '<span>·</span><b>' + esc(dateLabel(n.as_of)) + '</b>' +
      (old ? '<span>·</span><span>দরটি পুরনো হতে পারে — বর্তমান দর মিলিয়ে নিন।</span>' : '');
  }

  function paintPolicy() {
    var p = S.policy || {};
    var pct = p.relief_cap_pct != null ? Number(p.relief_cap_pct) : 25;
    var box = $('zkCap');
    if (!box) return;
    box.innerHTML = '<i class="ti ti-info-circle" aria-hidden="true"></i><div>' +
      '<span>প্রতিষ্ঠানের অংশ (আমেল):</span> <b>' + bn(Number(p.amil_pct) || 0) + '%</b>' +
      '<span> · </span><span>এক বছরে ঋণ মওকুফে সর্বোচ্চ জাকাত প্রাপ্তির</span> <b>' + bn(pct) + '%</b>' +
      '<br><span>এই সীমা শরিয়াহ বোর্ডের সংখ্যাগরিষ্ঠ সিদ্ধান্তেই কেবল বদলায়।</span></div>';
  }

  async function loadSummary() {
    var c = db();
    if (!c) return;
    try {
      var r = await c.rpc('public_zakat_summary');
      if (r.error || !r.data) throw r.error;
      S.summary = r.data;
      var d = r.data;
      document.querySelectorAll('[data-zk]').forEach(function (b) {
        var k = b.getAttribute('data-zk');
        var v = d[k];
        b.textContent = (k === 'collected' || k === 'disbursed' || k === 'available') ? money(v) : count(v);
      });
      var a = $('zkAsOf');
      if (a && d.as_of) a.innerHTML = '<span>সরাসরি ডাটাবেজ থেকে · হালনাগাদ</span> <b>' + esc(dateLabel(d.as_of)) + '</b>';
    } catch (e) {
      var a2 = $('zkAsOf');
      if (a2) a2.textContent = 'হিসাব আনা যায়নি — একটু পরে আবার চেষ্টা করুন।';
    }
  }

  /* ── ক্যালকুলেটর ───────────────────────────────────────────────── */
  function grams(wId, uId) {
    var w = num($(wId).value);
    return $(uId).value === 'vori' ? w * VORI : w;
  }
  function calc() {
    var gold = grams('zkGoldW', 'zkGoldU') * num($('zkGoldP').value);
    var silver = grams('zkSilverW', 'zkSilverU') * num($('zkSilverP').value);
    var cash = num($('zkCash').value) + num($('zkBank').value);
    var other = num($('zkBiz').value) + num($('zkRecv').value) + num($('zkOther').value);
    var assets = gold + silver + cash + other;
    var debts = num($('zkDebt').value) + num($('zkBills').value);
    var net = Math.max(0, assets - debts);

    var n = S.nisab || {};
    var goldOnly = gold > 0 && silver === 0 && cash === 0 && other === 0;
    var sp = num($('zkSilverP').value) || Number(n.silver_bdt_per_gram) || 0;
    var gp = num($('zkGoldP').value) || Number(n.gold_bdt_per_gram) || 0;
    var nisab = goldOnly ? gp * (Number(n.gold_grams) || 87.48) : sp * (Number(n.silver_grams) || 612.36);
    var hawl = (document.querySelector('input[name="zkHawl"]:checked') || {}).value !== 'no';

    $('zkRAssets').textContent = money(assets);
    $('zkRDebts').textContent = money(debts);
    $('zkRNet').textContent = money(net);
    $('zkRNisabL').textContent = goldOnly ? 'নিসাব (সোনা ৮৭.৪৮ গ্রাম)' : 'নিসাব (রুপা ৬১২.৩৬ গ্রাম)';
    $('zkRNisab').textContent = nisab ? money(nisab) : '—';

    var due = 0, msg;
    var use = $('zkUseAmt');
    if (!assets) {
      msg = 'উপরের ঘরগুলোতে আপনার সম্পদের হিসাব লিখুন।';
    } else if (!nisab) {
      msg = 'নিসাব হিসাব করতে রুপার দর (প্রতি গ্রাম) লিখুন।';
    } else if (net < nisab) {
      msg = 'আপনার নিট সম্পদ নিসাবের নিচে — এ বছর আপনার উপর জাকাত ফরজ নয়। চাইলে সদকা দিতে পারেন।';
    } else if (!hawl) {
      due = Math.ceil(net * 0.025);
      msg = 'নিসাব পূর্ণ হয়েছে, কিন্তু এক চান্দ্র বছর (হাওল) পূর্ণ হলে তবেই জাকাত ফরজ হবে। আগাম দিতে চাইলে দিতে পারেন।';
    } else {
      due = Math.ceil(net * 0.025);
      msg = 'আপনার উপর জাকাত ফরজ হয়েছে। নিট সম্পদের ২.৫% আপনার দেয় জাকাত।';
    }
    $('zkRDue').textContent = money(due);
    $('zkVerdict').textContent = msg;
    if (use) { use.hidden = !due; use.dataset.amt = String(due); }
  }

  /* ── প্রদান ────────────────────────────────────────────────────── */
  function amount() { return Math.round(num($('zkAmt').value) * 100) / 100; }

  function say(kind, html) {
    var m = $('zkPayMsg');
    if (!m) return;
    m.innerHTML = html ? '<div class="zk-msg ' + kind + '">' + html + '</div>' : '';
  }

  /* ⚠️ সাইটের নিয়ম: লগইন ছাড়া দান নেওয়া হয় না (donation.html-এর `data-kh-requires`)।
     জাকাত পাতার হিসাব ও খাতা সবার জন্য খোলা — কেবল টাকা দেওয়ার মুহূর্তে অ্যাকাউন্ট চাওয়া হয়। */
  async function formOk() {
    if (window.KHUI && KHUI.requireAccount) {
      var okAcc = await KHUI.requireAccount('donation');
      if (!okAcc) return false;
      await prefill();   /* এইমাত্র লগইন করলে নাম/মোবাইল/ই-মেইল এখনই বসে যায় */
    }
    var a = amount();
    if (!a || a < 10) { say('bad', 'জাকাতের পরিমাণ অন্তত ৳১০ লিখুন।'); $('zkAmt').focus(); return false; }
    if (a > 500000) { say('bad', 'এক লেনদেনে সর্বোচ্চ ৳৫,০০,০০০ — বড় অঙ্ক কয়েক ভাগে অথবা ব্যাংকে দিন।'); $('zkAmt').focus(); return false; }
    var anon = $('zkAnon').checked;
    if (!anon && !$('zkName').value.trim()) { say('bad', 'আপনার নাম লিখুন — অথবা “বেনামী” বেছে নিন।'); $('zkName').focus(); return false; }
    var mob = $('zkMobile').value.trim(), em = $('zkEmail').value.trim();
    if (!mob && !em) { say('bad', 'রশিদ পাঠাতে মোবাইল বা ই-মেইলের যেকোনো একটি দিন।'); $('zkMobile').focus(); return false; }
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { say('bad', 'ই-মেইল ঠিকানাটি সঠিক নয়।'); $('zkEmail').focus(); return false; }
    say('', '');
    return true;
  }

  /* লগইন থাকলে দাতার নাম, মোবাইল ও ই-মেইল প্রোফাইল থেকে নিজে থেকেই বসে (donation.html-এর মতোই);
     নিজে টাইপ করা ঘর কখনো মোছা হয় না। ⚠️ kh-ui.js এই ফাইলের পরে লোড হয়, তাই `load`-এ ডাকা হয়। */
  var prefilled = false;
  async function prefill() {
    if (prefilled || !window.KHUI || !KHUI.prefillFromProfile) return;
    try {
      var p = await KHUI.prefillFromProfile({ full_name: 'zkName', mobile: 'zkMobile', email: 'zkEmail' });
      if (p) prefilled = true;
    } catch (e) {}
  }

  function payload() {
    return {
      name: $('zkName').value.trim(),
      mobile: $('zkMobile').value.trim(),
      email: $('zkEmail').value.trim(),
      is_anonymous: $('zkAnon').checked,
      donation_for: 'zakat',
      country: $('zkCountry').value || null
    };
  }

  async function mountPay() {
    if (S.pay || !window.KHUI || !KHUI.payPicker) return;
    try {
      S.pay = await KHUI.payPicker($('zkPayPicker'), {
        title: 'জাকাত কীভাবে দিতে চান?',
        purpose: 'donation',
        purposeLabel: 'জাকাত',
        amount: amount,
        payerName: function () { return $('zkAnon').checked ? 'বেনামী দাতা' : ($('zkName').value.trim() || 'দাতা'); },
        cusFields: ['address', 'city', 'postcode'],
        payload: payload,
        beforePay: formOk
      });
      $('zkAmt').addEventListener('input', function () { if (S.pay && S.pay.refresh) S.pay.refresh(); });
      if (S.pay && S.pay.empty) $('zkManualBtn').hidden = true;
    } catch (e) { S.pay = null; }
  }

  async function manualSubmit() {
    if (S.busy) return;
    if (!(await formOk())) return;
    if (!S.pay || S.pay.empty) { say('bad', 'টাকা দেওয়ার মাধ্যমের তালিকা এখনো আসেনি — একটু পরে আবার চেষ্টা করুন।'); return; }
    var info = S.pay.validate();
    if (!info) { $('zkPayPicker').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var c = db();
    if (!c) { say('bad', 'সংযোগ পাওয়া যাচ্ছে না — পেজটি রিফ্রেশ করুন।'); return; }
    var btn = $('zkManualBtn');
    S.busy = true; btn.disabled = true;
    try {
      var p = payload();
      var r = await c.rpc('record_zakat', {
        p_amount: amount(),
        p_name: p.is_anonymous ? null : (p.name || null),
        p_mobile: p.mobile || null,
        p_email: p.email || null,
        p_payment_method: info.method,
        p_transaction_ref: info.reference || null,
        p_is_anonymous: p.is_anonymous,
        p_country: p.country
      });
      if (r.error) throw r.error;
      var d = r.data || {};
      say('ok', '<b>জাকাত গ্রহণ করা হয়েছে — জাযাকাল্লাহু খাইরান।</b><br>' +
        '<span>রশিদ নম্বর</span> <b class="zk-code">' + esc(d.donation_no || '—') + '</b><br>' +
        '<span>' + (d.has_email === false
          ? 'আপনার কোনো ই-মেইল ঠিকানা আমাদের কাছে নেই, তাই রশিদ ই-মেইলে যাবে না — নম্বরটি সংরক্ষণ করুন।'
          : 'কয়েক মিনিটের মধ্যে রশিদ আপনার ই-মেইলে পৌঁছে যাবে।') + '</span>');
      if (S.pay.reset) S.pay.reset();
      loadSummary();
      S.offset = 0; loadLedger(false);
    } catch (e) {
      say('bad', esc((e && e.message) || 'জাকাত সংরক্ষণ করা যায়নি — আবার চেষ্টা করুন।'));
    } finally {
      S.busy = false; btn.disabled = false;
    }
  }

  /* ── প্রকাশ্য খাতা ─────────────────────────────────────────────── */
  function methodName(id) {
    var list = (window.KHUI && KHUI.PAY_METHODS) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id ? String(id) : 'অন্যান্য';
  }
  function rowHTML(r) {
    var when = r.date ? dateLabel(r.date) : monthLabel(r.month);
    var whenNote = r.date ? '' : '<br><small class="zk-muted">কেবল মাস</small>';
    if (r.dir === 'in') {
      return '<tr><td>' + esc(when) + '</td><td><span class="zk-in-tag">প্রাপ্তি</span></td>' +
        '<td>' + esc(methodName(r.method)) + '<br><small class="zk-muted"><b>' + count(r.count) + '</b> <span>টি দান</span></small></td>' +
        '<td><b>' + esc(money(r.amount)) + '</b></td><td class="zk-muted">—</td><td class="zk-muted">—</td></tr>';
    }
    return '<tr><td>' + esc(when) + whenNote + '</td><td><span class="zk-out-tag">বিতরণ</span></td>' +
      '<td>' + esc(CAT[r.category] || 'জরুরি ত্রাণ') +
        (r.public_summary ? '<br><small class="zk-muted" data-no-i18n>' + esc(r.public_summary) + '</small>' : '') + '</td>' +
      '<td><b>' + esc(money(r.amount)) + '</b></td>' +
      '<td><span class="zk-code">' + esc(r.beneficiary_code || '—') + '</span></td>' +
      '<td>' + (r.approval_no
        ? '<button type="button" class="zk-link zk-code" data-appr="' + esc(r.approval_no) + '">' + esc(r.approval_no) + '</button>'
        : '—') + '</td></tr>';
  }

  async function loadLedger(more) {
    var c = db();
    var body = $('zkLedger');
    if (!c || !body) return;
    try {
      var r = await c.rpc('public_zakat_ledger', { p_limit: 50, p_offset: S.offset });
      if (r.error) throw r.error;
      var d = r.data || {}, rows = d.rows || [];
      S.total = d.total || 0;
      var html = rows.map(rowHTML).join('');
      if (more) body.insertAdjacentHTML('beforeend', html);
      else body.innerHTML = html || '<tr><td colspan="6" class="zk-empty">এখনো কোনো জাকাত জমা বা বিতরণ হয়নি।</td></tr>';
      S.offset += rows.length;
      $('zkMore').hidden = S.offset >= S.total;
    } catch (e) {
      if (!more) body.innerHTML = '<tr><td colspan="6" class="zk-empty">খাতা আনা যায়নি — একটু পরে আবার চেষ্টা করুন।</td></tr>';
    }
  }

  async function lookup(no) {
    var box = $('zkAppr');
    no = String(no || '').trim().toUpperCase();
    if (!no) { box.innerHTML = ''; return; }
    var c = db();
    if (!c) return;
    box.innerHTML = '<p class="zk-muted">যাচাই হচ্ছে…</p>';
    try {
      var r = await c.rpc('public_zakat_approval', { p_no: no });
      if (r.error) throw r.error;
      var a = r.data;
      if (!a) {
        box.innerHTML = '<div class="zk-msg bad">এই আইডির কোনো শরিয়াহ অনুমোদন পাওয়া যায়নি।</div>';
        return;
      }
      var seats = (a.seats || []).filter(Boolean);
      var docs = (a.documents || []).map(function (d) {
        return '<button type="button" class="zk-link" data-doc="' + esc(d.file_path) + '">' + esc(d.ref_no) + '</button>';
      }).join(' · ');
      var posted = a.posted_on ? dateLabel(a.posted_on) : (a.posted_month ? monthLabel(a.posted_month) : '');
      var policy = a.kind === 'policy' && a.policy && a.policy.relief_cap_pct != null
        ? '<div><span>নতুন ঋণ মওকুফ সীমা</span><b>' + bn(a.policy.relief_cap_pct) + '%</b></div>' : '';
      box.innerHTML = '<div class="zk-appr"><h4><i class="ti ti-rosette-discount-check" aria-hidden="true"></i>' +
        '<span>শরিয়াহ বোর্ড অনুমোদিত</span> <span class="zk-code">' + esc(a.approval_no) + '</span></h4>' +
        '<div class="zk-dl">' +
          '<div><span>সিদ্ধান্তের তারিখ</span><b>' + esc(dateLabel(a.decided_on)) + '</b></div>' +
          '<div><span>খাত</span><b>' + esc(CAT[a.kind] || '—') + '</b></div>' +
          (a.kind !== 'policy' ? '<div><span>পরিমাণ</span><b>' + esc(money(a.amount)) + '</b></div>' : policy) +
          '<div><span>অনুমোদন দিয়েছেন</span><b>' + count(a.approvals) + ' / ' + count(a.members) + '</b></div>' +
          (a.beneficiary_code ? '<div><span>প্রাপকের কোড</span><b class="zk-code">' + esc(a.beneficiary_code) + '</b></div>' : '') +
          (posted ? '<div><span>বিতরণ</span><b>' + esc(posted) + '</b></div>' : '<div><span>বিতরণ</span><b>এখনো হয়নি</b></div>') +
        '</div>' +
        (seats.length ? '<p class="zk-note"><span>অনুমোদনকারী পদ:</span> ' + seats.map(esc).join(' · ') + '</p>' : '') +
        (a.public_summary ? '<p class="zk-note" data-no-i18n>' + esc(a.public_summary) + '</p>' : '') +
        (docs ? '<p class="zk-note"><span>সংশ্লিষ্ট নথি:</span> ' + docs + '</p>' : '') +
        '</div>';
      try {
        var u = new URL(location.href);
        u.searchParams.set('approval', a.approval_no);
        history.replaceState(null, '', u.pathname + u.search + '#ledger');
      } catch (e2) {}
    } catch (e) {
      box.innerHTML = '<div class="zk-msg bad">যাচাই করা যায়নি — একটু পরে আবার চেষ্টা করুন।</div>';
    }
  }

  /* ── নথি ───────────────────────────────────────────────────────── */
  async function openDoc(path) {
    var c = db();
    if (!c || !path) return;
    var w = window.open('', '_blank');
    try {
      var r = await c.storage.from('shariah-docs').createSignedUrl(path, 600);
      if (r.error || !r.data) throw r.error;
      if (w) w.location.href = r.data.signedUrl; else location.href = r.data.signedUrl;
    } catch (e) {
      if (w) w.close();
      alert(tr('নথিটি খোলা যায়নি — একটু পরে আবার চেষ্টা করুন।'));
    }
  }

  async function loadDocs() {
    var c = db();
    var box = $('zkDocs');
    if (!c || !box) return;
    try {
      var r = await c.rpc('public_shariah_documents');
      if (r.error) throw r.error;
      var list = r.data || [];
      if (!list.length) {
        box.innerHTML = '<p class="zk-empty">শরিয়াহ বোর্ডের কোনো নথি এখনো প্রকাশিত হয়নি।</p>';
        return;
      }
      var L = (window.KHI18N && KHI18N.getLang) ? KHI18N.getLang() : 'bn';
      box.innerHTML = list.map(function (d) {
        var title = L === 'ar' ? (d.title_ar || d.title_en || d.title_bn) : L === 'en' ? (d.title_en || d.title_bn) : (d.title_bn || d.title_en);
        var appr = (d.approvals || []).map(function (x) {
          return '<button type="button" class="zk-link zk-code" data-appr="' + esc(x) + '">' + esc(x) + '</button>';
        }).join(' · ');
        return '<div class="zk-doc"><i class="ti ti-file-type-pdf" aria-hidden="true"></i><div style="min-width:0">' +
          '<b data-no-i18n>' + esc(title || d.ref_no) + '</b>' +
          '<small><span>' + esc(DOCKIND[d.kind] || 'নথি') + '</span> · <span class="zk-code">' + esc(d.ref_no) + '</span>' +
          (d.doc_date ? ' · <span>' + esc(dateLabel(d.doc_date)) + '</span>' : '') + '</small>' +
          (appr ? '<small><span>অনুমোদন:</span> ' + appr + '</small>' : '') +
          '<button type="button" class="zk-btn zk-btn-soft" data-doc="' + esc(d.file_path) + '"><i class="ti ti-external-link" aria-hidden="true"></i><span>PDF খুলুন</span></button>' +
          '</div></div>';
      }).join('');
    } catch (e) {
      box.innerHTML = '<p class="zk-empty">নথির তালিকা আনা যায়নি।</p>';
    }
  }

  /* ── শুরু ──────────────────────────────────────────────────────── */
  function boot() {
    var sel = $('zkCountry');
    sel.innerHTML = COUNTRIES.map(function (c) { return '<option value="' + c[0] + '">' + esc(c[1]) + '</option>'; }).join('') +
      '<option value="">অন্য দেশ</option>';

    ['zkCash', 'zkBank', 'zkGoldW', 'zkGoldP', 'zkSilverW', 'zkSilverP', 'zkBiz', 'zkRecv', 'zkOther', 'zkDebt', 'zkBills']
      .forEach(function (id) { $(id).addEventListener('input', calc); });
    ['zkGoldU', 'zkSilverU'].forEach(function (id) { $(id).addEventListener('change', calc); });
    document.querySelectorAll('input[name="zkHawl"]').forEach(function (r) { r.addEventListener('change', calc); });

    $('zkUseAmt').addEventListener('click', function () {
      $('zkAmt').value = this.dataset.amt || '';
      if (S.pay && S.pay.refresh) S.pay.refresh();
      $('pay').scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(function () { $('zkAmt').focus({ preventScroll: true }); }, 500);
    });
    $('zkManualBtn').addEventListener('click', manualSubmit);
    $('zkLookup').addEventListener('submit', function (e) { e.preventDefault(); lookup($('zkApprIn').value); });
    $('zkMore').addEventListener('click', function () { loadLedger(true); });
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-appr]');
      if (a) {
        e.preventDefault();
        $('zkApprIn').value = a.getAttribute('data-appr');
        lookup(a.getAttribute('data-appr'));
        $('ledger').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      var d = e.target.closest && e.target.closest('[data-doc]');
      if (d) { e.preventDefault(); openDoc(d.getAttribute('data-doc')); }
    });

    calc();
    loadSettings();
    loadSummary();
    loadLedger(false);
    loadDocs();
    var q = new URLSearchParams(location.search).get('approval');
    if (q) { $('zkApprIn').value = q; lookup(q); }
    var amtQ = new URLSearchParams(location.search).get('amount');
    if (amtQ && num(amtQ)) $('zkAmt').value = String(num(amtQ));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  /* kh-ui.js এই ফাইলের পরে লোড হয় — পিকার তাই `load`-এ */
  window.addEventListener('load', function () { mountPay(); prefill(); });
})();
