/* kh-volunteer.js — হেডারে "ভলেন্টিয়ার ম্যানেজমেন্ট" মেনু (সব পাবলিক পেজে একই)
   ওয়েবসাইট ও অ্যাপের ফিচার একই রাখতে এই মেনুর লিংক volunteer.html-এর সেকশনে যায়।
   নিয়ম: এই স্ক্রিপ্ট শুধু মেনু বসায়; ডাটা/লগইন সব volunteer.html ও admin-volunteers.html-এ। */
(function () {
  'use strict';
  if (document.body && document.body.getAttribute('data-kh-volunteer') === 'off') return;

  var MENU = [
    { href: 'volunteer.html#about',        icon: 'ti-heart-handshake', t: 'ভলেন্টিয়ার পরিচিতি ও শপথ' },
    { href: 'volunteer.html#profile',      icon: 'ti-id-badge-2',      t: 'নিবন্ধন ও আমার প্রোফাইল' },
    { href: 'volunteer.html#tasks',        icon: 'ti-checklist',       t: 'সেবার কাজ' },
    { href: 'volunteer.html#certificates', icon: 'ti-certificate',     t: 'সার্টিফিকেট ও যাচাই' },
    { href: 'volunteer.html#channel',      icon: 'ti-brand-whatsapp',  t: 'ভলেন্টিয়ার চ্যানেল' },
    { href: 'volunteer.html#ratings',      icon: 'ti-star',            t: 'রেটিং ও সেবা পয়েন্ট' }
  ];

  function css() {
    return '' +
      '.kh-vol-dd{position:relative;display:inline-block;margin-right:8px}' +
      '.kh-vol-dd-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;' +
      'border:1px solid transparent;background:linear-gradient(120deg,#0f766e,#14b8a6);color:#fff;' +
      'font:inherit;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;box-shadow:0 4px 14px rgba(20,184,166,.25)}' +
      '.kh-vol-dd-btn:hover{filter:brightness(1.07)}' +
      '.kh-vol-dd-btn:focus-visible{outline:2px solid #14b8a6;outline-offset:2px}' +
      '.kh-vol-dd-btn i{color:#fff}' +
      '.kh-vol-dd-menu{position:absolute;right:0;top:calc(100% + 8px);z-index:1100;display:flex;flex-direction:column;' +
      'gap:2px;min-width:250px;padding:8px;border-radius:14px;background:#fff;color:#1f2937;' +
      'border:1px solid rgba(15,118,110,.25);box-shadow:0 14px 34px rgba(0,0,0,.22)}' +
      '.kh-vol-dd-menu[hidden]{display:none}' +
      '.kh-vol-dd-menu a{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;color:inherit;' +
      'text-decoration:none;font-size:14px;font-weight:500}' +
      '.kh-vol-dd-menu a:hover{background:rgba(20,184,166,.12)}' +
      '.kh-vol-dd-menu a i{color:#0f766e;font-size:18px}' +
      'html[data-theme="dark"] .kh-vol-dd-menu,html:not([data-theme="light"]) .kh-vol-dd-menu{background:#15202b;color:#e5f3f1;border-color:rgba(20,184,166,.35)}' +
      'html[data-theme="dark"] .kh-vol-dd-menu a:hover,html:not([data-theme="light"]) .kh-vol-dd-menu a:hover{background:rgba(20,184,166,.18)}' +
      'html[data-theme="dark"] .kh-vol-dd-menu a i,html:not([data-theme="light"]) .kh-vol-dd-menu a i{color:#5eead4}' +
      '@media (max-width:1180px){.kh-vol-dd-btn .kh-vol-lbl{display:none}}';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount() {
    if (document.getElementById('khVolDd')) return;
    var right = document.querySelector('.nav-right');
    if (!right) {
      /* পুরোনো হেডার (nav-cta মোবাইলে লুকানো থাকে): হ্যামবার্গারের ঠিক আগে বসাই, যাতে সব স্ক্রিনে দেখা যায় */
      var h = document.querySelector('.nav-hamburger');
      right = (h && h.parentNode) || document.querySelector('.nav-cta') || document.querySelector('.navbar');
    }
    if (!right) return;

    var st = document.createElement('style');
    st.id = 'khVolDdCss';
    st.textContent = css();
    document.head.appendChild(st);

    var wrap = document.createElement('div');
    wrap.className = 'kh-vol-dd';
    wrap.id = 'khVolDd';
    wrap.innerHTML =
      '<button type="button" class="kh-vol-dd-btn" aria-expanded="false" aria-controls="khVolDdMenu" aria-label="ভলেন্টিয়ার ম্যানেজমেন্ট" title="ভলেন্টিয়ার ম্যানেজমেন্ট">' +
      '<i class="ti ti-users-group"></i><span class="kh-vol-lbl">ভলেন্টিয়ার ম্যানেজমেন্ট</span><i class="ti ti-chevron-down"></i></button>' +
      '<div class="kh-vol-dd-menu" id="khVolDdMenu" hidden>' +
      MENU.map(function (m) {
        return '<a href="' + esc(m.href) + '"><i class="ti ' + esc(m.icon) + '"></i><span>' + esc(m.t) + '</span></a>';
      }).join('') +
      '</div>';

    var appDd = right.querySelector('.kh-app-dd');
    var ham = right.querySelector('.nav-hamburger');
    if (appDd && appDd.parentNode === right) right.insertBefore(wrap, appDd);
    else if (ham && ham.parentNode === right) right.insertBefore(wrap, ham);
    else right.insertBefore(wrap, right.firstChild);

    var btn = wrap.querySelector('.kh-vol-dd-btn');
    var menu = wrap.querySelector('#khVolDdMenu');

    function close() {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = menu.hasAttribute('hidden');
      if (willOpen) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
