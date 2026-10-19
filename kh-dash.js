/* ============================================================
   কর্জে হাসানা ফাউন্ডেশন — ড্যাশবোর্ড (পাবলিক ও অ্যাডমিন একই কোড)
   ডেটা:
     • public_stats()            — ওয়েবসাইটে প্রদর্শিত সেই একই "আজ পর্যন্ত" হিসাব
     • public_stats_detail(topic) — প্রতিটি কার্ডের বিস্তারিত (ওয়েবসাইটের মতোই)
     • kh_admin_dash(topic)      — শুধু অনুমোদিত অ্যাডমিন (সার্ভারে যাচাই হয়)
   ব্যবহার: KHDash.init({ admin: true|false })
   প্রয়োজন: _supabase.js (window._db)
   ============================================================ */
(function (global) {
  'use strict';

  var BN = '০১২৩৪৫৬৭৮৯';
  var MON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  var ADMIN_TOPICS = { loan_apps: 1, overdue: 1, pending_tx: 1, recent_tx: 1, loans: 1, donation_methods: 1 };
  var S = { admin: false, db: null, root: null, stats: null, adm: null, me: null, views: [], timer: null };
  var uid = 0;

  /* ── ফরম্যাটিং ─────────────────────────────────── */
  function bn(s) { return String(s).replace(/[0-9]/g, function (d) { return BN.charAt(+d); }); }
  function num(v) { return bn(Number(v || 0).toLocaleString('en-US')); }
  function taka(v) { var x = Number(v || 0); return (x < 0 ? '−' : '') + '৳' + num(Math.round(Math.abs(x))); }
  function compact(v, money) {
    var x = Number(v || 0);
    if (!money) return num(Math.round(x));
    if (x >= 100000) return bn((x / 100000).toFixed(1)) + ' লাখ';
    if (x >= 1000) return bn(Math.round(x / 1000)) + 'হাজার';
    return bn(Math.round(x));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function isMonthKey(k) { return /^\d{4}-\d{2}$/.test(String(k || '')); }
  function monthLbl(k) { return isMonthKey(k) ? MON[+k.slice(5, 7) - 1] : String(k || ''); }
  function dayLbl(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? bn(+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + bn(m[1]) : '';
  }
  function fmtVal(c, v) {
    if (v == null) return '—';
    if (c.suffix) return bn(Number(v).toFixed(1)) + c.suffix;
    return c.money ? taka(v) : num(v);
  }
  function $(id) { return document.getElementById(id); }
  function head(s, key) {
    var hs = (s && s.funds && s.funds.heads) || [];
    for (var i = 0; i < hs.length; i++) if (hs[i].key === key) return hs[i];
    return {};
  }
  function updLabel(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return '';
    var h = +m[4], ap = h < 12 ? 'পূর্বাহ্ণ' : 'অপরাহ্ণ', h12 = h % 12 || 12;
    return bn(+m[3]) + ' ' + MON[+m[2] - 1] + ', ' + bn((h12 < 10 ? '0' : '') + h12 + ':' + m[5]) + ' ' + ap;
  }

  /* ── কার্ড সংজ্ঞা ──────────────────────────────── */
  /* topic  → বিস্তারিত কোন টপিক থেকে আসবে
     val    → পাবলিক ডেটা থেকে মান (stats)
     adm    → অ্যাডমিন সারসংক্ষেপের key (কেবল অ্যাডমিন)
     labelFn→ ফান্ডের নাম ডেটা থেকে */
  function cardsFor(viewId, admin) {
    var pub = {
      overview: [
        { topic: 'donation', icon: 'ti-heart-handshake', tone: 'hi', label: 'সর্বমোট দান', money: true,
          val: function (s) { return s.donation.total; },
          sub: function (s) { return num(s.donation.count) + ' টি নিশ্চিত দান · ' + num(s.donation.donors) + ' জন দাতা'; } },
        { topic: 'savings', icon: 'ti-pig-money', label: 'মোট সঞ্চয় জমা', money: true,
          val: function (s) { return s.savings.deposit; },
          sub: function (s) { return num(s.savings.accounts) + ' টি হিসাব · ' + num(s.savings.members) + ' জন সদস্য'; } },
        { topic: 'loan', icon: 'ti-cash-banknote', label: 'ঋণ বিতরণ', money: true,
          val: function (s) { return s.loan.principal; },
          sub: function (s) { return num(s.loan.people) + ' জনকে ' + num(s.loan.count) + ' টি ঋণ'; } },
        { topic: 'loan', icon: 'ti-arrow-back-up', label: 'ঋণ আদায়', money: true,
          val: function (s) { return s.loan.recovered; }, sub: function () { return 'কিস্তি থেকে পরিশোধিত'; } },
        { topic: 'loan', icon: 'ti-hourglass', label: 'বকেয়া ঋণ', money: true,
          val: function (s) { return s.loan.outstanding; }, sub: function () { return 'এখনো আদায়যোগ্য'; } },
        { topic: 'lendable', icon: 'ti-scale', label: 'ঋণযোগ্য তহবিল', money: true,
          val: function (s) { return s.lendable.balance; }, sub: function () { return 'বিতরণের জন্য প্রস্তুত'; } }
      ],
      members: [
        { topic: 'donation', icon: 'ti-users', label: 'মোট দাতা', val: function (s) { return s.donation.donors; },
          sub: function () { return 'নিশ্চিত দান দিয়েছেন'; } },
        { topic: 'savings', icon: 'ti-wallet', label: 'সঞ্চয়কারী সদস্য', val: function (s) { return s.savings.members; },
          sub: function () { return 'সঞ্চয় হিসাবধারী'; } },
        { topic: 'loan', icon: 'ti-hand-holding', label: 'ঋণগ্রহীতা', val: function (s) { return s.loan.people; },
          sub: function () { return 'ঋণ পেয়েছেন'; } },
        { topic: 'savings', icon: 'ti-building-bank', label: 'সক্রিয় সঞ্চয় হিসাব', val: function (s) { return s.savings.accounts; },
          sub: function () { return 'বর্তমানে চালু'; } }
      ],
      finance: [
        { topic: 'loanfund', icon: 'ti-coins', tone: 'hi', label: 'ঋণ তহবিল', money: true,
          labelFn: function (s) { return head(s, 'loan').label; },
          val: function (s) { return head(s, 'loan').balance; },
          sub: function (s) { var h = head(s, 'loan'); return 'প্রাপ্তি ' + taka(h.income) + ' · ব্যয় ' + taka(h.expense); } },
        { topic: 'revolving', icon: 'ti-refresh', label: 'রিভলভিং ফান্ড', money: true,
          labelFn: function (s) { return head(s, 'revolving').label; },
          val: function (s) { return head(s, 'revolving').balance; },
          sub: function (s) { var h = head(s, 'revolving'); return 'কিস্তি আদায় থেকে · ব্যয় ' + taka(h.expense); } },
        { topic: 'savingsfund', icon: 'ti-building-bank', label: 'সঞ্চয় থেকে ঋণযোগ্য', money: true,
          labelFn: function (s) { return head(s, 'savings').label; },
          val: function (s) { return head(s, 'savings').balance; },
          sub: function (s) { var h = head(s, 'savings'); return 'প্রাপ্তি ' + taka(h.income) + ' · ব্যয় ' + taka(h.expense); } },
        { topic: 'emergency', icon: 'ti-first-aid-kit', label: 'জরুরি ফান্ড', money: true,
          labelFn: function (s) { return head(s, 'emergency').label; },
          val: function (s) { return head(s, 'emergency').balance; },
          sub: function (s) { var h = head(s, 'emergency'); return 'প্রাপ্তি ' + taka(h.income) + ' · ব্যয় ' + taka(h.expense); } },
        { topic: 'operation', icon: 'ti-tool', label: 'অপারেশন ফান্ড', money: true,
          labelFn: function (s) { return head(s, 'operation').label; },
          val: function (s) { return head(s, 'operation').balance; },
          sub: function (s) { var h = head(s, 'operation'); return 'প্রাপ্তি ' + taka(h.income) + ' · ব্যয় ' + taka(h.expense); } },
        { topic: 'otr', icon: 'ti-target-arrow', label: 'সময়মতো পরিশোধের হার', suffix: '%',
          val: function (s) { return s.collection.otr_pct; }, sub: function () { return 'মেয়াদ পেরোনো কিস্তির হিসাবে'; } },
        { topic: 'otr', icon: 'ti-chart-donut', label: 'মোট আদায়ের হার', suffix: '%',
          val: function (s) { return s.collection.collection_pct; }, sub: function () { return 'প্রাপ্য কিস্তির তুলনায়'; } },
        { topic: 'otr', icon: 'ti-alert-triangle', label: 'মোট বকেয়া টাকা', money: true,
          val: function (s) { return s.collection.overdue_amount; }, sub: function (s) { return num(s.collection.defaulters) + ' জন খেলাপি'; } }
      ]
    };
    var adm = {
      overview: [],
      activity: [
        { topic: 'loan_apps', icon: 'ti-file-text', tone: 'hi', label: 'চলমান ঋণ আবেদন', adm: 'loan_apps',
          sub: function () { return 'অনুমোদন প্রক্রিয়ায়'; } },
        { topic: 'loan_apps', icon: 'ti-cash', label: 'আবেদনকৃত অর্থ', money: true, adm: 'loan_apps_amt',
          sub: function () { return 'সব চলমান আবেদনের মোট'; } },
        { topic: 'pending_tx', icon: 'ti-clock-hour-4', label: 'অপেক্ষমাণ লেনদেন', adm: 'pending_tx',
          sub: function () { return 'সঞ্চয় জমা/উত্তোলন অনুমোদনের অপেক্ষায়'; } },
        { topic: 'overdue', icon: 'ti-calendar-x', label: 'মেয়াদোত্তীর্ণ কিস্তি', adm: 'overdue',
          sub: function () { return 'নির্ধারিত তারিখ পেরিয়েছে'; } },
        { topic: 'overdue', icon: 'ti-alert-circle', label: 'মেয়াদোত্তীর্ণ টাকা', money: true, adm: 'overdue_amt',
          sub: function () { return 'এখনো পরিশোধ হয়নি'; } },
        { topic: 'loans', icon: 'ti-list-details', label: 'চলমান ঋণ', adm: 'active_loans',
          sub: function () { return 'ঋণের তালিকা ও কিস্তির অবস্থা'; } },
        { topic: 'recent_tx', icon: 'ti-activity', label: 'সাম্প্রতিক লেনদেন', text: 'তালিকা',
          sub: function () { return 'শেষ ৩০ দিনের দান ও সঞ্চয়'; } }
      ],
      members: [
        { topic: 'donation_methods', icon: 'ti-credit-card', label: 'দানের মাধ্যম', val: function (s) { return s.donation.count; },
          sub: function () { return 'কোন মাধ্যমে কত দান এসেছে'; } }
      ],
      finance: []
    };
    var list = (pub[viewId] || []).slice();
    if (admin && adm[viewId]) list = list.concat(adm[viewId]);
    return list;
  }

  var VIEW_DEFS = [
    { id: 'overview', label: 'ওভারভিউ', icon: 'ti-layout-dashboard', title: 'আর্থিক সারসংক্ষেপ', sub: 'দান, সঞ্চয় ও ঋণের এই মুহূর্তের চিত্র' },
    { id: 'activity', label: 'কার্যক্রম', icon: 'ti-activity', title: 'অ্যাডমিন কার্যক্রম', sub: 'আবেদন, অনুমোদন ও কিস্তির অবস্থা', adminOnly: true },
    { id: 'members', label: 'সদস্য ও দাতা', icon: 'ti-users', title: 'সদস্য ও দাতা', sub: 'কতজন দাতা, সঞ্চয়কারী ও ঋণগ্রহীতা' },
    { id: 'finance', label: 'আর্থিক', icon: 'ti-chart-pie', title: 'তহবিল ও আদায়', sub: 'প্রতিটি তহবিলের প্রাপ্তি, ব্যয় ও স্থিতি' }
  ];

  function viewsFor(admin) { return VIEW_DEFS.filter(function (v) { return admin || !v.adminOnly; }); }

  /* ── মান বের করা ─────────────────────────────── */
  function admCard(key) {
    var cs = (S.adm && S.adm.cards) || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].key === key) return cs[i];
    return null;
  }
  function cardValue(c) {
    if (c.text) return null;
    if (c.adm) { var a = admCard(c.adm); return a ? a.value : null; }
    if (c.val && S.stats) return c.val(S.stats);
    return null;
  }
  function cardLabel(c) { return (c.labelFn && S.stats) ? (c.labelFn(S.stats) || c.label) : c.label; }
  function cardSub(c) {
    if (typeof c.sub === 'function') return S.stats ? c.sub(S.stats) : '';
    return c.sub || '';
  }
  function isAdminTopic(topic) { return !!ADMIN_TOPICS[topic]; }

  /* ── HTML বিল্ডার ─────────────────────────────── */
  function cardHTML(c, first) {
    var label = cardLabel(c), sub = cardSub(c), v = cardValue(c);
    var valTxt = c.text ? c.text : fmtVal(c, v);
    var adminTopic = !!c.adm || isAdminTopic(c.topic);
    var tone = (first && c.tone === 'hi') ? ' hi' : '';
    return '<article class="card kd-card' + tone + '" role="button" tabindex="0" data-topic="' + esc(c.topic) +
      '" data-admin="' + (adminTopic ? 1 : 0) + '" data-s="' + esc(label + ' ' + sub) + '">' +
      '<div class="kd-kh"><span>' + esc(label) + '</span><i class="ti ' + esc(c.icon) + '" aria-hidden="true"></i></div>' +
      '<h2>' + esc(valTxt) + '</h2>' +
      '<p class="sub">' + esc(sub) + '</p>' +
      '<span class="kd-more">বিস্তারিত <i class="ti ti-arrow-right" aria-hidden="true"></i></span>' +
      '</article>';
  }

  function rowHTML(r) {
    var meta = [];
    if (r.note) meta.push(esc(r.note));
    if (r.date) meta.push(esc(dayLbl(r.date)));
    var right = '';
    if (r.value != null) right += '<b>' + esc(r.money === false ? num(r.value) : taka(r.value)) + '</b>';
    if (r.count != null) right += '<small>' + esc(num(r.count) + (/\(/.test(r.label || '') ? '' : ' টি')) + '</small>';
    return '<div class="kd-row"><div class="kd-row-l"><span>' + esc(r.label) + '</span>' +
      (meta.length ? '<em>' + meta.join(' · ') + '</em>' : '') + '</div><div class="kd-row-r">' + right + '</div></div>';
  }

  function detailBodyHTML(d) {
    var h = '';
    if (d.subtitle) h += '<p class="kd-lead">' + esc(d.subtitle) + '</p>';
    if (d.cards && d.cards.length) {
      h += '<div class="kd-mini">' + d.cards.map(function (c) {
        return '<div class="kd-mc kd-t-' + esc(c.tone || 'violet') + '"><span>' + esc(c.label) + '</span><b>' +
          esc(fmtVal(c, c.value)) + '</b></div>';
      }).join('') + '</div>';
    }
    var pts = (d.series && d.series.points) || [];
    if (pts.length) {
      h += '<div class="kd-box"><div class="kd-box-h">' + esc((d.series && d.series.title) || '') + '</div><div class="kd-chart" data-chart></div></div>';
    }
    if (d.rows && d.rows.length) {
      h += '<div class="kd-rows">' + d.rows.map(rowHTML).join('') + '</div>';
    }
    if (!h) h = '<p class="kd-empty">এখনো কোনো তথ্য নেই।</p>';
    return h;
  }

  /* ── চার্ট ─────────────────────────────────────── */
  var NS = 'http://www.w3.org/2000/svg';
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function barSvg(labels, values, money, title) {
    var W = 640, H = 240, P = { l: 56, r: 10, t: 14, b: 30 };
    var id = 'kdg' + (++uid);
    var svg = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': title || 'চার্ট' });
    var defs = sv('defs', {}, svg);
    var g = sv('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    sv('stop', { offset: '0%', 'stop-color': '#f08c28' }, g);
    sv('stop', { offset: '100%', 'stop-color': '#d6336c' }, g);
    var iw = W - P.l - P.r, ih = H - P.t - P.b;
    var max = Math.max.apply(null, [1].concat(values.map(function (v) { return Number(v) || 0; })));
    for (var i = 0; i <= 4; i++) {
      var y = P.t + ih - ih * i / 4;
      sv('line', { x1: P.l, x2: W - P.r, y1: y, y2: y, 'class': 'grid' }, svg);
      var t = sv('text', { x: P.l - 8, y: y + 4, 'text-anchor': 'end', 'class': 'axis' }, svg);
      t.textContent = compact(max * i / 4, money);
    }
    var gw = iw / Math.max(labels.length, 1), bw = Math.max(6, Math.min(30, gw * 0.6));
    var step = Math.max(1, Math.ceil(labels.length / 10));
    labels.forEach(function (lab, idx) {
      var v = Number(values[idx]) || 0;
      var h = v > 0 ? Math.max(3, ih * v / max) : 0;
      var cx = P.l + gw * idx + gw / 2;
      var r = sv('rect', { x: cx - bw / 2 + bw * 0.1, y: P.t + ih - h, width: bw * 0.8, height: h, rx: bw * 0.4,
        fill: 'url(#' + id + ')', 'class': 'bar' }, svg);
      sv('title', {}, r).textContent = lab + ': ' + (money ? taka(v) : num(v));
      if (idx % step === 0) {
        var tx = sv('text', { x: cx, y: H - 8, 'text-anchor': 'middle', 'class': 'axis' }, svg);
        tx.textContent = lab;
      }
    });
    return svg;
  }

  function mountCharts(container, d) {
    var pts = (d.series && d.series.points) || [];
    var box = container.querySelector('[data-chart]');
    if (!box || !pts.length) return;
    box.appendChild(barSvg(pts.map(function (p) { return monthLbl(p.label); }),
      pts.map(function (p) { return p.value; }), d.series.unit !== '%', d.series.title));
  }

  /* ── ডেটা ─────────────────────────────────────── */
  async function fetchTopic(topic) {
    var r = isAdminTopic(topic)
      ? await S.db.rpc('kh_admin_dash', { p_topic: topic })
      : await S.db.rpc('public_stats_detail', { p_topic: topic });
    if (r.error) throw r.error;
    return r.data;
  }

  /* ── ড্রয়ার ───────────────────────────────────── */
  function escHandler(e) { if (e.key === 'Escape') closeDrawer(); }
  function openDrawer(title, sub) {
    closeDrawer();
    var o = document.createElement('div');
    o.className = 'kd-ov';
    o.id = 'kd-ov';
    o.innerHTML = '<div class="kd-dr" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
      '<div class="kd-dr-h"><div><div class="kd-dr-t">' + esc(title) + '</div>' +
      '<div class="kd-dr-s">' + esc(sub || '') + '</div></div>' +
      '<button type="button" class="kd-x" aria-label="বন্ধ করুন"><i class="ti ti-x" aria-hidden="true"></i></button></div>' +
      '<div class="kd-dr-b"><p class="kd-empty">লোড হচ্ছে…</p></div></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) {
      if (e.target === o || (e.target.closest && e.target.closest('.kd-x'))) closeDrawer();
    });
    document.addEventListener('keydown', escHandler);
    return o.querySelector('.kd-dr-b');
  }
  function closeDrawer() {
    var o = $('kd-ov');
    if (o) o.remove();
    document.removeEventListener('keydown', escHandler);
  }
  function drawerError(body) {
    body.innerHTML = '<p class="kd-empty kd-err">তথ্য আনা যায়নি। একটু পরে আবার চেষ্টা করুন।</p>';
  }

  async function openTopic(topic) {
    var title = topic, sub = '';
    var body = openDrawer('বিস্তারিত', '');
    try {
      var d = await fetchTopic(topic);
      title = d.title || title;
      sub = '';
      var dr = document.querySelector('#kd-ov .kd-dr');
      dr.querySelector('.kd-dr-t').textContent = title;
      dr.querySelector('.kd-dr-s').textContent = '';
      body.innerHTML = detailBodyHTML(d);
      mountCharts(body, d);
    } catch (e) {
      console.error(e);
      drawerError(body);
    }
  }

  /* একটি ভিউয়ের সব কার্ডের বিস্তারিত এক সাথে */
  async function openView(viewId) {
    var vdef = VIEW_DEFS.filter(function (v) { return v.id === viewId; })[0];
    var body = openDrawer(vdef ? vdef.title : 'বিস্তারিত', vdef ? vdef.sub : '');
    var cards = cardsFor(viewId, S.admin).filter(function (c) { return c.topic; });
    var topics = [];
    cards.forEach(function (c) { if (topics.indexOf(c.topic) < 0) topics.push(c.topic); });
    try {
      var results = await Promise.all(topics.map(function (t) {
        return fetchTopic(t).then(function (d) { return { t: t, d: d }; }, function () { return { t: t, d: null }; });
      }));
      var html = '';
      results.forEach(function (x, i) {
        if (!x.d) { html += '<section class="kd-sec"><p class="kd-empty kd-err">এই অংশের তথ্য আনা যায়নি।</p></section>'; return; }
        html += '<section class="kd-sec" data-sec="' + i + '"><h3>' + esc(x.d.title || x.t) + '</h3>' + detailBodyHTML(x.d) + '</section>';
      });
      body.innerHTML = html || '<p class="kd-empty">এখনো কোনো তথ্য নেই।</p>';
      body.querySelectorAll('section[data-sec]').forEach(function (sec, i) {
        var r = results.filter(function (x) { return x.d; })[i];
        if (r) mountCharts(sec, r.d);
      });
    } catch (e) {
      console.error(e);
      drawerError(body);
    }
  }

  /* ── রেন্ডার ───────────────────────────────────── */
  function greeting() {
    var h = +new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', hour12: false }).format(new Date());
    return h < 12 ? 'শুভ সকাল' : h < 17 ? 'শুভ দুপুর' : h < 20 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি';
  }

  function shellHTML(opt) {
    var views = viewsFor(!!opt.admin);
    var nav = views.map(function (v, i) {
      return '<button type="button" class="kd-nav' + (i === 0 ? ' on' : '') + '" data-view="' + v.id + '" title="' + esc(v.label) +
        '" aria-label="' + esc(v.label) + '"><i class="ti ' + v.icon + '" aria-hidden="true"></i><span>' + esc(v.label) + '</span></button>';
    }).join('');
    var sections = views.map(function (v, i) {
      return '<section class="kd-view' + (i === 0 ? ' on' : '') + '" id="kv-' + v.id + '" data-view="' + v.id + '">' +
        '<div class="kd-vh"><div><h2>' + esc(v.title) + '</h2><p>' + esc(v.sub) + '</p></div>' +
        '<button type="button" class="kd-detbtn" data-view-detail="' + v.id + '"><i class="ti ti-list-details" aria-hidden="true"></i> সব বিস্তারিত</button></div>' +
        '<div class="grid kd-grid" data-cards="' + v.id + '"></div></section>';
    }).join('');
    return '<div class="kd-app">' +
      '<aside class="kd-rail glass" aria-label="মেনু"><div class="kd-mark"><img src="assets/brand/korje-round-logo-256.png" alt="কর্জে হাসানা ফাউন্ডেশন"></div>' +
      '<nav>' + nav + '</nav></aside>' +
      '<main class="kd-main">' +
      '<header class="kd-top">' +
        '<label class="kd-search glass"><i class="ti ti-search" aria-hidden="true"></i><input id="kd-q" type="search" placeholder="কার্ড খুঁজুন..." aria-label="কার্ড খুঁজুন"></label>' +
        '<div class="kd-chip glass" id="kd-today"></div>' +
        '<button type="button" class="kd-ibtn glass" id="kd-refresh" aria-label="রিফ্রেশ" title="রিফ্রেশ"><i class="ti ti-refresh" aria-hidden="true"></i></button>' +
        (opt.admin ? '<a class="kd-ibtn glass" href="transparency.html" title="পাবলিক পাতা" aria-label="পাবলিক পাতা"><i class="ti ti-world" aria-hidden="true"></i></a>' : '') +
        '<div class="kd-avatar" aria-hidden="true">KH</div>' +
      '</header>' +
      '<section class="kd-hello"><h1 id="kd-hello">স্বাগতম</h1>' +
        '<p>' + esc(opt.subtitle || 'কর্জে হাসানা ফাউন্ডেশনের এই মুহূর্তের চিত্র। তথ্য সরাসরি ডাটাবেজ থেকে আসে।') +
        (opt.admin ? ' <span id="kd-who" class="kd-who"></span>' : '') + '</p></section>' +
      '<div id="kd-status" class="kd-status" role="status"></div>' +
      '<div id="kd-content">' + sections + '</div>' +
      '<footer class="kd-foot">সর্বশেষ আপডেট: <span id="kd-upd">—</span></footer>' +
      '</main></div>';
  }

  function gateHTML(title, text, href, btn) {
    return '<div class="kd-gate card"><h2>' + esc(title) + '</h2><p class="sub">' + esc(text) + '</p>' +
      '<a class="kd-btn" href="' + esc(href) + '">' + esc(btn) + '</a></div>';
  }

  function renderCards() {
    VIEW_DEFS.forEach(function (v) {
      var host = document.querySelector('[data-cards="' + v.id + '"]');
      if (!host) return;
      var cards = cardsFor(v.id, S.admin);
      host.innerHTML = cards.map(function (c, i) { return cardHTML(c, i === 0); }).join('');
    });
  }

  function renderHeader() {
    var h = $('kd-hello');
    if (h) h.innerHTML = greeting() + ', <span>স্বাগতম</span>';
    var t = $('kd-today');
    if (t) t.textContent = bn(new Date().toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
  }

  async function load() {
    var st = $('kd-status');
    if (st) { st.className = 'kd-status'; st.textContent = S.stats ? '' : 'তথ্য লোড হচ্ছে…'; }
    try {
      var r = await S.db.rpc('public_stats');
      if (r.error || !r.data) throw r.error || new Error('no data');
      S.stats = r.data;
      if (S.admin) {
        var a = await S.db.rpc('kh_admin_dash', { p_topic: 'summary' });
        if (a.error) throw a.error;
        S.adm = a.data;
      }
      if (st) st.textContent = '';
      renderHeader();
      renderCards();
      var u = $('kd-upd');
      if (u) u.textContent = updLabel(S.stats.as_of);
    } catch (e) {
      console.error(e);
      if (st) { st.className = 'kd-status err'; st.textContent = 'তথ্য আনা যায়নি। একটু পরে আবার চেষ্টা করুন।'; }
    }
  }

  async function adminGate() {
    var box = $('kd-content');
    var ss = null;
    try { ss = await S.db.auth.getSession(); } catch (e) { ss = null; }
    if (!ss || !ss.data || !ss.data.session) {
      box.innerHTML = gateHTML('অ্যাডমিন লগইন প্রয়োজন', 'এই ড্যাশবোর্ড শুধু অনুমোদিত অ্যাডমিনের জন্য। প্রথমে অ্যাডমিন অ্যাকাউন্টে লগইন করুন।', 'admin-login.html', 'অ্যাডমিন লগইন');
      return false;
    }
    var info = null;
    try { info = await S.db.rpc('get_my_admin_info'); } catch (e) { info = null; }
    var me = info && !info.error && info.data ? (Array.isArray(info.data) ? info.data[0] : info.data) : null;
    if (!me) {
      box.innerHTML = gateHTML('অনুমতি নেই', 'এই অ্যাকাউন্টে অ্যাডমিন ড্যাশবোর্ড দেখার অনুমতি নেই।', 'admin-login.html', 'অন্য অ্যাকাউন্টে লগইন');
      return false;
    }
    S.me = me;
    var who = $('kd-who');
    if (who) who.textContent = [me.name_bn, me.designation_bn].filter(Boolean).join(' · ');
    return true;
  }

  function bindEvents() {
    var root = S.root;
    root.addEventListener('click', function (e) {
      var nav = e.target.closest('.kd-nav');
      if (nav) {
        root.querySelectorAll('.kd-nav').forEach(function (b) { b.classList.toggle('on', b === nav); });
        var id = 'kv-' + nav.getAttribute('data-view');
        root.querySelectorAll('.kd-view').forEach(function (s) { s.classList.toggle('on', s.id === id); });
        applyFilter();
        return;
      }
      var vd = e.target.closest('[data-view-detail]');
      if (vd) { openView(vd.getAttribute('data-view-detail')); return; }
      if ($('kd-refresh') && e.target.closest('#kd-refresh')) { load(); return; }
      var card = e.target.closest('.kd-card');
      if (card) { openTopic(card.getAttribute('data-topic')); }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest && e.target.closest('.kd-card');
      if (card) { e.preventDefault(); openTopic(card.getAttribute('data-topic')); }
    });
    var q = $('kd-q');
    if (q) q.addEventListener('input', applyFilter);
  }

  function applyFilter() {
    var q = ($('kd-q') && $('kd-q').value || '').trim().toLowerCase();
    var view = S.root.querySelector('.kd-view.on');
    if (!view) return;
    view.querySelectorAll('.kd-card').forEach(function (c) {
      c.hidden = !!q && (c.getAttribute('data-s') || '').toLowerCase().indexOf(q) === -1;
    });
  }

  async function init(opt) {
    opt = opt || {};
    S.admin = !!opt.admin;
    S.root = $('kh-dash-root');
    if (!S.root) { console.error('kh-dash-root নেই'); return; }
    S.db = global._db;
    if (!S.db) { S.root.innerHTML = '<p class="kd-empty kd-err">সংযোগ শুরু করা যায়নি।</p>'; return; }
    S.root.innerHTML = shellHTML(opt);
    bindEvents();
    if (S.admin) {
      var ok = await adminGate();
      if (!ok) { var f = $('kd-foot'); if (f) f.hidden = true; return; }
    }
    await load();
    S.timer = setInterval(load, 5 * 60 * 1000);
  }

  global.KHDash = { init: init };
})(window);
