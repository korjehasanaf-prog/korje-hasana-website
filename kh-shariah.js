/* ════════════════════════════════════════════════════════════════════
   kh-shariah.js — শরিয়াহ বোর্ডের পর্যালোচনা প্যানেল (shariah-board.html)
   ২ নভেম্বর ২০২৬

   ⚠️ সব অনুমতি সার্ভারে — এই পাতা কেবল দেখায়:
      my_shariah_status() → {member, admin, seat}
      zakat_requests_list / zakat_request_detail — বোর্ড সদস্য প্রাপকের নাম,
        মোবাইল বা ঋণ নম্বর পান না (সার্ভারই বাদ দেয়), কেবল গোপন কোড
      shariah_vote — একবারই, পরে বদলানো যায় না (ট্রিগার আটকায়)
      shariah_docs_list / shariah_doc_add / shariah_doc_publish
   ⚠️ নথি `shariah-docs` প্রাইভেট বাকেটে: docs/<uuid>.pdf; প্রমাণ দেখা
      হয় সাময়িক signed URL দিয়ে।
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  var MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var KIND = { debt_relief: 'অক্ষম ঋণগ্রস্তের ঋণ মওকুফ', parental_care: 'অবহেলিত পিতা-মাতা সেবা', relief: 'জরুরি ত্রাণ',
               livelihood: 'স্বাবলম্বীকরণ', policy: 'নীতিগত সিদ্ধান্ত' };
  var HARD = { disaster: 'প্রাকৃতিক দুর্যোগ', illness: 'দুরারোগ্য ব্যাধি', accident: 'দুর্ঘটনা', death: 'মৃত্যু', other: 'অন্যান্য' };
  var STATUS = { draft: 'খসড়া', submitted: 'মতামতের অপেক্ষায়', info_needed: 'আরও তথ্য চাওয়া হয়েছে', approved: 'অনুমোদিত',
                 rejected: 'নামঞ্জুর', posted: 'বিতরণ সম্পন্ন', cancelled: 'বাতিল' };
  var VOTE = { approve: 'অনুমোদন', reject: 'নামঞ্জুর', info: 'আরও তথ্য চাই' };
  var DOCKIND = { fatwa: 'ফতোয়া', resolution: 'রেজুলেশন', audit: 'অডিট', certificate: 'সনদ' };

  var S = { me: null, tab: 'pending', list: [], cur: null };

  function $(id) { return document.getElementById(id); }
  function db() { return (window.KHUI && KHUI.db && KHUI.db()) || window._db || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function bn(v) { return String(v).replace(/[0-9]/g, function (d) { return BN[+d]; }); }
  function money(n) { return '৳' + bn((Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })); }
  function day(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d)) return '—';
    var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    var g = {}; p.forEach(function (x) { g[x.type] = x.value; });
    return bn(g.day) + ' ' + MON[(+g.month) - 1] + ' ' + bn(g.year);
  }
  function chip(st) { return '<span class="sb-chip st-' + esc(st) + '">' + esc(STATUS[st] || st) + '</span>'; }
  function errText(e) { return (e && (e.message || e.error_description)) || 'কিছু একটা ভুল হয়েছে — আবার চেষ্টা করুন।'; }

  /* ── প্রবেশাধিকার ─────────────────────────────────────────────── */
  async function gate() {
    var c = db(), g = $('sbGate');
    if (!c) { g.innerHTML = '<p class="sb-sub">সংযোগ তৈরি হয়নি — পাতাটি রিফ্রেশ করুন।</p>'; return false; }
    var s = null;
    try { s = await c.auth.getSession(); } catch (e) {}
    if (!s || !s.data || !s.data.session) {
      g.innerHTML = '<i class="ti ti-login" aria-hidden="true"></i><h2 style="justify-content:center">আগে লগইন করুন</h2>' +
        '<p class="sb-sub">শরিয়াহ বোর্ডের সদস্যরা নিজের অ্যাকাউন্টে লগইন করে এই পাতায় মতামত দেন।</p>' +
        '<a class="sb-btn sb-btn-main" href="user-login.html?next=shariah-board.html"><i class="ti ti-login" aria-hidden="true"></i><span>লগইন করুন</span></a>';
      return false;
    }
    try {
      var r = await c.rpc('my_shariah_status');
      if (r.error) throw r.error;
      S.me = r.data || {};
    } catch (e) { S.me = {}; }
    if (!S.me.member && !S.me.admin) {
      g.innerHTML = '<i class="ti ti-lock" aria-hidden="true"></i><h2 style="justify-content:center">এই পাতা কেবল শরিয়াহ বোর্ডের জন্য</h2>' +
        '<p class="sb-sub">আপনার অ্যাকাউন্ট শরিয়াহ বোর্ডের অনুমোদিত সদস্য হিসেবে যুক্ত নয়। আমন্ত্রণ পেয়ে থাকলে আগে কমিটির সম্মতিপত্র জমা দিন।</p>' +
        '<a class="sb-btn sb-btn-soft" href="my-dashboard.html"><i class="ti ti-layout-dashboard" aria-hidden="true"></i><span>আমার ড্যাশবোর্ডে যান</span></a>';
      return false;
    }
    g.hidden = true;
    $('sbApp').hidden = false;
    var w = $('sbWho');
    w.hidden = false;
    w.innerHTML = '<i class="ti ti-user-check" aria-hidden="true"></i><span>' +
      (S.me.member ? esc(S.me.seat || 'শরিয়াহ বোর্ডের সদস্য') : 'অ্যাডমিন — কেবল দেখার জন্য') + '</span>';
    return true;
  }

  /* ── তালিকা ───────────────────────────────────────────────────── */
  async function loadList() {
    var box = $('sbList');
    try {
      var r = await db().rpc('zakat_requests_list', { p_status: null, p_limit: 200 });
      if (r.error) throw r.error;
      S.list = r.data || [];
    } catch (e) { box.innerHTML = '<p class="sb-empty">' + esc(errText(e)) + '</p>'; return; }
    var pend = S.list.filter(function (x) { return x.status === 'submitted' && !x.my_vote; });
    $('sbPendN').textContent = bn(pend.length);
    paintList();
    /* বিজ্ঞপ্তির লিংক: shariah-board.html#ZR-2026-0001 */
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (/^ZR-\d{4}-\d+$/.test(h)) {
      var hit = S.list.filter(function (x) { return x.request_no === h; })[0];
      if (hit) openDetail(hit.id);
    }
  }

  function paintList() {
    var box = $('sbList');
    var rows = S.tab === 'pending'
      ? S.list.filter(function (x) { return x.status === 'submitted' && (!x.my_vote || !S.me.member); })
      : S.list;
    if (!rows.length) {
      box.innerHTML = '<p class="sb-empty">' + (S.tab === 'pending' ? 'এখন আপনার মতামতের অপেক্ষায় কোনো প্রস্তাব নেই।' : 'এখনো কোনো প্রস্তাব আসেনি।') + '</p>';
      return;
    }
    box.innerHTML = rows.map(function (x) {
      var v = x.votes || {};
      return '<button type="button" class="sb-item" data-id="' + esc(x.id) + '"><div>' +
        '<b data-no-i18n>' + esc(x.title) + '</b>' +
        '<small><span class="sb-code">' + esc(x.request_no) + '</span> · <span>' + esc(KIND[x.kind] || x.kind) + '</span>' +
          (x.beneficiary_code ? ' · <span>প্রাপকের কোড</span> ' + esc(x.beneficiary_code) : '') + '</small>' +
        '<small>' + chip(x.status) + ' <span class="sb-votes"><span>অনুমোদন</span> <b>' + bn(v.approve || 0) + '</b> · <span>নামঞ্জুর</span> <b>' + bn(v.reject || 0) +
          '</b> · <span>আরও তথ্য</span> <b>' + bn(v.info || 0) + '</b></span>' +
          (x.my_vote ? ' · <span>আপনার মত:</span> <b>' + esc(VOTE[x.my_vote] || x.my_vote) + '</b>' : '') + '</small>' +
        '</div><span class="sb-amt">' + (x.kind === 'policy' ? '—' : esc(money(x.amount))) + '</span></button>';
    }).join('');
  }

  /* ── বিস্তারিত ────────────────────────────────────────────────── */
  async function openDetail(id) {
    var box = $('sbDetail');
    $('sbListCard').hidden = true;
    box.hidden = false;
    box.innerHTML = '<p class="sb-empty">লোড হচ্ছে…</p>';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var d;
    try {
      var r = await db().rpc('zakat_request_detail', { p_id: id });
      if (r.error) throw r.error;
      d = r.data || {};
    } catch (e) { box.innerHTML = '<button class="sb-btn sb-btn-soft sb-back" data-back>← তালিকায় ফিরুন</button><p class="sb-empty">' + esc(errText(e)) + '</p>'; return; }
    S.cur = d;
    var q = d.request || {}, l = d.loan, cap = d.cap || {}, ap = d.approval;
    var myVote = (d.votes || []).filter(function (v) { return v.mine && v.round === q.round; })[0];
    var canVote = S.me.member && q.status === 'submitted' && !myVote;
    var ev = Array.isArray(q.evidence) ? q.evidence : [];

    var html = '<button type="button" class="sb-btn sb-btn-soft sb-back" data-back><i class="ti ti-arrow-left" aria-hidden="true"></i><span>তালিকায় ফিরুন</span></button>' +
      '<h2><i class="ti ti-file-description" aria-hidden="true"></i><span data-no-i18n>' + esc(q.title) + '</span></h2>' +
      '<p class="sb-sub"><span>' + esc(q.request_no) + '</span> · <span>' + esc(KIND[q.kind] || q.kind) + '</span> · ' + chip(q.status) +
        (q.round > 1 ? ' · <span>দফা</span> <b>' + bn(q.round) + '</b>' : '') + '</p>' +
      '<div class="sb-dl">' +
        (q.kind === 'policy'
          ? '<div><span>প্রস্তাবিত ঋণ মওকুফ সীমা</span><b>' + bn((q.policy || {}).relief_cap_pct) + '%</b></div>' +
            '<div><span>বর্তমান সীমা</span><b>' + bn(cap.pct) + '%</b></div>'
          : '<div><span>অঙ্ক</span><b>' + esc(money(q.amount)) + '</b></div>') +
        (q.hardship ? '<div><span>কষ্টের কারণ</span><b>' + esc(HARD[q.hardship] || q.hardship) + '</b></div>' : '') +
        (q.beneficiary_code ? '<div><span>প্রাপকের গোপন কোড</span><b>' + esc(q.beneficiary_code) + '</b></div>' : '') +
        '<div><span>জাকাত তহবিলে আছে</span><b>' + esc(money(d.pool)) + '</b></div>' +
        '<div><span>বোর্ডের সদস্য</span><b>' + bn(d.members || 0) + '</b></div>' +
        '<div><span>জমা হয়েছে</span><b>' + esc(day(q.submitted_at || q.created_at)) + '</b></div>' +
      '</div>';

    if (q.kind === 'debt_relief') {
      html += '<h3 class="sb-h3"><i class="ti ti-scale" aria-hidden="true"></i><span>এ বছরের ঋণ মওকুফ সীমা</span></h3>' +
        '<div class="sb-dl">' +
          '<div><span>সীমা</span><b>' + bn(cap.pct) + '%</b></div>' +
          '<div><span>এ বছর জাকাত প্রাপ্তি</span><b>' + esc(money(cap.year_receipts)) + '</b></div>' +
          '<div><span>অবশিষ্ট সীমা</span><b>' + esc(money(cap.remaining)) + '</b></div>' +
        '</div>';
    }
    if (l) {
      html += '<h3 class="sb-h3"><i class="ti ti-wallet" aria-hidden="true"></i><span>ঋণের অবস্থা</span></h3>' +
        '<div class="sb-dl">' +
          '<div><span>মূল ঋণ</span><b>' + esc(money(l.principal)) + '</b></div>' +
          '<div><span>পরিশোধিত</span><b>' + esc(money(l.paid)) + '</b></div>' +
          '<div><span>বকেয়া</span><b>' + esc(money(l.outstanding)) + '</b></div>' +
          '<div><span>মাসিক কিস্তি</span><b>' + esc(money(l.monthly_emi)) + '</b></div>' +
          '<div><span>মেয়াদ (মাস)</span><b>' + bn(l.tenure_months || 0) + '</b></div>' +
          '<div><span>মেয়াদোত্তীর্ণ কিস্তি</span><b>' + bn(l.overdue || 0) + '</b></div>' +
        '</div>';
    }
    if (q.details) html += '<h3 class="sb-h3"><i class="ti ti-notes" aria-hidden="true"></i><span>বিবরণ</span></h3><div class="sb-text" data-no-i18n>' + esc(q.details) + '</div>';
    if (q.public_summary) html += '<h3 class="sb-h3"><i class="ti ti-world" aria-hidden="true"></i><span>প্রকাশ্য খাতার বিবরণ</span></h3><div class="sb-text" data-no-i18n>' + esc(q.public_summary) + '</div>';
    if (ev.length) {
      html += '<h3 class="sb-h3"><i class="ti ti-paperclip" aria-hidden="true"></i><span>প্রমাণপত্র</span></h3><div class="sb-ev">' +
        ev.map(function (x) {
          var p = typeof x === 'string' ? x : (x && x.path);
          var n = (x && x.name) || String(p || '').split('/').pop();
          return p ? '<button type="button" class="sb-btn sb-btn-soft" data-file="' + esc(p) + '"><i class="ti ti-file" aria-hidden="true"></i><span data-no-i18n>' + esc(n) + '</span></button>' : '';
        }).join('') + '</div>';
    }

    html += '<h3 class="sb-h3"><i class="ti ti-messages" aria-hidden="true"></i><span>সদস্যদের মতামত</span></h3>';
    var votes = d.votes || [];
    html += votes.length ? '<div class="sb-vlist">' + votes.map(function (v) {
      return '<div class="sb-v ' + esc(v.vote) + '"><b>' + esc(VOTE[v.vote] || v.vote) + '</b> · <span>' + esc(v.seat || 'সদস্য') + '</span>' +
        (v.mine ? ' · <b>(আপনি)</b>' : '') + (v.signed ? ' · <span>ই-স্বাক্ষরিত</span>' : '') +
        ' · <small>' + esc(day(v.at)) + (v.round > 1 ? ' · দফা ' + bn(v.round) : '') + '</small>' +
        (v.note ? '<div data-no-i18n style="margin-top:4px;white-space:pre-wrap">' + esc(v.note) + '</div>' : '') + '</div>';
    }).join('') + '</div>' : '<p class="sb-sub">এখনো কেউ মতামত দেননি।</p>';

    if (ap) {
      html += '<div class="sb-msg ok"><b>শরিয়াহ বোর্ড অনুমোদিত</b> · <span>' + esc(ap.approval_no) + '</span> · <b>' + bn(ap.approvals) + ' / ' + bn(ap.members) + '</b> ' +
        '<a class="sb-link" href="zakat.html?approval=' + encodeURIComponent(ap.approval_no) + '#ledger" target="_blank" rel="noopener">প্রকাশ্য খাতায় দেখুন</a></div>';
    }
    if (myVote) html += '<div class="sb-msg info">আপনি এই দফায় মতামত দিয়েছেন: <b>' + esc(VOTE[myVote.vote] || myVote.vote) + '</b></div>';

    if (canVote) {
      html += '<form class="sb-form" id="sbVoteForm"><h3 class="sb-h3" style="margin-top:0"><i class="ti ti-gavel" aria-hidden="true"></i><span>আপনার মতামত</span></h3>' +
        '<div class="sb-radios" role="radiogroup" aria-label="মতামত">' +
          '<label><input type="radio" name="sbVote" value="approve"><span>অনুমোদন</span></label>' +
          '<label><input type="radio" name="sbVote" value="info"><span>আরও তথ্য চাই</span></label>' +
          '<label><input type="radio" name="sbVote" value="reject"><span>নামঞ্জুর</span></label>' +
        '</div>' +
        '<div class="sb-f"><label for="sbNote">শারই নোট / কারণ</label><textarea class="sb-ta" id="sbNote" maxlength="2000"></textarea><small>অনুমোদন না দিলে কারণ লেখা বাধ্যতামূলক। নোট কেবল বোর্ড ও অ্যাডমিন দেখেন।</small></div>' +
        (q.kind !== 'policy' ? '<div class="sb-f" id="sbPubF" hidden><label for="sbPub">প্রকাশ্য খাতার এক লাইনের বিবরণ (ঐচ্ছিক)</label><input class="sb-in" id="sbPub" maxlength="400" value="' + esc(q.public_summary || '') + '"><small>কারো নাম, মোবাইল বা ঠিকানা লিখবেন না — যেমন "বন্যায় ক্ষতিগ্রস্ত সদস্যের ঋণ পরিশোধ"।</small></div>' : '') +
        '<p class="sb-sub" id="sbSig"></p>' +
        '<button type="submit" class="sb-btn sb-btn-main" id="sbVoteBtn"><i class="ti ti-send" aria-hidden="true"></i><span>মতামত জমা দিন</span></button>' +
        '<p class="sb-sub" style="margin-top:8px">জমা দেওয়ার পর মতামত আর বদলানো যায় না।</p>' +
        '<div id="sbVoteMsg" aria-live="polite"></div></form>';
    }
    box.innerHTML = html;
    if (canVote) wireVote(q);
  }

  async function wireVote(q) {
    var f = $('sbVoteForm');
    f.querySelectorAll('input[name="sbVote"]').forEach(function (r) {
      r.addEventListener('change', function () { var pf = $('sbPubF'); if (pf) pf.hidden = r.value !== 'approve' || !r.checked; });
    });
    try {
      var st = await db().rpc('my_signature_status');
      var has = st && st.data && st.data.has;
      $('sbSig').innerHTML = has
        ? '<i class="ti ti-signature" aria-hidden="true"></i> <span>আপনার ই-সিগনেচার এই মতামতের সাথে যুক্ত হবে।</span>'
        : '<i class="ti ti-alert-triangle" aria-hidden="true"></i> <span>আপনার ই-সিগনেচার নেই — মতামত দেওয়া যাবে, তবে</span> <a class="sb-link" href="my-profile.html">প্রোফাইলে স্বাক্ষর যোগ করুন</a>।';
    } catch (e) {}
    f.addEventListener('submit', async function (e) {
      e.preventDefault();
      var v = (f.querySelector('input[name="sbVote"]:checked') || {}).value;
      var note = $('sbNote').value.trim();
      var msg = $('sbVoteMsg');
      if (!v) { msg.innerHTML = '<div class="sb-msg bad">মতামত বাছুন।</div>'; return; }
      if (v !== 'approve' && !note) { msg.innerHTML = '<div class="sb-msg bad">অনুমোদন না দিলে কারণ লিখুন।</div>'; $('sbNote').focus(); return; }
      var btn = $('sbVoteBtn');
      btn.disabled = true;
      try {
        var r = await db().rpc('shariah_vote', { p_id: q.id, p_vote: v, p_note: note || null,
          p_public_summary: v === 'approve' && $('sbPub') ? ($('sbPub').value.trim() || null) : null });
        if (r.error) throw r.error;
        var d = r.data || {};
        var res = d.status === 'approved' || d.status === 'posted'
          ? 'সংখ্যাগরিষ্ঠ অনুমোদন পূর্ণ হয়েছে — অনুমোদন আইডি ' + (d.approval_no || '')
          : d.status === 'rejected' ? 'সংখ্যাগরিষ্ঠ মতে প্রস্তাবটি নামঞ্জুর হয়েছে।'
          : d.status === 'info_needed' ? 'প্রস্তাবটি আরও তথ্যের জন্য অ্যাডমিনের কাছে ফেরত গেছে।'
          : 'আপনার মতামত জমা হয়েছে — অন্য সদস্যদের মতামতের অপেক্ষা।';
        msg.innerHTML = '<div class="sb-msg ok">' + esc(res) + '</div>';
        await loadList();
        setTimeout(function () { openDetail(q.id); }, 900);
      } catch (e2) {
        msg.innerHTML = '<div class="sb-msg bad">' + esc(errText(e2)) + '</div>';
        btn.disabled = false;
      }
    });
  }

  async function openFile(path) {
    var w = window.open('', '_blank');
    try {
      var r = await db().storage.from('shariah-docs').createSignedUrl(path, 600);
      if (r.error || !r.data) throw r.error;
      if (w) w.location.href = r.data.signedUrl; else location.href = r.data.signedUrl;
    } catch (e) { if (w) w.close(); alert('ফাইলটি খোলা যায়নি।'); }
  }

  /* ── নথি ──────────────────────────────────────────────────────── */
  async function loadDocs() {
    var box = $('sbDocList');
    try {
      var r = await db().rpc('shariah_docs_list');
      if (r.error) throw r.error;
      var list = r.data || [];
      box.innerHTML = list.length ? list.map(function (d) {
        return '<div class="sb-doc"><i class="ti ti-file-type-pdf" aria-hidden="true"></i><div style="min-width:0">' +
          '<b data-no-i18n>' + esc(d.title_bn) + '</b>' +
          '<small><span>' + esc(DOCKIND[d.kind] || d.kind) + '</span> · ' + esc(d.ref_no) + (d.doc_date ? ' · ' + esc(day(d.doc_date)) : '') +
            ((d.approvals || []).length ? ' · ' + (d.approvals || []).map(esc).join(', ') : '') + '</small></div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
            '<button type="button" class="sb-btn sb-btn-soft" data-file="' + esc(d.file_path) + '"><i class="ti ti-eye" aria-hidden="true"></i><span>দেখুন</span></button>' +
            '<label class="sb-switch"><input type="checkbox" data-pub="' + esc(d.id) + '"' + (d.published ? ' checked' : '') + '><span>প্রকাশিত</span></label>' +
          '</div></div>';
      }).join('') : '<p class="sb-empty">এখনো কোনো নথি আপলোড হয়নি।</p>';
      box.querySelectorAll('[data-pub]').forEach(function (cb) {
        cb.addEventListener('change', async function () {
          cb.disabled = true;
          try {
            var r2 = await db().rpc('shariah_doc_publish', { p_id: cb.getAttribute('data-pub'), p_published: cb.checked });
            if (r2.error) throw r2.error;
          } catch (e) { cb.checked = !cb.checked; alert(errText(e)); }
          cb.disabled = false;
        });
      });
    } catch (e) { box.innerHTML = '<p class="sb-empty">' + esc(errText(e)) + '</p>'; }
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }

  async function uploadDoc(e) {
    e.preventDefault();
    var msg = $('sbDocMsg'), btn = $('sbDocBtn');
    var file = $('sbDocFile').files[0];
    var say = function (k, t) { msg.innerHTML = '<div class="sb-msg ' + k + '">' + esc(t) + '</div>'; };
    if (!$('sbDocTbn').value.trim()) { say('bad', 'নথির বাংলা শিরোনাম লিখুন।'); $('sbDocTbn').focus(); return; }
    if (!file) { say('bad', 'PDF ফাইলটি বাছুন।'); return; }
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { say('bad', 'কেবল PDF ফাইল আপলোড করা যায়।'); return; }
    if (file.size > 10 * 1024 * 1024) { say('bad', 'ফাইলটি ১০ MB-র বেশি।'); return; }
    btn.disabled = true; say('info', 'আপলোড হচ্ছে…');
    try {
      var path = 'docs/' + uuid() + '.pdf';
      var up = await db().storage.from('shariah-docs').upload(path, file, { contentType: 'application/pdf', upsert: false });
      if (up.error) throw up.error;
      var appr = $('sbDocAppr').value.split(/[,\s]+/).map(function (x) { return x.trim().toUpperCase(); }).filter(Boolean);
      var r = await db().rpc('shariah_doc_add', { p: {
        kind: $('sbDocKind').value, title_bn: $('sbDocTbn').value.trim(), title_en: $('sbDocTen').value.trim(),
        title_ar: $('sbDocTar').value.trim(), signed_by: $('sbDocSign').value.trim(), doc_date: $('sbDocDate').value || null,
        file_path: path, approval_nos: appr } });
      if (r.error) throw r.error;
      if ($('sbDocPub').checked && r.data && r.data.id) {
        var p2 = await db().rpc('shariah_doc_publish', { p_id: r.data.id, p_published: true });
        if (p2.error) throw p2.error;
      }
      say('ok', 'নথি সংরক্ষিত হয়েছে — ' + ((r.data && r.data.ref_no) || ''));
      $('sbDocForm').reset();
      loadDocs();
    } catch (e2) { say('bad', errText(e2)); }
    btn.disabled = false;
  }

  /* ── ট্যাব ও শুরু ──────────────────────────────────────────────── */
  function setTab(t) {
    S.tab = t;
    document.querySelectorAll('.sb-tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-tab') === t); });
    var docs = t === 'docs';
    $('sbDocs').hidden = !docs;
    $('sbDetail').hidden = true;
    $('sbListCard').hidden = docs;
    if (docs) { loadDocs(); return; }
    $('sbListH').innerHTML = t === 'pending'
      ? '<i class="ti ti-inbox" aria-hidden="true"></i><span>মতামতের অপেক্ষায়</span>'
      : '<i class="ti ti-list-details" aria-hidden="true"></i><span>সব প্রস্তাব</span>';
    $('sbListSub').textContent = t === 'pending' ? 'যে প্রস্তাবে এখনো আপনার মতামত দেওয়া হয়নি।' : 'খসড়া ছাড়া সব প্রস্তাব — নতুনটি আগে।';
    paintList();
  }

  async function boot() {
    if (!(await gate())) return;
    document.querySelectorAll('.sb-tab').forEach(function (b) { b.addEventListener('click', function () { setTab(b.getAttribute('data-tab')); }); });
    document.addEventListener('click', function (e) {
      var it = e.target.closest && e.target.closest('.sb-item[data-id]');
      if (it) { openDetail(it.getAttribute('data-id')); return; }
      if (e.target.closest && e.target.closest('[data-back]')) {
        $('sbDetail').hidden = true; $('sbListCard').hidden = false;
        try { history.replaceState(null, '', location.pathname); } catch (e2) {}
        return;
      }
      var f = e.target.closest && e.target.closest('[data-file]');
      if (f) { e.preventDefault(); openFile(f.getAttribute('data-file')); }
    });
    $('sbDocForm').addEventListener('submit', uploadDoc);
    if (!S.me.member && !S.me.admin) return;
    loadList();
    if (location.hash === '#docs') setTab('docs');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
