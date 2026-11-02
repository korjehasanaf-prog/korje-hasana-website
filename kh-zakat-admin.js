/* ════════════════════════════════════════════════════════════════════
   kh-zakat-admin.js — অ্যাডমিন ড্যাশবোর্ডের "জাকাত ব্যবস্থাপনা" প্যানেল
   (dashboard.html → #panel-zakat) · ২ নভেম্বর ২০২৬

   প্রবাহ: প্রস্তাব (খসড়া) → বোর্ডে পাঠানো → শরিয়াহ বোর্ডের সংখ্যাগরিষ্ঠ
   অনুমোদন (shariah-board.html) → [ঋণ মওকুফে ঋণগ্রহীতার সম্মতি — নিজে
   অথবা কাগজে] → সুপার অ্যাডমিন "বিতরণ সম্পন্ন" (zakat_post)।
   ⚠️ সব নিয়ম সার্ভারে: zakat_request_save / _submit / _cancel ·
      zakat_relief_consent_paper · zakat_post (সুপার অ্যাডমিন, তহবিল ও
      বার্ষিক সীমা যাচাই) · zakat_set_nisab (সুপার অ্যাডমিন) ·
      zakat_dashboard · zakat_requests_list · zakat_request_detail
   ⚠️ প্রমাণ/সম্মতিপত্র `shariah-docs` প্রাইভেট বাকেটে —
      evidence/<uuid>/… ও consent/<request-id>/…
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var BN = '০১২৩৪৫৬৭৮৯';
  var KIND = { debt_relief: 'অক্ষম ঋণগ্রস্তের ঋণ মওকুফ', parental_care: 'অবহেলিত পিতা-মাতা সেবা', relief: 'জরুরি ত্রাণ',
               livelihood: 'স্বাবলম্বীকরণ', policy: 'নীতিগত সিদ্ধান্ত (ঋণ মওকুফ সীমা)' };
  var HARD = { disaster: 'প্রাকৃতিক দুর্যোগ', illness: 'দুরারোগ্য ব্যাধি', accident: 'দুর্ঘটনা', death: 'মৃত্যু', other: 'অন্যান্য' };
  var STATUS = { draft: ['খসড়া', 'b-review'], submitted: ['বোর্ডে', 'b-pending'], info_needed: ['আরও তথ্য চাওয়া', 'b-review'],
                 approved: ['অনুমোদিত', 'b-confirmed'], posted: ['বিতরণ সম্পন্ন', 'b-approved'], rejected: ['নামঞ্জুর', 'b-rejected'],
                 cancelled: ['বাতিল', 'b-rejected'] };
  var METHOD = { bkash: 'বিকাশ', nagad: 'নগদ', rocket: 'রকেট', upay: 'উপায়', gpay: 'জিপে', bqr: 'বাংলা কিউআর', bank: 'ব্যাংক',
                 card: 'কার্ড', cash: 'নগদ টাকা', agent: 'এজেন্ট', other: 'অন্যান্য' };
  var S = { built: false, filter: 'open', edit: null, ev: [], loans: null, dash: null };

  function $(id) { return document.getElementById(id); }
  function db() { return window._db || (typeof _db !== 'undefined' ? _db : null); }
  function isSuper() { try { return typeof _adminInfo !== 'undefined' && _adminInfo && _adminInfo.role === 'super_admin'; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bn(v) { return String(v).replace(/[0-9]/g, function (d) { return BN[d]; }); }
  function money(n) { return '৳' + bn((Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })); }
  var MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  /* "১ নভেম্বর ২০২৬" — kh-i18n-এর তারিখের প্যাটার্ন ইংরেজিতে নিজেই বদলায় */
  function day(iso) {
    if (!iso) return '—';
    var d = new Date(iso); if (isNaN(d)) return '—';
    var g = {}; new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'numeric', year: 'numeric' })
      .formatToParts(d).forEach(function (x) { g[x.type] = x.value; });
    return bn(+g.day) + ' ' + MON[(+g.month) - 1] + ' ' + bn(g.year);
  }
  function msg(id, ok, t) { var m = $(id); if (!m) return; m.className = 'msg show ' + (ok ? 'ok' : 'err'); m.textContent = t; }
  function err(e) { return (e && e.message) || 'কিছু একটা ভুল হয়েছে'; }
  function uuid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2); }
  function safeName(n) { return String(n || 'file').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-60) || 'file'; }
  function daysOld(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null;
    var now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400000);
  }

  /* ── কাঠামো (একবার) ─────────────────────────────────────────── */
  function build() {
    var p = $('panel-zakat');
    if (!p || S.built) return;
    S.built = true;
    p.innerHTML =
      '<div class="panel-title">🌙 জাকাত ব্যবস্থাপনা</div>' +
      '<div class="panel-sub">আলাদা জাকাত তহবিল · শরিয়াহ বোর্ডের সংখ্যাগরিষ্ঠ অনুমোদন ছাড়া কোনো বিতরণ নয় · প্রতিষ্ঠানের অংশ ০%</div>' +
      '<div id="zkaStale"></div>' +
      '<div class="stat-grid" id="zkaStats"></div>' +
      '<div class="card"><div class="card-title"><i class="ti ti-chart-bar"></i> প্রাপ্তি ও বিতরণের ভাগ</div><div id="zkaBreak"><div class="empty-state"><p>লোড হচ্ছে...</p></div></div></div>' +

      '<div class="card" id="zkaFormCard"><div class="card-title"><i class="ti ti-file-plus"></i> <span id="zkaFormT">নতুন বিতরণ প্রস্তাব</span></div>' +
        '<div class="form-grid">' +
          '<div class="fld"><label>ধরন *</label><select id="zka-kind">' +
            Object.keys(KIND).map(function (k) { return '<option value="' + k + '">' + KIND[k] + '</option>'; }).join('') + '</select></div>' +
          '<div class="fld"><label>শিরোনাম *</label><input id="zka-title" maxlength="160" placeholder="যেমন: বন্যায় ক্ষতিগ্রস্ত সদস্যের ঋণ মওকুফ"></div>' +
          '<div class="fld zka-amt"><label>অঙ্ক (৳) *</label><input id="zka-amount" type="number" min="1" step="0.01"></div>' +
          '<div class="fld zka-pol" hidden><label>নতুন ঋণ মওকুফ সীমা (জাকাত প্রাপ্তির %) *</label><input id="zka-cap" type="number" min="0" max="100" step="0.5"></div>' +
          '<div class="fld zka-debt"><label>ঋণ (সক্রিয়) *</label><select id="zka-loan"><option value="">লোড হচ্ছে…</option></select></div>' +
          '<div class="fld zka-debt"><label>কষ্টের কারণ *</label><select id="zka-hard"><option value="">— বাছুন —</option>' +
            Object.keys(HARD).map(function (k) { return '<option value="' + k + '">' + HARD[k] + '</option>'; }).join('') + '</select></div>' +
          '<div class="fld zka-person"><label>প্রাপকের নাম * <small>(কেবল ভেতরে)</small></label><input id="zka-bname" maxlength="120"></div>' +
          '<div class="fld zka-person"><label>প্রাপকের মোবাইল <small>(কেবল ভেতরে)</small></label><input id="zka-bmob" inputmode="tel" maxlength="20"></div>' +
          '<div class="fld form-full"><label>বিস্তারিত বিবরণ (বোর্ড দেখবে)</label><textarea id="zka-details" maxlength="4000" placeholder="পরিস্থিতি, যাচাইয়ের তথ্য, কেন জাকাতের যোগ্য…"></textarea></div>' +
          '<div class="fld form-full zka-notpol"><label>প্রকাশ্য খাতার এক লাইন (নাম/মোবাইল/ঠিকানা নয়)</label><input id="zka-pub" maxlength="400" placeholder="যেমন: বন্যায় ক্ষতিগ্রস্ত সদস্যের ঋণ পরিশোধ"></div>' +
          '<div class="fld form-full"><label>প্রমাণপত্র (ছবি/PDF, প্রতিটি ≤১০ MB)</label><input id="zka-files" type="file" accept="application/pdf,image/jpeg,image/png" multiple><div id="zka-evlist" style="margin-top:8px;font-size:13px"></div></div>' +
        '</div>' +
        '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">' +
          '<button class="btn btn-primary" id="zka-save"><i class="ti ti-device-floppy"></i> খসড়া সংরক্ষণ</button>' +
          '<button class="btn btn-gold" id="zka-send"><i class="ti ti-send"></i> সংরক্ষণ করে বোর্ডে পাঠান</button>' +
          '<button class="btn btn-sm" id="zka-reset" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:var(--muted)">নতুন / রিসেট</button>' +
        '</div><div id="zka-msg" class="msg"></div>' +
        '<div style="margin-top:10px;font-size:12.5px;color:var(--muted);line-height:1.7">ⓘ প্রাপকের নাম ও মোবাইল কেবল অ্যাডমিন দেখেন — শরিয়াহ বোর্ড ও প্রকাশ্য খাতায় যায় একটি গোপন কোড। ঋণ মওকুফে জাকাত আগে ঋণগ্রহীতার মালিকানায় যায়; তাঁর সম্মতি (নিজে ড্যাশবোর্ড থেকে, অথবা কাগজে স্বাক্ষর করে) ছাড়া ঋণে সমন্বয় হয় না।</div>' +
      '</div>' +

      '<div class="card"><div class="card-title"><i class="ti ti-list-details"></i> প্রস্তাবের তালিকা</div>' +
        '<div class="filter-pills" style="margin-bottom:12px" id="zkaPills">' +
          [['open', 'চলমান'], ['draft', 'খসড়া'], ['submitted', 'বোর্ডে'], ['info_needed', 'আরও তথ্য'], ['approved', 'অনুমোদিত'], ['posted', 'বিতরণ সম্পন্ন'], ['closed', 'নামঞ্জুর/বাতিল'], ['all', 'সব']]
            .map(function (f, i) { return '<button class="filter-pill' + (i === 0 ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join('') +
        '</div><div id="zkaList"><div class="empty-state"><p>লোড হচ্ছে...</p></div></div></div>' +

      '<div class="card super-only" id="zkaNisabCard"><div class="card-title"><i class="ti ti-scale"></i> নিসাবের দর — সাপ্তাহিক হালনাগাদ (বাজুস)</div>' +
        '<div id="zkaNisabNow" style="font-size:13.5px;color:var(--muted);margin-bottom:12px;line-height:1.7"></div>' +
        '<div class="form-grid">' +
          '<div class="fld"><label>রুপা — প্রতি গ্রাম (৳) *</label><input id="zka-silver" type="number" min="1" step="0.01"></div>' +
          '<div class="fld"><label>সোনা — প্রতি গ্রাম (৳)</label><input id="zka-gold" type="number" min="1" step="0.01"></div>' +
          '<div class="fld"><label>দরের তারিখ *</label><input id="zka-asof" type="date"></div>' +
          '<div class="fld"><label>উৎস</label><input id="zka-src" maxlength="120" placeholder="বাজুস — ২২ ক্যারেট (হলমার্ক)"></div>' +
        '</div>' +
        '<div style="margin-top:6px;font-size:12.5px;color:var(--muted)">ⓘ বাজুস ভরি হিসেবে দাম দিলে ভাগ করুন ১১.৬৬৪ দিয়ে (১ ভরি = ১১.৬৬৪ গ্রাম)।</div>' +
        '<div style="margin-top:12px"><button class="btn btn-primary" id="zka-nisab-save"><i class="ti ti-device-floppy"></i> দর সংরক্ষণ</button></div>' +
        '<div id="zka-nisab-msg" class="msg"></div></div>' +

      '<div class="card"><div class="card-title"><i class="ti ti-shield-check"></i> শরিয়াহ বোর্ড ও নথি</div>' +
        '<div id="zkaBoard" style="font-size:14px;color:var(--muted);line-height:1.8"></div>' +
        '<div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">' +
          '<a class="btn btn-primary" href="shariah-board.html" target="_blank" rel="noopener"><i class="ti ti-external-link"></i> শরিয়াহ বোর্ড প্যানেল</a>' +
          '<a class="btn btn-sm" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:var(--muted)" href="shariah-board.html#docs" target="_blank" rel="noopener"><i class="ti ti-file-certificate"></i> ফতোয়া ও নথি আপলোড</a>' +
          '<a class="btn btn-sm" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:var(--muted)" href="zakat.html#ledger" target="_blank" rel="noopener"><i class="ti ti-world"></i> প্রকাশ্য জাকাত পাতা</a>' +
        '</div></div>';

    if (!isSuper()) { var nc = $('zkaNisabCard'); if (nc) nc.style.display = 'none'; }
    $('zka-kind').addEventListener('change', kindUI);
    $('zka-files').addEventListener('change', uploadEvidence);
    $('zka-save').addEventListener('click', function () { save(false); });
    $('zka-send').addEventListener('click', function () { save(true); });
    $('zka-reset').addEventListener('click', resetForm);
    $('zka-nisab-save').addEventListener('click', saveNisab);
    $('zkaPills').addEventListener('click', function (e) {
      var b = e.target.closest('.filter-pill'); if (!b) return;
      $('zkaPills').querySelectorAll('.filter-pill').forEach(function (x) { x.classList.toggle('active', x === b); });
      S.filter = b.getAttribute('data-f'); loadList();
    });
    $('zkaList').addEventListener('click', onListClick);
    $('zkaList').addEventListener('change', onListChange);
    kindUI();
  }

  function kindUI() {
    var k = $('zka-kind').value;
    var show = function (cls, on) { document.querySelectorAll('#panel-zakat .' + cls).forEach(function (el) { el.hidden = !on; el.style.display = on ? '' : 'none'; }); };
    show('zka-debt', k === 'debt_relief');
    show('zka-person', ['parental_care', 'relief', 'livelihood'].indexOf(k) >= 0);
    show('zka-pol', k === 'policy');
    show('zka-amt', k !== 'policy');
    show('zka-notpol', k !== 'policy');
    if (k === 'debt_relief') loadLoans();
  }

  async function loadLoans() {
    if (S.loans) return;
    var sel = $('zka-loan');
    try {
      var r = await db().from('loans').select('id,loan_no,principal,paid_amount,monthly_emi,borrowers(name_bn,name,mobile)')
        .eq('status', 'active').order('loan_no', { ascending: true }).limit(500);
      if (r.error) throw r.error;
      S.loans = r.data || [];
      sel.innerHTML = '<option value="">— ঋণ বাছুন —</option>' + S.loans.map(function (l) {
        var b = l.borrowers || {};
        return '<option value="' + esc(l.id) + '">' + esc((b.name_bn || b.name || 'ঋণগ্রহীতা') + ' — ' + l.loan_no) + '</option>';
      }).join('');
      if (S.edit && S.edit.loan_id) sel.value = S.edit.loan_id;
    } catch (e) { sel.innerHTML = '<option value="">ঋণের তালিকা আনা যায়নি</option>'; }
  }

  function paintEv() {
    var box = $('zka-evlist');
    box.innerHTML = S.ev.length ? S.ev.map(function (x, i) {
      return '<span style="display:inline-flex;gap:6px;align-items:center;margin:0 8px 6px 0;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--border)">' +
        '<i class="ti ti-paperclip"></i>' + esc(x.name) + ' <button type="button" class="btn btn-sm btn-danger" data-ev-del="' + i + '" style="padding:2px 8px">✕</button></span>';
    }).join('') : '<span style="color:var(--muted)">কোনো প্রমাণপত্র যুক্ত হয়নি</span>';
    box.querySelectorAll('[data-ev-del]').forEach(function (b) {
      b.addEventListener('click', function () { S.ev.splice(+b.getAttribute('data-ev-del'), 1); paintEv(); });
    });
  }

  async function uploadEvidence() {
    var files = Array.prototype.slice.call($('zka-files').files || []);
    if (!files.length) return;
    var dir = 'evidence/' + uuid() + '/';
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(f.type)) { msg('zka-msg', false, f.name + ' — কেবল PDF, JPEG বা PNG'); continue; }
      if (f.size > 10 * 1024 * 1024) { msg('zka-msg', false, f.name + ' — ১০ MB-র বেশি'); continue; }
      var path = dir + Date.now() + '-' + safeName(f.name);
      try {
        var up = await db().storage.from('shariah-docs').upload(path, f, { contentType: f.type, upsert: false });
        if (up.error) throw up.error;
        S.ev.push({ path: path, name: f.name, type: f.type });
      } catch (e) { msg('zka-msg', false, f.name + ' — আপলোড হয়নি: ' + err(e)); }
    }
    $('zka-files').value = '';
    paintEv();
  }

  function resetForm() {
    S.edit = null; S.ev = [];
    ['zka-title', 'zka-amount', 'zka-cap', 'zka-bname', 'zka-bmob', 'zka-details', 'zka-pub'].forEach(function (id) { $(id).value = ''; });
    $('zka-hard').value = ''; $('zka-kind').value = 'debt_relief';
    if ($('zka-loan').options.length) $('zka-loan').value = '';
    $('zkaFormT').textContent = 'নতুন বিতরণ প্রস্তাব';
    var m = $('zka-msg'); m.className = 'msg';
    kindUI(); paintEv();
  }

  async function save(send) {
    var k = $('zka-kind').value;
    var p = { kind: k, title: $('zka-title').value.trim(), details: $('zka-details').value.trim(),
              public_summary: $('zka-pub').value.trim(), evidence: S.ev };
    if (k === 'policy') p.policy = { relief_cap_pct: $('zka-cap').value };
    else p.amount = $('zka-amount').value;
    if (k === 'debt_relief') { p.loan_id = $('zka-loan').value; p.hardship = $('zka-hard').value; }
    if (['parental_care', 'relief', 'livelihood'].indexOf(k) >= 0) { p.beneficiary_name = $('zka-bname').value.trim(); p.beneficiary_mobile = $('zka-bmob').value.trim(); }
    var b1 = $('zka-save'), b2 = $('zka-send');
    b1.disabled = b2.disabled = true;
    try {
      var r = await db().rpc('zakat_request_save', { p_id: S.edit ? S.edit.id : null, p: p });
      if (r.error) throw r.error;
      var id = r.data && r.data.id, no = r.data && r.data.request_no;
      if (send) {
        var s2 = await db().rpc('zakat_request_submit', { p_id: id });
        if (s2.error) throw s2.error;
        msg('zka-msg', true, no + ' — বোর্ডে পাঠানো হয়েছে (' + bn((s2.data && s2.data.members) || 0) + ' জন সদস্যকে বিজ্ঞপ্তি)।');
      } else msg('zka-msg', true, no + ' — খসড়া সংরক্ষিত হয়েছে।');
      var keep = $('zka-msg').textContent;
      resetForm(); msg('zka-msg', true, keep);
      refresh();
    } catch (e) { msg('zka-msg', false, err(e)); }
    b1.disabled = b2.disabled = false;
  }

  /* ── সারসংক্ষেপ ─────────────────────────────────────────────── */
  async function refresh() {
    build();
    try {
      var r = await db().rpc('zakat_dashboard');
      if (r.error) throw r.error;
      S.dash = r.data || {};
    } catch (e) {
      $('zkaStats').innerHTML = '<div class="empty-state"><p>' + esc(err(e)) + '</p></div>';
      return;
    }
    var d = S.dash, cap = d.cap || {}, req = d.requests || {};
    $('zkaStats').innerHTML =
      stat('sc-teal', 'ti-coins', money(d.collected), '<span>সংগৃহীত জাকাত</span> · ' + bn(d.collected_count || 0) + ' <span>টি দান</span>') +
      stat('sc-purple', 'ti-hand-move', money(d.disbursed), '<span>বিতরণ হয়েছে</span>') +
      stat('sc-green', 'ti-building-bank', money(d.available), '<span>তহবিলে আছে</span>') +
      stat('sc-gold', 'ti-scale', money(cap.remaining), '<span>এ বছর ঋণ মওকুফের বাকি সীমা</span> (' + bn(cap.pct) + '%)');
    var bars = function (obj, map) {
      var ks = Object.keys(obj || {});
      if (!ks.length) return '<p style="color:var(--muted);font-size:13.5px">এখনো কিছু নেই</p>';
      var max = Math.max.apply(null, ks.map(function (k) { return Number(obj[k]) || 0; })) || 1;
      return ks.map(function (k) {
        var v = Number(obj[k]) || 0;
        return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span>' + esc(map[k] || k) + '</span><b>' + money(v) + '</b></div>' +
          '<div style="height:8px;border-radius:6px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:' + Math.max(3, Math.round(v * 100 / max)) + '%;background:linear-gradient(90deg,#0f766e,#7048e8)"></div></div></div>';
      }).join('');
    };
    var CAT = { debt_relief: KIND.debt_relief, parental_care: KIND.parental_care, relief: KIND.relief, livelihood: KIND.livelihood };
    $('zkaBreak').innerHTML = '<div class="form-grid">' +
      '<div><div style="font-weight:700;margin-bottom:8px">প্রাপ্তির মাধ্যম</div>' + bars(d.by_method, METHOD) + '</div>' +
      '<div><div style="font-weight:700;margin-bottom:8px">বিতরণের খাত</div>' + bars(d.by_category, CAT) + '</div></div>' +
      '<div style="margin-top:10px;font-size:13.5px;color:var(--muted);line-height:1.8">' +
        'বিদেশ থেকে: <b>' + bn((d.foreign || {}).count || 0) + '</b>টি দান, <b>' + money((d.foreign || {}).amount) + '</b> · ' +
        '<span>অপেক্ষমাণ জাকাত দান:</span> <b>' + bn(d.pending_count || 0) + '</b> · ' +
        'এ বছর জাকাত প্রাপ্তি: <b>' + money(cap.year_receipts) + '</b>, ঋণ মওকুফে ব্যবহৃত: <b>' + money(cap.used) + '</b>' +
      '</div>';
    var seats = (d.member_seats || []).map(function (m) { return esc(m.seat || 'সদস্য') + (m.chief ? ' (প্রধান)' : ''); });
    $('zkaBoard').innerHTML = '<span>বোর্ডের সক্রিয় সদস্য:</span> <b>' + bn(d.members || 0) + '</b>' + (seats.length ? ' — <span data-no-i18n>' + seats.join(' · ') + '</span>' : '') + '<br>' +
      '<span>অনুমোদনের নিয়ম: সক্রিয় সদস্যদের অর্ধেকের বেশি "অনুমোদন" দিলে।</span><br>' +
      '<span>প্রস্তাব — বোর্ডে:</span> <b>' + bn(req.submitted || 0) + '</b> · <span>অনুমোদিত (বিতরণের অপেক্ষায়):</span> <b>' + bn(req.approved || 0) + '</b> · <span>বিতরণ সম্পন্ন:</span> <b>' + bn(req.posted || 0) + '</b>' +
      (d.members ? '' : '<div class="msg show err" style="margin-top:8px">⚠️ শরিয়াহ বোর্ডে এখনো কোনো অনুমোদিত সদস্য নেই — কমিটি ব্যবস্থাপনায় "শরিয়াহ" কমিটির আবেদন অনুমোদন করুন।</div>');
    paintNisab();
    setMenuBadge();
    loadList();
  }
  function stat(cls, icon, num, lbl) {
    return '<div class="stat-card ' + cls + '"><i class="ti ' + icon + ' stat-ico" style="color:#fff"></i><div class="stat-num" style="font-size:22px">' + esc(num) + '</div><div class="stat-lbl" style="color:#fff">' + lbl + '</div></div>';   /* lbl কেবল নিজের স্থির লেখা + সংখ্যা */
  }

  function paintNisab() {
    var n = (S.dash && S.dash.nisab) || {}, pol = (S.dash && S.dash.policy) || {};
    var age = daysOld(n.as_of), lim = Number(pol.nisab_stale_days) || 7;
    var stale = !n.silver_bdt_per_gram || age == null || age > lim;
    var now = $('zkaNisabNow');
    if (now) now.innerHTML = n.silver_bdt_per_gram
      ? 'বর্তমান: রুপা <b>' + money(n.silver_bdt_per_gram) + '</b>/গ্রাম · সোনা <b>' + money(n.gold_bdt_per_gram) + '</b>/গ্রাম · ' + esc(n.source || '') + ' · <b>' + esc(day(n.as_of)) + '</b>' +
        ' — রুপার নিসাব <b>' + money((Number(n.silver_bdt_per_gram) || 0) * (Number(n.silver_grams) || 612.36)) + '</b>'
      : 'দর এখনো বসানো হয়নি।';
    var sv = $('zka-silver');
    if (sv && !sv.value && n.silver_bdt_per_gram) {
      sv.value = n.silver_bdt_per_gram; $('zka-gold').value = n.gold_bdt_per_gram || '';
      $('zka-src').value = n.source || '';
    }
    var asof = $('zka-asof'); if (asof && !asof.value) asof.value = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
    var box = $('zkaStale');
    if (box) box.innerHTML = stale && isSuper()
      ? '<div class="msg show err" style="margin:0 0 14px"><span>⚠️ নিসাবের দর</span> ' + (age == null ? '<span>বসানো হয়নি</span>' : bn(age) + ' <span>দিন পুরনো</span>') + ' <span>— বাজুসের সর্বশেষ দর বসিয়ে দিন (নিচে "নিসাবের দর")।</span></div>' : '';
  }

  async function saveNisab() {
    var b = $('zka-nisab-save'); b.disabled = true;
    try {
      var r = await db().rpc('zakat_set_nisab', { p_silver: Number($('zka-silver').value) || null, p_gold: Number($('zka-gold').value) || null,
                                                  p_as_of: $('zka-asof').value || null, p_source: $('zka-src').value.trim() || null });
      if (r.error) throw r.error;
      msg('zka-nisab-msg', true, 'দর সংরক্ষিত হয়েছে — জাকাত পাতার ক্যালকুলেটরে এখনই দেখা যাবে।');
      refresh();
    } catch (e) { msg('zka-nisab-msg', false, err(e)); }
    b.disabled = false;
  }

  /* ── তালিকা ─────────────────────────────────────────────────── */
  async function loadList() {
    var c = $('zkaList');
    var list;
    try {
      var r = await db().rpc('zakat_requests_list', { p_status: null, p_limit: 300 });
      if (r.error) throw r.error;
      list = r.data || [];
    } catch (e) { c.innerHTML = '<div class="empty-state"><p>' + esc(err(e)) + '</p></div>'; return; }
    var f = S.filter;
    list = list.filter(function (x) {
      if (f === 'all') return true;
      if (f === 'open') return ['draft', 'submitted', 'info_needed', 'approved'].indexOf(x.status) >= 0;
      if (f === 'closed') return ['rejected', 'cancelled'].indexOf(x.status) >= 0;
      return x.status === f;
    });
    if (!list.length) { c.innerHTML = '<div class="empty-state"><i class="ti ti-inbox"></i><p>এই তালিকায় কোনো প্রস্তাব নেই</p></div>'; return; }
    var sup = isSuper();
    c.innerHTML = list.map(function (x) {
      var st = STATUS[x.status] || [x.status, 'b-review'], v = x.votes || {};
      var acts = [];
      if (x.status === 'draft' || x.status === 'info_needed') {
        acts.push('<button class="btn btn-sm btn-primary" data-act="edit" data-id="' + x.id + '"><i class="ti ti-edit"></i> সম্পাদনা</button>');
        acts.push('<button class="btn btn-sm btn-success" data-act="submit" data-id="' + x.id + '"><i class="ti ti-send"></i> বোর্ডে পাঠান</button>');
      }
      if (['draft', 'submitted', 'info_needed'].indexOf(x.status) >= 0)
        acts.push('<button class="btn btn-sm btn-danger" data-act="cancel" data-id="' + x.id + '"><i class="ti ti-x"></i> বাতিল</button>');
      if (x.status === 'approved' && x.kind === 'debt_relief' && !x.consent_at)
        acts.push('<label class="btn btn-sm btn-success" style="cursor:pointer"><i class="ti ti-upload"></i> কাগজের সম্মতিপত্র<input type="file" accept="application/pdf,image/jpeg,image/png" data-consent="' + x.id + '" hidden></label>');
      if (x.status === 'approved' && x.kind !== 'policy' && sup && (x.kind !== 'debt_relief' || x.consent_at))
        acts.push('<button class="btn btn-sm btn-gold" data-act="post" data-id="' + x.id + '" data-kind="' + x.kind + '"><i class="ti ti-circle-check"></i> বিতরণ সম্পন্ন করুন</button>');
      acts.push('<button class="btn btn-sm" style="background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted)" data-act="detail" data-id="' + x.id + '"><i class="ti ti-eye"></i> বিস্তারিত</button>');
      var consent = x.kind === 'debt_relief' && (x.status === 'approved' || x.status === 'posted')
        ? (x.consent_at ? ' · সম্মতি: <b>' + esc(day(x.consent_at)) + '</b>' : ' · <span class="badge b-pending">সম্মতির অপেক্ষায়</span>') : '';
      return '<div class="apv-card" style="margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<div style="min-width:0"><div style="font-weight:700;font-size:15px" data-no-i18n>' + esc(x.title) + '</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-top:3px">' + esc(x.request_no) + ' · <span>' + esc(KIND[x.kind] || x.kind) + '</span>' +
            (x.beneficiary_name ? ' · <span data-no-i18n>' + esc(x.beneficiary_name) + '</span>' : '') + (x.beneficiary_code ? ' · ' + esc(x.beneficiary_code) : '') +
            (x.approval_no ? ' · <b>' + esc(x.approval_no) + '</b>' : '') + consent + '</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-top:3px"><span>ভোট</span> — <span>অনুমোদন</span> ' + bn(v.approve || 0) + ' · <span>নামঞ্জুর</span> ' + bn(v.reject || 0) + ' · <span>আরও তথ্য</span> ' + bn(v.info || 0) +
            (x.round > 1 ? ' · <span>দফা</span> ' + bn(x.round) : '') + ' · ' + esc(day(x.created_at)) + '</div></div>' +
          '<div style="text-align:end"><span class="badge ' + st[1] + '">' + st[0] + '</span>' +
            '<div class="td-amount" style="margin-top:6px">' + (x.kind === 'policy' ? '—' : money(x.amount)) + '</div></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">' + acts.join('') + '</div>' +
        '<div data-box="' + x.id + '"></div></div>';
    }).join('');
  }

  async function onListClick(e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    var id = b.getAttribute('data-id'), act = b.getAttribute('data-act');
    var box = $('zkaList').querySelector('[data-box="' + id + '"]');
    var say = function (ok, t) { if (box) box.innerHTML = '<div class="msg show ' + (ok ? 'ok' : 'err') + '">' + esc(t) + '</div>'; };
    if (act === 'detail') return detail(id, box);
    if (act === 'edit') return editReq(id);
    if (act === 'post') return postForm(id, b.getAttribute('data-kind'), box);
    if (act === 'post-go') return postGo(id, box);
    b.disabled = true;
    try {
      var r;
      if (act === 'submit') r = await db().rpc('zakat_request_submit', { p_id: id });
      if (act === 'cancel') {
        var why = (box && box.querySelector('[data-why]')) ? box.querySelector('[data-why]').value.trim() : null;
        if (!box.querySelector('[data-why]')) {
          box.innerHTML = '<div class="fld" style="margin-top:10px"><label>বাতিলের কারণ</label><input data-why maxlength="300"></div>' +
            '<button class="btn btn-sm btn-danger" data-act="cancel" data-id="' + id + '" style="margin-top:6px">নিশ্চিতভাবে বাতিল করুন</button>';
          b.disabled = false; return;
        }
        r = await db().rpc('zakat_request_cancel', { p_id: id, p_reason: why || null });
      }
      if (r && r.error) throw r.error;
      say(true, act === 'submit' ? 'বোর্ডে পাঠানো হয়েছে।' : 'বাতিল হয়েছে।');
      setTimeout(refresh, 700);
    } catch (e2) { say(false, err(e2)); b.disabled = false; }
  }

  async function onListChange(e) {
    var inp = e.target.closest('[data-consent]'); if (!inp) return;
    var id = inp.getAttribute('data-consent'), f = inp.files && inp.files[0];
    var box = $('zkaList').querySelector('[data-box="' + id + '"]');
    if (!f) return;
    if (!/^(application\/pdf|image\/jpeg|image\/png)$/.test(f.type) || f.size > 10 * 1024 * 1024) {
      box.innerHTML = '<div class="msg show err">কেবল PDF/JPEG/PNG, ১০ MB-এর মধ্যে।</div>'; return;
    }
    try {
      var path = 'consent/' + id + '/' + Date.now() + '-' + safeName(f.name);
      var up = await db().storage.from('shariah-docs').upload(path, f, { contentType: f.type, upsert: false });
      if (up.error) throw up.error;
      var r = await db().rpc('zakat_relief_consent_paper', { p_id: id, p_doc: path });
      if (r.error) throw r.error;
      box.innerHTML = '<div class="msg show ok">স্বাক্ষরিত সম্মতিপত্র যুক্ত হয়েছে — এখন বিতরণ করা যাবে।</div>';
      setTimeout(refresh, 900);
    } catch (e2) { box.innerHTML = '<div class="msg show err">' + esc(err(e2)) + '</div>'; }
  }

  function postForm(id, kind, box) {
    var debt = kind === 'debt_relief';
    box.innerHTML = '<div style="margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:10px">' +
      (debt ? '<div style="font-size:13.5px;color:var(--muted);margin-bottom:8px">অঙ্কটি ঋণের সবচেয়ে পুরনো বকেয়া কিস্তি থেকে ক্রমে সমন্বয় হবে (মাধ্যম: জাকাত)। এটি ফেরানো যায় না।</div>'
            : '<div class="form-grid"><div class="fld"><label>প্রাপককে কোন মাধ্যমে দেওয়া হলো *</label><select data-pm>' +
              Object.keys(METHOD).map(function (k) { return '<option value="' + k + '">' + METHOD[k] + '</option>'; }).join('') + '</select></div>' +
              '<div class="fld"><label>রেফারেন্স / রশিদ নম্বর</label><input data-pref maxlength="80"></div></div>') +
      '<div class="fld" style="margin-top:8px"><label>মন্তব্য</label><input data-pnote maxlength="200"></div>' +
      '<button class="btn btn-sm btn-gold" data-act="post-go" data-id="' + id + '" style="margin-top:8px"><i class="ti ti-circle-check"></i> নিশ্চিত — জাকাত তহবিল থেকে বিতরণ</button></div>';
  }

  async function postGo(id, box) {
    var b = box.querySelector('[data-act="post-go"]'); b.disabled = true;
    var pm = box.querySelector('[data-pm]'), pr = box.querySelector('[data-pref]'), pn = box.querySelector('[data-pnote]');
    try {
      var r = await db().rpc('zakat_post', { p_id: id, p_method: pm ? pm.value : null, p_ref: pr ? (pr.value.trim() || null) : null,
                                             p_note: pn ? (pn.value.trim() || null) : null });
      if (r.error) throw r.error;
      box.innerHTML = '<div class="msg show ok">বিতরণ সম্পন্ন — ' + esc((r.data && r.data.approval_no) || '') + ' · তহবিলে বাকি ' + esc(money(r.data && r.data.pool_after)) + '</div>';
      setTimeout(refresh, 900);
    } catch (e) { box.insertAdjacentHTML('beforeend', '<div class="msg show err">' + esc(err(e)) + '</div>'); b.disabled = false; }
  }

  async function detail(id, box) {
    if (box.getAttribute('data-open') === '1') { box.innerHTML = ''; box.removeAttribute('data-open'); return; }
    box.innerHTML = '<p style="color:var(--muted);font-size:13px;margin-top:8px">লোড হচ্ছে…</p>';
    try {
      var r = await db().rpc('zakat_request_detail', { p_id: id });
      if (r.error) throw r.error;
      var d = r.data || {}, q = d.request || {}, l = d.loan;
      var ev = Array.isArray(q.evidence) ? q.evidence : [];
      var AUD = { create: 'তৈরি', edit: 'সম্পাদনা', submit: 'বোর্ডে পাঠানো', vote: 'ভোট', consent: 'সম্মতি', post: 'বিতরণ', cancel: 'বাতিল' };
      box.setAttribute('data-open', '1');
      box.innerHTML = '<div style="margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:10px;font-size:13.5px;line-height:1.8">' +
        (q.details ? '<div style="white-space:pre-wrap;margin-bottom:8px">' + esc(q.details) + '</div>' : '') +
        (q.public_summary ? '<div>প্রকাশ্য খাতা: <b>' + esc(q.public_summary) + '</b></div>' : '') +
        (q.beneficiary_mobile ? '<div>প্রাপকের মোবাইল: ' + esc(q.beneficiary_mobile) + '</div>' : '') +
        (l ? '<div>ঋণ: <b>' + esc(l.loan_no || '') + '</b> · ' + esc(l.borrower_name || '') + ' · বকেয়া ' + money(l.outstanding) + ' · মেয়াদোত্তীর্ণ কিস্তি ' + bn(l.overdue || 0) + '</div>' : '') +
        (q.consent_method ? '<div>সম্মতি: ' + (q.consent_method === 'self' ? 'ঋণগ্রহীতা নিজে (ড্যাশবোর্ড)' : 'কাগজে স্বাক্ষর') + ' · ' + esc(day(q.consent_at)) +
          (q.consent_doc ? ' · <button class="btn btn-sm" data-file="' + esc(q.consent_doc) + '" style="background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted)">সম্মতিপত্র দেখুন</button>' : '') + '</div>' : '') +
        (ev.length ? '<div>প্রমাণপত্র: ' + ev.map(function (x) { return '<button class="btn btn-sm" data-file="' + esc(x.path || x) + '" style="background:rgba(255,255,255,.06);border:1px solid var(--border);color:var(--muted);margin:2px">' + esc(x.name || 'ফাইল') + '</button>'; }).join('') + '</div>' : '') +
        '<div style="margin-top:6px"><b>বোর্ডের মতামত</b></div>' +
        ((d.votes || []).length ? (d.votes || []).map(function (v) {
          return '<div>• ' + esc(v.seat || 'সদস্য') + ' — <b>' + esc({ approve: 'অনুমোদন', reject: 'নামঞ্জুর', info: 'আরও তথ্য চাই' }[v.vote] || v.vote) + '</b>' +
            (v.signed ? ' (ই-স্বাক্ষরিত)' : '') + ' · ' + esc(day(v.at)) + (v.note ? '<div style="white-space:pre-wrap;color:var(--muted);margin-inline-start:14px">' + esc(v.note) + '</div>' : '') + '</div>';
        }).join('') : '<div style="color:var(--muted)">এখনো কোনো মতামত নেই</div>') +
        '<div style="margin-top:6px"><b>নিরীক্ষা লগ</b></div>' +
        (d.audit || []).map(function (a) { return '<div style="color:var(--muted)">' + esc(day(a.at)) + ' — ' + esc(AUD[a.action] || a.action) + '</div>'; }).join('') +
        '</div>';
      box.querySelectorAll('[data-file]').forEach(function (fb) {
        fb.addEventListener('click', async function () {
          var w = window.open('', '_blank');
          try { var s = await db().storage.from('shariah-docs').createSignedUrl(fb.getAttribute('data-file'), 600); if (s.error) throw s.error; w.location.href = s.data.signedUrl; }
          catch (e3) { if (w) w.close(); alert('ফাইল খোলা যায়নি'); }
        });
      });
    } catch (e) { box.innerHTML = '<div class="msg show err">' + esc(err(e)) + '</div>'; }
  }

  async function editReq(id) {
    try {
      var r = await db().rpc('zakat_request_detail', { p_id: id });
      if (r.error) throw r.error;
      var q = (r.data || {}).request || {};
      S.edit = q; S.ev = Array.isArray(q.evidence) ? q.evidence.slice() : [];
      $('zka-kind').value = q.kind; kindUI();
      $('zka-title').value = q.title || ''; $('zka-amount').value = q.amount || '';
      $('zka-cap').value = (q.policy || {}).relief_cap_pct || '';
      $('zka-hard').value = q.hardship || ''; $('zka-bname').value = q.beneficiary_name || ''; $('zka-bmob').value = q.beneficiary_mobile || '';
      $('zka-details').value = q.details || ''; $('zka-pub').value = q.public_summary || '';
      if (q.loan_id) { await loadLoans(); $('zka-loan').value = q.loan_id; }
      $('zkaFormT').textContent = q.request_no + ' — সম্পাদনা';
      paintEv();
      $('zkaFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) { alert(err(e)); }
  }

  /* ── মেনুর ব্যাজ: বিতরণের অপেক্ষায় + পুরনো দর ─────────────────── */
  function setMenuBadge() {
    var el = $('badge-zakat'); if (!el || !S.dash) return;
    var n = Number((S.dash.requests || {}).approved || 0);
    var nis = S.dash.nisab || {}, age = daysOld(nis.as_of), lim = Number((S.dash.policy || {}).nisab_stale_days) || 7;
    if (isSuper() && (!nis.silver_bdt_per_gram || age == null || age > lim)) n += 1;
    el.textContent = bn(n); el.style.display = n > 0 ? 'block' : 'none';
  }
  async function badge() {
    try { var r = await db().rpc('zakat_dashboard'); if (!r.error) { S.dash = r.data || {}; setMenuBadge(); } } catch (e) {}
  }

  window.KHZakatAdmin = { open: refresh, badge: badge };
})();
