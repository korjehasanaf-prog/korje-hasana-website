/* Korje Hasana — নোটিশ বোর্ড (ওয়েব)
 * পেজের নিচে-বাম কোণে একটি বাটন। ক্লিক করলে বা কার্সর নিলে ডান দিকে একটি প্যানেল খোলে:
 *   • প্রতিবেদন  — মাসিক / বার্ষিক / নিরীক্ষা প্রতিবেদন (সুপার-এডমিন আপলোড করে)
 *   • খবর ও ঘোষণা — General Settings থেকে পাঠানো ঘোষণার যেগুলো "নোটিশ বোর্ডেও দেখান" করা
 *   • সিস্টেম প্রতিবেদন — সিস্টেম থেকে তৈরি খাতভিত্তিক তহবিলের হিসাব (public_stats)
 * সুপার-এডমিন ম্যানেজার: KHNotice.mountAdmin(container, _db)
 * ব্যবহার: kh-ui.js ও kh-app-downloads.js-এর পরে <script src="kh-notice.js?v=1" defer></script>
 * ড্যাশবোর্ডে বডি ট্যাগে data-kh-notice="off" থাকলে পাবলিক বাটন বসে না (শুধু ম্যানেজার).
 */
(function () {
  'use strict';

  var SB_URL = 'https://fgczixybyrzkrsoqrgdl.supabase.co';
  var SB_KEY = 'sb_publishable_rVcvOlXzVeRF8aSY3DMziQ_nNdNFACZ';
  var MAX_BYTES = 26214400; /* ২৫ MB — bucket-এর সীমার সাথে মেলানো */
  var CAT = {
    monthly: { bn: 'মাসিক প্রতিবেদন', en: 'Monthly report' },
    annual:  { bn: 'বার্ষিক প্রতিবেদন', en: 'Annual report' },
    audit:   { bn: 'নিরীক্ষা প্রতিবেদন', en: 'Audit report' },
    other:   { bn: 'অন্যান্য', en: 'Other' }
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lang() {
    try { return window.KHI18N && KHI18N.getLang() === 'bn' ? 'bn' : 'en'; } catch (e) { return 'en'; }
  }
  function T(bn, en) { return lang() === 'en' ? en : bn; }
  function dateTxt(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(+d)) return '';
    return d.toLocaleDateString(lang() === 'en' ? 'en-GB' : 'bn-BD',
      { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function rpc(name, body) {
    return fetch(SB_URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }

  /* ---------- পাবলিক বোর্ড ---------- */
  var state = { open: false, pinned: false, tab: 'reports', cat: 'all', board: null, boardAt: 0, timer: null };
  var tabBtn, panel;
  var isTouch = !(window.matchMedia && window.matchMedia('(hover: hover)').matches);

  var CSS = [
    '.kh-nb-tab{position:fixed;left:14px;bottom:18px;z-index:9100;display:inline-flex;align-items:center;gap:8px;',
    'padding:10px 16px;border:1px solid rgba(255,255,255,.55);border-radius:999px;cursor:pointer;',
    'background:linear-gradient(135deg,#a855f7 0%,#6d28d9 100%);color:#fff;font-family:inherit,system-ui,sans-serif;font-weight:700;font-size:13.5px;line-height:1.1;',
    'box-shadow:0 8px 22px rgba(109,40,217,.45)}',
    '.kh-nb-tab:hover{filter:brightness(1.08)}',
    '.kh-nb-tab:focus-visible{outline:2px solid #fff;outline-offset:3px}',
    '.kh-nb-tab i{font-size:17px;color:#fff}',
    '@media (max-width:768px){.kh-nb-tab{bottom:96px}}',
    '.kh-nb-panel{position:fixed;top:0;right:0;bottom:0;width:min(440px,94vw);z-index:9200;display:flex;flex-direction:column;',
    'background:#111827;color:#f1f5f9;box-shadow:-12px 0 32px rgba(0,0,0,.35);transform:translateX(105%);',
    'transition:transform .25s ease;font-family:inherit}',
    'html[data-theme="light"] .kh-nb-panel{background:#ffffff;color:#0f172a;box-shadow:-12px 0 32px rgba(15,23,42,.18)}',
    '.kh-nb-panel.open{transform:none}',
    '.kh-nb-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(127,127,127,.25)}',
    '.kh-nb-head b{font-size:16px}',
    '.kh-nb-x{background:transparent;border:0;color:inherit;font-size:20px;cursor:pointer;padding:4px 8px;border-radius:8px}',
    '.kh-nb-x:hover{background:rgba(127,127,127,.18)}',
    '.kh-nb-tabs{display:flex;gap:6px;padding:10px 14px;border-bottom:1px solid rgba(127,127,127,.2);flex-wrap:wrap}',
    '.kh-nb-seg{border:1px solid rgba(127,127,127,.35);background:transparent;color:inherit;border-radius:999px;padding:6px 12px;font-family:inherit,system-ui,sans-serif;font-weight:600;font-size:12.5px;line-height:1;cursor:pointer}',
    '.kh-nb-seg.on{background:#7c3aed;border-color:#7c3aed;color:#fff}',
    '.kh-nb-body{flex:1;overflow:auto;padding:12px 14px 24px}',
    '.kh-nb-item{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid rgba(127,127,127,.25);border-radius:12px;margin-bottom:10px;color:inherit;text-decoration:none}',
    '.kh-nb-item:hover{background:rgba(127,127,127,.12)}',
    '.kh-nb-item-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
    '.kh-nb-item-main b{font-size:14px;line-height:1.4;overflow-wrap:anywhere}',
    '.kh-nb-item-main small,.kh-nb-news small{font-size:12px;opacity:.7}',
    '.kh-nb-item > i{font-size:20px;opacity:.8}',
    '.kh-nb-badge{flex:none;font-size:11px;font-weight:700;padding:4px 8px;border-radius:999px;background:rgba(124,58,237,.18);color:#c4b5fd}',
    'html[data-theme="light"] .kh-nb-badge{color:#5b21b6;background:rgba(124,58,237,.12)}',
    '.kh-nb-news{border:1px solid rgba(127,127,127,.25);border-radius:12px;padding:12px 14px;margin-bottom:10px}',
    '.kh-nb-news h4{margin:4px 0 6px;font-size:14.5px;line-height:1.4}',
    '.kh-nb-news p{margin:0;font-size:13.5px;line-height:1.6;white-space:pre-wrap;opacity:.9}',
    '.kh-nb-empty{font-size:13.5px;opacity:.7;padding:14px 4px}',
    '.kh-nb-sys{font-size:13px}',
    '.kh-nb-sys .kh-fh-err{opacity:.8}'
  ].join('');

  function injectCss() {
    var s = document.createElement('style');
    s.setAttribute('data-kh-notice', '1');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function labels() {
    if (tabBtn) tabBtn.querySelector('span').textContent = T('নোটিশ বোর্ড', 'Notice Board');
    var t = panel && panel.querySelector('.kh-nb-title');
    if (t) t.textContent = T('নোটিশ বোর্ড', 'Notice Board');
    var x = panel && panel.querySelector('.kh-nb-x');
    if (x) x.setAttribute('aria-label', T('বন্ধ করুন', 'Close'));
  }

  function loadBoard() {
    var now = Date.now();
    if (state.board && now - state.boardAt < 60000) return Promise.resolve(state.board);
    return rpc('notice_board_public').then(function (d) {
      state.board = d || { reports: [], news: [] };
      state.boardAt = Date.now();
      return state.board;
    }).catch(function () {
      return state.board || { reports: [], news: [], failed: true };
    });
  }

  function tabsHTML() {
    var names = [['reports', T('প্রতিবেদন', 'Reports')], ['news', T('খবর ও ঘোষণা', 'News & notices')], ['system', T('সিস্টেম প্রতিবেদন', 'System reports')]];
    return '<div class="kh-nb-tabs" role="tablist">' + names.map(function (n) {
      return '<button type="button" class="kh-nb-seg' + (state.tab === n[0] ? ' on' : '') + '" role="tab" data-tab="' + n[0] +
             '" aria-selected="' + (state.tab === n[0]) + '">' + esc(n[1]) + '</button>';
    }).join('') + '</div>';
  }

  function reportsHTML(d) {
    var cats = [['all', T('সব', 'All')], ['monthly', T('মাসিক', 'Monthly')], ['annual', T('বার্ষিক', 'Annual')], ['audit', T('নিরীক্ষা', 'Audit')], ['other', T('অন্যান্য', 'Other')]];
    var chips = '<div class="kh-nb-tabs" style="border:0;padding:0 0 10px">' + cats.map(function (c) {
      return '<button type="button" class="kh-nb-seg' + (state.cat === c[0] ? ' on' : '') + '" data-cat="' + c[0] + '">' + esc(c[1]) + '</button>';
    }).join('') + '</div>';
    var list = (d.reports || []).filter(function (r) { return state.cat === 'all' || r.category === state.cat; });
    if (!list.length) return chips + '<div class="kh-nb-empty">' + esc(T('এখনো কোনো প্রতিবেদন আপলোড হয়নি।', 'No reports have been uploaded yet.')) + '</div>';
    return chips + list.map(function (r) {
      var c = CAT[r.category] || CAT.other;
      var meta = [r.period, dateTxt(r.published_at)].filter(Boolean).join(' · ');
      return '<a class="kh-nb-item" href="' + esc(r.file_url) + '" target="_blank" rel="noopener">' +
        '<span class="kh-nb-badge">' + esc(T(c.bn, c.en)) + '</span>' +
        '<span class="kh-nb-item-main"><b>' + esc(r.title) + '</b><small>' + esc(meta) + '</small></span>' +
        '<i class="ti ti-download" aria-hidden="true"></i></a>';
    }).join('');
  }

  function newsHTML(d) {
    var list = d.news || [];
    if (!list.length) return '<div class="kh-nb-empty">' + esc(T('এখনো কোনো খবর বা ঘোষণা নেই।', 'No news or notices yet.')) + '</div>';
    return list.map(function (n) {
      return '<article class="kh-nb-news"><small>' + esc(dateTxt(n.created_at)) + '</small><h4>' + esc(n.title) +
             '</h4><p>' + esc(n.body) + '</p></article>';
    }).join('');
  }

  function systemHTML(holder) {
    holder.innerHTML = '<div class="kh-nb-empty">' + esc(T('লোড হচ্ছে…', 'Loading…')) + '</div>';
    rpc('public_stats').then(function (r) {
      if (!r || !r.funds) throw new Error('no data');
      if (window.KHUI && KHUI.fundSummaryHTML) {
        holder.innerHTML = KHUI.fundSummaryHTML(r.funds, { detail: true, collection: r.collection,
          foot: T('শুরু থেকে আজ পর্যন্ত · সর্বশেষ হালনাগাদ', 'From the start to today · last updated') + ' ' + dateTxt(r.as_of) });
      } else {
        holder.innerHTML = '<div class="kh-nb-empty">' + esc(T('প্রতিবেদন আনা যায়নি।', 'Could not load reports.')) + '</div>';
      }
    }).catch(function () {
      holder.innerHTML = '<div class="kh-nb-empty">' + esc(T('প্রতিবেদন আনা যায়নি — একটু পরে আবার চেষ্টা করুন।', 'Could not load reports — please try again shortly.')) + '</div>';
    });
  }

  function render() {
    var head = '<div class="kh-nb-head"><b class="kh-nb-title">' + esc(T('নোটিশ বোর্ড', 'Notice Board')) + '</b>' +
      '<button type="button" class="kh-nb-x" aria-label="' + esc(T('বন্ধ করুন', 'Close')) + '">&times;</button></div>';
    panel.innerHTML = head + tabsHTML() + '<div class="kh-nb-body"></div>';
    labels();
    var holder = panel.querySelector('.kh-nb-body');
    if (state.tab === 'system') { systemHTML(holder); return; }
    holder.innerHTML = '<div class="kh-nb-empty">' + esc(T('লোড হচ্ছে…', 'Loading…')) + '</div>';
    loadBoard().then(function (d) {
      if (state.tab === 'reports') holder.innerHTML = reportsHTML(d);
      else holder.innerHTML = newsHTML(d);
    });
  }

  function openPanel(pin) {
    clearTimeout(state.timer);
    state.open = true;
    if (pin) state.pinned = true;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    tabBtn.setAttribute('aria-expanded', 'true');
    render();
  }
  function closePanel() {
    clearTimeout(state.timer);
    state.open = false;
    state.pinned = false;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    tabBtn.setAttribute('aria-expanded', 'false');
  }
  function scheduleClose() {
    if (state.pinned) return;
    clearTimeout(state.timer);
    state.timer = setTimeout(function () { if (!state.pinned) closePanel(); }, 300);
  }

  function mountPublic() {
    if (document.body && document.body.getAttribute('data-kh-notice') === 'off') return;
    if (document.querySelector('.kh-nb-tab')) return;
    injectCss();

    tabBtn = document.createElement('button');
    tabBtn.type = 'button';
    tabBtn.className = 'kh-nb-tab';
    tabBtn.setAttribute('aria-expanded', 'false');
    tabBtn.setAttribute('aria-controls', 'khNbPanel');
    tabBtn.innerHTML = '<i class="ti ti-speakerphone" aria-hidden="true"></i><span></span>';
    document.body.appendChild(tabBtn);

    panel = document.createElement('aside');
    panel.className = 'kh-nb-panel';
    panel.id = 'khNbPanel';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Notice Board');
    document.body.appendChild(panel);

    labels();

    /* কার্সর নিলে খোলে (ডেস্কটপ); ক্লিক করলে পিন হয়ে থাকে; টাচে শুধু ক্লিক */
    tabBtn.addEventListener('mouseenter', function () { if (!isTouch && !state.open) openPanel(false); else clearTimeout(state.timer); });
    tabBtn.addEventListener('mouseleave', scheduleClose);
    panel.addEventListener('mouseenter', function () { clearTimeout(state.timer); });
    panel.addEventListener('mouseleave', scheduleClose);

    tabBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (state.open && state.pinned) closePanel();
      else openPanel(true);
    });

    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t.closest('.kh-nb-x')) { closePanel(); return; }
      var tab = t.closest('[data-tab]');
      if (tab) { state.tab = tab.getAttribute('data-tab'); render(); return; }
      var cat = t.closest('[data-cat]');
      if (cat) { state.cat = cat.getAttribute('data-cat'); render(); return; }
    });

    document.addEventListener('click', function (e) {
      if (!state.open || !state.pinned) return;
      /* composedPath: ক্লিকের পরে ভিতরের অংশ বদলে গেলেও ঠিক থাকে */
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(panel) !== -1 || path.indexOf(tabBtn) !== -1) return;
      closePanel();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) closePanel(); });

    /* ভাষা বদলালে বাটন/শিরোনাম তখনই বদলায়; খোলা থাকলে ভিতরের অংশও */
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('[data-lang-set], .kh-lang-pill')) {
        setTimeout(function () { labels(); if (state.open) render(); }, 80);
      }
    });
  }

  /* ---------- সুপার-এডমিন ম্যানেজার ---------- */
  function mountAdmin(container, sb) {
    if (!container || !sb) return;
    container.innerHTML =
      '<form class="kh-nba-form" id="khNbForm">' +
        '<div class="kh-nba-row">' +
          '<label>ধরন<select name="category">' +
            '<option value="monthly">মাসিক প্রতিবেদন</option>' +
            '<option value="annual">বার্ষিক প্রতিবেদন</option>' +
            '<option value="audit">নিরীক্ষা প্রতিবেদন</option>' +
            '<option value="other">অন্যান্য</option>' +
          '</select></label>' +
          '<label>সময়কাল (ঐচ্ছিক)<input name="period" maxlength="60" placeholder="যেমন সেপ্টেম্বর ২০২৬ / ২০২৫-২৬"></label>' +
        '</div>' +
        '<label>শিরোনাম<input name="title" maxlength="200" required></label>' +
        '<label>ফাইল আপলোড (PDF, XLSX, DOCX, ছবি — সর্বোচ্চ ২৫ MB)<input name="file" type="file" accept=".pdf,.xlsx,.xls,.csv,.docx,.doc,.png,.jpg,.jpeg"></label>' +
        '<label>অথবা সরাসরি ফাইলের লিংক (https)<input name="url" type="url" placeholder="https://..."></label>' +
        '<button type="submit" class="kh-nba-submit">প্রকাশ করুন</button>' +
        '<p class="kh-nba-msg" role="status"></p>' +
      '</form>' +
      '<div class="kh-nba-list"></div>';

    var form = container.querySelector('#khNbForm');
    var msg = form.querySelector('.kh-nba-msg');
    var list = container.querySelector('.kh-nba-list');
    var CATN = { monthly: 'মাসিক', annual: 'বার্ষিক', audit: 'নিরীক্ষা', other: 'অন্যান্য' };

    function say(text, bad) { msg.textContent = text; msg.style.color = bad ? '#dc2626' : ''; }

    async function load() {
      var r = await sb.rpc('admin_list_notice_files');
      if (r.error) { list.innerHTML = '<p class="kh-nba-msg">তালিকা আনা যায়নি: ' + esc(r.error.message) + '</p>'; return; }
      var rows = r.data || [];
      if (!rows.length) { list.innerHTML = '<p class="kh-nba-msg">এখনো কোনো ফাইল আপলোড হয়নি।</p>'; return; }
      list.innerHTML = '<table class="kh-nba-table"><thead><tr><th>ধরন</th><th>শিরোনাম</th><th>তারিখ</th><th>অবস্থা</th></tr></thead><tbody>' +
        rows.map(function (x) {
          var on = x.is_active;
          return '<tr><td>' + esc(CATN[x.category] || x.category) + '</td>' +
            '<td><a href="' + esc(x.file_url) + '" target="_blank" rel="noopener">' + esc(x.title) + '</a>' +
            (x.period ? '<br><small>' + esc(x.period) + '</small>' : '') + '</td>' +
            '<td>' + esc(String(x.published_at || '').slice(0, 10)) + '</td>' +
            '<td><button type="button" class="kh-nba-toggle" data-id="' + esc(x.id) + '" data-active="' + (on ? '0' : '1') + '">' +
              (on ? 'বন্ধ করুন' : 'চালু করুন') + '</button></td></tr>';
        }).join('') + '</tbody></table>';
    }

    list.addEventListener('click', async function (e) {
      var b = e.target.closest('.kh-nba-toggle');
      if (!b) return;
      b.disabled = true;
      var r = await sb.rpc('admin_set_notice_file_active', { p_id: b.getAttribute('data-id'), p_active: b.getAttribute('data-active') === '1' });
      if (r.error) { say('হালনাগাদ করা যায়নি: ' + r.error.message, true); b.disabled = false; return; }
      load();
    });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var category = String(fd.get('category') || 'other');
      var title = String(fd.get('title') || '').trim();
      var period = String(fd.get('period') || '').trim() || null;
      var file = fd.get('file');
      var url = String(fd.get('url') || '').trim();
      var fileName = null;
      if (!title) { say('শিরোনাম লিখুন', true); return; }
      try {
        if (file && file.size) {
          if (file.size > MAX_BYTES) { say('ফাইল ২৫ MB-এর বেশি হতে পারবে না', true); return; }
          say('ফাইল আপলোড হচ্ছে…');
          var safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          var path = 'notice/' + category + '/' + Date.now() + '-' + safe;
          var up = await sb.storage.from('notice-board').upload(path, file, {
            contentType: file.type || 'application/octet-stream', upsert: false });
          if (up.error) throw up.error;
          url = sb.storage.from('notice-board').getPublicUrl(path).data.publicUrl;
          fileName = file.name;
        }
        if (!url) { say('একটি ফাইল আপলোড করুন অথবা লিংক দিন', true); return; }
        say('প্রকাশ হচ্ছে…');
        var r = await sb.rpc('admin_publish_notice_file', { p_category: category, p_title: title, p_period: period, p_url: url, p_file_name: fileName });
        if (r.error) throw r.error;
        say('প্রকাশ হয়েছে। ওয়েবসাইটের নোটিশ বোর্ডে এখন দেখা যাবে।');
        form.reset();
        load();
      } catch (err) {
        say('প্রকাশ করা যায়নি: ' + (err && err.message ? err.message : err), true);
      }
    });

    load();
  }

  window.KHNotice = { mountAdmin: mountAdmin };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountPublic);
  else mountPublic();
})();
