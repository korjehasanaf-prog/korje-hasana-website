/* kh-volunteer.js — হেডারে "ভলেন্টিয়ার" শীর্ষ মেনু (হোম/অন্য মেনুর মতো একই ধাঁচে)
   + লগইন করা অনুমোদিত ভলেন্টিয়ারের জন্য টিল ও বেগুনি থীম (সব পেজে)।
   নিয়ম: এই স্ক্রিপ্ট শুধু মেনু ও থীম বসায়; ডাটা/লগইন সব volunteer.html ও admin-volunteers.html-এ। */
(function () {
  'use strict';
  if (document.body && document.body.getAttribute('data-kh-volunteer') === 'off') return;

  var MENU = [
    { href: 'volunteer.html#about',        icon: 'ti-heart-handshake', t: 'ভলেন্টিয়ার পরিচিতি ও শপথ' },
    { href: 'volunteer.html#profile',      icon: 'ti-id-badge-2',      t: 'নিবন্ধন ও আমার প্রোফাইল' },
    { href: 'volunteer.html#tasks',        icon: 'ti-checklist',       t: 'সেবার কাজ' },
    { href: 'volunteer.html#assist',     icon: 'ti-users-group',     t: 'অ্যাসিস্ট মোড' },
    { href: 'volunteer.html#batch',      icon: 'ti-stack-2',         t: 'আমার ব্যাচ' },
    { href: 'volunteer.html#certificates', icon: 'ti-certificate',     t: 'সার্টিফিকেট ও যাচাই' },
    { href: 'volunteer.html#channel',      icon: 'ti-brand-whatsapp',  t: 'ভলেন্টিয়ার চ্যানেল' },
    { href: 'volunteer.html#ratings',      icon: 'ti-star',            t: 'রেটিং ও সেবা পয়েন্ট' }
  ];

  var CSS_NAV =
    '.kh-vol-item{position:relative;height:68px;display:flex;align-items:center}' +
    '.kh-vol-item .kh-vol-sub{display:none;position:absolute;top:100%;left:50%;transform:translateX(-50%);' +
    'flex-direction:column;gap:2px;min-width:260px;margin-top:6px;padding:8px;border-radius:14px;z-index:1200;' +
    'background:#fff;color:#1f2937;border:1px solid rgba(15,118,110,.3);box-shadow:0 14px 34px rgba(0,0,0,.25)}' +
    '.kh-vol-item.open > .kh-vol-sub{display:flex}' +
    '.kh-vol-sub a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;color:inherit;' +
    'text-decoration:none;font-size:14px;font-weight:500;white-space:nowrap}' +
    '.kh-vol-sub a:hover,.kh-vol-sub a:focus-visible{background:rgba(20,184,166,.14);outline:none}' +
    '.kh-vol-sub a i{color:#0f766e;font-size:18px}' +
    'html:not([data-theme="light"]) .kh-vol-sub{background:#15202b;color:#e5f3f1;border-color:rgba(20,184,166,.35)}' +
    'html:not([data-theme="light"]) .kh-vol-sub a i{color:#5eead4}' +
    '@media (max-width:900px){' +
    '.kh-vol-item{height:auto;display:block}' +
    '.kh-vol-item .kh-vol-sub{position:static;transform:none;min-width:0;margin:0;padding:0 0 0 14px;' +
    'border:0;box-shadow:none;background:transparent;color:inherit}' +
    '.kh-vol-item.open > .kh-vol-sub{display:flex}' +
    '.kh-vol-sub a{padding:8px 4px}' +
    'html .kh-vol-item .kh-vol-sub{background:transparent;border:0;box-shadow:none;color:inherit}' +
    '}';

  /* ভলেন্টিয়ার থীম: টিল (#0f766e→#14b8a6) + বেগুনি (#4c2f9e / #7048e8).
     শুধু লগইন করা ও অনুমোদিত ভলেন্টিয়ারের জন্য <html class="kh-vol-theme"> যোগ হয়। */
  var CSS_THEME =
    ':root.kh-vol-theme,:root.kh-vol-theme[data-theme="dark"],:root.kh-vol-theme[data-theme="light"]{' +
    '--kh-green:#0f766e;--kh-green-lt:#14b8a6;--kh-green-pale:#ccfbf1;--kh-green-mint:#99f6e4;' +
    '--kh-gold:#4c2f9e;--kh-gold-lt:#7048e8;--kh-gold-pale:#c4b5fd;--kh-violet:#7048e8}' +
    ':root.kh-vol-theme[data-theme="dark"],:root.kh-vol-theme:not([data-theme="light"]){' +
    '--kh-green:#14b8a6;--kh-green-lt:#5eead4;--kh-gold:#a78bfa;--kh-gold-lt:#c4b5fd;--kh-gold-pale:#ddd6fe}' +
    '.kh-vol-theme .kh-vol-item > .nav-link{color:#5eead4}';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function addStyle(id, text) {
    if (document.getElementById(id)) return;
    var st = document.createElement('style');
    st.id = id;
    st.textContent = text;
    document.head.appendChild(st);
  }

  function isMobileNav() {
    var h = document.querySelector('.nav-hamburger');
    if (!h) return false;
    return window.getComputedStyle(h).display !== 'none';
  }

  /* ── শীর্ষ মেনু: "ভলেন্টিয়ার" (হোম/অন্য মেনুর মতো একটি nav-item) ── */
  function mountNav() {
    if (document.getElementById('mi-volunteer')) return;
    var links = document.getElementById('navCenter') || document.querySelector('.nav-links');
    if (!links) return;
    addStyle('khVolNavCss', CSS_NAV);

    var item = document.createElement('div');
    item.className = 'nav-item kh-vol-item';
    item.id = 'mi-volunteer';
    item.innerHTML =
      '<a class="nav-link" href="volunteer.html" aria-haspopup="true" aria-expanded="false">' +
      'ভলেন্টিয়ার <i class="ti ti-chevron-down nav-chevron"></i></a>' +
      '<div class="kh-vol-sub" role="menu">' +
      MENU.map(function (m) {
        return '<a role="menuitem" href="' + esc(m.href) + '"><i class="ti ' + esc(m.icon) + '"></i><span>' + esc(m.t) + '</span></a>';
      }).join('') +
      '</div>';

    var contact = document.getElementById('mi-contact');
    var ind = document.getElementById('navInd');
    if (contact && contact.parentNode === links) links.insertBefore(item, contact);
    else if (ind && ind.parentNode === links) links.insertBefore(item, ind);
    else links.appendChild(item);

    var a = item.querySelector('.nav-link');
    var timer;
    function setOpen(open) {
      item.classList.toggle('open', open);
      a.setAttribute('aria-expanded', String(open));
    }
    item.addEventListener('mouseenter', function () {
      if (isMobileNav()) return;
      clearTimeout(timer);
      setOpen(true);
    });
    item.addEventListener('mouseleave', function () {
      if (isMobileNav()) return;
      timer = setTimeout(function () { setOpen(false); }, 120);
    });
    a.addEventListener('click', function (e) {
      /* মোবাইলে প্রথম ট্যাপে সাব-মেনু খোলে; ডেস্কটপে লিংক সরাসরি volunteer.html খোলে */
      if (isMobileNav()) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(!item.classList.contains('open'));
      }
    });
    document.addEventListener('click', function (e) {
      if (!item.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ── লগইন করা অনুমোদিত ভলেন্টিয়ারের থীম ── */
  function setVolTheme(on) {
    var root = document.documentElement;
    if (on) {
      addStyle('khVolThemeCss', CSS_THEME);
      root.classList.add('kh-vol-theme');
    } else {
      root.classList.remove('kh-vol-theme');
    }
  }

  function checkVolTheme() {
    var db = window._db;
    if (!db || !db.auth || !db.rpc) return;
    try {
      db.auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        if (!s) { setVolTheme(false); return null; }
        return db.rpc('vol_me').then(function (res) {
          var v = res && res.data;
          setVolTheme(!!(v && v.status === 'approved'));
        });
      }).catch(function () { setVolTheme(false); });
    } catch (e) { setVolTheme(false); }
  }

  function bindAuth() {
    var db = window._db;
    if (!db || !db.auth || !db.auth.onAuthStateChange) return;
    /* supabase-js-তে onAuthStateChange-এর ভেতরে সরাসরি rpc করলে আটকে যেতে পারে, তাই একটু পরে */
    db.auth.onAuthStateChange(function () { setTimeout(checkVolTheme, 0); });
  }

  function init() {
    mountNav();
    checkVolTheme();
    bindAuth();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
