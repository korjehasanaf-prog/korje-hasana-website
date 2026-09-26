/* ══════════════════════════════════════════════════════════
   কর্জে হাসানা ফাউন্ডেশন — Shared UI Kit (JS)
   Requires: kh-ui.css, Tabler Icons webfont
   Exposes:  window.KHUI
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KHUI = {};

  /* ── Supabase ক্লায়েন্ট খুঁজে নেয় ──
     _supabase.js-এ `const _db` থাকলে সেটি window-এ বসে না; তাই
     window._db না পেলে গ্লোবাল লেক্সিক্যাল `_db`-ও দেখা হয়।     */
  function sb() {
    if (window._db) return window._db;
    try { if (typeof _db !== 'undefined' && _db) { window._db = _db; return _db; } } catch (e) {}
    return null;
  }
  KHUI.db = sb;

  /* ── Bengali digit helpers ───────────────────────────── */
  var BN = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  KHUI.bn = function (v) {
    return String(v).replace(/[0-9]/g, function (d) { return BN[+d]; });
  };
  KHUI.en = function (v) {
    return String(v).replace(/[০-৯]/g, function (d) { return String(BN.indexOf(d)); });
  };

  /* ══════════════════════════════════════════════════════
     1 ── LIQUID GLASS NAVBAR
     ══════════════════════════════════════════════════════ */

  var NAV_ITEMS = [
    { href: 'index.html',            icon: 'ti-home',      label: 'হোম'    },
    { href: 'donation.html',         icon: 'ti-heart',     label: 'দান'    },
    { href: 'loan-application.html', icon: 'ti-wallet',    label: 'ঋণ'     },
    { href: 'savings-portal.html',   icon: 'ti-pig-money', label: 'সঞ্চয়'  },
    { href: 'user-login.html',       icon: 'ti-login',     label: 'লগইন'   }
  ];

  KHUI.mountNav = function (opts) {
    opts = opts || {};
    if (document.querySelector('.kh-glassnav')) return;

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

    var nav = document.createElement('nav');
    nav.className = 'kh-glassnav kh-hidden';
    nav.setAttribute('aria-label', 'দ্রুত নেভিগেশন');

    var pill = document.createElement('div');
    pill.className = 'kh-glassnav-pill';
    nav.appendChild(pill);

    NAV_ITEMS.forEach(function (it) {
      var a = document.createElement('a');
      a.href = it.href;
      a.innerHTML = '<i class="ti ' + it.icon + '" aria-hidden="true"></i><span>' + it.label + '</span>';
      if (it.href.toLowerCase() === here) a.classList.add('kh-on');
      nav.appendChild(a);
    });

    var sep = document.createElement('div');
    sep.className = 'kh-glassnav-sep';
    nav.appendChild(sep);

    /* theme toggle — sits to the left of the scroll-top button */
    var th = document.createElement('button');
    th.className = 'kh-glassnav-top kh-theme-btn';
    th.setAttribute('aria-label', 'থিম পরিবর্তন করুন');
    th.title = 'থিম পরিবর্তন';
    th.innerHTML = '<i class="ti ti-moon" aria-hidden="true"></i>';
    th.onclick = function () { KHUI.toggleTheme(); };
    nav.appendChild(th);

    var top = document.createElement('button');
    top.className = 'kh-glassnav-top';
    top.setAttribute('aria-label', 'উপরে যান');
    top.innerHTML = '<i class="ti ti-arrow-up" aria-hidden="true"></i>';
    top.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };
    nav.appendChild(top);

    KHUI._syncThemeIcon();

    document.body.appendChild(nav);

    function place() {
      var on = nav.querySelector('a.kh-on');
      if (!on) { pill.style.width = '0'; return; }
      pill.style.left  = (on.offsetLeft - 0) + 'px';
      pill.style.width = on.offsetWidth + 'px';
    }

    // hover preview of the pill — ফন্ট কালার সব বাটনে একই থাকে
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        pill.style.left = a.offsetLeft + 'px';
        pill.style.width = a.offsetWidth + 'px';
      });
    });
    nav.addEventListener('mouseleave', function () { place(); });

    setTimeout(place, 90);
    window.addEventListener('resize', place);

    // visible immediately; opts.scrollReveal hides it until the page is scrolled
    if (opts.scrollReveal) {
      function tick() {
        var y = window.scrollY || document.documentElement.scrollTop;
        nav.classList.toggle('kh-hidden', y <= 220);
      }
      window.addEventListener('scroll', tick, { passive: true });
      tick();
    } else {
      requestAnimationFrame(function () { nav.classList.remove('kh-hidden'); });
    }

    KHUI._nav = nav;
  };

  /* ══════════════════════════════════════════════════════
     2 ── SLIDING AUTH PANEL
     ══════════════════════════════════════════════════════ */

  KHUI.slide = function (id, toRegister) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('kh-reg', !!toRegister);
    try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
  };

  KHUI.msg = function (id, text, kind) {
    var el = document.getElementById(id);
    if (!el) return;
    if (!text) { el.className = 'kh-msg'; el.textContent = ''; return; }
    el.textContent = text;
    el.className = 'kh-msg kh-' + (kind || 'err');
  };

  /* keep select floating-labels in sync */
  document.addEventListener('change', function (e) {
    if (e.target && e.target.tagName === 'SELECT' && e.target.closest('.kh-field')) {
      e.target.classList.toggle('kh-filled', !!e.target.value);
    }
  });

  /* ══════════════════════════════════════════════════════
     3 ── OTP VERIFICATION OVERLAY  (demo mode)
     ══════════════════════════════════════════════════════ */

  /**
   * KHUI.otp({
   *   phone:    '01711515952',      // shown masked
   *   length:   4,                  // default 4
   *   demo:     true,               // show the generated code on screen
   *   code:     '1234',             // optional fixed code
   *   onVerify: function(code, done){ done(true) },   // optional async check
   *   onSuccess:function(){ ... },
   *   onCancel: function(){ ... }
   * })
   */
  KHUI.otp = function (cfg) {
    cfg = cfg || {};
    var LEN  = cfg.length || 4;
    var DEMO = cfg.demo !== false;
    var code = cfg.code || String(Math.floor(Math.random() * 9000) + 1000);

    var masked = '';
    if (cfg.phone) {
      var p = String(cfg.phone).replace(/\D/g, '');
      masked = p.length >= 7
        ? p.slice(0, 3) + 'xx-xxxx' + p.slice(-2)
        : p;
    }

    var back = document.createElement('div');
    back.className = 'kh-otp-back';
    back.innerHTML =
      '<div class="kh-otp-card" id="khOtpCard" style="position:relative">' +
        '<button class="kh-otp-x" aria-label="বন্ধ করুন"><i class="ti ti-x"></i></button>' +
        '<div class="kh-otp-icon"><i class="ti ti-lock" aria-hidden="true"></i></div>' +
        '<h3 class="kh-otp-title">' + (cfg.title || 'মোবাইল নম্বর যাচাই করুন') + '</h3>' +
        '<p class="kh-otp-sub">' +
          (cfg.subtitle ? cfg.subtitle
            : (masked ? KHUI.bn(masked) + ' নম্বরে ' + KHUI.bn(LEN) + ' সংখ্যার কোড পাঠানো হয়েছে'
                      : KHUI.bn(LEN) + ' সংখ্যার যাচাই কোডটি লিখুন')) +
        '</p>' +
        (DEMO ? '<div class="kh-otp-demo">ডেমো মোড — আপনার কোড: <b>' + KHUI.bn(code) + '</b></div>' : '') +
        '<div class="kh-otp-row"></div>' +
        '<p class="kh-otp-foot">কোড পাননি? <a class="kh-off">পুনরায় পাঠান</a> <span class="kh-otp-timer"></span></p>' +
      '</div>';

    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';

    var card  = back.querySelector('.kh-otp-card');
    var row   = back.querySelector('.kh-otp-row');
    var title = back.querySelector('.kh-otp-title');
    var sub   = back.querySelector('.kh-otp-sub');
    var glyph = back.querySelector('.kh-otp-icon i');
    var resend= back.querySelector('.kh-otp-foot a');
    var timer = back.querySelector('.kh-otp-timer');

    var boxes = [];
    for (var i = 0; i < LEN; i++) {
      var inp = document.createElement('input');
      inp.className = 'kh-otp-in';
      inp.maxLength = 1;
      inp.inputMode = 'numeric';
      inp.autocomplete = 'one-time-code';
      inp.setAttribute('aria-label', 'কোডের ' + KHUI.bn(i + 1) + ' নম্বর সংখ্যা');
      row.appendChild(inp);
      boxes.push(inp);
    }

    function close(ok) {
      back.classList.remove('kh-show');
      document.body.style.overflow = '';
      setTimeout(function () { back.remove(); }, 300);
      if (!ok && cfg.onCancel) cfg.onCancel();
    }

    function reset() {
      card.classList.remove('kh-bad', 'kh-ok');
      title.textContent = cfg.title || 'মোবাইল নম্বর যাচাই করুন';
      glyph.className = 'ti ti-lock';
    }

    function attempt() {
      var val = boxes.map(function (b) { return b.value; }).join('');
      if (val.length < LEN) { reset(); return; }

      function done(ok) {
        if (ok) {
          card.classList.remove('kh-bad');
          card.classList.add('kh-ok');
          glyph.className = 'ti ti-lock-open';
          title.textContent = 'যাচাই সম্পন্ন!';
          sub.textContent = 'আপনার পরিচয় সফলভাবে নিশ্চিত করা হয়েছে';
          boxes.forEach(function (b) { b.disabled = true; });
          setTimeout(function () {
            close(true);
            if (cfg.onSuccess) cfg.onSuccess();
          }, 950);
        } else {
          card.classList.add('kh-bad');
          glyph.className = 'ti ti-lock-exclamation';
          title.textContent = 'কোড সঠিক নয়';
          sub.textContent = 'অনুগ্রহ করে আবার চেষ্টা করুন';
          setTimeout(function () {
            boxes.forEach(function (b) { b.value = ''; b.classList.remove('kh-filled'); });
            boxes[0].focus();
            reset();
            sub.textContent = cfg.subtitle ? cfg.subtitle
              : (masked
                ? KHUI.bn(masked) + ' নম্বরে ' + KHUI.bn(LEN) + ' সংখ্যার কোড পাঠানো হয়েছে'
                : KHUI.bn(LEN) + ' সংখ্যার যাচাই কোডটি লিখুন');
          }, 1200);
        }
      }

      if (cfg.onVerify) cfg.onVerify(val, done);
      else done(val === code);
    }

    boxes.forEach(function (b, i) {
      b.addEventListener('input', function () {
        b.value = KHUI.en(b.value).replace(/\D/g, '').slice(0, 1);
        b.classList.toggle('kh-filled', !!b.value);
        if (b.value && i < LEN - 1) boxes[i + 1].focus();
        attempt();
      });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus();
        if (e.key === 'ArrowLeft'  && i > 0)       boxes[i - 1].focus();
        if (e.key === 'ArrowRight' && i < LEN - 1) boxes[i + 1].focus();
        if (e.key === 'Escape') close(false);
      });
      b.addEventListener('paste', function (e) {
        e.preventDefault();
        var t = KHUI.en((e.clipboardData || window.clipboardData).getData('text')).replace(/\D/g, '');
        for (var k = 0; k < LEN; k++) {
          boxes[k].value = t[k] || '';
          boxes[k].classList.toggle('kh-filled', !!boxes[k].value);
        }
        boxes[Math.min(t.length, LEN - 1)].focus();
        attempt();
      });
    });

    back.querySelector('.kh-otp-x').onclick = function () { close(false); };
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(false); });

    // 60-second resend countdown
    var left = 60;
    timer.textContent = '(' + KHUI.bn('0:' + (left < 10 ? '0' : '') + left) + ')';
    var iv = setInterval(function () {
      left--;
      if (left <= 0) {
        clearInterval(iv);
        timer.textContent = '';
        resend.classList.remove('kh-off');
      } else {
        timer.textContent = '(' + KHUI.bn('0:' + (left < 10 ? '0' : '') + left) + ')';
      }
    }, 1000);

    resend.onclick = function () {
      if (resend.classList.contains('kh-off')) return;
      code = String(Math.floor(Math.random() * 9000) + 1000);
      var d = back.querySelector('.kh-otp-demo');
      if (d) d.innerHTML = 'ডেমো মোড — আপনার কোড: <b>' + KHUI.bn(code) + '</b>';
      boxes.forEach(function (b) { b.value = ''; b.disabled = false; b.classList.remove('kh-filled'); });
      boxes[0].focus();
      reset();
      left = 60;
      resend.classList.add('kh-off');
      clearInterval(iv);
      iv = setInterval(function () {
        left--;
        if (left <= 0) { clearInterval(iv); timer.textContent = ''; resend.classList.remove('kh-off'); }
        else { timer.textContent = '(' + KHUI.bn('0:' + (left < 10 ? '0' : '') + left) + ')'; }
      }, 1000);
    };

    requestAnimationFrame(function () {
      back.classList.add('kh-show');
      setTimeout(function () { boxes[0].focus(); }, 340);
    });

    return { close: close, code: function () { return code; } };
  };

  /* ══════════════════════════════════════════════════════
     VERIFICATION METHOD CHOOSER
     Shows the available ways to verify an account. Methods
     marked soon:true render disabled with a "শীঘ্রই আসছে" tag.
     KHUI.chooseVerify({ onPick(method){}, onCancel(){} })
     ══════════════════════════════════════════════════════ */
  KHUI.chooseVerify = function (cfg) {
    cfg = cfg || {};
    var methods = cfg.methods || [
      { id: 'email', icon: 'ti-mail-fast', title: 'ই-মেইল OTP',
        sub: 'ই-মেইলে ৬ সংখ্যার কোড যাবে', active: true },
      { id: 'sms', icon: 'ti-device-mobile-message', title: 'মোবাইল SMS',
        sub: 'SMS-এ কোড', active: false, soonText: 'শীঘ্রই আসছে' }
    ];

    var back = document.createElement('div');
    back.className = 'kh-otp-back';
    var cards = methods.map(function (m) {
      return '<button type="button" class="kh-vc-card' + (m.active ? '' : ' kh-vc-off') + '" data-m="' + m.id + '"' + (m.active ? '' : ' disabled') + '>' +
        '<span class="kh-vc-ic"><i class="ti ' + m.icon + '" aria-hidden="true"></i></span>' +
        '<span class="kh-vc-tx"><b>' + m.title + '</b><small>' + m.sub + '</small></span>' +
        (m.active ? '<i class="ti ti-chevron-right kh-vc-go" aria-hidden="true"></i>'
                  : '<span class="kh-vc-soon">' + (m.soonText || 'শীঘ্রই') + '</span>') +
        '</button>';
    }).join('');
    back.innerHTML =
      '<div class="kh-otp-card" style="position:relative;text-align:left">' +
        '<button class="kh-otp-x" aria-label="বন্ধ করুন"><i class="ti ti-x"></i></button>' +
        '<div class="kh-otp-icon" style="display:flex;margin:0 auto 14px"><i class="ti ti-shield-check" aria-hidden="true"></i></div>' +
        '<h3 class="kh-otp-title" style="text-align:center">যাচাইয়ের মাধ্যম বেছে নিন</h3>' +
        '<p class="kh-otp-sub" style="text-align:center">অ্যাকাউন্ট খুলতে যেকোনো একটি মাধ্যমে যাচাই করুন</p>' +
        '<div class="kh-vc-list">' + cards + '</div>' +
      '</div>';
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';

    function close(picked) {
      back.classList.remove('kh-show');
      document.body.style.overflow = '';
      setTimeout(function () { back.remove(); }, 280);
      if (!picked && cfg.onCancel) cfg.onCancel();
    }
    back.querySelector('.kh-otp-x').onclick = function () { close(false); };
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(false); });
    back.querySelectorAll('.kh-vc-card:not(.kh-vc-off)').forEach(function (b) {
      b.onclick = function () {
        var m = b.dataset.m;
        close(true);
        if (cfg.onPick) setTimeout(function () { cfg.onPick(m); }, 300);
      };
    });
    requestAnimationFrame(function () { back.classList.add('kh-show'); });
  };

  /* ══════════════════════════════════════════════════════
     4 ── PASSWORD STRENGTH METER + EYE TOGGLE
     ══════════════════════════════════════════════════════ */

  var RULES = [
    { key: '৮ অক্ষর', test: function (v) { return v.length >= 8; } },
    { key: 'A-Z',     test: function (v) { return /[A-Z]/.test(v); } },
    { key: 'a-z',     test: function (v) { return /[a-z]/.test(v); } },
    { key: '১২৩',     test: function (v) { return /[0-9]/.test(v); } },
    { key: '@#$',     test: function (v) { return /[^A-Za-z0-9]/.test(v); } }
  ];

  KHUI.score = function (v) {
    var n = 0;
    RULES.forEach(function (r) { if (r.test(v)) n++; });
    return n;
  };

  function addEye(input) {
    if (input.dataset.khEye === '1') return;
    input.dataset.khEye = '1';

    var host = input.parentElement;
    if (!host) return;
    var cs = window.getComputedStyle(host).position;
    if (cs === 'static') host.style.position = 'relative';
    host.classList.add('kh-pw-wrap');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kh-pw-eye';
    btn.setAttribute('aria-label', 'পাসওয়ার্ড দেখান');
    btn.innerHTML = '<i class="ti ti-eye" aria-hidden="true"></i>';
    btn.onclick = function () {
      var hidden = input.type === 'password';
      input.type = hidden ? 'text' : 'password';
      btn.querySelector('i').className = hidden ? 'ti ti-eye-off' : 'ti ti-eye';
      btn.setAttribute('aria-label', hidden ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখান');
      input.focus();
    };
    host.appendChild(btn);

    // keep text clear of the button
    var pr = parseFloat(window.getComputedStyle(input).paddingRight) || 0;
    if (pr < 36) input.style.paddingRight = '36px';
  }

  function addMeter(input) {
    if (input.dataset.khMeter === '1') return;
    input.dataset.khMeter = '1';

    var box = document.createElement('div');
    box.className = 'kh-pw-meter';
    box.innerHTML =
      '<div class="kh-pw-top"><span>পাসওয়ার্ডের শক্তি</span><span class="kh-pw-lvl">—</span></div>' +
      '<div class="kh-pw-bar"><div class="kh-pw-fill"></div></div>' +
      '<div class="kh-pw-chips">' +
        RULES.map(function (r) {
          return '<span class="kh-pw-chip"><i class="ti ti-circle-filled" aria-hidden="true"></i>' + r.key + '</span>';
        }).join('') +
      '</div>';

    var anchor = input.closest('.kh-field') || input.closest('.form-group') || input.parentElement;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);

    var fill  = box.querySelector('.kh-pw-fill');
    var lvl   = box.querySelector('.kh-pw-lvl');
    var chips = box.querySelectorAll('.kh-pw-chip');

    function update() {
      var v = input.value, n = 0;
      RULES.forEach(function (r, i) {
        var hit = r.test(v);
        chips[i].classList.toggle('kh-hit', hit);
        if (hit) n++;
      });
      fill.style.width = Math.round(n / RULES.length * 100) + '%';
      lvl.className = 'kh-pw-lvl';
      if (!v)          { fill.style.width = '0'; lvl.textContent = '—'; }
      else if (n <= 2) { fill.style.background = 'var(--kh-weak)';   lvl.textContent = 'দুর্বল';     lvl.classList.add('kh-l1'); }
      else if (n <= 4) { fill.style.background = 'var(--kh-mid)';    lvl.textContent = 'মধ্যম';      lvl.classList.add('kh-l2'); }
      else             { fill.style.background = 'var(--kh-strong)'; lvl.textContent = 'শক্তিশালী'; lvl.classList.add('kh-l3'); }
    }

    input.addEventListener('input', update);
    update();
  }

  KHUI.enhancePasswords = function (root) {
    root = root || document;
    root.querySelectorAll('input[type="password"]').forEach(function (inp) {
      if (inp.dataset.khSkip === '1') return;
      addEye(inp);
      if (inp.dataset.khStrength === '1') addMeter(inp);
    });
  };

  /* ══════════════════════════════════════════════════════
     PREMIUM EMAIL INPUT — validity tick + quick domain chips
     ══════════════════════════════════════════════════════ */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var DOMAINS = [
    { d: 'gmail.com',   cls: 'kh-dc-gmail',   ic: 'G' },
    { d: 'outlook.com', cls: 'kh-dc-outlook', ic: 'O' },
    { d: 'yahoo.com',   cls: 'kh-dc-yahoo',   ic: 'Y' }
  ];

  function enhanceEmail(inp) {
    if (inp.dataset.khEmail === '1' || inp.dataset.khSkip === '1') return;
    inp.dataset.khEmail = '1';
    inp.classList.add('kh-email-live');

    /* 1 ── validity tick inside the field ── */
    var host = inp.parentElement;
    if (host) {
      var cs = window.getComputedStyle(host).position;
      if (cs === 'static') host.classList.add('kh-email-host');
      var tick = document.createElement('span');
      tick.className = 'kh-email-tick';
      tick.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>';
      host.appendChild(tick);
      inp._khTick = tick;
      /* keep the value clear of the tick */
      var pr = parseFloat(window.getComputedStyle(inp).paddingRight) || 0;
      if (pr < 34) inp.style.paddingRight = '34px';
    }

    /* 2 ── quick-select domain chips below the field ── */
    var anchor = inp.closest('.kh-field') || inp.closest('.form-group') ||
                 inp.closest('.fg') || inp.closest('.fl-field') ||
                 inp.closest('.mfield') || inp.parentElement;
    if (anchor && anchor.parentNode && inp.dataset.khDomains !== 'off') {
      var row = document.createElement('div');
      row.className = 'kh-domain-row';
      row.innerHTML = '<span class="kh-domain-lbl">দ্রুত বাছাই:</span>';
      DOMAINS.forEach(function (o) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'kh-domain-chip';
        b.innerHTML = '<span class="kh-dc-ic ' + o.cls + '">' + o.ic + '</span>' + o.d;
        b.addEventListener('click', function (e) {
          e.preventDefault();
          applyDomain(inp, o.d);
        });
        row.appendChild(b);
      });
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
    }

    function validate() {
      var v = inp.value.trim();
      var ok = EMAIL_RE.test(v);
      if (inp._khTick) inp._khTick.classList.toggle('kh-ok', ok);
      inp.classList.toggle('kh-valid', ok);
      inp.classList.toggle('kh-invalid', v.length > 3 && v.indexOf('@') > 0 && !ok);
    }
    inp.addEventListener('input', validate);
    inp.addEventListener('blur', validate);
    validate();
  }

  function applyDomain(inp, domain) {
    var v = inp.value.trim();
    var at = v.indexOf('@');
    if (at === -1) {
      /* no @ yet: append the domain to whatever local part they typed */
      inp.value = (v || '') + '@' + domain;
    } else {
      /* replace whatever is after @ */
      inp.value = v.slice(0, at + 1) + domain;
    }
    inp.focus();
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    /* nudge the caret to the end */
    try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) {}
  }

  KHUI.enhanceEmails = function (root) {
    root = root || document;
    root.querySelectorAll('input[type="email"]').forEach(enhanceEmail);
  };

  /* ══════════════════════════════════════════════════════
     AUTO-FILL FORMS FROM THE LOGGED-IN MEMBER PROFILE
     Pages pass a map of  profileField -> inputElementId.
     Fields the user already typed are left untouched.
     Returns the profile (or null) so the caller can react.
     ══════════════════════════════════════════════════════ */
  KHUI.prefillFromProfile = function (map, opts) {
    opts = opts || {};
    if (!sb() || !sb().rpc) return Promise.resolve(null);

    return sb().auth.getSession().then(function (s) {
      if (!s || !s.data || !s.data.session) return null;
      return sb().rpc('get_my_profile').then(function (r) {
        var p = (r && !r.error) ? r.data : null;
        if (!p) return null;

        Object.keys(map).forEach(function (field) {
          var el = document.getElementById(map[field]);
          if (!el) return;
          var val = p[field];
          if (val === null || val === undefined || val === '') return;
          if (el.value && el.value.trim() !== '' && !opts.overwrite) return; // don't clobber typing
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.classList.add('kh-autofilled');
        });

        if (typeof opts.onFilled === 'function') opts.onFilled(p);
        return p;
      });
    }).catch(function () { return null; });
  };

  /* ══════════════════════════════════════════════════════
     LOGGED-IN USER — profile cache + navbar chip
     ══════════════════════════════════════════════════════ */

  var PROFILE_KEY = 'kh_profile_v1';

  KHUI.getMyProfile = function (force) {
    if (!sb() || !sb().auth) return Promise.resolve(null);
    return sb().auth.getSession().then(function (s) {
      var sess = s && s.data && s.data.session;
      if (!sess) {
        try { sessionStorage.removeItem(PROFILE_KEY); } catch (e) {}
        return null;
      }
      if (!force) {
        try {
          var c = JSON.parse(sessionStorage.getItem(PROFILE_KEY) || 'null');
          if (c && c.id === sess.user.id) return c;
        } catch (e) {}
      }
      return Promise.resolve(sb().rpc('get_my_profile')).then(function (r) {
        var p = (r && !r.error) ? r.data : null;
        if (p) { try { sessionStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch (e) {} }
        return p;
      });
    }).catch(function () { return null; });
  };

  KHUI.clearProfileCache = function () {
    try { sessionStorage.removeItem(PROFILE_KEY); } catch (e) {}
  };

  /* ফার্স্ট + মিডল/লাস্ট নেম */
  KHUI.shortName = function (full) {
    var parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).join(' ') || 'সদস্য';
  };

  /* ── প্রোফাইল কত শতাংশ পূর্ণ ── */
  var PROFILE_FIELDS = [
    'full_name', 'mobile', 'email', 'occupation', 'address',
    'permanent_address', 'district', 'nid', 'photo_url', 'nid_url'
  ];
  KHUI.profileProgress = function (p) {
    if (!p) return { pct: 0, filled: 0, total: PROFILE_FIELDS.length, missing: PROFILE_FIELDS.slice() };
    var filled = 0, missing = [];
    PROFILE_FIELDS.forEach(function (f) {
      var v = p[f];
      if (v !== null && v !== undefined && String(v).trim() !== '') filled++;
      else missing.push(f);
    });
    return {
      pct: Math.round(filled / PROFILE_FIELDS.length * 100),
      filled: filled, total: PROFILE_FIELDS.length, missing: missing
    };
  };

  /* ── ডায়নামিক জেনারেল সেটিংস (app_settings) ── */
  var _settingsCache = null;
  KHUI.getSettings = function (force) {
    if (_settingsCache && !force) return Promise.resolve(_settingsCache);
    if (!sb() || !sb().from) return Promise.resolve({});
    return new Promise(function (resolve) {
      Promise.resolve(sb().from('app_settings').select('key,value')).then(function (r) {
        var out = {};
        ((r && r.data) || []).forEach(function (row) { out[row.key] = row.value; });
        _settingsCache = out;
        resolve(out);
      }, function () { resolve({}); });
    });
  };
  KHUI.getSetting = function (key, fallback) {
    return KHUI.getSettings().then(function (s) {
      return (s && s[key] !== undefined) ? s[key] : (fallback !== undefined ? fallback : null);
    });
  };
  KHUI.productEnabled = function (name) {
    return KHUI.getSetting('products', {}).then(function (p) {
      if (!p || !p[name]) return true;              /* সেটিং না থাকলে চালু ধরা হয় */
      return p[name].enabled !== false;
    });
  };

  /* ── ডায়নামিক বাধ্যতামূলক ফিল্ড ──
     map: settingsField -> inputId । required হলে ইনপুটে data-kh-req
     ও লেবেলে * বসে। ভ্যালিডেশন: KHUI.checkRequired(map) → null বা প্রথম খালি inputId */
  KHUI.applyRequiredFields = function (product, map) {
    return KHUI.getSetting('required_fields.' + product, []).then(function (list) {
      list = Array.isArray(list) ? list : [];
      Object.keys(map).forEach(function (field) {
        var el = document.getElementById(map[field]);
        if (!el) return;
        var need = list.indexOf(field) !== -1;
        el.toggleAttribute('data-kh-req', need);
        if (need) el.setAttribute('aria-required', 'true');
        /* লেবেল খুঁজে তারকা বসানো */
        var label = null;
        if (el.id) label = document.querySelector('label[for="' + el.id + '"]');
        if (!label && el.parentElement) label = el.parentElement.querySelector('label');
        if (label) {
          var star = label.querySelector('.kh-req-star');
          if (need && !star) {
            star = document.createElement('span');
            star.className = 'kh-req-star';
            star.textContent = ' *';
            label.appendChild(star);
          } else if (!need && star) star.remove();
        }
      });
      return list;
    });
  };
  KHUI.checkRequired = function (map) {
    var bad = null;
    Object.keys(map).some(function (field) {
      var el = document.getElementById(map[field]);
      if (el && el.hasAttribute('data-kh-req') && String(el.value || '').trim() === '') {
        bad = map[field];
        return true;
      }
      return false;
    });
    return bad;
  };

  /* ── প্রোফাইল ছবি জুম করে বড় দেখা ── */
  KHUI.zoomPhoto = function (url, name, pct) {
    if (document.querySelector('.kh-zoom')) return;

    var back = document.createElement('div');
    back.className = 'kh-zoom';
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-label', 'প্রোফাইল ছবি');

    var box = document.createElement('div');
    box.className = 'kh-zoom-box';

    var inner = '';
    if (url) {
      inner += '<img class="kh-zoom-img" src="' + String(url).replace(/"/g, '&quot;') + '" alt="">';
    } else {
      inner += '<div class="kh-zoom-ini">' + ((name && name.trim()[0]) || 'স') + '</div>';
    }
    inner += '<div class="kh-zoom-name"></div>';
    if (pct != null) inner += '<div class="kh-zoom-pct">প্রোফাইল ' + KHUI.bn(pct) + '% পূর্ণ</div>';
    inner += '<div class="kh-zoom-acts">' +
      '<a class="kh-zoom-btn" href="my-profile.html"><i class="ti ti-user-edit" aria-hidden="true"></i> প্রোফাইল আপডেট</a>' +
      '<a class="kh-zoom-btn kh-zoom-alt" href="my-dashboard.html"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> ড্যাশবোর্ড</a>' +
      '</div>' +
      '<button class="kh-zoom-x" aria-label="বন্ধ করুন"><i class="ti ti-x" aria-hidden="true"></i></button>';

    box.innerHTML = inner;
    box.querySelector('.kh-zoom-name').textContent = name || 'সদস্য';
    back.appendChild(box);
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back.classList.add('kh-in'); });

    function close() {
      back.classList.remove('kh-in');
      document.body.style.overflow = '';
      setTimeout(function () { if (back.parentNode) back.remove(); }, 220);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    box.querySelector('.kh-zoom-x').onclick = close;
    document.addEventListener('keydown', onKey);
    KHUI._closeZoom = close;
  };

  function buildAvatar(p, name) {
    if (p.photo_url) {
      var img = document.createElement('img');
      img.className = 'kh-uchip-av';
      img.alt = '';
      img.src = p.photo_url;
      return img;
    }
    var sp = document.createElement('span');
    sp.className = 'kh-uchip-av kh-uchip-ini';
    sp.textContent = (name && name[0]) || 'স';
    return sp;
  }

  KHUI.mountUserChip = function () {
    if (!sb() || !sb().auth) { KHUI._addNavLoginItem(); return Promise.resolve(null); }
    return KHUI.getMyProfile().then(function (p) {
      if (!p) { KHUI._addNavLoginItem(); return null; }
      var name = KHUI.shortName(p.full_name);

      /* topbar-এর লগইন লিংকগুলো নাম-চিপে বদলে যায় */
      document.querySelectorAll('.kh-login-link').forEach(function (a) {
        var wrap = document.createElement('span');
        wrap.className = 'kh-uwrap';

        var chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'kh-uchip';
        chip.setAttribute('aria-haspopup', 'true');
        chip.appendChild(buildAvatar(p, name));
        var nm = document.createElement('span');
        nm.className = 'kh-uchip-nm';
        nm.textContent = name;
        chip.appendChild(nm);
        var car = document.createElement('i');
        car.className = 'ti ti-chevron-down';
        car.setAttribute('aria-hidden', 'true');
        chip.appendChild(car);

        var menu = document.createElement('span');
        menu.className = 'kh-umenu';
        menu.innerHTML =
          '<a href="my-dashboard.html"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> আমার ড্যাশবোর্ড</a>' +
          '<a href="my-profile.html"><i class="ti ti-user-edit" aria-hidden="true"></i> প্রোফাইল আপডেট</a>' +
          '<button type="button" class="kh-uout"><i class="ti ti-logout" aria-hidden="true"></i> সাইন আউট</button>';

        wrap.appendChild(chip);
        wrap.appendChild(menu);
        a.replaceWith(wrap);

        chip.onclick = function (e) {
          e.stopPropagation();
          document.querySelectorAll('.kh-uwrap.kh-open').forEach(function (w) {
            if (w !== wrap) w.classList.remove('kh-open');
          });
          wrap.classList.toggle('kh-open');
        };
        /* মেনুতে "ছবি বড় করে দেখুন" */
        var zoomItem = document.createElement('button');
        zoomItem.type = 'button';
        zoomItem.className = 'kh-uzoom';
        zoomItem.innerHTML = '<i class="ti ti-zoom-in" aria-hidden="true"></i> ছবি বড় করে দেখুন';
        menu.insertBefore(zoomItem, menu.firstChild);
        zoomItem.onclick = function () {
          wrap.classList.remove('kh-open');
          KHUI.zoomPhoto(p.photo_url, p.full_name, KHUI.profileProgress(p).pct);
        };

        /* ছবিতে সরাসরি ক্লিক করলেও জুম */
        var avEl = chip.querySelector('.kh-uchip-av');
        if (avEl) {
          avEl.style.cursor = 'zoom-in';
          avEl.addEventListener('click', function (e) {
            e.stopPropagation();
            wrap.classList.remove('kh-open');
            KHUI.zoomPhoto(p.photo_url, p.full_name, KHUI.profileProgress(p).pct);
          });
        }

        menu.querySelector('.kh-uout').onclick = function () {
          KHUI.clearProfileCache();
          try { sessionStorage.removeItem('kh_user'); } catch (e) {}
          sb().auth.signOut().then(function () { location.href = 'index.html'; });
        };
      });

      document.addEventListener('click', function () {
        document.querySelectorAll('.kh-uwrap.kh-open').forEach(function (w) { w.classList.remove('kh-open'); });
      });

      /* ── মোবাইল: টপবার লুকানো থাকে, তাই হ্যামবার্গার মেনুতেও যোগ করা ── */
      KHUI._addNavMenuItems(p, name);

      /* glass nav ও বাকি কাজ */
      KHUI._mountGlassAvatar(p, name);
      return p;
    });
  };

  /* হ্যামবার্গার মেনুতে (.nav-links) সদস্যের আইটেম বসায় */
  KHUI._addNavMenuItems = function (p, name) {
    var lists = document.querySelectorAll('.nav-links');
    lists.forEach(function (list) {
      if (list.querySelector('.kh-navme')) return;

      var wrap = document.createElement('div');
      wrap.className = 'kh-navme';

      var head = document.createElement('div');
      head.className = 'kh-navme-head';
      var av;
      if (p.photo_url) {
        av = document.createElement('img');
        av.src = p.photo_url; av.alt = '';
      } else {
        av = document.createElement('span');
        av.textContent = (name && name[0]) || 'স';
      }
      av.className = 'kh-navme-av';
      head.appendChild(av);
      var t = document.createElement('div');
      t.innerHTML = '<b>' + vEsc(name) + '</b><span>প্রোফাইল ' + KHUI.bn(KHUI.profileProgress(p).pct) + '% পূর্ণ</span>';
      head.appendChild(t);
      wrap.appendChild(head);

      wrap.insertAdjacentHTML('beforeend',
        '<a href="my-dashboard.html"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> আমার ড্যাশবোর্ড</a>' +
        '<a href="my-profile.html"><i class="ti ti-user-edit" aria-hidden="true"></i> প্রোফাইল আপডেট</a>' +
        '<button type="button" class="kh-navme-out"><i class="ti ti-logout" aria-hidden="true"></i> সাইন আউট</button>');

      wrap.querySelector('.kh-navme-out').onclick = function () {
        KHUI.clearProfileCache();
        try { sessionStorage.clear(); } catch (e) {}
        sb().auth.signOut().then(function () { location.href = 'index.html'; });
      };
      list.appendChild(wrap);
    });
    KHUI._addNavAdminItem(true);
  };

  /* লগ-আউট অবস্থায় হ্যামবার্গার মেনুতে "লগইন" আইটেম */
  KHUI._addNavLoginItem = function () {
    document.querySelectorAll('.nav-links').forEach(function (list) {
      if (list.querySelector('.kh-navlogin')) return;
      var a = document.createElement('a');
      a.className = 'kh-navlogin';
      a.href = 'user-login.html';
      a.innerHTML = '<i class="ti ti-user-circle" aria-hidden="true"></i> লগইন / সাইন আপ';
      list.appendChild(a);
    });
    KHUI._addNavAdminItem(false);
  };

  /* ⚠️ মোবাইলে অ্যাডমিন লগইনের কোনো পথ ছিল না (১৩ সেপ্টেম্বর ২০২৬)।
     "Admin" বাটনটি আছে `.topbar`-এ, আর মোবাইলে `.topbar { display:none }` —
     তাই অ্যাডমিনকে ডেস্কটপ খুঁজতে হত অথবা হাতে URL লিখতে হত।

     ⚠️ দুটি আলাদা পথ (সিদ্ধান্ত: ১৪ সেপ্টেম্বর ২০২৬ — ব্যবহারকারী
     চেয়েছেন "খুব হাইলাইট করার দরকার নেই, ছোট করে কোথাও রাখলেই হবে"):
       • **লগ-আউট অবস্থায়** — মেনুর একদম শেষে একটি ছোট, শান্ত লিংক
         → `admin-login.html`।
       • **লগইন অবস্থায়** — শুধু তিনিই "অ্যাডমিন প্যানেল" আইটেমটি
         দেখেন যিনি সত্যিই অ্যাডমিন; সেটি বসে সদস্যের কার্ডের ভেতরে
         এবং সরাসরি `dashboard.html`-এ নিয়ে যায়। **আলাদা করে অ্যাডমিন
         লগইন করতে হয় না** — একই সেশনেই চলে (`initAdmin()` কেবল
         `get_my_admin_info()` দেখে, আলাদা লগইন চায় না)।
       • **সাধারণ সদস্য কিছুই দেখেন না** — মেনু অকারণে ভরে না।
     যাচাই একই ফাংশনে করা হয় যেটি ড্যাশবোর্ড নিজে ব্যবহার করে
     (`get_my_admin_info`), তাই "লিংক দেখাল কিন্তু ঢুকতে দিল না" —
     এমন অমিল হতে পারে না। */
  KHUI._addNavAdminItem = function (signedIn) {
    if (document.body.dataset.khAdminLink === 'off') return;
    if (/admin-login\.html/i.test(location.pathname)) return;   /* ঐ পেজে অর্থহীন */

    if (signedIn) { khAdminPanelItem(); return; }

    document.querySelectorAll('.nav-links').forEach(function (list) {
      if (list.querySelector('.kh-navadmin')) return;
      var a = document.createElement('a');
      a.className = 'kh-navadmin';
      a.href = 'admin-login.html';
      a.innerHTML = '<i class="ti ti-shield-lock" aria-hidden="true"></i> অ্যাডমিন লগইন';
      list.appendChild(a);
    });
  };

  /* ⚠️ `rpc()`-এ `.catch()` নেই (প্রকল্পের ৪ নম্বর নিয়ম) — try/catch লাগে।
     ব্যর্থ হলে চুপচাপ কিছুই বসে না; অ্যাডমিন তখন ডেস্কটপের টপবার বা
     `admin-login.html` দিয়ে ঢুকতে পারেন। */
  async function khAdminPanelItem() {
    var db = sb();
    if (!db || !db.rpc) return;
    var rows;
    try {
      var r = await db.rpc('get_my_admin_info');
      rows = r && r.data;
    } catch (e) { return; }
    if (!rows || !rows.length) return;        /* সাধারণ সদস্য — কিছুই দেখানো হয় না */

    document.querySelectorAll('.nav-links .kh-navme').forEach(function (wrap) {
      if (wrap.querySelector('.kh-navadmin')) return;
      var a = document.createElement('a');
      a.className = 'kh-navadmin kh-navadmin-in';
      a.href = 'dashboard.html';
      a.innerHTML = '<i class="ti ti-shield-lock" aria-hidden="true"></i> অ্যাডমিন প্যানেল';
      var out = wrap.querySelector('.kh-navme-out');   /* সাইন আউটের ঠিক উপরে */
      if (out) wrap.insertBefore(a, out); else wrap.appendChild(a);
    });
  }

  /* গ্লাস নেভে লগইন → শুধু ছবি + প্রোফাইল-পূর্ণতার সবুজ রিং */
  KHUI._mountGlassAvatar = function (p, name) {
    {
      var g = document.querySelector('.kh-glassnav a[href="user-login.html"]');
      if (g) {
        var prog = KHUI.profileProgress(p);
        g.href = 'my-dashboard.html';
        g.className = (g.className ? g.className + ' ' : '') + 'kh-gav-link';
        g.setAttribute('aria-label', 'প্রোফাইল ' + prog.pct + '% পূর্ণ');
        g.title = 'প্রোফাইল ' + prog.pct + '% পূর্ণ';
        g.textContent = '';

        var ring = document.createElement('span');
        ring.className = 'kh-gav-ring';
        ring.style.background =
          'conic-gradient(#22c55e ' + prog.pct + '%, rgba(160,150,190,.35) ' + prog.pct + '% 100%)';

        var av;
        if (p.photo_url) {
          av = document.createElement('img');
          av.className = 'kh-gav';
          av.alt = '';
          av.src = p.photo_url;
        } else {
          av = document.createElement('span');
          av.className = 'kh-gav kh-gav-ini';
          av.textContent = (name && name[0]) || 'স';
        }
        ring.appendChild(av);
        g.appendChild(ring);

        /* ক্লিকে ছোট মেনু: প্রোফাইল ও ড্যাশবোর্ড */
        var gm = document.createElement('div');
        gm.className = 'kh-gmenu';
        gm.innerHTML =
          '<div class="kh-gmenu-pct"><span class="kh-gmenu-bar"><i style="width:' + prog.pct + '%"></i></span> প্রোফাইল ' + KHUI.bn(prog.pct) + '% পূর্ণ</div>' +
          '<button type="button" class="kh-gzoom"><i class="ti ti-zoom-in" aria-hidden="true"></i> ছবি বড় করে দেখুন</button>' +
          '<a href="my-dashboard.html"><i class="ti ti-layout-dashboard" aria-hidden="true"></i> আমার ড্যাশবোর্ড</a>' +
          '<a href="my-profile.html"><i class="ti ti-user-edit" aria-hidden="true"></i> প্রোফাইল আপডেট</a>';
        g.parentElement.appendChild(gm);
        gm.querySelector('.kh-gzoom').onclick = function (e) {
          e.stopPropagation();
          gm.classList.remove('kh-open');
          KHUI.zoomPhoto(p.photo_url, p.full_name, prog.pct);
        };

        g.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          gm.classList.toggle('kh-open');
        });
        document.addEventListener('click', function () { gm.classList.remove('kh-open'); });
      }
    }
    return p;
  };

  /* ══════════════════════════════════════════════════════
     লাইভ ক্যামেরা — সেলফি বা কার্ডের ছবি তোলা
     KHUI.camera({ facing:'user'|'environment', title, guide, onShot(blob) })
     ══════════════════════════════════════════════════════ */

  KHUI.camera = function (cfg) {
    cfg = cfg || {};
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof cfg.onError === 'function') cfg.onError(new Error('এই ব্রাউজারে ক্যামেরা চালু করা যাচ্ছে না'));
      return null;
    }
    if (document.querySelector('.kh-cam-back')) return null;

    var facing = cfg.facing === 'environment' ? 'environment' : 'user';
    var back = document.createElement('div');
    back.className = 'kh-cam-back';
    back.innerHTML =
      '<div class="kh-cam">' +
        '<div class="kh-cam-head">' +
          '<span>' + vEsc(cfg.title || 'ছবি তুলুন') + '</span>' +
          '<button type="button" class="kh-cam-x" aria-label="বন্ধ করুন"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="kh-cam-stage' + (facing === 'user' ? ' kh-cam-mirror' : '') + '">' +
          '<video class="kh-cam-video" playsinline autoplay muted></video>' +
          '<div class="kh-cam-guide' + (facing === 'user' ? ' kh-cam-oval' : '') + '"></div>' +
          '<div class="kh-cam-msg"></div>' +
        '</div>' +
        '<div class="kh-cam-hint">' + vEsc(cfg.guide || (facing === 'user'
            ? 'মুখটি বৃত্তের ভেতরে রাখুন · ভালো আলোয় তুলুন'
            : 'কার্ডটি সোজা করে পুরো ফ্রেমে রাখুন · ঝলক এড়ান')) + '</div>' +
        '<div class="kh-cam-acts">' +
          '<button type="button" class="kh-cam-btn kh-cam-shot"><i class="ti ti-camera"></i> ছবি তুলুন</button>' +
          '<button type="button" class="kh-cam-btn kh-cam-alt kh-cam-flip"><i class="ti ti-rotate"></i> ক্যামেরা বদল</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back.classList.add('kh-in'); });

    var video = back.querySelector('.kh-cam-video');
    var stage = back.querySelector('.kh-cam-stage');
    var msgEl = back.querySelector('.kh-cam-msg');
    var stream = null;

    function say(t) { msgEl.textContent = t || ''; msgEl.style.display = t ? 'flex' : 'none'; }

    function stop() {
      if (stream) { stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} }); stream = null; }
    }
    function close() {
      stop();
      back.classList.remove('kh-in');
      document.body.style.overflow = '';
      setTimeout(function () { if (back.parentNode) back.remove(); }, 200);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.querySelector('.kh-cam-x').onclick = close;

    function start() {
      say('ক্যামেরা চালু হচ্ছে…');
      stop();
      navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } },
        audio: false
      }).then(function (s) {
        stream = s;
        video.srcObject = s;
        stage.classList.toggle('kh-cam-mirror', facing === 'user');
        back.querySelector('.kh-cam-guide').classList.toggle('kh-cam-oval', facing === 'user');
        return video.play();
      }).then(function () { say(''); })
        .catch(function (err) {
          var m = 'ক্যামেরা চালু করা যায়নি।';
          if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
            m = 'ক্যামেরার অনুমতি দেওয়া হয়নি। ব্রাউজারের ঠিকানা বারে ক্যামেরা আইকনে গিয়ে অনুমতি দিন।';
          } else if (err && err.name === 'NotFoundError') {
            m = 'এই ডিভাইসে ক্যামেরা পাওয়া যায়নি।';
          }
          say(m);
        });
    }
    start();

    back.querySelector('.kh-cam-flip').onclick = function () {
      facing = facing === 'user' ? 'environment' : 'user';
      start();
    };

    back.querySelector('.kh-cam-shot').onclick = function () {
      if (!stream || !video.videoWidth) { say('ক্যামেরা এখনো প্রস্তুত নয়…'); return; }
      var cv = document.createElement('canvas');
      cv.width = video.videoWidth; cv.height = video.videoHeight;
      var ctx = cv.getContext('2d');
      if (facing === 'user') {           /* সেলফি আয়নার মত দেখায় — সোজা করে সংরক্ষণ */
        ctx.translate(cv.width, 0); ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, cv.width, cv.height);
      cv.toBlob(function (blob) {
        if (!blob) { say('ছবি নেওয়া যায়নি, আবার চেষ্টা করুন।'); return; }
        var file = new File([blob], 'capture-' + Date.now() + '.jpg', { type: 'image/jpeg' });
        close();
        if (typeof cfg.onShot === 'function') cfg.onShot(file);
      }, 'image/jpeg', 0.92);
    };

    KHUI._closeCamera = close;
    return back;
  };

  /* ══════════════════════════════════════════════════════
     ডিজিটাল ভাউচার (সঞ্চয় জমা / উত্তোলন / যেকোনো লেনদেন)
     KHUI.voucher({ title, no, amount, name, code, mobile, photo,
                    rows:[[label,value],...], status, note, verifyUrl })
     ══════════════════════════════════════════════════════ */

  function vEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  KHUI.voucher = function (cfg) {
    cfg = cfg || {};
    var old = document.querySelector('.kh-vch-back');
    if (old) old.remove();

    var amountTxt = '৳' + KHUI.bn(Number(cfg.amount || 0).toLocaleString('en-IN'));
    var when = cfg.date ? new Date(cfg.date) : new Date();
    var whenTxt = when.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    /* r = [লেবেল, মান, হাইলাইট?] — তৃতীয় ঘরটি সত্য হলে সারিটি জোর দিয়ে দেখানো হয় */
    var rowsHtml = (cfg.rows || []).map(function (r) {
      return '<div class="kh-vch-cell' + (r[2] ? ' kh-vch-hl' : '') + '">' +
             '<div class="kh-vch-lbl">' + vEsc(r[0]) + '</div>' +
             '<div class="kh-vch-val">' + vEsc(r[1]) + '</div></div>';
    }).join('');

    var photoHtml = cfg.photo
      ? '<img class="kh-vch-av" src="' + vEsc(cfg.photo) + '" alt="" crossorigin="anonymous">'
      : '<span class="kh-vch-av kh-vch-ini">' + vEsc((cfg.name || 'স').trim()[0] || 'স') + '</span>';

    var back = document.createElement('div');
    back.className = 'kh-vch-back';
    back.innerHTML =
      '<div class="kh-vch" id="khVoucher">' +
        '<div class="kh-vch-head">' +
          '<div class="kh-vch-top">' +
            '<div class="kh-vch-brand">' +
              '<div class="kh-vch-logo">KH</div>' +
              '<div><b>কর্জে হাসানা ফাউন্ডেশন</b><span>Korje Hasana Foundation</span></div>' +
            '</div>' +
            '<div class="kh-vch-no"><span>' + vEsc(cfg.title || 'জমা ভাউচার') + '</span><b>' + vEsc(cfg.no || '—') + '</b></div>' +
          '</div>' +
          '<div class="kh-vch-amtrow">' +
            '<div><div class="kh-vch-cap">পরিমাণ / Amount</div><div class="kh-vch-amt">' + amountTxt + '</div></div>' +
            '<div style="text-align:left">' +
              '<div class="kh-vch-cap">তারিখ ও সময়</div>' +
              '<div class="kh-vch-when">' + vEsc(whenTxt) + '</div>' +
              '<div class="kh-vch-badge">' + vEsc(cfg.status || 'গৃহীত') + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="kh-vch-stripe"></div>' +
        '</div>' +

        '<div class="kh-vch-body">' +
          '<div class="kh-vch-member">' +
            '<div class="kh-vch-avwrap">' + photoHtml + '</div>' +
            '<div style="min-width:0">' +
              '<div class="kh-vch-lbl">সদস্য / Member</div>' +
              '<div class="kh-vch-name">' + vEsc(cfg.name || '—') + '</div>' +
              '<div class="kh-vch-code">' +
                (cfg.code ? 'সদস্য কোড: ' + vEsc(cfg.code) : '') +
                (cfg.mobile ? (cfg.code ? ' · ' : '') + vEsc(cfg.mobile) : '') +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="kh-vch-grid">' + rowsHtml + '</div>' +

          '<div class="kh-vch-foot">' +
            '<div class="kh-vch-qr" id="khVchQr"></div>' +
            '<div class="kh-vch-seal">' +
              '<div class="kh-vch-sealbox">অনুমোদিত<br><b>কর্জে হাসানা</b></div>' +
              '<div class="kh-vch-note">' + vEsc(cfg.note || 'এটি একটি ডিজিটাল ভাউচার — স্বাক্ষর ছাড়াই বৈধ।') + '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        (cfg.email ? '<div class="kh-vch-mailnote" id="khVchNote">' +
            '<i class="ti ti-loader-2 kh-spin"></i> ভাউচারের একটি কপি ই-মেইলে পাঠানো হচ্ছে…' +
          '</div>' : '') +
        '<div class="kh-vch-acts">' +
          '<button type="button" class="kh-vch-btn kh-vch-print"><i class="ti ti-printer"></i> প্রিন্ট / PDF</button>' +
          '<button type="button" class="kh-vch-btn kh-vch-alt kh-vch-png"><i class="ti ti-download"></i> ছবি সেভ</button>' +
          '<button type="button" class="kh-vch-btn kh-vch-alt kh-vch-close"><i class="ti ti-x"></i> বন্ধ করুন</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { back.classList.add('kh-in'); });

    /* QR — লাইব্রেরি থাকলে, নাহলে আইকন */
    var qrEl = back.querySelector('#khVchQr');
    var qrText = cfg.verifyUrl ||
      ('https://korje-hasana-website.vercel.app/verify.html?ref=' + encodeURIComponent(cfg.no || '') +
       '&amt=' + encodeURIComponent(cfg.amount || 0));
    function drawQr() {
      try {
        qrEl.innerHTML = '';
        new window.QRCode(qrEl, { text: qrText, width: 92, height: 92, correctLevel: window.QRCode.CorrectLevel.L });
      } catch (e) {
        qrEl.innerHTML = '<i class="ti ti-qrcode" style="font-size:56px;color:#241539"></i>';
      }
    }
    if (window.QRCode) drawQr();
    else {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = drawQr;
      s.onerror = function () { qrEl.innerHTML = '<i class="ti ti-qrcode" style="font-size:56px;color:#241539"></i>'; };
      document.head.appendChild(s);
    }

    function close() {
      back.classList.remove('kh-in');
      document.body.style.overflow = '';
      setTimeout(function () { if (back.parentNode) back.remove(); }, 220);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.kh-vch-close').onclick = close;

    /* প্রিন্ট: নতুন উইন্ডোতে ভাউচারটিই ছাপা হয় (টেক্সট পরিষ্কার থাকে) */
    back.querySelector('.kh-vch-print').onclick = function () {
      var node = back.querySelector('.kh-vch').cloneNode(true);
      var acts = node.querySelector('.kh-vch-acts');
      if (acts) acts.remove();
      var css = '';
      document.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
        css += '<link rel="stylesheet" href="' + l.href + '">';
      });
      var w = window.open('', '_blank', 'width=760,height=980');
      if (!w) return;
      w.document.write(
        '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8">' +
        '<title>' + vEsc(cfg.title || 'ভাউচার') + ' — ' + vEsc(cfg.no || '') + '</title>' + css +
        '<style>body{margin:0;background:#f3f0f8;display:flex;justify-content:center;padding:22px;' +
        "font-family:'Hind Siliguri',sans-serif}" +
        '.kh-vch{max-width:620px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.15)}' +
        '@media print{body{background:#fff;padding:0}.kh-vch{box-shadow:none}}</style></head><body>' +
        node.outerHTML +
        '<script>window.onload=function(){setTimeout(function(){window.print();},450);}<\/script>' +
        '</body></html>'
      );
      w.document.close();
    };

    /* ভাউচার ছবি হিসেবে সেভ */
    var pngBtn = back.querySelector('.kh-vch-png');
    if (pngBtn) {
      pngBtn.onclick = function () {
        var b = pngBtn;
        b.disabled = true;
        b.innerHTML = '<i class="ti ti-loader-2 kh-spin"></i> তৈরি হচ্ছে…';
        KHUI.voucherToPng(back.querySelector('.kh-vch')).then(function (b64) {
          b.disabled = false;
          b.innerHTML = '<i class="ti ti-download"></i> ছবি সেভ';
          if (!b64) return;
          var a = document.createElement('a');
          a.href = 'data:image/png;base64,' + b64;
          a.download = (cfg.no || 'voucher') + '.png';
          document.body.appendChild(a); a.click(); a.remove();
        });
      };
    }

    /* ── ই-মেইল সম্পূর্ণ স্বয়ংক্রিয় — নিচে শুধু ছোট নোটিশ ── */
    var noteEl = back.querySelector('#khVchNote');
    if (cfg.email && noteEl && cfg.autoEmail !== false) {
      function note(html, kind) {
        noteEl.className = 'kh-vch-mailnote' + (kind ? ' kh-' + kind : '');
        noteEl.innerHTML = html;
      }
      /* ভাউচারটি পর্দায় বসার পর ছবি বানিয়ে পাঠানো হয় */
      setTimeout(function () {
        KHUI.sendVoucherMail(cfg.email.kind, cfg.email.id, { node: back.querySelector('.kh-vch') })
          .then(function (r) {
            note('<i class="ti ti-mail-check"></i> এই ভাউচারের একটি কপি ' +
                 (r.sent_to || 'আপনার ই-মেইলে') + ' পাঠানো হয়েছে' + (r.image ? ' (ছবিসহ)' : '') + '।', 'ok');
          })
          .catch(function (e) {
            var m = (e && e.message) || '';
            note('<i class="ti ti-mail-off"></i> ' +
                 (/লগইন/.test(m) ? 'ই-মেইল পাঠানো যায়নি — লগইন করা থাকলে ভাউচার নিজে থেকেই ই-মেইলে চলে যায়।'
                                 : 'ই-মেইল পাঠানো যায়নি: ' + (m || 'পরে আবার চেষ্টা করা হবে')) +
                 ' ভাউচারটি "ছবি সেভ" দিয়ে রেখে দিতে পারেন।', 'err');
          });
      }, 900);
    }

    KHUI._closeVoucher = close;
    return back;
  };

  /* ══════════════════════════════════════════════════════
     ছবি ছোট করা — যেকোনো আকারের ছবি নির্ধারিত সীমার নিচে নামায়
     KHUI.compressImage(file, {maxDim, maxBytes}) → Blob (image/jpeg)
     ══════════════════════════════════════════════════════ */
  function _loadImg(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () { URL.revokeObjectURL(url); res(im); };
      im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('ছবি পড়া যায়নি')); };
      im.src = url;
    });
  }
  function _canvasBlob(cv, q) {
    return new Promise(function (res) { cv.toBlob(function (b) { res(b); }, 'image/jpeg', q); });
  }
  KHUI.compressImage = function (file, opt) {
    opt = opt || {};
    var maxBytes = opt.maxBytes || 2 * 1024 * 1024;
    var maxDim = opt.maxDim || 1200;
    if (!/^image\//i.test(file.type)) return Promise.resolve(file);   /* PDF ইত্যাদি অপরিবর্তিত */
    return _loadImg(file).then(function (im) {
      var Q = [0.9, 0.82, 0.72, 0.6, 0.5, 0.42];
      function step(i, dim) {
        if (i >= Q.length) return Promise.resolve(null);
        var scale = Math.min(1, dim / Math.max(im.width, im.height));
        var w = Math.max(1, Math.round(im.width * scale));
        var h = Math.max(1, Math.round(im.height * scale));
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(im, 0, 0, w, h);
        return _canvasBlob(cv, Q[i]).then(function (b) {
          if (b && b.size <= maxBytes) return b;
          return step(i + 1, Math.round(dim * 0.8));
        });
      }
      return step(0, maxDim);
    }).then(function (b) {
      if (!b) throw new Error('ছবি প্রস্তুত করা যায়নি');
      return b;
    });
  };

  /* ── html2canvas দরকারে লোড করা ── */
  var _h2cPromise = null;
  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (_h2cPromise) return _h2cPromise;
    _h2cPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload = function () { res(window.html2canvas); };
      s.onerror = function () { rej(new Error('ছবি তৈরির টুল লোড হয়নি')); };
      document.head.appendChild(s);
    });
    return _h2cPromise;
  }

  /* ── jsPDF দরকারে লোড করা ──
     ⚠️ PDF-এ বাংলা লেখা সরাসরি বসানো যায় না (shaping নেই), তাই ভাউচারের
     ছবিটিকেই পাতায় বসানো হয় — লেখা তখন ছবির অংশ, বাংলা নিখুঁত থাকে। */
  var _pdfPromise = null;
  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (_pdfPromise) return _pdfPromise;
    _pdfPromise = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = function () {
        (window.jspdf && window.jspdf.jsPDF) ? res(window.jspdf.jsPDF) : rej(new Error('jsPDF পাওয়া গেল না'));
      };
      s.onerror = function () { rej(new Error('PDF টুল লোড হয়নি')); };
      document.head.appendChild(s);
    });
    return _pdfPromise;
  }

  /* ভাউচারের PNG থেকে PDF — base64 (কোনো ডেটা-URL উপসর্গ ছাড়া) */
  KHUI.pngToPdfBase64 = function (pngB64) {
    if (!pngB64) return Promise.resolve(null);
    var build = loadJsPdf().then(function (jsPDF) {
      return new Promise(function (res, rej) {
        var img = new Image();
        img.onload = function () {
          try {
            /* ⚠️ পাতা সবসময় সত্যিকারের A4 (২১০×২৯৭ মিমি) — আগে ছবির অনুপাত ধরে
               পাতার উচ্চতা বদলে যেত, ফলে ছাপাতে দিলে A4-এ বসত না। */
            var A4W = 210, A4H = 297, pad = 10;
            var maxW = A4W - pad * 2, maxH = A4H - pad * 2;
            var w = maxW, h = maxW * (img.height / img.width);
            if (h > maxH) { h = maxH; w = maxH * (img.width / img.height); }  /* লম্বা হলে উচ্চতায় ফিট */
            var x = (A4W - w) / 2, y = (A4H - h) / 2;                        /* পাতার মাঝখানে */
            var pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
            pdf.addImage('data:image/png;base64,' + pngB64, 'PNG', x, y, w, h, undefined, 'FAST');
            var out = pdf.output('datauristring');
            res((out.split(',')[1]) || null);
          } catch (e) { rej(e); }
        };
        img.onerror = function () { rej(new Error('ছবি পড়া যায়নি')); };
        img.src = 'data:image/png;base64,' + pngB64;
      });
    });
    /* PDF বানাতে আটকে গেলেও মেইল যেন থেমে না থাকে */
    var guard = new Promise(function (res) { setTimeout(function () { res(null); }, 10000); });
    return Promise.race([build, guard]).catch(function () { return null; });
  };

  /* ভাউচারটিকে ছবি (PNG) বানানো — ই-মেইলে পাঠানোর জন্য
     ⚠️ আগে শর্ত ছিল "ভাউচার পর্দায় থাকতে হবে": নোডের মাপ ৪০px-এর কম হলে সরাসরি
     null দেওয়া হত। দানের পেজে ভাউচারের ওভারলে `.show` না পাওয়া পর্যন্ত
     `#voucherDoc` থাকে ০×০ — তাই ছবি/PDF কখনো তৈরিই হত না (সঞ্চয়ে কিটের নিজের
     ভাউচার সবসময় দৃশ্যমান, তাই ওটি কাজ করত)। এখন লুকানো থাকলে নোডটি ক্লোন করে
     পর্দার বাইরে (কিন্তু লেআউট-সহ) বসিয়ে ছবি তোলা হয় — ওভারলে খোলা থাকা,
     টাইমিং বা ব্যবহারকারী ভাউচার বন্ধ করে দেওয়া — কিছুতেই আর আটকায় না। */
  KHUI.voucherToPng = function (node) {
    node = node || document.querySelector('.kh-vch') || document.getElementById('voucherDoc');
    if (!node) return Promise.resolve(null);

    var host = null;                 /* ক্লোন রাখার অস্থায়ী ঘর */
    function target() {
      var r = node.getBoundingClientRect();
      if (r.width >= 40 && r.height >= 40) return node;
      /* লুকানো — পর্দার বাইরে ক্লোন করে মাপ পাওয়া যায় */
      var w = node.offsetWidth || node.scrollWidth || 580;
      host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:fixed;left:-10000px;top:0;width:' + w +
                           'px;background:#fff;z-index:-1;pointer-events:none';
      var clone = node.cloneNode(true);
      clone.style.width = w + 'px';
      clone.style.display = 'block';
      host.appendChild(clone);
      document.body.appendChild(host);
      var cr = clone.getBoundingClientRect();
      if (cr.width < 40 || cr.height < 40) { cleanup(); return null; }
      return clone;
    }
    function cleanup() {
      if (host && host.parentNode) host.parentNode.removeChild(host);
      host = null;
    }

    var shot = loadHtml2Canvas().then(function (h2c) {
      var el = target();
      if (!el) return null;
      /* বড় ভাউচারে স্কেল কমানো — মেইলের আকার নিয়ন্ত্রণে থাকে */
      var tall = el.getBoundingClientRect().height > 1100;
      return h2c(el, {
        scale: tall ? 1.35 : 1.7, useCORS: true, backgroundColor: '#ffffff', logging: false,
        imageTimeout: 6000,
        onclone: function (doc) {
          /* বাটন ও বার্তা ছবিতে থাকবে না */
          doc.querySelectorAll('.kh-vch-acts, .kh-vch-mailnote, .v-actions').forEach(function (x) {
            x.style.display = 'none';
          });
        }
      });
    }).then(function (cv) {
      cleanup();
      if (!cv || !cv.width || !cv.height) return null;
      var data = cv.toDataURL('image/png');
      var b64 = data.split(',')[1] || null;
      return (b64 && b64.length > 2000) ? b64 : null;   /* base64 অংশটুকু */
    }).catch(function (e) {
      cleanup();
      throw e;
    });

    /* html2canvas কখনো আটকে গেলেও ই-মেইল যেন থেমে না থাকে */
    var guard = new Promise(function (res) {
      setTimeout(function () { cleanup(); res(null); }, 12000);
    });
    return Promise.race([shot, guard]).catch(function () { cleanup(); return null; });
  };

  /* ভাউচার ই-মেইল — Edge Function কল (লগইন আবশ্যক)
     ভাউচারটি ছবি হিসেবেও পাঠানো হয় যাতে যেকোনো ই-মেইল অ্যাপে পড়া যায় */
  KHUI.sendVoucherMail = function (kind, id, opts) {
    opts = opts || {};
    var db = sb();
    if (!db || !db.auth) return Promise.reject(new Error('সংযোগ নেই'));

    /* ══════════════════════════════════════════════════════════
       ⚠️ পর্দার হুবহু ভাউচারটি সার্ভারে **জমা দেওয়া** হয়, নিজে মেইল করা হয় না।
       আগে ব্রাউজার সরাসরি Edge Function-কে ডাকত — তাতে লগইন আবশ্যক ছিল আর
       CORS/JWT-এর ফাঁদে বারবার আটকে যেত (ছবি/PDF কখনোই পৌঁছাত না)।
       এখন `attach_voucher_asset` RPC-তে ছবি ও A4 PDF জমা পড়ে — record_donation
       যে পথে কাজ করে, ঠিক সেই PostgREST পথ — তারপর `request_voucher_mail`
       সার্ভারকে বলে "এখনই পাঠাও"। লগইন লাগে না, দ্বিগুণ কপিও যায় না।
       ══════════════════════════════════════════════════════════ */
    var pngPromise = (opts.png === false)
      ? Promise.resolve(null)
      : KHUI.voucherToPng(opts.node);

    return pngPromise.then(function (png) {
      if (!png || opts.pdf === false) return { png: png, pdf: null };
      return KHUI.pngToPdfBase64(png).then(function (pdf) {
        return { png: png, pdf: pdf };
      });
    }).then(function (made) {
      /* ছবি/PDF জমা দেওয়া — না বানাতে পারলেও সার্ভার সাধারণ রশিদ পাঠাবে */
      var put = (made.png || made.pdf)
        ? db.rpc('attach_voucher_asset', {
            p_kind: kind, p_ref_id: id,
            p_png: made.png || null, p_pdf: made.pdf || null
          }).then(function (r) { return r && r.data; })
        : Promise.resolve(null);

      return put.then(function (res) {
        return db.rpc('request_voucher_mail', { p_kind: kind, p_ref_id: id })
          .then(function () { return res; })
          .catch(function () { return res; });
      }).then(function (res) {
        return {
          ok: true,
          queued: true,
          image: !!(res && res.png),
          pdf: !!(res && res.pdf),
          already: !!(res && res.already)
        };
      });
    });
  };

  /* লগইন করা অবস্থায় সরাসরি Edge Function দিয়ে পাঠানো — অ্যাডমিনের ম্যানুয়াল
     "ই-মেইল করুন" বাটনের জন্য রাখা হলো (সাধারণ পথ উপরের জমা দেওয়াই) */
  KHUI.sendVoucherMailDirect = function (kind, id, opts) {
    opts = opts || {};
    var db = sb();
    if (!db || !db.auth) return Promise.reject(new Error('সংযোগ নেই'));

    return db.auth.getSession().then(function (s) {
      var sess = s && s.data && s.data.session;
      if (!sess) throw new Error('আগে লগইন করুন');

      return db.rpc('voucher_mail_status', { p_kind: kind, p_id: id })
        .then(function (r) { return (r && r.data) || null; })
        .catch(function () { return null; })
        .then(function (st) {
          if (st && st.status === 'sent') {
            return { ok: true, already: true, sent_to: st.sent_to, image: false };
          }
          return sendNow();
        });

      function sendNow() {
      var pngPromise = (opts.png === false)
        ? Promise.resolve(null)
        : KHUI.voucherToPng(opts.node);

      return pngPromise.then(function (png) {
        if (!png || opts.pdf === false) return { png: png, pdf: null };
        return KHUI.pngToPdfBase64(png).then(function (pdf) {
          return { png: png, pdf: pdf };
        });
      }).then(function (made) {
        var png = made.png, pdf = made.pdf;
      var url = (window.KH_FN_BASE || 'https://fgczixybyrzkrsoqrgdl.supabase.co/functions/v1') + '/send-voucher';
      /* উত্তর না এলে যেন "পাঠানো হচ্ছে…" চিরকাল ঘুরতে না থাকে */
      var ac = (typeof AbortController !== 'undefined') ? new AbortController() : null;
      var killer = ac ? setTimeout(function () { ac.abort(); }, 75000) : null;
      return fetch(url, {
        method: 'POST',
        signal: ac ? ac.signal : undefined,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sess.access_token
        },
        body: JSON.stringify({ kind: kind, id: id, image_base64: png, pdf_base64: pdf })
      }).catch(function (e) {
        if (killer) clearTimeout(killer);
        throw new Error((e && e.name === 'AbortError')
          ? 'সময় শেষ — ই-মেইল সার্ভার সাড়া দেয়নি'
          : 'সংযোগ সমস্যা — ই-মেইল পাঠানো যায়নি');
      }).then(function (res) {
        if (killer) clearTimeout(killer);
        return res;
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          if (!res.ok) {
            var m = j.error === 'no email' ? 'আপনার প্রোফাইলে ই-মেইল ঠিকানা নেই'
                  : j.error === 'forbidden' ? 'এই ভাউচার পাঠানোর অনুমতি নেই'
                  : j.error === 'not found' ? 'লেনদেনটি পাওয়া যায়নি'
                  : (j.error || 'ব্যর্থ');
            throw new Error(m);
          }
          return j;
        });
      });
      });
      }   /* sendNow() শেষ */
    });
  };

  /* ══════════════════════════════════════════════════════
     5 ── WHATSAPP CHAT WIDGET
     ══════════════════════════════════════════════════════ */

  /* ফাউন্ডেশনের হোয়াটসঅ্যাপ নম্বর — সুপার অ্যাডমিন জেনারেল সেটিংস থেকে বদলাতে পারেন
     (app_settings → whatsapp)। সেটিংস না থাকলে নিচের নম্বরটিই ব্যবহৃত হয়। */
  var WA_NUMBER = '8801971515952';   // wa.me format: country code + number, digits only
  var WA_LABEL  = '';
  function waNormalize(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '0') d = '88' + d;
    else if (d.length === 10) d = '880' + d;
    return d;
  }
  /* পেজে হাতে লেখা wa.me লিংকগুলোও সেটিংসের নম্বরে বদলে দেওয়া হয় —
     তাই নম্বর একটি জায়গাতেই রাখলে সারা সাইটে ঠিক থাকে */
  function syncWaLinks() {
    var as = document.querySelectorAll('a[href*="wa.me/"]');
    Array.prototype.forEach.call(as, function (a) {
      a.href = a.getAttribute('href').replace(/wa\.me\/\d+/, 'wa.me/' + WA_NUMBER);
    });
  }

  if (KHUI.getSetting) {
    KHUI.getSetting('whatsapp', {}).then(function (w) {
      if (w && typeof w === 'object') {
        if (w.number) WA_NUMBER = waNormalize(w.number);
        if (w.label) WA_LABEL = w.label;
        if (w.enabled === false) {
          var b = document.querySelector('.kh-chat-fab, .kh-chat-btn');
          if (b) b.style.display = 'none';
        }
      }
      syncWaLinks();
    }).catch(function () { syncWaLinks(); });
  }

  var CHAT_CHIPS = [
    { label: 'ঋণের আবেদন',  msg: 'আসসালামু আলাইকুম। আমি সুদমুক্ত ঋণের আবেদন করতে চাই।' },
    { label: 'সঞ্চয় স্কিম',  msg: 'আসসালামু আলাইকুম। সঞ্চয় স্কিম সম্পর্কে জানতে চাই।' },
    { label: 'দান করব',      msg: 'আসসালামু আলাইকুম। আমি দান করতে চাই।' },
    { label: 'কিস্তি পরিশোধ', msg: 'আসসালামু আলাইকুম। কিস্তি পরিশোধ সম্পর্কে জানতে চাই।' }
  ];

  KHUI.mountChat = function (opts) {
    opts = opts || {};
    if (document.querySelector('.kh-chat-launch')) return;
    var wa = waNormalize(opts.number || WA_NUMBER);

    /* launcher */
    var btn = document.createElement('button');
    btn.className = 'kh-chat-launch';
    btn.setAttribute('aria-label', 'WhatsApp চ্যাট খুলুন');
    btn.innerHTML = '<i class="ti ti-brand-whatsapp" aria-hidden="true"></i><span class="kh-chat-badge">1</span>';
    document.body.appendChild(btn);

    /* panel */
    var panel = document.createElement('div');
    panel.className = 'kh-chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'কর্জে হাসানা চ্যাট');
    panel.innerHTML =
      '<div class="kh-chat-head">' +
        '<div class="kh-chat-av">KH<span class="kh-chat-dot"></span></div>' +
        '<div style="flex:1;min-width:0">' +
          '<div class="kh-chat-name">কর্জে হাসানা ফাউন্ডেশন</div>' +
          '<div class="kh-chat-stat"><i class="ti ti-circle-filled" style="font-size:7px;color:#8effb4" aria-hidden="true"></i> অনলাইন — সাধারণত কয়েক মিনিটেই উত্তর দিই</div>' +
        '</div>' +
        '<button class="kh-chat-x" aria-label="বন্ধ করুন"><i class="ti ti-x" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="kh-chat-body"></div>' +
      '<div class="kh-chat-foot">' +
        '<div class="kh-chat-pill">' +
          '<button type="button" class="kh-cp-plus" aria-label="আরও অপশন"><i class="ti ti-plus" aria-hidden="true"></i></button>' +
          '<span class="kh-chat-div"></span>' +
          '<input type="text" placeholder="মেসেজ লিখুন..." aria-label="মেসেজ">' +
          '<button type="button" class="kh-cp-cam" aria-label="ছবি পাঠান"><i class="ti ti-camera" aria-hidden="true"></i></button>' +
          '<button type="button" class="kh-cp-emo" aria-label="ইমোজি"><i class="ti ti-mood-smile" aria-hidden="true"></i></button>' +
        '</div>' +
        '<button type="button" class="kh-chat-rbtn kh-chat-send" aria-label="পাঠান"><i class="ti ti-send" aria-hidden="true"></i></button>' +
        '<button type="button" class="kh-chat-rbtn kh-chat-mic" aria-label="ভয়েস মেসেজ"><i class="ti ti-microphone" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="kh-chat-note"><i class="ti ti-brand-whatsapp" aria-hidden="true"></i> মেসেজ পাঠালে WhatsApp-এ কথোপকথন চালু হবে</div>';
    document.body.appendChild(panel);

    var body   = panel.querySelector('.kh-chat-body');
    var input  = panel.querySelector('.kh-chat-pill input');
    var opened = false;

    function now() {
      var d = new Date(), h = d.getHours() % 12 || 12;
      return KHUI.bn(h + ':' + String(d.getMinutes()).padStart(2, '0'));
    }

    function typingEl() { return panel.querySelector('.kh-chat-typing'); }

    function addBubble(txt, out) {
      var el = document.createElement('div');
      el.className = 'kh-bub ' + (out ? 'kh-bub-out' : 'kh-bub-in');
      el.innerHTML = txt + '<div class="kh-bub-t">' + (out ? '✓✓ ' : '') + now() + '</div>';
      var ty = typingEl();
      if (ty) body.insertBefore(el, ty); else body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    function botReply(msg, delay) {
      var ty = typingEl();
      if (!ty) return;
      ty.classList.add('kh-on');
      body.scrollTop = body.scrollHeight;
      setTimeout(function () {
        ty.classList.remove('kh-on');
        addBubble(msg, false);
      }, delay || 1300);
    }

    function openWA(text) {
      var url = 'https://wa.me/' + wa + '?text=' + encodeURIComponent(text);
      window.open(url, '_blank', 'noopener');
    }

    function greet() {
      body.innerHTML = '';
      addBubble('আসসালামু আলাইকুম! 🌙<br>কর্জে হাসানা ফাউন্ডেশনে স্বাগতম। কীভাবে সাহায্য করতে পারি?', false);
      var chips = document.createElement('div');
      chips.className = 'kh-chat-chips';
      CHAT_CHIPS.forEach(function (c) {
        var b = document.createElement('button');
        b.className = 'kh-chat-chip';
        b.type = 'button';
        b.textContent = c.label;
        b.onclick = function () { userSend(c.msg); };
        chips.appendChild(b);
      });
      body.appendChild(chips);
      var ty = document.createElement('div');
      ty.className = 'kh-chat-typing';
      ty.innerHTML = '<span></span><span></span><span></span>';
      body.appendChild(ty);
    }

    function userSend(text) {
      text = (text || '').trim();
      if (!text) return;
      addBubble(text, true);
      botReply('জাযাকাল্লাহ খাইর! WhatsApp-এ নিয়ে যাচ্ছি — সেখানেই আমরা উত্তর দেব। 📱', 1100);
      setTimeout(function () { openWA(text); }, 2200);
    }

    function toggle(want) {
      opened = (want !== undefined) ? want : !opened;
      panel.classList.toggle('kh-open', opened);
      btn.style.opacity = opened ? '0' : '1';
      btn.style.pointerEvents = opened ? 'none' : 'auto';
      if (opened) {
        var badge = btn.querySelector('.kh-chat-badge');
        if (badge) badge.remove();
        if (!body.childElementCount) greet();
        setTimeout(function () { input.focus(); }, 350);
      }
    }

    btn.onclick = function () { toggle(true); };
    panel.querySelector('.kh-chat-x').onclick = function () { toggle(false); };
    panel.querySelector('.kh-chat-send').onclick = function () {
      userSend(input.value); input.value = '';
    };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { userSend(input.value); input.value = ''; }
      if (e.key === 'Escape') toggle(false);
    });
    /* the extras open WhatsApp directly — photos & voice live there */
    panel.querySelector('.kh-cp-cam').onclick =
    panel.querySelector('.kh-cp-plus').onclick = function () {
      openWA('আসসালামু আলাইকুম। আমি একটি ছবি/ডকুমেন্ট পাঠাতে চাই।');
    };
    panel.querySelector('.kh-chat-mic').onclick = function () {
      openWA('আসসালামু আলাইকুম।'); /* voice notes are recorded in WhatsApp itself */
    };
    panel.querySelector('.kh-cp-emo').onclick = function () { input.focus(); };

    KHUI._chat = { open: function () { toggle(true); }, close: function () { toggle(false); } };
  };

  /* ══════════════════════════════════════════════════════
     7 ── THEME (dark ⇄ light)
     ══════════════════════════════════════════════════════ */

  var THEME_KEY = 'kh_theme';

  KHUI.getTheme = function () {
    try { return localStorage.getItem(THEME_KEY) || 'dark'; }
    catch (e) { return 'dark'; }
  };

  KHUI.setTheme = function (t) {
    t = (t === 'light') ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    KHUI._syncThemeIcon();
  };

  KHUI.toggleTheme = function () {
    var next = KHUI.getTheme() === 'light' ? 'dark' : 'light';
    var root = document.documentElement;
    root.classList.add('kh-theming');           // brief cross-fade
    KHUI.setTheme(next);
    setTimeout(function () { root.classList.remove('kh-theming'); }, 420);
  };

  KHUI._syncThemeIcon = function () {
    var b = document.querySelector('.kh-theme-btn i');
    if (!b) return;
    var light = KHUI.getTheme() === 'light';
    b.className = light ? 'ti ti-sun' : 'ti ti-moon';
    var btn = b.parentElement;
    btn.setAttribute('aria-label', light ? 'ডার্ক থিমে যান' : 'লাইট থিমে যান');
    btn.title = light ? 'ডার্ক থিম' : 'লাইট থিম';
  };

  /* apply the saved theme as early as possible to avoid a flash */
  (function () {
    try {
      var t = localStorage.getItem(THEME_KEY);
      if (t) document.documentElement.setAttribute('data-theme', t);
    } catch (e) {}
  })();

  /* ══════════════════════════════════════════════════════
     6 ── CURSOR GLOW (site-wide)
     ══════════════════════════════════════════════════════ */

  KHUI.mountGlow = function () {
    if (document.querySelector('.kh-cursor-glow')) return;
    if (window.matchMedia('(max-width: 900px)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var glow = document.createElement('div');
    glow.className = 'kh-cursor-glow';
    glow.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glow);

    var x = 0, y = 0, cx = 0, cy = 0, raf = null, lit = false;

    /* is the pointer over a dark surface? then brighten the glow */
    var darkSel = '.topbar, .navbar, .hero, .page-hero, .footer, footer, ' +
                  '.pc-img, .impact-section, .mv-section, .quran-strip, ' +
                  '.profile-strip, .kh-slider .kh-brand, .login-shell';
    var lastCheck = 0;

    function tick() {
      cx += (x - cx) * 0.16;
      cy += (y - cy) * 0.16;
      glow.style.transform = 'translate(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px)';
      if (Math.abs(x - cx) > 0.6 || Math.abs(y - cy) > 0.6) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      x = e.clientX; y = e.clientY;
      if (!lit) { lit = true; glow.classList.add('kh-lit'); }
      if (!raf) raf = requestAnimationFrame(tick);

      /* throttle the dark-surface test — it costs a hit-test */
      var t = Date.now();
      if (t - lastCheck > 120 && document.elementFromPoint) {
        lastCheck = t;
        try {
          var el = document.elementFromPoint(e.clientX, e.clientY);
          glow.classList.toggle('kh-on-dark', !!(el && el.closest && el.closest(darkSel)));
        } catch (err) { /* ignore */ }
      }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      lit = false; glow.classList.remove('kh-lit');
    });
    document.addEventListener('mouseout', function (e) {
      if (!e.relatedTarget) { lit = false; glow.classList.remove('kh-lit'); }
    });

    KHUI._glow = glow;
  };

  /* ══════════════════════════════════════════════════════
     AUTO-INIT
     ══════════════════════════════════════════════════════ */

  /* pages without the glass navbar still need a way to switch theme */
  /* ⚠️ আলাদা/ভাসমান থীম বাটনটি সম্পূর্ণ বাদ (সিদ্ধান্ত: ১৩ সেপ্টেম্বর ২০২৬)।
     এখন **সব পেজেই** গ্লাস নেভবার আছে, আর থীম টগলটি তার ভেতরেই
     (`mountNav()`-এর `.kh-glassnav-top.kh-theme-btn`)। দুটো রাখলে একই
     জিনিস দুবার থাকত, আর ভাসমানটি অ্যাডমিন টপবারের "লাইভ" ব্যাজ
     ঢেকে দিত। নতুন কোনো পেজে `data-kh-nav="off"` দিলে থীম বদলানোর
     পথ থাকবে না — তাই নেভবার সবসময় চালু রাখতে হবে। */

  /* ══════════════════════════════════════════════════════
     সাইন-আপ গেট — লগইন ছাড়া ঋণ/সঞ্চয়/দান নেওয়া যাবে না।
     পেজে `data-kh-requires="signup"` দিলে নিজে থেকেই কাজ করে;
     অথবা KHUI.requireAccount('savings') হাতে ডাকা যায়।
     ══════════════════════════════════════════════════════ */

  var GATE_LABEL = {
    savings:  'সঞ্চয় হিসাব খুলতে',
    loan:     'ঋণের আবেদন করতে',
    donation: 'দান করতে',
    generic:  'এই সেবা নিতে'
  };

  KHUI.requireAccount = function (what, opts) {
    opts = opts || {};
    var db = sb();
    if (!db || !db.auth) return Promise.resolve(true);   /* সংযোগ নেই — আটকাবো না */

    return db.auth.getSession().then(function (s) {
      if (s && s.data && s.data.session) return true;    /* লগইন আছে */

      /* ফিরে আসার পথ মনে রাখা */
      var back = location.pathname.split('/').pop() + location.search + location.hash;
      try { sessionStorage.setItem('kh_after_login', back); } catch (e) {}

      if (opts.silent) return false;
      KHUI.signupGate(what, back);
      return false;
    }).catch(function () { return true; });
  };

  /* সুন্দর বাংলা পর্দা — "অ্যাকাউন্ট খুলুন" */
  KHUI.signupGate = function (what, back) {
    if (document.querySelector('.kh-gate-back')) return;
    var label = GATE_LABEL[what] || GATE_LABEL.generic;
    var url = 'user-login.html?signup=1&next=' + encodeURIComponent(back || '');

    var el = document.createElement('div');
    el.className = 'kh-gate-back';
    el.innerHTML =
      '<div class="kh-gate">' +
        '<div class="kh-gate-ico"><i class="ti ti-user-plus"></i></div>' +
        '<h3>প্রথমে অ্যাকাউন্ট খুলুন</h3>' +
        '<p>' + vEsc(label) + ' একটি সদস্য অ্যাকাউন্ট প্রয়োজন। একবার খুললে আপনার তথ্য ' +
          'সব ফর্মে নিজে থেকেই বসবে, ভাউচার ই-মেইলে যাবে এবং ড্যাশবোর্ডে সব হিসাব দেখতে পাবেন।</p>' +
        '<div class="kh-gate-acts">' +
          '<a class="kh-gate-btn" href="' + url + '"><i class="ti ti-user-plus"></i> সাইন আপ করুন</a>' +
          '<a class="kh-gate-btn kh-gate-alt" href="user-login.html?next=' + encodeURIComponent(back || '') + '"><i class="ti ti-login"></i> লগইন</a>' +
        '</div>' +
        '<button type="button" class="kh-gate-x">শুধু দেখে যাই</button>' +
      '</div>';

    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { el.classList.add('kh-in'); });

    function close() {
      el.classList.remove('kh-in');
      document.body.style.overflow = '';
      setTimeout(function () { if (el.parentNode) el.remove(); }, 200);
    }
    el.querySelector('.kh-gate-x').onclick = close;
    el.addEventListener('click', function (e) { if (e.target === el) close(); });
    KHUI._closeGate = close;
  };

  /* ══════════════════════════════════════════════════════
     মোবাইল: চওড়া টেবিল/উপাদান নিজে থেকেই স্ক্রলযোগ্য করা
     (parent selector CSS-এ নেই, তাই JS দিয়ে করা হয়)
     ══════════════════════════════════════════════════════ */
  KHUI.makeTablesScrollable = function (root) {
    root = root || document;
    if (!window.matchMedia || !window.matchMedia('(max-width: 820px)').matches) return;

    root.querySelectorAll('table').forEach(function (t) {
      var p = t.parentElement;
      if (!p) return;
      /* আগেই মোড়া আছে? */
      if (p.classList.contains('kh-scrollx') || p.classList.contains('tbl-wrap') ||
          p.classList.contains('table-wrap')) {
        p.style.overflowX = 'auto';
        p.style.webkitOverflowScrolling = 'touch';
        return;
      }
      var wrap = document.createElement('div');
      wrap.className = 'kh-scrollx';
      p.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
  };

  /* নতুন করে আঁকা টেবিলও ধরা পড়বে */
  KHUI._watchTables = function () {
    if (!window.MutationObserver) return;
    if (!window.matchMedia || !window.matchMedia('(max-width: 820px)').matches) return;
    var pending = null;
    var mo = new MutationObserver(function () {
      clearTimeout(pending);
      pending = setTimeout(function () { KHUI.makeTablesScrollable(document); }, 220);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    KHUI._tableObserver = mo;
  };

  /* ════════════════════════════════════════════════════════
     প্রিমিয়াম প্রোফাইল কার্ড

     `profile_card()` / `admin_profile_cards()`-এর এক সারি নিয়ে
     কার্ডটি বানায়। অনুমতি সার্ভারেই যাচাই হয় — সদস্য শুধু
     নিজের সারিটিই পান, তাই এখানে আর যাচাই করা হয় না।
     ════════════════════════════════════════════════════════ */
  function pcTk(n) { return '৳' + KHUI.bn(Number(n || 0).toLocaleString('en-IN')); }

  KHUI.profileCardHTML = function (c) {
    if (!c) return '';
    var sav = c.savings || {}, don = c.donation || {}, loan = c.loan || {};
    var name = c.name || 'সদস্য';

    var tags = [];
    if (c.is_depositor) tags.push('আমানতকারী');
    if (c.is_donor)     tags.push('দানকারী');
    if (c.is_borrower)  tags.push('ঋণগ্রহীতা');
    if (!tags.length)   tags.push('সদস্য');

    var photo = c.photo
      ? '<img class="kh-pc-photo" src="' + vEsc(c.photo) + '" alt="' + vEsc(name) + '">'
      : '<div class="kh-pc-photo kh-pc-ini">' + vEsc(name.trim().charAt(0) || 'স') + '</div>';

    var mob = (c.mobile || '').replace(/\D/g, '');
    var wa  = mob ? (mob.length === 11 && mob.charAt(0) === '0' ? '88' + mob : mob) : '';
    var rbtn = function (cls, icon, href, title) {
      return href
        ? '<a class="kh-pc-rbtn ' + cls + '" href="' + href + '" title="' + title + '" ' +
          'target="_blank" rel="noopener"><i class="ti ' + icon + '"></i></a>'
        : '<span class="kh-pc-rbtn kh-off" title="নম্বর/ঠিকানা নেই"><i class="ti ' + icon + '"></i></span>';
    };

    return '' +
    '<div class="kh-pc" data-kh-pc="' + vEsc(c.id || '') + '">' +
      '<div class="kh-pc-visual">' + photo + '</div>' +
      '<div class="kh-pc-body">' +
        '<span class="kh-pc-pill' + (c.online ? ' kh-on' : '') + '">' +
          '<i aria-hidden="true"></i>' + (c.online ? 'এখন অনলাইনে' : 'অফলাইন') +
        '</span>' +
        '<div class="kh-pc-name">' + vEsc(name) + '</div>' +
        '<div class="kh-pc-code">' + vEsc(c.code || '—') +
          (c.mobile ? ' · ' + KHUI.bn(vEsc(c.mobile)) : '') + '</div>' +
        '<p class="kh-pc-desc">' +
          vEsc([c.occupation, c.district].filter(Boolean).join(' · ') ||
               'কর্জে হাসানা ফাউন্ডেশনের সদস্য') + '</p>' +
        '<div class="kh-pc-tags">' +
          tags.map(function (t) { return '<span class="kh-pc-tag">' + t + '</span>'; }).join('') +
        '</div>' +
        /* ⚠️ প্রতিটি ঘরে `data-kh-cat` — অ্যাডমিনের তালিকায় ক্যাটাগরি বেছে
           নিলে বা ঘরটিতে ক্লিক করলে এই নাম ধরেই `kh-hl` বসানো হয়।
           টুলটিপ এখানে দেওয়া হয় না — সদস্যের নিজের কার্ডে বাছাবাছি নেই,
           তাই dashboard.html `kh-pc-pick` বসানোর সময় title যোগ করে। */
        '<div class="kh-pc-stats">' +
          '<div class="kh-pc-stat kh-pc-s-sav" data-kh-cat="depositor">' +
            '<b>আমানত</b><s>' + pcTk(sav.balance) + '</s>' +
            '<span>' + KHUI.bn(sav.accounts || 0) + 'টি হিসাব</span></div>' +
          '<div class="kh-pc-stat kh-pc-s-don" data-kh-cat="donor">' +
            '<b>দান</b><s>' + pcTk(don.total) + '</s>' +
            '<span>' + KHUI.bn(don.count || 0) + 'বার</span></div>' +
          '<div class="kh-pc-stat kh-pc-s-loan" data-kh-cat="borrower">' +
            '<b>ঋণ বকেয়া</b><s>' + pcTk(loan.outstanding) + '</s>' +
            '<span>' + KHUI.bn(loan.count || 0) + 'টি ঋণ</span></div>' +
        '</div>' +
        '<button type="button" class="kh-pc-link" data-kh-pc-more>' +
          'বিস্তারিত হিসাব দেখুন <i class="ti ti-arrow-right" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="kh-pc-rail">' +
        rbtn('kh-pc-r-stat', 'ti-file-text', 'savings-portal.html#history', 'স্টেটমেন্ট') +
        rbtn('kh-pc-r-call', 'ti-phone', mob ? 'tel:' + mob : '', 'ফোন') +
        rbtn('kh-pc-r-wa',   'ti-brand-whatsapp', wa ? 'https://wa.me/' + wa : '', 'হোয়াটসঅ্যাপ') +
        rbtn('kh-pc-r-mail', 'ti-mail', c.email ? 'mailto:' + c.email : '', 'ই-মেইল') +
      '</div>' +
    '</div>';
  };

  /* কার্ডটি কোথাও বসিয়ে দেওয়া। uid না দিলে নিজের কার্ড। */
  KHUI.mountProfileCard = async function (host, uid) {
    host = typeof host === 'string' ? document.querySelector(host) : host;
    if (!host) return null;
    var db = sb();
    if (!db) { host.innerHTML = ''; return null; }
    try {
      var r = await db.rpc('profile_card', uid ? { p_user: uid } : {});
      if (r.error || !r.data) throw r.error || new Error('no data');
      host.innerHTML = KHUI.profileCardHTML(r.data);
      var more = host.querySelector('[data-kh-pc-more]');
      if (more) more.onclick = function () { KHUI.profileCardDetail(r.data); };
      return r.data;
    } catch (e) {
      host.innerHTML = '<div style="padding:16px;font-size:13.5px;color:#9186a3">' +
                       'কার্ড দেখানো যায়নি।</div>';
      return null;
    }
  };

  /* ক্যাটাগরির বাংলা নাম — সব জায়গায় এখান থেকেই নেওয়া হয় */
  KHUI.PC_CATS = {
    depositor: 'আমানতকারী',
    donor:     'দানকারী',
    borrower:  'ঋণগ্রহীতা'
  };

  /* একটি কার্ডে ক্যাটাগরির ঘরটি জোর দিয়ে দেখানো।
     cat না দিলে (বা 'all') সব হাইলাইট মুছে যায়। */
  KHUI.pcHighlight = function (card, cat) {
    if (!card) return;
    card.querySelectorAll('.kh-pc-stat').forEach(function (s) {
      s.classList.toggle('kh-hl', !!cat && cat !== 'all' &&
                                  s.getAttribute('data-kh-cat') === cat);
    });
  };

  /* "বিস্তারিত হিসাব" — ভাউচারের মত সাদা পাতা, দুই থীমে এক।
     cat দিলে বড় অঙ্কটি ও সংশ্লিষ্ট সারিগুলো সেই ক্যাটাগরির হয়। */
  KHUI.profileCardDetail = function (c, cat) {
    var sav = c.savings || {}, don = c.donation || {}, loan = c.loan || {};
    var hlS = cat === 'depositor', hlD = cat === 'donor', hlL = cat === 'borrower';
    var big = hlD ? (don.total || 0) : hlL ? (loan.outstanding || 0) : (sav.balance || 0);
    var cap = hlD ? 'দানকারী — সর্বমোট দান'
            : hlL ? 'ঋণগ্রহীতা — বর্তমান বকেয়া'
            : hlS ? 'আমানতকারী — বর্তমান স্থিতি' : 'সদস্যের হিসাব';
    KHUI.voucher({
      title: cap,
      no:    c.code || '—',
      amount: big,
      name:  c.name,
      code:  c.code,
      mobile: c.mobile,
      photo: c.photo,
      status: c.online ? 'এখন অনলাইনে' : 'অফলাইন',
      rows: [
        ['আমানত — হিসাব সংখ্যা', KHUI.bn(sav.accounts || 0) + 'টি', hlS],
        ['আমানত — মোট জমা',      pcTk(sav.deposited), hlS],
        ['আমানত — মোট উত্তোলন',  pcTk(sav.withdrawn), hlS],
        ['আমানত — অনুমোদনের অপেক্ষায়', pcTk(sav.pending), hlS],
        ['আমানত — বর্তমান স্থিতি', pcTk(sav.balance), hlS],
        ['দান — সংখ্যা',          KHUI.bn(don.count || 0) + 'বার', hlD],
        ['দান — সর্বমোট',         pcTk(don.total), hlD],
        ['ঋণ — সংখ্যা',           KHUI.bn(loan.count || 0) + 'টি', hlL],
        ['ঋণ — মোট গৃহীত',        pcTk(loan.principal), hlL],
        ['ঋণ — পরিশোধিত',        pcTk(loan.paid), hlL],
        ['ঋণ — বকেয়া',           pcTk(loan.outstanding), hlL]
      ],
      note: 'এটি সদস্যের বর্তমান হিসাবের সারসংক্ষেপ — সিস্টেম থেকে তৈরি।'
    });
  };

  /* ════════════════════════════════════════════════════════
     অনলাইন উপস্থিতি

     প্রতি মিনিটে সার্ভারকে "আমি আছি" বলা হয়; সার্ভার ২ মিনিটের
     মধ্যে সাড়া পেলে অনলাইন ধরে। ⚠️ ট্যাব পেছনে থাকলে স্পন্দন
     পাঠানো হয় না — নাহলে বন্ধ করে রাখা ট্যাবও চিরকাল "অনলাইন"
     দেখাত। সামনে ফিরলেই সাথে সাথে একবার পাঠানো হয়।
     ════════════════════════════════════════════════════════ */
  var presenceTimer = null;

  KHUI.startPresence = function () {
    if (presenceTimer) return;
    var db = sb();
    if (!db || !db.rpc) return;

    async function beat() {
      if (document.hidden) return;
      try {
        var ses = (await db.auth.getSession()).data.session;
        if (!ses) return;                       /* লগ-আউট — কিছু পাঠানোর নেই */
        await db.rpc('touch_presence');
      } catch (e) { /* নীরবে — উপস্থিতি জানাতে না পারলে কিছু ভাঙে না */ }
    }

    beat();
    presenceTimer = setInterval(beat, 60000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) beat();
    });
  };

  /* ════════════════════════════════════════════════════════
     ই-সিগনেচার — ছবি পরিষ্কার করা

     লক্ষ্য: যে ফরম্যাটেই দিন, ফল একই রকম হবে — স্বচ্ছ পটভূমি,
     কাটা-ছাঁটা, আর ৬০০×২০০ আদর্শ মাপ।

     ⚠️ একটিমাত্র উজ্জ্বলতার সীমা (threshold) দিয়ে কাজ হয় না —
     মোবাইলে তোলা ছবিতে কাগজের এক পাশে ছায়া থাকে, ফলে ছায়ার
     দিকটা পুরো কালো হয়ে যায়। তাই আগে কাগজের নিজের উজ্জ্বলতা
     এলাকাভিত্তিক আন্দাজ করা হয়, তারপর তার থেকে পার্থক্য মেপে
     কালি আলাদা করা হয়।
     ════════════════════════════════════════════════════════ */
  var SIG_W = 600, SIG_H = 200;          /* আদর্শ মাপ (৩:১) */

  /* ছবি → কালির ঘনত্বের মানচিত্র */
  function sigAnalyze(img) {
    var MAX = 1600;
    var w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    var s = Math.min(1, MAX / Math.max(w, h));
    w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));

    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    var px = ctx.getImageData(0, 0, w, h).data;

    var gray = new Float32Array(w * h);
    for (var i = 0, p = 0; i < gray.length; i++, p += 4) {
      gray[i] = 0.299 * px[p] + 0.587 * px[p + 1] + 0.114 * px[p + 2];
    }

    /* ── কাগজের উজ্জ্বলতার মানচিত্র ──
       ব্লকে ভাগ করে ৯০তম পার্সেন্টাইল নেওয়া হয়। সর্বোচ্চ নিলে
       চকচকে প্রতিফলন ধরে ফেলত, গড় নিলে কালিও মিশে যেত। */
    var B  = Math.max(8, Math.round(Math.min(w, h) / 24));
    var gw = Math.max(1, Math.ceil(w / B)), gh = Math.max(1, Math.ceil(h / B));
    var bg = new Float32Array(gw * gh);
    var hist = new Uint32Array(32);
    for (var by = 0; by < gh; by++) {
      for (var bx = 0; bx < gw; bx++) {
        hist.fill(0);
        var n = 0;
        var y1 = Math.min(h, (by + 1) * B), x1 = Math.min(w, (bx + 1) * B);
        for (var yy = by * B; yy < y1; yy++) {
          for (var xx = bx * B; xx < x1; xx++) { hist[gray[yy * w + xx] >> 3 | 0]++; n++; }
        }
        /* ⚠️ Math.max(1,…) — এক-পিক্সেলের ব্লকে want শূন্য হয়ে যেত,
           ফলে ঐ পিক্সেলটি কালি বলে ধরা পড়ত */
        var want = Math.max(1, Math.floor(n * 0.9)), acc = 0, k = 0;
        for (k = 0; k < 32; k++) { acc += hist[k]; if (acc >= want) break; }
        bg[by * gw + bx] = Math.min(255, k * 8 + 4);
      }
    }

    /* ব্লকের মানগুলো মসৃণ করে প্রতিটি পিক্সেলে বসানো (bilinear) */
    var diff = new Uint8ClampedArray(w * h);
    var maxD = 1;
    for (var y2 = 0; y2 < h; y2++) {
      var fy = Math.min(gh - 1.001, Math.max(0, y2 / B - 0.5));
      var iy = fy | 0, ty = fy - iy, iy2 = Math.min(gh - 1, iy + 1);
      for (var x2 = 0; x2 < w; x2++) {
        var fx = Math.min(gw - 1.001, Math.max(0, x2 / B - 0.5));
        var ix = fx | 0, tx = fx - ix, ix2 = Math.min(gw - 1, ix + 1);
        var b00 = bg[iy * gw + ix],  b10 = bg[iy * gw + ix2];
        var b01 = bg[iy2 * gw + ix], b11 = bg[iy2 * gw + ix2];
        var paper = (b00 * (1 - tx) + b10 * tx) * (1 - ty) + (b01 * (1 - tx) + b11 * tx) * ty;
        var d = paper - gray[y2 * w + x2];
        if (d < 0) d = 0;
        diff[y2 * w + x2] = d;
        if (d > maxD) maxD = d;
      }
    }
    /* সবচেয়ে গাঢ় কালিকে ২৫৫ ধরে বাকিটা মাপা — হালকা পেন্সিলও ধরা পড়ে */
    if (maxD > 0 && maxD < 255) {
      var f = 255 / maxD;
      for (var j = 0; j < diff.length; j++) diff[j] = diff[j] * f;
    }

    var thr = sigOtsu(diff);

    /* ── কালি নীল কি না ──
       ⚠️ এটি অবশ্যই diff বের হওয়ার **পরে**, আর শুধু কালির পিক্সেল দেখে।
       আগে "গাঢ় পিক্সেল" ধরে হিসাব হত — ফলে ছায়ায় পড়া ধূসর কাগজও গাঢ়
       গোনা হত ও নীল কলমের ঝোঁক চাপা পড়ে যেত (পরীক্ষায় ধরা পড়েছে)। */
    var sumR = 0, sumB = 0, nInk = 0;
    for (var m = 0; m < diff.length; m++) {
      if (diff[m] > thr) { var q = m * 4; sumR += px[q]; sumB += px[q + 2]; nInk++; }
    }
    var blueish = nInk > 30 && (sumB / nInk) - (sumR / nInk) > 18;

    return { w: w, h: h, diff: diff, blueish: blueish, otsu: thr };
  }

  /* কালি ও কাগজ ভাগ করার স্বয়ংক্রিয় সীমা (Otsu) */
  function sigOtsu(d) {
    var hist = new Uint32Array(256), i;
    for (i = 0; i < d.length; i++) hist[d[i]]++;
    var total = d.length, sum = 0;
    for (i = 0; i < 256; i++) sum += i * hist[i];
    var sumB = 0, wB = 0, best = 0, thr = 60;
    for (i = 0; i < 256; i++) {
      wB += hist[i]; if (!wB) continue;
      var wF = total - wB; if (!wF) break;
      sumB += i * hist[i];
      var mB = sumB / wB, mF = (sum - sumB) / wF;
      var between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; thr = i; }
    }
    /* খুব নিচে নামলে কাগজের দানা কালি বলে ধরা পড়ে */
    return Math.max(28, Math.min(200, thr));
  }

  /* বিশ্লেষণ + সীমা → স্বচ্ছ, কাটা-ছাঁটা, আদর্শ মাপের ক্যানভাস */
  function sigRender(an, thr) {
    var w = an.w, h = an.h, d = an.diff;
    var lo = thr * 0.55, hi = thr * 1.15, span = Math.max(1, hi - lo);
    var ink = an.blueish ? [22, 49, 107] : [17, 24, 39];

    var full = document.createElement('canvas');
    full.width = w; full.height = h;
    var fctx = full.getContext('2d');
    var out = fctx.createImageData(w, h);
    var o = out.data;
    var minX = w, minY = h, maxX = -1, maxY = -1;

    for (var y = 0, i = 0; y < h; y++) {
      for (var x = 0; x < w; x++, i++) {
        var a = (d[i] - lo) / span;
        a = a < 0 ? 0 : (a > 1 ? 1 : a);      /* নরম কিনারা — খাঁজকাটা দেখায় না */
        var p = i * 4;
        o[p] = ink[0]; o[p + 1] = ink[1]; o[p + 2] = ink[2];
        o[p + 3] = Math.round(a * 255);
        if (a > 0.25) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;               /* কালি খুঁজে পাওয়া যায়নি */
    fctx.putImageData(out, 0, 0);

    return sigFit(full, minX, minY, maxX - minX + 1, maxY - minY + 1);
  }

  /* কাটা অংশটিকে ৬০০×২০০ পাতার মাঝখানে বসানো */
  function sigFit(src, cx, cy, cw, ch) {
    var pad = Math.round(Math.max(cw, ch) * 0.03);
    cx = Math.max(0, cx - pad); cy = Math.max(0, cy - pad);
    cw = Math.min(src.width - cx, cw + pad * 2);
    ch = Math.min(src.height - cy, ch + pad * 2);

    var c = document.createElement('canvas');
    c.width = SIG_W; c.height = SIG_H;
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    /* ⚠️ ১.৫ গুণের বেশি বড় করা হয় না — ছোট ছবি টেনে বড় করলে ঝাপসা দেখায়।
       তখন স্বাক্ষরটি পাতার মাঝে একটু ছোট বসে, কিন্তু পরিষ্কার থাকে। */
    var s = Math.min(1.5, (SIG_W - 40) / cw, (SIG_H - 30) / ch);
    var dw = cw * s, dh = ch * s;
    ctx.drawImage(src, cx, cy, cw, ch, (SIG_W - dw) / 2, (SIG_H - dh) / 2, dw, dh);
    return c;
  }

  /* আঁকা ক্যানভাস (স্বচ্ছ পটভূমি, গাঢ় কালি) — শুধু কেটে মাপে বসানো */
  function sigTrimDrawn(src) {
    var ctx = src.getContext('2d', { willReadFrequently: true });
    var d = ctx.getImageData(0, 0, src.width, src.height).data;
    var minX = src.width, minY = src.height, maxX = -1, maxY = -1;
    for (var y = 0, i = 0; y < src.height; y++) {
      for (var x = 0; x < src.width; x++, i++) {
        if (d[i * 4 + 3] > 40) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;
    return sigFit(src, minX, minY, maxX - minX + 1, maxY - minY + 1);
  }

  /* বাইরের জন্য: যেকোনো ছবি → পরিষ্কার স্বাক্ষরের ক্যানভাস */
  KHUI.cleanSignature = function (img, threshold) {
    var an = sigAnalyze(img);
    return sigRender(an, threshold == null ? an.otsu : threshold);
  };

  /* ── স্বাক্ষর নেওয়ার পর্দা ──
     cfg.onSave(blob, dataUrl) — সংরক্ষণে চাপলে ডাকা হয়।
     cfg.current — আগের স্বাক্ষরের URL (থাকলে দেখানো হয়)। */
  KHUI.signaturePad = function (cfg) {
    cfg = cfg || {};
    var ov = document.createElement('div');
    ov.className = 'kh-sig-ov';
    ov.innerHTML =
      '<div class="kh-sig-box" role="dialog" aria-modal="true" aria-label="ই-সিগনেচার">' +
        '<button type="button" class="kh-sig-x" aria-label="বন্ধ">&times;</button>' +
        '<div class="kh-sig-head"><b>ই-সিগনেচার</b><span>যেভাবেই দিন — সিস্টেম পটভূমি মুছে আদর্শ মাপে বসিয়ে নেবে</span></div>' +
        '<div class="kh-sig-tabs">' +
          '<button type="button" class="kh-sig-tab kh-on" data-tab="draw"><i class="ti ti-signature"></i> আঙুলে আঁকুন</button>' +
          '<button type="button" class="kh-sig-tab" data-tab="up"><i class="ti ti-photo-up"></i> ছবি দিন</button>' +
        '</div>' +

        '<div class="kh-sig-pane" data-pane="draw">' +
          '<div class="kh-sig-padwrap"><canvas class="kh-sig-pad" width="900" height="300"></canvas>' +
            '<span class="kh-sig-hint">এখানে স্বাক্ষর করুন</span>' +
            '<span class="kh-sig-base"></span></div>' +
          '<div class="kh-sig-row"><button type="button" class="kh-sig-btn kh-sig-clear"><i class="ti ti-eraser"></i> মুছুন</button></div>' +
        '</div>' +

        '<div class="kh-sig-pane" data-pane="up" hidden>' +
          '<label class="kh-sig-drop"><input type="file" accept="image/*" hidden>' +
            '<i class="ti ti-cloud-upload"></i><b>ছবি বাছুন বা ক্যামেরায় তুলুন</b>' +
            '<span>সাদা কাগজে স্বাক্ষর করে ভালো আলোয় ছবি তুললে ফল সবচেয়ে ভালো হয়</span></label>' +
          '<div class="kh-sig-tune" hidden>' +
            '<label>কালির ঘনত্ব' +
              '<input type="range" class="kh-sig-thr" min="20" max="200" value="70">' +
            '</label>' +
            '<span class="kh-sig-tunehint">দাগ কম উঠলে বাঁয়ে, দাগের সাথে দাগ-ছোপ উঠলে ডানে টানুন</span>' +
          '</div>' +
        '</div>' +

        '<div class="kh-sig-prevwrap" hidden>' +
          '<div class="kh-sig-prevlbl">যেমন দেখাবে</div>' +
          '<div class="kh-sig-prev"><img alt="স্বাক্ষরের প্রাকদর্শন"></div>' +
        '</div>' +

        '<div class="kh-sig-msg" role="alert"></div>' +
        '<div class="kh-sig-foot">' +
          '<button type="button" class="kh-sig-btn kh-sig-cancel">বাতিল</button>' +
          '<button type="button" class="kh-sig-btn kh-sig-save" disabled><i class="ti ti-check"></i> সংরক্ষণ করুন</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';

    var q    = function (s) { return ov.querySelector(s); };
    /* ⚠️ willReadFrequently এখানেই দিতে হয় — প্রতি স্ট্রোকের শেষে
       sigTrimDrawn() getImageData করে; পরে অপশন দিলে ব্রাউজার তা ফেলে দেয় */
    var pad  = q('.kh-sig-pad'), pctx = pad.getContext('2d', { willReadFrequently: true });
    var prevWrap = q('.kh-sig-prevwrap'), prevImg = prevWrap.querySelector('img');
    var saveBtn  = q('.kh-sig-save'), msg = q('.kh-sig-msg');
    var tune = q('.kh-sig-tune'), thrEl = q('.kh-sig-thr');
    var result = null, upAnalysis = null;

    function say(t, bad) {
      msg.textContent = t || '';
      msg.style.color = bad ? '#fca5a5' : '#86efac';
    }
    function setResult(canvas) {
      result = canvas;
      if (canvas) {
        prevImg.src = canvas.toDataURL('image/png');
        prevWrap.hidden = false;
        saveBtn.disabled = false;
      } else {
        prevWrap.hidden = true;
        saveBtn.disabled = true;
      }
    }

    /* ── আঁকা ── */
    pctx.lineWidth = 4.5; pctx.lineCap = 'round'; pctx.lineJoin = 'round';
    pctx.strokeStyle = '#111827';
    var drawing = false, last = null, inked = false;
    function pt(e) {
      var r = pad.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return { x: (t.clientX - r.left) * (pad.width / r.width),
               y: (t.clientY - r.top)  * (pad.height / r.height) };
    }
    function down(e) { e.preventDefault(); drawing = true; last = pt(e); q('.kh-sig-hint').style.opacity = 0; }
    function move(e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pt(e);
      pctx.beginPath(); pctx.moveTo(last.x, last.y); pctx.lineTo(p.x, p.y); pctx.stroke();
      last = p; inked = true;
    }
    function up() {
      if (!drawing) return;
      drawing = false;
      if (inked) {
        var c = sigTrimDrawn(pad);
        if (c) setResult(c);
      }
    }
    /* ⚠️ দুই পরিবারের ইভেন্ট একসাথে বাঁধলে ফোনে প্রতিটি নড়াচড়ায় দুবার
       getBoundingClientRect + stroke হয় — দাগ দুবার পড়ে না ঠিকই, কিন্তু
       সস্তা ফোনে আঁকা আটকে আটকে যায়। তাই Pointer Events থাকলে সেটিই,
       না থাকলে (পুরনো iOS Safari) touch fallback। */
    var hasPointer = 'PointerEvent' in window;
    if (hasPointer) {
      pad.addEventListener('pointerdown', down);
      pad.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    } else {
      pad.addEventListener('touchstart', down, { passive: false });
      pad.addEventListener('touchmove', move, { passive: false });
      pad.addEventListener('mousedown', down);
      pad.addEventListener('mousemove', move);
      window.addEventListener('touchend', up);
      window.addEventListener('mouseup', up);
    }

    q('.kh-sig-clear').onclick = function () {
      pctx.clearRect(0, 0, pad.width, pad.height);
      inked = false; q('.kh-sig-hint').style.opacity = '';
      setResult(null); say('');
    };

    /* ── ছবি দেওয়া ── */
    q('.kh-sig-drop input').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      say('ছবি পরিষ্কার করা হচ্ছে…');
      var img = new Image();
      img.onload = function () {
        try {
          upAnalysis = sigAnalyze(img);
          thrEl.value = upAnalysis.otsu;
          tune.hidden = false;
          var c = sigRender(upAnalysis, upAnalysis.otsu);
          if (!c) { setResult(null); say('ছবিতে স্বাক্ষর খুঁজে পাওয়া যায়নি — আরেকটু আলোয় আবার তুলুন', true); return; }
          setResult(c); say('হয়ে গেছে — দরকার হলে নিচের টানে ঠিক করে নিন');
        } catch (err) {
          setResult(null); say('ছবিটি পড়া গেল না — অন্য একটি চেষ্টা করুন', true);
        }
        URL.revokeObjectURL(img.src);
      };
      img.onerror = function () {
        say('ছবিটি পড়া গেল না — অন্য একটি চেষ্টা করুন', true);
        URL.revokeObjectURL(img.src);          /* নাহলে ব্লবটি পেজের শেষ পর্যন্ত থেকে যেত */
      };
      img.src = URL.createObjectURL(f);
    };
    thrEl.oninput = function () {
      if (!upAnalysis) return;
      var c = sigRender(upAnalysis, parseInt(thrEl.value, 10));
      if (c) setResult(c);
    };

    /* ── ট্যাব ── */
    ov.querySelectorAll('.kh-sig-tab').forEach(function (b) {
      b.onclick = function () {
        ov.querySelectorAll('.kh-sig-tab').forEach(function (x) { x.classList.remove('kh-on'); });
        b.classList.add('kh-on');
        ov.querySelectorAll('.kh-sig-pane').forEach(function (p) {
          p.hidden = p.dataset.pane !== b.dataset.tab;
        });
        setResult(null); say('');
      };
    });

    function close() {
      window.removeEventListener('pointerup', up);
      window.removeEventListener('touchend', up);
      window.removeEventListener('mouseup', up);
      ov.remove();
      document.body.style.overflow = '';
    }
    q('.kh-sig-x').onclick = close;
    q('.kh-sig-cancel').onclick = close;
    /* পেছনে ক্লিক করলে বন্ধ — তবে স্বাক্ষর তৈরি হয়ে গেলে নয়,
       নাহলে ভুল ছোঁয়ায় পরিশ্রমটুকু হারিয়ে যেত */
    ov.addEventListener('click', function (e) { if (e.target === ov && !result) close(); });

    saveBtn.onclick = function () {
      if (!result) return;
      saveBtn.disabled = true; say('সংরক্ষণ হচ্ছে…');
      result.toBlob(function (blob) {
        if (!blob) { saveBtn.disabled = false; say('সংরক্ষণ করা গেল না', true); return; }
        Promise.resolve(cfg.onSave && cfg.onSave(blob, result.toDataURL('image/png')))
          .then(function () { close(); })
          .catch(function (e) {
            saveBtn.disabled = false;
            say((e && e.message) || 'সংরক্ষণ করা গেল না', true);
          });
      }, 'image/png');
    };

    return { close: close };
  };

  /* ── স্বাক্ষর সংরক্ষণ: বাকেটে তুলে প্রোফাইলে পথ বসানো ── */
  KHUI.saveSignature = async function (blob) {
    var db = sb();
    if (!db) throw new Error('সংযোগ পাওয়া যায়নি');
    var ses = (await db.auth.getSession()).data.session;
    if (!ses) throw new Error('আগে লগইন করুন');
    var uid = ses.user.id;
    /* ⚠️ পথ অবশ্যই uid দিয়ে শুরু — স্টোরেজ পলিসি ও RPC দুটোই তা যাচাই করে */
    var path = uid + '/signature-' + Date.now() + '.png';

    var up = await db.storage.from('signatures')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    if (up.error) throw new Error('আপলোড হয়নি: ' + up.error.message);

    var r = await db.rpc('set_my_signature', { p_url: path });
    if (r.error) throw new Error(r.error.message);
    KHUI.clearProfileCache && KHUI.clearProfileCache();
    return path;
  };

  /* ── দেখার জন্য সাময়িক লিংক (প্রাইভেট বাকেট) ── */
  KHUI.signatureUrl = async function (path, secs) {
    var db = sb();
    if (!db || !path) return null;
    try {
      var r = await db.storage.from('signatures').createSignedUrl(path, secs || 3600);
      return (r.data && r.data.signedUrl) || null;
    } catch (e) { return null; }
  };

  KHUI.signatureStatus = async function () {
    var db = sb();
    if (!db) return null;
    try {
      var r = await db.rpc('my_signature_status');
      return r.error ? null : r.data;
    } catch (e) { return null; }
  };

  /* ── স্মরণিকা পট্টি ──
     অ্যাডমিন ও কমিটির অনুমোদিত সদস্যের স্বাক্ষর না থাকলে উপরে দেখায়।
     ⚠️ কোনো কাজ আটকায় না (সিদ্ধান্ত: ১২ সেপ্টেম্বর ২০২৬) — জরুরি
     মুহূর্তে অনুমোদন থেমে যাওয়া এর চেয়ে বড় ক্ষতি। */
  KHUI.mountSignatureReminder = async function () {
    if (document.querySelector('.kh-sigbar')) return;
    try { if (sessionStorage.getItem('kh_sigbar_off') === '1') return; } catch (e) {}
    /* কোনো ওভারলে খোলা থাকলে তার উপরে পট্টি তুলে দেওয়া হয় না */
    if (document.querySelector('.kh-otp-back.show, .kh-gate-back, .kh-cam-back, .kh-sig-ov, .kh-vch-back.show')) return;

    var st = await KHUI.signatureStatus();
    if (!st || !st.signed_in || !st.required || st.has) return;

    var bar = document.createElement('div');
    bar.className = 'kh-sigbar';
    bar.innerHTML =
      '<i class="ti ti-signature" aria-hidden="true"></i>' +
      '<span>আপনার <b>ই-সিগনেচার</b> এখনো দেওয়া হয়নি — ' +
        (st.is_admin ? 'অনুমোদনের কাগজে' : 'কমিটির নথিতে') + ' এটি প্রয়োজন হয়।</span>' +
      '<button type="button" class="kh-sigbar-go">এখনই দিন</button>' +
      '<button type="button" class="kh-sigbar-x" aria-label="পরে">&times;</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('kh-on'); });

    bar.querySelector('.kh-sigbar-go').onclick = function () {
      KHUI.signaturePad({
        onSave: async function (blob) {
          await KHUI.saveSignature(blob);
          bar.remove();
          alert('✅ ই-সিগনেচার সংরক্ষণ হয়েছে');
        }
      });
    };
    bar.querySelector('.kh-sigbar-x').onclick = function () {
      try { sessionStorage.setItem('kh_sigbar_off', '1'); } catch (e) {}
      bar.remove();
    };
  };

  /* ════════════════════════════════════════════════════════
     ভিজিটর কাউন্টার — আজকের ও সর্বমোট, ফুটারে

     গোপনীয়তা: IP বা ব্রাউজারের কোনো তথ্য পাঠানো হয় না। শুধু
     একটি এলোমেলো UUID localStorage-এ থাকে, যাতে সার্ভার একই
     দর্শককে দিনে একবারই গোনে। কেউ localStorage মুছে দিলে
     তিনি নতুন দর্শক হিসেবে গোনা হবেন — এটি জেনেই করা।
     ════════════════════════════════════════════════════════ */
  var VISIT_KEY = 'kh_vid';
  var visitDone = false;          /* ⚠️ ব্যর্থ হলে কার্ডটি DOM থেকে সরে যায়, তাই
                                     `.kh-visit` খুঁজে দেখা যথেষ্ট নয় — নাহলে
                                     দ্বিতীয়বার ডাকলে আবার গোনা হয়ে যেত */

  KHUI.mountVisitorCounter = function () {
    if (visitDone || document.querySelector('.kh-visit')) return;
    var host = document.getElementById('khVisitors') ||
               document.querySelector('footer');
    if (!host) return;
    visitDone = true;

    var box = document.createElement('div');
    box.className = 'kh-visit';
    /* ⚠️ aria-live দেওয়া হয় না — গোনার সময় সংখ্যা সেকেন্ডে ~৬০ বার বদলায়,
       স্ক্রিন রিডার প্রতিবার পড়ে শোনাত। সংখ্যা বসে যাওয়ার পর একবারে
       aria-label বসানো হয়। */
    box.innerHTML =
      '<div class="kh-visit-item kh-visit-today">' +
        '<span class="kh-visit-ic"><i class="ti ti-user-check" aria-hidden="true"></i></span>' +
        '<span class="kh-visit-tx">' +
          '<b class="kh-visit-num" data-kh-visit="today">০</b>' +
          '<span class="kh-visit-lbl">আজকের ভিজিটর</span>' +
        '</span>' +
      '</div>' +
      '<span class="kh-visit-sep" aria-hidden="true"></span>' +
      '<div class="kh-visit-item kh-visit-total">' +
        '<span class="kh-visit-ic"><i class="ti ti-users-group" aria-hidden="true"></i></span>' +
        '<span class="kh-visit-tx">' +
          '<b class="kh-visit-num" data-kh-visit="total">০</b>' +
          '<span class="kh-visit-lbl">সর্বমোট ভিজিটর</span>' +
        '</span>' +
      '</div>' +
      '<span class="kh-visit-live"><i aria-hidden="true"></i>লাইভ</span>';

    host.appendChild(box);

    var elToday = box.querySelector('[data-kh-visit="today"]');
    var elTotal = box.querySelector('[data-kh-visit="total"]');

    /* ০ থেকে গুনে গুনে উঠে আসে */
    function countUp(el, target) {
      var start = 0, t0 = null, dur = 900;
      function settle() { el.textContent = KHUI.bn(Number(target).toLocaleString('en-IN')); }
      /* গতি বন্ধ রাখা পছন্দ, অথবা ট্যাব পেছনে (তখন rAF চলেই না — সংখ্যা
         ০-তে আটকে থাকত) → সরাসরি বসিয়ে দেওয়া */
      var still = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (target <= 0 || still || document.hidden) { settle(); return; }
      function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);                    /* easeOutCubic */
        var v = Math.round(start + (target - start) * eased);
        el.textContent = KHUI.bn(v.toLocaleString('en-IN'));
        if (p < 1) requestAnimationFrame(step);
        else {
          settle();
          el.classList.add('kh-visit-bump');
          setTimeout(function () { el.classList.remove('kh-visit-bump'); }, 500);
        }
      }
      requestAnimationFrame(step);
    }

    (function () {
      var db = sb();
      if (!db || !db.rpc) { box.remove(); return; }             /* সুপাবেস নেই — কিছুই দেখানো হবে না */

      var mine = null;
      try { mine = localStorage.getItem(VISIT_KEY) || null; } catch (e) { /* প্রাইভেট মোড */ }

      /* ⚠️ supabase-js-এর rpc()-এ .catch() নেই — try/catch দিয়েই ধরতে হয় */
      (async function () {
        try {
          /* সময়সীমা — অনুরোধ ঝুলে গেলে কার্ডটি চিরকাল অদৃশ্য অবস্থায় ফুটারে
             জায়গা দখল করে বসে থাকত, দেখে মনে হত ফাঁকা গর্ত */
          var r = await Promise.race([
            db.rpc('record_visit', { p_visitor: mine }),
            new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 8000); })
          ]);
          if (r.error || !r.data) { box.remove(); return; }
          var d = r.data;
          if (d.visitor) {
            try { localStorage.setItem(VISIT_KEY, d.visitor); } catch (e) {}
          }
          var today = Number(d.today) || 0, total = Number(d.total) || 0;
          box.classList.add('kh-visit-in');
          countUp(elToday, today);
          countUp(elTotal, total);
          box.setAttribute('aria-label',
            'আজকের ভিজিটর ' + KHUI.bn(today.toLocaleString('en-IN')) +
            ', সর্বমোট ভিজিটর ' + KHUI.bn(total.toLocaleString('en-IN')));
        } catch (e) {
          box.remove();                                          /* গুনতে না পারলে শূন্য দেখানোর চেয়ে না দেখানোই ভালো */
        }
      })();
    })();
  };

  /* ════════════════════════════════════════════════════════
     লাইভ পরিসংখ্যান ড্যাশবোর্ড (হোম পেজ, হিরোর নিচে)

     সব অঙ্ক আসে `public_stats()` থেকে — anon-ও ডাকতে পারে, কারণ
     এতে কেবল সর্বমোট যোগফল থাকে, কারো নাম বা মোবাইল নয়।
     কার্ডে ক্লিক করলে `public_stats_detail(topic)` দিয়ে শুধু সেই
     বিষয়ের ভাঙা হিসাব ও মাসভিত্তিক ধারা দেখানো হয়।
     ⚠️ বাদ দিতে হলে পেজে `<body data-kh-stats="off">`।
     ════════════════════════════════════════════════════════ */
  var BN_MONTH = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
                  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];

  function stNum(n) { return KHUI.bn(Number(n || 0).toLocaleString('en-IN')); }
  function stTk(n)  { return '৳' + stNum(Math.round(Number(n || 0))); }
  function stVal(v, money) { return money ? stTk(v) : stNum(v); }

  /* '2026-09' → 'সেপ্টে ২৬' (জায়গা কম, তাই সংক্ষিপ্ত) */
  function stMon(iso) {
    var p = String(iso || '').split('-');
    var m = parseInt(p[1], 10);
    if (!p[0] || !(m >= 1 && m <= 12)) return KHUI.bn(iso || '');
    return BN_MONTH[m - 1].slice(0, 4) + ' ' + KHUI.bn(p[0].slice(2));
  }

  /* ০ থেকে গুনে গুনে ওঠা — ট্যাব পেছনে থাকলে সরাসরি বসে
     (rAF তখন চলে না, নাহলে "০" দেখাত — ভিজিটর কাউন্টারের মতোই) */
  function stCount(el, to, money) {
    var end = Number(to || 0);
    if (document.hidden || !window.requestAnimationFrame ||
        (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      el.textContent = stVal(end, money); return;
    }
    var t0 = 0, dur = 1100;
    requestAnimationFrame(function step(ts) {
      if (!t0) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      el.textContent = stVal(end * e, money);
      if (k < 1) requestAnimationFrame(step);
      else el.textContent = stVal(end, money);
    });
  }

  function stCard(o) {
    return '<button type="button" class="kh-st-card kh-st-' + o.tone + '" ' +
             'data-kh-topic="' + o.topic + '">' +
        '<span class="kh-st-ic"><i class="ti ' + o.icon + '" aria-hidden="true"></i></span>' +
        '<span class="kh-st-lbl">' + vEsc(o.label) + '</span>' +
        '<span class="kh-st-num" data-kh-to="' + Number(o.value || 0) + '" ' +
              'data-kh-money="' + (o.money === false ? '0' : '1') + '">' +
          (o.money === false ? '০' : '৳০') + '</span>' +
        '<span class="kh-st-sub">' + vEsc(o.sub || '') + '</span>' +
        (o.mini && o.mini.length
          ? '<span class="kh-st-mini">' + o.mini.map(function (m) {
              return '<span><b>' + vEsc(m[0]) + '</b><s>' + stTk(m[1]) + '</s></span>';
            }).join('') + '</span>'
          : '') +
        '<span class="kh-st-go">বিস্তারিত দেখুন ' +
          '<i class="ti ti-arrow-right" aria-hidden="true"></i></span>' +
      '</button>';
  }

  KHUI.publicStatsHTML = function (s) {
    var d = s.donation || {}, op = s.operation || {}, rv = s.revolving || {},
        sv = s.savings || {}, ln = s.loan || {};
    var opPct = KHUI.bn(op.pct != null ? op.pct : 5);
    var rvPct = KHUI.bn(rv.pct != null ? rv.pct : 5);

    return '<div class="kh-stats-head">' +
        '<span class="kh-stats-kick"><i aria-hidden="true"></i>লাইভ হিসাব</span>' +
        '<div class="kh-stats-h2">আজ পর্যন্ত আমাদের হিসাব</div>' +
        '<div class="kh-stats-sub">প্রতিটি কার্ডে ক্লিক করলে সেই বিষয়ের বিস্তারিত হিসাব দেখা যাবে</div>' +
      '</div>' +
      '<div class="kh-stats-grid">' +
        stCard({ topic: 'donation', tone: 'pink', icon: 'ti-heart-handshake',
                 label: 'সর্বমোট দান প্রাপ্তি', value: d.total,
                 sub: stNum(d.count) + 'টি দান · ' + stNum(d.donors) + ' জন দাতা',
                 mini: [['আজ', d.today], ['চলতি মাসে', d.month]] }) +

        stCard({ topic: 'operation', tone: 'teal', icon: 'ti-briefcase',
                 label: 'অপারেশন ফান্ড (স্থিতি)', value: op.balance,
                 sub: 'দানের ' + opPct + '% এই তহবিলে জমা হয়',
                 mini: [['প্রাপ্তি', op.income], ['খরচ', op.expense], ['স্থিতি', op.balance]] }) +

        stCard({ topic: 'revolving', tone: 'violet', icon: 'ti-refresh',
                 label: 'রিভলভিং ফান্ড (স্থিতি)', value: rv.balance,
                 sub: 'দানের ' + rvPct + '% এই তহবিলে জমা হয়',
                 mini: [['প্রাপ্তি', rv.income], ['সমন্বয়', rv.adjusted], ['স্থিতি', rv.balance]] }) +

        stCard({ topic: 'savings', tone: 'amber', icon: 'ti-pig-money',
                 label: 'মোট সঞ্চয় জমা', value: sv.deposit,
                 sub: stNum(sv.accounts) + 'টি হিসাব · ' + stNum(sv.members) + ' জন সদস্য',
                 mini: [['উত্তোলন', sv.withdraw], ['স্থিতি', sv.balance]] }) +

        stCard({ topic: 'loan', tone: 'indigo', icon: 'ti-businessplan',
                 label: 'ঋণ বিতরণ', value: ln.principal,
                 sub: stNum(ln.people) + ' জনকে ' + stNum(ln.count) + 'টি ঋণ',
                 mini: [['আদায়', ln.recovered], ['বকেয়া', ln.outstanding]] }) +

        stCard({ topic: 'loan', tone: 'rust', icon: 'ti-cash-banknote',
                 label: 'ঋণ আদায়', value: ln.recovered,
                 sub: 'বকেয়া ' + stTk(ln.outstanding),
                 mini: [['বিতরণ', ln.principal], ['বকেয়া', ln.outstanding]] }) +
      '</div>' +
      '<div class="kh-stats-foot">সব অঙ্ক সরাসরি সিস্টেম থেকে — সর্বশেষ হালনাগাদ ' +
        KHUI.bn(stWhen(s.as_of)) + '</div>';
  };

  /* '2026-09-12T13:31:33' → '১২ সেপ্টেম্বর ২০২৬, ০১:৩১ অপরাহ্ণ'
     ⚠️ সার্ভার ঢাকার সময়েই পাঠায়, তাই এখানে আর টাইমজোন বদলানো হয় না */
  function stWhen(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return '';
    var h = +m[4], ap = h < 12 ? 'পূর্বাহ্ণ' : 'অপরাহ্ণ';
    var h12 = h % 12 || 12;
    return (+m[3]) + ' ' + BN_MONTH[+m[2] - 1] + ' ' + m[1] + ', ' +
           (h12 < 10 ? '0' : '') + h12 + ':' + m[5] + ' ' + ap;
  }

  KHUI.mountPublicStats = async function (host) {
    host = typeof host === 'string' ? document.querySelector(host) : host;
    host = host || document.getElementById('khStats');
    if (!host || host.dataset.khMounted === '1') return null;
    var db = sb();
    if (!db) { host.remove(); return null; }
    try {
      var r = await db.rpc('public_stats');
      if (r.error || !r.data) throw r.error || new Error('no data');
      host.dataset.khMounted = '1';
      host.classList.add('kh-stats');
      host.innerHTML = KHUI.publicStatsHTML(r.data);
      host.querySelectorAll('.kh-st-num').forEach(function (el) {
        stCount(el, el.getAttribute('data-kh-to'), el.getAttribute('data-kh-money') === '1');
      });
      host.querySelectorAll('[data-kh-topic]').forEach(function (b) {
        b.addEventListener('click', function () {
          KHUI.statsDetail(b.getAttribute('data-kh-topic'));
        });
      });
      return r.data;
    } catch (e) {
      host.remove();          /* গুনতে না পারলে শূন্য দেখানোর চেয়ে না দেখানোই ভালো */
      return null;
    }
  };

  /* এক বিষয়ের বিস্তারিত — আলাদা পর্দায় */
  KHUI.statsDetail = async function (topic) {
    var db = sb();
    if (!db) return;
    var old = document.querySelector('.kh-stdet');
    if (old) old.remove();

    var back = document.createElement('div');
    back.className = 'kh-stdet show';
    back.innerHTML = '<div class="kh-stdet-box"><div class="kh-stdet-head">' +
        '<button type="button" class="kh-stdet-x" aria-label="বন্ধ করুন">' +
          '<i class="ti ti-x" aria-hidden="true"></i></button>' +
        '<div class="kh-stdet-t">লোড হচ্ছে…</div></div></div>';
    document.body.appendChild(back);

    function close() {
      back.remove();
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    back.querySelector('.kh-stdet-x').onclick = close;

    var box = back.querySelector('.kh-stdet-box');
    try {
      var r = await db.rpc('public_stats_detail', { p_topic: topic });
      if (r.error || !r.data) throw r.error || new Error('no data');
      var d = r.data;
      var pts = (d.series && d.series.points) || [];
      var max = pts.reduce(function (a, p) { return Math.max(a, Number(p.value || 0)); }, 0) || 1;
      var TONE = ['pink', 'teal', 'violet', 'amber', 'indigo', 'rust'];

      box.innerHTML =
        '<div class="kh-stdet-head">' +
          '<button type="button" class="kh-stdet-x" aria-label="বন্ধ করুন">' +
            '<i class="ti ti-x" aria-hidden="true"></i></button>' +
          '<div class="kh-stdet-t">' + vEsc(d.title || '') + '</div>' +
          /* ⚠️ আগে বাংলা অঙ্ক, তারপর এসকেপ — উল্টো করলে `&#39;`-এর ৩৯-ও
             বাংলা হয়ে `&#৩৯;` হয়ে যেত ও কাঁচা লেখা হিসেবে দেখা যেত */
          '<div class="kh-stdet-s">' + vEsc(KHUI.bn(d.subtitle || '')) + '</div>' +
        '</div>' +

        '<div class="kh-stdet-cards">' +
          (d.cards || []).map(function (c, i) {
            return '<div class="kh-stdet-c kh-st-' +
                     (TONE.indexOf(c.tone) >= 0 ? c.tone : TONE[i % TONE.length]) + '">' +
                   '<b>' + vEsc(c.label) + '</b><s>' + stVal(c.value, c.money) + '</s></div>';
          }).join('') +
        '</div>' +

        (pts.length
          ? '<div class="kh-stdet-sec">' + vEsc(d.series.title || '') + '</div>' +
            '<div class="kh-stdet-bars">' +
              pts.map(function (p) {
                var h = Math.max(4, Math.round(Number(p.value || 0) / max * 100));
                return '<div class="kh-stdet-bar" title="' + vEsc(stMon(p.label)) + ' — ' +
                         stTk(p.value) + '">' +
                       '<u>' + stTk(p.value) + '</u>' +
                       '<i style="height:' + h + '%"></i>' +
                       '<em>' + vEsc(stMon(p.label)) + '</em></div>';
              }).join('') +
            '</div>'
          : '') +

        '<div class="kh-stdet-sec">ভাগ অনুযায়ী হিসাব</div>' +
        ((d.rows || []).length
          ? '<table class="kh-stdet-tbl"><thead><tr><th>খাত</th>' +
              '<th style="text-align:right">সংখ্যা</th>' +
              '<th style="text-align:right">টাকা</th></tr></thead><tbody>' +
            d.rows.map(function (x) {
              return '<tr><td>' + vEsc(x.label) + '</td>' +
                     '<td class="n">' + stNum(x.count) + '</td>' +
                     '<td class="n">' + stTk(x.value) + '</td></tr>';
            }).join('') + '</tbody></table>'
          : '<div class="kh-stdet-empty">এখনো কোনো তথ্য নেই।</div>') +

        '<div class="kh-stdet-foot">এটি প্রকাশ্য সারসংক্ষেপ — কোনো ব্যক্তির নাম, ' +
          'মোবাইল বা লেনদেনের বিবরণ এখানে দেখানো হয় না। ' +
          'সর্বশেষ হালনাগাদ ' + KHUI.bn(stWhen(d.as_of)) + '।</div>';
      box.querySelector('.kh-stdet-x').onclick = close;
    } catch (e) {
      box.innerHTML = '<div class="kh-stdet-head">' +
        '<button type="button" class="kh-stdet-x" aria-label="বন্ধ করুন">' +
          '<i class="ti ti-x" aria-hidden="true"></i></button>' +
        '<div class="kh-stdet-t">বিস্তারিত আনা যায়নি</div>' +
        '<div class="kh-stdet-s">একটু পরে আবার চেষ্টা করুন।</div></div>';
      box.querySelector('.kh-stdet-x').onclick = close;
    }
  };

  /* ════════════════════════════════════════════════════════
     সেকশন-ব্রেকের আলো-রেখা

     পাশাপাশি দুটি বড় সেকশনের মাঝে একটি সরু রেখা বসায়, যার
     উপর দিয়ে আভা বাঁ থেকে ডানে ভেসে যায় — কোথায় এক অংশ শেষ
     হয়ে আরেকটি শুরু হলো তা যেন বোঝা যায়।

     ⚠️ প্রতিটি পেজের গঠন আলাদা, তাই **অনুমান করা হয় না** —
     শুধু সেই ভাইবোনদের মাঝে বসে যারা সত্যিই বড়, পুরো চওড়া ও
     সাধারণ প্রবাহে আছে (fixed/absolute নয়)। ওভারলে, মোডাল,
     ফ্লোটিং বাটন — কোনোটাই ধরা পড়ে না।
     ⚠️ বাদ দিতে `<body data-kh-breaks="off">` বা সেকশনে
     `class="kh-nobreak"`।
     ════════════════════════════════════════════════════════ */
  function khIsBand(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' ||
        tag === 'TEMPLATE' || tag === 'NOSCRIPT' || tag === 'BR') return false;
    if (el.classList.contains('kh-break') || el.classList.contains('kh-nobreak')) return false;
    /* নেভবার, ফ্লোটিং ও ওভারলে বাদ */
    if (el.matches('nav, .navbar, .topbar, .kh-glassnav, .wa-float, .btt, [role="dialog"]')) return false;
    var cs = getComputedStyle(el);
    if (cs.position === 'fixed' || cs.position === 'absolute' || cs.position === 'sticky') return false;
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var r = el.getBoundingClientRect();
    /* বড় ও কার্যত পুরো চওড়া হলে তবেই "ব্যান্ড" ধরা হয় */
    return r.height >= 140 && r.width >= document.documentElement.clientWidth * 0.9;
  }

  /* পর্দার বাইরে গেলে আভা থামানো (ব্যাটারি) */
  var khBreakObs = null;
  function khWatchBreak(el) {
    if (!window.IntersectionObserver) return;
    if (!khBreakObs) {
      khBreakObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('kh-break-off', !e.isIntersecting);
        });
      }, { rootMargin: '120px 0px' });
    }
    el.classList.add('kh-break-off');
    khBreakObs.observe(el);
  }

  function khScanBreaks(root) {
    var kids = Array.prototype.slice.call(root.children);
    var prevBand = null, made = 0;
    kids.forEach(function (el) {
      if (el.classList && el.classList.contains('kh-break')) { prevBand = null; return; }
      if (!khIsBand(el)) return;
      if (prevBand) {
        var br = document.createElement('div');
        br.className = 'kh-break';
        br.setAttribute('aria-hidden', 'true');
        el.parentNode.insertBefore(br, el);
        khWatchBreak(br);
        made++;
      }
      prevBand = el;
    });
    return made;
  }

  KHUI.mountSectionBreaks = function (root) {
    if (document.body.dataset.khBreaks === 'off') return 0;
    if (root) return khScanBreaks(root);

    var made = khScanBreaks(document.body);
    /* কিছু পেজে (my-dashboard, committee, wallet…) পুরো বিষয়বস্তু
       একটি মোড়কের ভেতরে থাকে — তখন body-তে কিছুই মেলে না।
       ⚠️ এক ধাপই নামা হয়, আর কেবল সাধারণ block মোড়কে — flex/grid-এ
       ৩px-এর একটি সন্তান লেআউট ভেঙে দিতে পারত। */
    if (!made) {
      Array.prototype.slice.call(document.body.children).some(function (w) {
        if (!w || w.nodeType !== 1 || !w.children || w.children.length < 2) return false;
        var cs = getComputedStyle(w);
        if (cs.display !== 'block' && cs.display !== 'flow-root') return false;
        if (cs.position === 'fixed' || cs.position === 'absolute') return false;
        var r = w.getBoundingClientRect();
        if (r.width < document.documentElement.clientWidth * 0.9) return false;
        made = khScanBreaks(w);
        return made > 0;
      });
    }
    return made;
  };

  /* ══════════════════════════════════════════════════════
     🤖 হাসানা সহায়িকা — চ্যাটবট + কথা বলা এভাটার
     (১৪ সেপ্টেম্বর ২০২৬)

     ⚠️ হোয়াটসঅ্যাপ চ্যাট বাটনটি আলাদাই থাকে (ব্যবহারকারীর সিদ্ধান্ত) —
     এটি তার উপরে বসে, রঙও আলাদা (বেগুনি/গোলাপি বনাম সবুজ)।
     বন্ধ করতে `<body data-kh-bot="off">`।

     ⚠️ গোপনীয়তা: ব্রাউজার কোনো ব্যক্তিগত তথ্য পাঠায় না — কেবল
     সেশন টোকেনটি হেডারে যায়। Edge Function ঐ টোকেন দিয়েই
     ব্যবহারকারীর নিজের RPC ডাকে, তাই RLS-ই সীমা টানে।
     ══════════════════════════════════════════════════════ */

  var BOT_TIPS = [
    'কর্জে হাসানা কী?',
    'সঞ্চয় হিসাব কীভাবে খুলব?',
    'ঋণের আবেদন কীভাবে করব?',
    'আজ পর্যন্ত মোট দান কত?'
  ];

  /* ══════════════════════════════════════════════════════════
     🧕 হাসানা সহায়িকার এভাটার — ব্যবহারকারীর দেওয়া ছবি।
     ছবিটি বসে **CSS-এ** (`.kh-av`-এর background), এখানে কেবল ঘরটুকু
     ও কথা বলার শব্দতরঙ্গের ব্যাজ। দুই জায়গায় ব্যবহৃত হয়:
     লঞ্চ বাটন ও প্যানেলের মাথা।
     ⚠️ ছবি বলে ঠোঁট নড়ানো যায় না — তাই `.kh-speaking` ক্লাসে
        মাথা-কাঁধ নরমভাবে দোলে ও ব্যাজটি ফুটে ওঠে; `.kh-listening`-এ
        চারপাশে লাল স্পন্দন। বিস্তারিত ও কারণ kh-ui.css-এ। */
  function khAvatarHTML() {
    return '<span class="kh-av" aria-hidden="true">' +
             '<span class="kh-av-wave"><b></b><b></b><b></b></span>' +
           '</span>';
  }

  KHUI.mountAssistant = function () {
    if (document.body.dataset.khBot === 'off') return;
    if (document.querySelector('.kh-bot-launch')) return;

    var history = [];
    var busy = false;
    var muted = false;
    try { muted = localStorage.getItem('kh_bot_mute') === '1'; } catch (e) {}

    /* ভিজিটর আইডি — ভিজিটর কাউন্টারের সাথে একই, নতুন কিছু নয় */
    var vid = '';
    try {
      vid = localStorage.getItem('kh_vid') || '';
      if (!vid && window.crypto && crypto.randomUUID) {
        vid = crypto.randomUUID();
        localStorage.setItem('kh_vid', vid);
      }
    } catch (e) {}

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kh-bot-launch';
    btn.setAttribute('aria-label', 'হাসানা সহায়িকা');
    btn.title = 'হাসানা সহায়িকা — প্রশ্ন করুন';
    btn.innerHTML = khAvatarHTML();

    var panel = document.createElement('div');
    panel.className = 'kh-bot-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'হাসানা সহায়িকা');
    panel.innerHTML =
      '<div class="kh-bot-head">' +
        '<div class="kh-bot-face" aria-hidden="true">' + khAvatarHTML() + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<b>হাসানা সহায়িকা</b>' +
          '<span>কর্জে হাসানা ফাউন্ডেশন সম্পর্কে জিজ্ঞেস করুন</span>' +
        '</div>' +
        '<button type="button" class="kh-bot-mute" aria-label="কণ্ঠস্বর"></button>' +
        '<button type="button" class="kh-bot-head-x" aria-label="বন্ধ করুন">' +
          '<i class="ti ti-x" aria-hidden="true"></i></button>' +
      '</div>' +
      /* 🧕 Speak to Me — হ্যান্ডস-ফ্রি টগলের ঠিক নিচে (ব্যবহারকারীর চাওয়া:
         "হ্যান্ডস-ফ্রি টগল বাটনের ওখানে")। ⚠️ মাথার সারিতেই বসানো যায়নি —
         ৩৬৬px প্যানেলে ছবি + নাম + তিনটি বোতাম + এই পিল মিলে নামের জন্য
         মাত্র ~৩০px থাকত। তাই একই গ্র্যাডিয়েন্টে দ্বিতীয় সারি, ডানে সাজানো। */
      '<div class="kh-bot-stmrow" hidden>' +
        '<button type="button" class="kh-bot-stm" aria-label="Speak to Me — হাসানার সাথে মুখোমুখি কথা বলুন">' +
          '<i class="ti ti-video" aria-hidden="true"></i><span>Speak to Me</span></button>' +
      '</div>' +
      '<div class="kh-bot-body"></div>' +
      '<div class="kh-bot-chips"></div>' +
      '<div class="kh-bot-foot">' +
        '<button type="button" class="kh-bot-mic" aria-label="কথা বলে প্রশ্ন করুন" aria-pressed="false" hidden>' +
          '<i class="ti ti-microphone" aria-hidden="true"></i></button>' +
        '<input type="text" placeholder="আপনার প্রশ্ন লিখুন…" aria-label="প্রশ্ন">' +
        '<button type="button" class="kh-bot-send" aria-label="পাঠান">' +
          '<i class="ti ti-send" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="kh-bot-note">উত্তরগুলো স্বয়ংক্রিয়। নিশ্চিত হতে অফিসে যোগাযোগ করুন।</div>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    var body  = panel.querySelector('.kh-bot-body');
    var chips = panel.querySelector('.kh-bot-chips');
    var input = panel.querySelector('.kh-bot-foot input');
    var send  = panel.querySelector('.kh-bot-send');
    var muteB = panel.querySelector('.kh-bot-mute');
    var micB  = panel.querySelector('.kh-bot-mic');
    var stmB  = panel.querySelector('.kh-bot-stm');
    var note  = panel.querySelector('.kh-bot-note');
    var NOTE_DEFAULT = note.textContent;

    function paintMute() {
      muteB.innerHTML = '<i class="ti ' + (muted ? 'ti-volume-off' : 'ti-volume') + '" aria-hidden="true"></i>';
      muteB.title = muted ? 'কণ্ঠস্বর বন্ধ আছে — কণ্ঠে করা প্রশ্নের উত্তরও লেখায় আসবে'
                          : 'কণ্ঠস্বর বন্ধ করুন';
    }
    paintMute();

    /* ⚠️ textContent — উত্তরের লেখা কখনো innerHTML-এ বসানো হয় না */
    function say(text, kind) {
      var d = document.createElement('div');
      d.className = 'kh-bot-msg ' + (kind || 'bot');
      d.textContent = text;
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }

    function typing(on) {
      var t = body.querySelector('.kh-bot-typing');
      if (on && !t) {
        t = document.createElement('div');
        t.className = 'kh-bot-typing';
        t.innerHTML = '<span></span><span></span><span></span>';
        body.appendChild(t);
        body.scrollTop = body.scrollHeight;
      } else if (!on && t) { t.remove(); }
    }

    /* ══ 🔊 কণ্ঠস্বর — ব্রাউজারের নিজস্ব, সম্পূর্ণ ফ্রি ════════════
       ⚠️⚠️ পড়ার আগে লেখা পরিষ্কার করা **আবশ্যক**। মডেলের উত্তরে
          তারকা, হ্যাশ, বুলেট, ইমোজি, লিংক থাকে — TTS সেগুলোকেও
          উচ্চারণ করার চেষ্টা করে ও অদ্ভুত শোনায় (ব্যবহারকারীর
          পর্যবেক্ষণ, ১৫ সেপ্টেম্বর ২০২৬)। `ttsClean()` সেগুলো সরায়। */
    var speaking = false, speakSeq = 0;
    var TTS_DROP = /[*_`~#>|\[\](){}<>^=+\\/•·◦▪●■→←↔⇒–—…]/g;
    var TTS_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu;

    function ttsClean(s) {
      var t = String(s || '');
      t = t.replace(/```[\s\S]*?```/g, ' ');            /* কোড ব্লক পড়া হয় না */
      t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');    /* [লেখা](লিংক) → লেখা */
      t = t.replace(/https?:\/\/\S+|www\.\S+/gi, ' লিংক ');
      t = t.replace(/[\w.+-]+@[\w.-]+\.\w+/g, ' ই-মেইল ঠিকানা ');
      t = t.replace(TTS_EMOJI, ' ');
      t = t.replace(/^\s*[-*•·—]+\s+/gm, ' ');          /* বুলেটের দাগ */
      t = t.replace(/৳\s*/g, ' টাকা ').replace(/[$]\s*/g, ' ডলার ');
      t = t.replace(/%/g, ' শতাংশ ').replace(/&/g, ' এবং ');
      t = t.replace(TTS_DROP, ' ');
      t = t.replace(/([।!?,;:])\1+/g, '$1');
      return t.replace(/\s+/g, ' ').trim();
    }

    /* লম্বা লেখা টুকরো করে বলা — ক্রোম এক টানে বেশি বললে মাঝপথে কেটে যায় */
    function ttsChunks(s, max) {
      var parts = s.split(/(?<=[।.!?])\s+/), out = [], cur = '';
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        while (p.length > max) {                        /* বিশাল বাক্য হলে */
          var cut = p.lastIndexOf(' ', max); if (cut < max * 0.5) cut = max;
          out.push(p.slice(0, cut).trim()); p = p.slice(cut);
        }
        if ((cur + ' ' + p).trim().length > max) { if (cur) out.push(cur.trim()); cur = p; }
        else { cur = (cur + ' ' + p).trim(); }
      }
      if (cur.trim()) out.push(cur.trim());
      return out.filter(Boolean);
    }

    /* ⚠️ ব্যবহারকারীর সিদ্ধান্ত: **ডিফল্টে নরম নারীকণ্ঠ**। বাংলা নারীকণ্ঠ
       না থাকলে বাংলা পুরুষকণ্ঠ — ভাষা ঠিক থাকাটাই আগে, লিঙ্গ পরে।
       ⚠️ `getVoices()` প্রথমবার ফাঁকা আসতে পারে, তাই ক্যাশ করা হয় না। */
    var TTS_F = /(female|woman|girl|নারী|মহিলা|nabanita|tanish|aditi|raveena|kalpana|swara|veena|lekha|heera|sarika|pooja|neerja|kajal|priya|ananya|salma|shruti|isha|zira|hazel|susan|linda|catherine|\beva\b|samantha|karen|fiona|tessa|moira|serena|allison|\bava\b|joanna|kendra|kimberly|salli|nicole|\bamy\b|emma|sonia|libby|maisie|natasha|clara|yasmin)/i;
    var TTS_M = /(\bmale\b|\bman\b|পুরুষ|bashkar|pradeep|prabhat|madhur|hemant|ravi|\bmark\b|david|george|james|\balex\b|daniel|\bfred\b|oliver|thomas|aaron|arthur|ryan|guy|liam|matthew|justin|joey|brian)/i;

    function pickVoice() {
      var vs = [];
      try { vs = speechSynthesis.getVoices() || []; } catch (e) {}
      if (!vs.length) return null;
      var forced = '';
      try { forced = window.KH_TTS_VOICE || localStorage.getItem('kh_bot_voice') || ''; } catch (e) {}
      if (forced) {
        for (var k = 0; k < vs.length; k++) {
          if (vs[k].name === forced || vs[k].voiceURI === forced) return vs[k];
        }
      }
      var best = null, bestScore = -1e9;
      for (var i = 0; i < vs.length; i++) {
        var v = vs[i], lg = (v.lang || '').replace('_', '-'), n = v.name || '';
        var sc = 0;
        if (/^bn/i.test(lg)) sc += 100;                 /* বাংলা সবার আগে */
        else if (/^hi/i.test(lg)) sc += 40;
        else if (/^en-IN/i.test(lg)) sc += 26;
        else if (/^en/i.test(lg)) sc += 10;
        else sc -= 40;
        if (TTS_F.test(n)) sc += 50; else if (TTS_M.test(n)) sc -= 30;
        if (/google/i.test(n)) sc += 6;                 /* সাধারণত বেশি স্বাভাবিক */
        if (v.localService) sc += 2;
        if (sc > bestScore) { bestScore = sc; best = v; }
      }
      return best;
    }
    /* কণ্ঠের তালিকা দেখতে/বদলাতে: KHUI.botVoices() · KHUI.botVoice('নাম') */
    KHUI.botVoices = function () {
      var vs = []; try { vs = speechSynthesis.getVoices() || []; } catch (e) {}
      return vs.map(function (v) {
        return { name: v.name, lang: v.lang, female: TTS_F.test(v.name || '') };
      });
    };
    KHUI.botVoice = function (name) {
      try { localStorage.setItem('kh_bot_voice', name || ''); } catch (e) {}
      return name || '(স্বয়ংক্রিয়)';
    };
    try {
      if ('speechSynthesis' in window) speechSynthesis.getVoices();
      if (window.speechSynthesis && 'onvoiceschanged' in speechSynthesis) {
        speechSynthesis.addEventListener('voiceschanged', function () { pickVoice(); });
      }
    } catch (e) {}

    function talking(on) {
      speaking = !!on;
      panel.classList.toggle('kh-speaking', !!on);
      btn.classList.toggle('kh-speaking', !!on);
      paintNote();
    }

    function canSpeak() { return !muted && ('speechSynthesis' in window); }

    /* opts: {onStart, onDone, onChunk, force}
         onDone(started) — সব টুকরো বলা শেষ হলে
         onChunk(on, text) — প্রতিটি বাক্য শুরু (true) ও শেষে (false);
                             Speak to Me-র মুখ এটি দিয়েই নড়ে-থামে
         force — মিউট উপেক্ষা (মুখোমুখি আলাপে কণ্ঠই একমাত্র পথ) */
    function speak(text, opts) {
      opts = opts || {};
      var done = opts.onDone || function () {};
      var chunkHook = opts.onChunk || function () {};
      var ok = opts.force ? ('speechSynthesis' in window) : canSpeak();
      if (!ok) { done(false); return; }
      var clean = ttsClean(text);
      if (!clean) { done(false); return; }
      var chunks = ttsChunks(clean, 180);
      var v = pickVoice();
      var myTurn = ++speakSeq, started = false, idx = 0;
      try { speechSynthesis.cancel(); } catch (e) {}
      function next() {
        if (myTurn !== speakSeq) return;                /* নতুন কথা শুরু হয়েছে */
        if (idx >= chunks.length) { talking(false); done(started); return; }
        var u = new SpeechSynthesisUtterance(chunks[idx++]);
        if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'bn-BD'; }
        u.rate = 0.95; u.pitch = 1.12; u.volume = 1;    /* নরম ও ধীর */
        u.onstart = function () {
          if (myTurn !== speakSeq) return;
          if (!started) { started = true; if (opts.onStart) opts.onStart(); }
          talking(true);
          chunkHook(true, u.text);
        };
        u.onend = function () {
          if (myTurn === speakSeq) chunkHook(false, u.text);
          next();
        };
        /* শব্দের সীমা — Speak to Me-র মুখ প্রতিটি শব্দে একটু বেশি খোলে
           (সব কণ্ঠ এই ঘটনা দেয় না; না দিলে মুখ নিজের ছন্দেই নড়ে) */
        u.onboundary = function (ev) { if (myTurn === speakSeq && opts.onWord) opts.onWord(ev); };
        u.onerror = function () { if (myTurn === speakSeq) { talking(false); done(started); } };
        try { speechSynthesis.speak(u); } catch (e) { talking(false); done(started); }
      }
      next();
    }

    /* ══ 🎙️ কথা বলে প্রশ্ন — Web Speech API ═══════════════════
       ⚠️ পুরোটাই ব্রাউজারের ভেতরে — কোনো সার্ভার, খরচ বা API কি লাগে না।
       ⚠️ ব্রাউজার না চিনলে (যেমন Firefox) বাটন দুটি **বসানোই হয় না** —
          নিষ্ক্রিয় বাটন দেখিয়ে বিভ্রান্ত করা হয় না।
       ⚠️⚠️ বট যখন কথা বলে তখন কখনো শোনা হয় না — নাহলে নিজের কণ্ঠস্বরই
          শুনে ফেলত আর অনন্ত লুপ তৈরি হত। তাই হ্যান্ডস-ফ্রিতে শোনা শুরু
          হয় কেবল `afterSpeak()` থেকে, অর্থাৎ বলা শেষ হওয়ার পর। */
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    var rec = null, listening = false, wantListen = false, heard = '';
    /* ⚠️ হ্যান্ডস-ফ্রি টগল বাদ (২৬ সেপ্টে ২০২৬, ব্যবহারকারীর সিদ্ধান্ত:
       "Speak to Me বাটন থাকলে হ্যান্ডস-ফ্রি বাটনের প্রয়োজন নেই") —
       টানা কণ্ঠ-আলাপ এখন কেবল Speak to Me-তে। প্যানেলের মাইক এক প্রশ্নের। */
    var handsFree = false;
    try { localStorage.removeItem('kh_bot_hf'); } catch (e) {}

    function paintVoice() {
      if (!SR) return;
      micB.classList.toggle('kh-on', listening);
      micB.setAttribute('aria-pressed', listening ? 'true' : 'false');
      micB.title = listening ? 'শোনা বন্ধ করুন' : 'কথা বলে প্রশ্ন করুন';
      panel.classList.toggle('kh-listening', listening);
      btn.classList.toggle('kh-listening', listening);
      paintNote();
    }

    /* নিচের নোটটিই ভয়েস মোডের একমাত্র অবস্থা-সূচক */
    function paintNote() {
      if (listening)      note.textContent = '🎙️ শুনছি… বলা শেষ হলেই নিজে থেকে পাঠিয়ে দেব।';
      else if (speaking)  note.textContent = '🔊 কণ্ঠে উত্তর দিচ্ছি…';
      else                note.textContent = NOTE_DEFAULT;
      note.classList.toggle('kh-hear', listening || speaking);
    }

    function makeRec() {
      var r = new SR();
      r.lang = window.KH_VOICE_LANG || 'bn-BD';
      r.interimResults = true;
      r.continuous = false;               /* এক দমে এক প্রশ্ন — থামলেই শেষ */
      r.maxAlternatives = 1;
      r.onstart = function () { listening = true; paintVoice(); };
      r.onresult = function (ev) {
        var interim = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) heard += t; else interim += t;
        }
        input.value = (heard + interim).trim();   /* বলতে বলতেই লেখা দেখা যায় */
      };
      r.onerror = function (ev) {
        wantListen = false;
        var e = ev && ev.error;
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          handsFree = false;
          try { localStorage.setItem('kh_bot_hf', '0'); } catch (x) {}
          say('মাইক ব্যবহারের অনুমতি পাওয়া যায়নি। ঠিকানা বারের পাশের 🔒 আইকনে গিয়ে মাইক্রোফোন "Allow" করে আবার চেষ্টা করুন।', 'err');
        } else if (e === 'no-speech') {
          say('কিছু শুনতে পাইনি। আবার চেষ্টা করুন, অথবা লিখে জিজ্ঞেস করুন।', 'err');
        }
      };
      r.onend = function () {
        listening = false; paintVoice();
        var t = (heard || input.value || '').trim();
        heard = '';
        if (t) { input.value = t; ask('voice'); }  /* বলা শেষ → কণ্ঠ মোডে পাঠায় */
        else if (handsFree && wantListen) { setTimeout(startListen, 250); }
      };
      return r;
    }

    function startListen() {
      if (stm) return;                 /* মুখোমুখি আলাপ চলছে — সেটির নিজের মাইক */
      if (!SR || listening || busy) return;
      if (!panel.classList.contains('kh-open')) return;
      speakSeq++;                      /* বাকি টুকরোগুলোও থেমে যাক */
      try { speechSynthesis.cancel(); } catch (e) {}
      talking(false);
      heard = ''; wantListen = true;
      if (!rec) rec = makeRec();
      try { rec.start(); } catch (e) {}          /* আগে থেকেই চললে চুপচাপ */
    }
    function stopListen() {
      wantListen = false;
      if (rec && listening) { try { rec.stop(); } catch (e) {} }
    }
    /* বট বলা শেষ করলে — হ্যান্ডস-ফ্রি হলে আবার শোনা শুরু */
    function afterSpeak() {
      if (handsFree && panel.classList.contains('kh-open')) setTimeout(startListen, 350);
    }

    /* ══ 🧕 Speak to Me — মুখোমুখি কথা বলার মানব ইন্টারফেস (২৫ সেপ্টে ২০২৬) ══
       ব্যবহারকারীর চাওয়া: হিজাবি নারী, নরম-মধুর কণ্ঠ, আবেগ, হাতের ইশারা —
       "দেখে মনে হবে মানুষের সাথে কথা বলছি"। সিদ্ধান্ত: **কোনো মাসিক খরচ
       নয়**, সাইটের ভেতরেই তৈরি; চেহারা একজন সত্যিকারের নারীর (লিখিত সম্মতিসহ)।

       ⚙️ কৌশল — ভিডিও-ক্লিপের অবস্থা-যন্ত্র:
         ঐ নারীর ছোট ছোট ক্লিপ (নীরব, শোনা, ভাবা, কথা বলা, সালাম, বুঝিয়ে বলা,
         দেখানো, সম্মতি, হাসিমুখে ও সহানুভূতিতে কথা বলা)। প্রতিটি ক্লিপ একই
         "মূল ভঙ্গি"তে শুরু ও শেষ হয়, তাই দুটি <video> ক্রসফেড করলে জোড়া চোখে
         পড়ে না। কোন ক্লিপ চলবে ঠিক করে বটের নিজের উত্তর — kh-chat
         `mode:'avatar'` প্রতিটি উত্তরে সাদা-তালিকাভুক্ত `mood` ও `gesture` দেয়।
       ⚠️ ঠোঁট শব্দে-শব্দে মেলে না। কথা বলার ক্লিপে মুখ স্বাভাবিকভাবে নড়ে,
          আর প্রতিটি বাক্য শেষ হলে (~৪০০ms) নীরব ক্লিপে ফেরে — তাই চুপ থাকার
          সময় মুখ নড়তে দেখা যায় না। শব্দ-নির্ভুল লিপ-সিঙ্ক পরের ধাপের কাজ।
       ⚠️ `images/avatar/manifest.json` না থাকলে ছবি-মোড — বর্তমান এভাটারের
          ছবিটিই দোল খায়। ক্লিপ রেকর্ড হলে কেবল ফাইল ও manifest বসালেই চলবে।
       ⚠️ কেবল লগইন করা সদস্য (ব্যবহারকারীর সিদ্ধান্ত) — সার্ভারও যাচাই করে।
       ⚠️ প্রতিটি কলব্যাক `stmAlive(id)` দেখে — বন্ধ করে সাথে সাথে আবার
          খুললে পুরনো সেশনের মাইক/কণ্ঠ যেন নতুন সেশনে কিছু না করে। */
    var STM_BASE = window.KH_AVATAR_BASE || 'images/avatar/';
    var STM_MOODS = { smile: 1, neutral: 1, empathy: 1, serious: 1 };
    var STM_GESTS = { greet: 1, explain: 1, point: 1, nod: 1, none: 1 };
    var stm = null;              /* খোলা থাকলে সেশনের অবস্থা */
    var stmSeq = 0;
    var stmClips = null;         /* null = এখনো দেখা হয়নি · false = ক্লিপ নেই (ছবি-মোড) */

    /* ══ 🧕 জীবন্ত প্রতিকৃতি — ছবি-মোড (সেশন ২ · ২৬ সেপ্টেম্বর ২০২৬) ══════
       ব্যবহারকারী: "তুমি এআই জেনারেটেড একটি এভাটার তৈরী করে দিবে" — খরচ
       ছাড়া, তাই কোনো সেবা নয়: Canva-তে তৈরি একটি স্থির প্রতিকৃতিকে
       ক্যানভাসে জীবন্ত করা হয় —
         • ঠোঁট/চোয়াল — মুখরেখার নিচের সারিগুলো নিচে সরে (চোয়াল নামে),
           উপরের ঠোঁট সামান্য ওঠে, ফাঁকে মুখের ভেতর (দাঁত+জিভের আভাস)
         • চোখের পলক — চোখের ঠিক উপরের পাতার চামড়া টেনে নামানো, ২–৬ সেকেন্ডে
         • মাথা — শ্বাস, হালকা দোলা, মাথা নাড়া (nod), সালামে কাত, সহানুভূতিতে কাত
       ⚠️ ঠোঁট শব্দে-শব্দে মেলে না — ছন্দ কৃত্রিম, আর কণ্ঠ শব্দের সীমা
          (`onboundary`) দিলে প্রতিটি শব্দে মুখ একটু বেশি খোলে।
       ⚠️⚠️ FACE-এর সংখ্যাগুলো **এই ছবিটির** মাপ (১০৮৮×১৪৫৬) — ছবি বদলালে
          চোখ, মুখরেখা ও থুতনি নতুন করে মেপে বসাতে হবে, নাহলে ভুল জায়গা নড়বে।
       ⚠️ পিক্সেল কখনো পড়া হয় না (getImageData নেই) — তাই ছবিটি অন্য
          ডোমেইনে থাকলেও ক্যানভাস "tainted" হলে কিছু ভাঙে না। */
    var STM_FACE_SRC = window.KH_STM_FACE ||
      'https://fgczixybyrzkrsoqrgdl.supabase.co/storage/v1/object/public/site-assets/bot/stm-avatar-v2';
    /* ⚠️ v2 = ইনার হিজাবে চুল পুরো ঢাকা (ব্যবহারকারীর নির্দেশ, ২৬ সেপ্টে ২০২৬)। ছবি বদলালে
       নতুন নাম দিতে হবে — ফাইলটি এক বছরের cache-এ যায়, একই নামে বসালে পুরনোটাই দেখাবে।
       মুখের স্থানাঙ্ক v1 ও v2-তে একই (মেপে দেখা)। */
    var FACE = {
      W: 1088,
      mouthX: 541, mouthY: 691, mouthHalf: 90,   /* মুখরেখা ও ঠোঁটের অর্ধেক প্রস্থ */
      lipTop: 668, chin: 824, jawEnd: 884, jawHalf: 178,
      /* [x, y, পাতার উপরের রঙ, নিচের রঙ] — ছবি থেকে মাপা রঙ (y ৪৭০ ও ৫৩৫), সামান্য উজ্জ্বল করা */
      eyes: [[449, 506, 'rgb(180,130,106)', 'rgb(162,110,90)'],
             [633, 506, 'rgb(162,114,90)', 'rgb(150,100,80)']],
      eyeRx: 47, eyeRy: 18, lidFrom: 466
    };

    function stmFace(host) {
      var reduce = false;
      try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      var cv = document.createElement('canvas');
      cv.className = 'kh-stm-face';
      cv.setAttribute('aria-hidden', 'true');
      host.appendChild(cv);
      var ctx = cv.getContext('2d');
      var strip = document.createElement('canvas'), sx = strip.getContext('2d');
      var lid = document.createElement('canvas'), lx = lid.getContext('2d');
      var img = new Image();
      var big = (window.devicePixelRatio || 1) * (host.clientWidth || 360) > 760;
      img.src = STM_FACE_SRC + (big ? '@2x.jpg' : '.jpg');
      var k = 1, ready = false, alive = true, raf = 0, dirty = true;
      var st = {
        talk: false, listen: false, think: false, open: 0, word: 0, t0: performance.now(),
        blinkAt: -1, nextBlink: 0, dbl: false, mood: 'neutral', gest: '', gestAt: 0, rot: 0
      };

      function schedBlink(now, soon) {
        st.nextBlink = now + (soon ? 180 : 2200 + Math.random() * 3800);
      }
      img.onload = function () {
        if (!alive) return;
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        k = cv.width / FACE.W; ready = true;
        host.classList.add('is-ready');
        schedBlink(performance.now());
        raf = requestAnimationFrame(tick);
      };
      img.onerror = function () { host.classList.add('is-fallback'); };  /* পুরনো ছোট ছবিটিই থাকে */

      function blinkAmt(now) {
        if (st.blinkAt < 0) return 0;
        var t = now - st.blinkAt;
        if (t < 70) return t / 70;
        if (t < 95) return 1;
        if (t < 180) return 1 - (t - 95) / 85;
        st.blinkAt = -1;
        /* মাঝে মাঝে পরপর দুবার — মানুষ এভাবেই পলক ফেলে */
        var again = !st.dbl && Math.random() < 0.18;
        st.dbl = again;
        schedBlink(now, again);
        return 0;
      }

      function mouth(a) {
        var cx = FACE.mouthX * k, y0 = FACE.mouthY * k, hw = FACE.jawHalf * k;
        var up = a * 0.22;                                  /* উপরের ঠোঁট সামান্য ওঠে */
        var top = (FACE.lipTop - 6) * k, chin = FACE.chin * k, end = FACE.jawEnd * k;
        var sw = Math.ceil(hw * 2), sh = Math.ceil(end - top + a + 4);
        if (strip.width !== sw) strip.width = sw;
        strip.height = sh;                                  /* উচ্চতা বসালেই মুছে যায় */
        sx.globalCompositeOperation = 'source-over';
        /* ফাঁকটুকু আগে মুখরেখার রঙ টেনে ভরা — কোণে যেন পুরনো ঠোঁট না দেখায় */
        sx.drawImage(img, cx - hw, y0 - 1.5 * k, sw, 3 * k, 0, y0 - up - top, sw, a + up + 1);
        var step = Math.max(1, Math.round(2 * k));
        for (var y = top; y < end; y += step) {
          var s = y < y0 ? -up * ((y - top) / (y0 - top))
                : y < chin ? a
                : a * (1 - (y - chin) / (end - chin));
          sx.drawImage(img, cx - hw, y, sw, step, 0, y - top + s, sw, step + 0.6);
        }
        /* পাশের দিকে মিলিয়ে দেওয়া — গাল ও হিজাবের কিনারায় জোড়া দেখা যায় না */
        sx.globalCompositeOperation = 'destination-in';
        var g = sx.createLinearGradient(0, 0, sw, 0);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.2, '#000');
        g.addColorStop(0.8, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        sx.fillStyle = g; sx.fillRect(0, 0, sw, sh);
        ctx.drawImage(strip, cx - hw, top);

        /* মুখের ভেতর */
        var mw = FACE.mouthHalf * k * (0.74 + 0.1 * st.open);
        var my = y0 + (a - up) / 2, mh = (a + up) / 2 + 1.2 * k;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(cx, my, mw, mh, 0, 0, Math.PI * 2); ctx.clip();
        var gi = ctx.createLinearGradient(0, y0 - up, 0, y0 + a);
        gi.addColorStop(0, '#3d1219'); gi.addColorStop(1, '#1b070b');
        ctx.fillStyle = gi; ctx.fillRect(cx - mw, my - mh, mw * 2, mh * 2);
        if (a > 6 * k) {                                    /* উপরের দাঁতের আভাস */
          ctx.fillStyle = 'rgba(226,216,210,.55)';            /* ফিকে — উজ্জ্বল সাদা রেখার মতো দেখাত */
          ctx.beginPath(); ctx.ellipse(cx, y0 - up, mw * 0.56, Math.min(a * 0.2, 4 * k), 0, 0, Math.PI); ctx.fill();
        }
        if (a > 9 * k) {                                    /* জিভের আভাস */
          ctx.fillStyle = 'rgba(150,58,68,.5)';
          ctx.beginPath(); ctx.ellipse(cx, y0 + a, mw * 0.55, a * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      function eye(e, b) {
        var ex = e[0] * k, ey = e[1] * k, rx = FACE.eyeRx * k, ry = FACE.eyeRy * k;
        var srcTop = FACE.lidFrom * k, open = ey - ry - 2 * k;
        var srcH = Math.max(3, open - srcTop);
        /* ⚠️ পুরো চোখ ঢাকতে হবে — কম ঢাকলে আধখোলা, ভূতুড়ে চোখ দেখা যায় (পরীক্ষায় ধরা পড়ে) */
        var cover = (ry * 2 + 10 * k) * b;
        var w = Math.ceil(rx * 2.5), h = Math.ceil(srcH + cover + 4 * k);
        lid.width = w; lid.height = h;
        var x0 = ex - w / 2;
        /* ⚠️ শুধু চামড়া টেনে নামালে পাপড়ি/ভাঁজও টেনে আসে, আর বন্ধ চোখ ঝাপসা-ভূতুড়ে
           দেখায় (পরীক্ষায় ধরা পড়ে)। তাই আগে ঐ চোখের পাতার মাপা রঙের ভরাট ঢাল,
           তার উপরে হালকা করে (৩৫%) চামড়ার বুনট। */
        var lg = lx.createLinearGradient(0, 0, 0, srcH + cover);
        lg.addColorStop(0, e[2]); lg.addColorStop(1, e[3]);
        lx.fillStyle = lg; lx.fillRect(0, 0, w, srcH + cover);
        lx.globalAlpha = 0.35;
        lx.drawImage(img, x0, srcTop, w, srcH * 0.6, 0, 0, w, srcH + cover);
        lx.globalAlpha = 1;
        if (b > 0.45) {                                     /* পাপড়ির রেখা */
          lx.strokeStyle = 'rgba(30,18,18,' + (0.55 + 0.35 * b).toFixed(2) + ')';
          lx.lineWidth = 3.2 * k; lx.lineCap = 'round';
          var ly = srcH + cover - 5 * k;
          lx.beginPath(); lx.moveTo(w / 2 - rx * 0.95, ly - 2 * k);
          lx.quadraticCurveTo(w / 2, ly + 3 * k, w / 2 + rx * 0.95, ly - 2 * k); lx.stroke();
        }
        lx.globalCompositeOperation = 'destination-in';
        var cyl = (srcH + cover) / 2, ryl = cyl + 3 * k, rxl = rx * 1.25;
        lx.save(); lx.translate(w / 2, cyl); lx.scale(1, ryl / rxl);
        var gr = lx.createRadialGradient(0, 0, 0, 0, 0, rxl);
        gr.addColorStop(0, '#000'); gr.addColorStop(0.74, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        lx.fillStyle = gr; lx.fillRect(-rxl, -rxl, rxl * 2, rxl * 2);
        lx.restore();
        lx.globalCompositeOperation = 'source-over';
        ctx.drawImage(lid, x0, srcTop);
      }

      function pose(now, t) {
        var rot = 0, ty = 0, tx = 0, sc = 1.06;
        if (!reduce) {
          rot = Math.sin(t * 0.45) * 0.55 + Math.sin(t * 0.23 + 1) * 0.35;
          ty = Math.sin(t * 0.9) * 0.35;                    /* শ্বাস */
          tx = Math.sin(t * 0.31 + 0.7) * 0.3;
          if (st.talk) { rot += Math.sin(t * 1.7) * 0.45; ty += Math.sin(t * 2.6) * 0.22; }
          if (st.listen) rot += 1.4;                        /* শোনার সময় মাথা একটু কাত */
          if (st.think) { rot -= 1.2; ty -= 0.4; }
          if (st.gest) {
            var g = (now - st.gestAt) / 1000;
            if (st.gest === 'nod' && g < 1.2) ty += 1.4 * Math.max(0, Math.sin(g * Math.PI / 0.4));
            else if (st.gest === 'greet' && g < 1.8) { rot += 3 * Math.sin(g * Math.PI / 1.8); ty += 0.9 * Math.max(0, Math.sin(g * Math.PI / 0.9)); }
            else if (st.gest === 'explain' && g < 2.4) { rot += 1.2 * Math.sin(g * 4); tx += 0.5 * Math.sin(g * 2.2); }
            else if (st.gest === 'point' && g < 1.6) { tx += 1.2 * Math.sin(g * Math.PI / 1.6); rot -= 1.5 * Math.sin(g * Math.PI / 1.6); }
            else if (g > 2.5) st.gest = '';
          }
          if (st.mood === 'empathy') rot += 2.2;            /* সহানুভূতিতে মাথা কাত */
          else if (st.mood === 'smile') rot -= 0.6;
        }
        st.rot += (rot - st.rot) * 0.12;
        cv.style.transform = 'translate(' + tx.toFixed(2) + '%,' + ty.toFixed(2) + '%) rotate(' +
          st.rot.toFixed(2) + 'deg) scale(' + sc + ')';
      }

      function tick(now) {
        if (!alive) return;
        raf = requestAnimationFrame(tick);
        if (!ready || document.hidden) return;
        var t = (now - st.t0) / 1000, tgt = 0;
        if (st.talk) {
          /* তিনটি ভিন্ন ছন্দ মিলিয়ে অক্ষরের মতো ওঠানামা, মাঝে মাঝে ছোট বিরতি */
          var o = 0.5 * Math.sin(t * 2 * Math.PI * 4.4) + 0.32 * Math.sin(t * 2 * Math.PI * 6.9 + 1.3) +
                  0.22 * Math.sin(t * 2 * Math.PI * 2.3 + 0.5) + 0.28;
          if (Math.sin(t * 2 * Math.PI * 0.55 + 2) > 0.86) o *= 0.25;
          tgt = Math.max(0, Math.min(1, o)) * 0.82 + st.word;
        }
        st.word *= 0.86;
        var prev = st.open;
        st.open += (Math.min(1, tgt) - st.open) * (tgt > st.open ? 0.45 : 0.3);
        if (st.open < 0.01) st.open = 0;
        if (st.blinkAt < 0 && now >= st.nextBlink) st.blinkAt = now;
        var b = blinkAmt(now);
        if (st.open > 0 || prev > 0 || b > 0 || dirty) {
          dirty = b > 0 || st.open > 0;                     /* শেষ ফ্রেমটি পরিষ্কার করে আঁকা */
          ctx.drawImage(img, 0, 0);
          if (st.open > 0.02) mouth(st.open * 17 * k);
          if (b > 0.02) FACE.eyes.forEach(function (e) { eye(e, b); });
        }
        pose(now, t);
      }

      return {
        talk: function (on) { st.talk = !!on; if (!on) st.word = 0; },
        word: function () { if (st.talk) st.word = Math.min(0.4, st.word + 0.32); },
        mood: function (m) { st.mood = m || 'neutral'; },
        gesture: function (g) { if (g && g !== 'none') { st.gest = g; st.gestAt = performance.now(); } },
        listen: function (on) { st.listen = !!on; },
        think: function (on) { st.think = !!on; },
        destroy: function () { alive = false; cancelAnimationFrame(raf); cv.remove(); }
      };
    }

    function stmAlive(id) { return !!stm && stm.id === id; }

    async function stmToken() {
      try {
        var db = sb();
        if (db && db.auth) {
          var s = await db.auth.getSession();
          return (s && s.data && s.data.session && s.data.session.access_token) || '';
        }
      } catch (e) {}
      return '';
    }

    /* ক্লিপের তালিকা — manifest.json থেকে; না থাকলে ছবি-মোড */
    async function stmLoadClips() {
      if (stmClips !== null) return stmClips;
      try {
        var r = await fetch(STM_BASE + 'manifest.json', { cache: 'no-cache' });
        if (!r.ok) throw new Error('no manifest');
        var m = await r.json();
        var c = (m && m.clips) || null;
        if (!c || !c.idle || !c.idle.length) throw new Error('no idle');
        c._poster = (m && m.poster) || '';
        stmClips = c;
      } catch (e) { stmClips = false; }
      return stmClips;
    }

    function stmPick(list, last) {
      if (!list || !list.length) return '';
      if (list.length === 1) return list[0];
      var f, guard = 0;
      do { f = list[Math.floor(Math.random() * list.length)]; } while (f === last && ++guard < 6);
      return f;
    }

    function stmTalkState() {
      var s = 'talk_' + ((stm && stm.mood) || 'neutral');
      return (stmClips && stmClips[s] && stmClips[s].length) ? s : 'talk';
    }

    /* একটি অবস্থা দেখানো। opts.once → একবার চালিয়ে opts.then() */
    function stmShow(state, opts) {
      opts = opts || {};
      if (!stm) return;
      stm.state = state;
      stm.stage.setAttribute('data-state', state);
      if (!stmClips) {                          /* ছবি-মোড: জীবন্ত প্রতিকৃতি অবস্থা দেখায় */
        if (stm.face) {
          stm.face.listen(state === 'listen');
          stm.face.think(state === 'think');
          if (STM_GESTS[state]) stm.face.gesture(state);
        }
        if (opts.once && opts.then) { var id0 = stm.id; setTimeout(function () { if (stmAlive(id0)) opts.then(); }, 1100); }
        return;
      }
      var list = stmClips[state];
      if (!list || !list.length) {              /* ক্লিপ নেই → কাছাকাছিটি */
        var fb = /^talk_/.test(state) ? 'talk'
               : STM_GESTS[state] ? stmTalkState()
               : (state === 'listen' || state === 'think') ? 'idle' : '';
        if (fb && fb !== state) stmShow(fb, opts);
        return;
      }
      var file = stmPick(list, stm.lastFile);
      stm.lastFile = file;
      var id = stm.id, gen = ++stm.gen;
      var back = stm.vids[1 - stm.front], front = stm.vids[stm.front];
      back.loop = !opts.once;
      back.onended = opts.once ? function () {
        if (stmAlive(id) && stm.gen === gen && opts.then) opts.then();
      } : null;
      back.oncanplay = function () {
        back.oncanplay = null;
        if (!stmAlive(id) || stm.gen !== gen) return;
        var p = back.play(); if (p && p.catch) p.catch(function () {});
        back.classList.add('is-on'); front.classList.remove('is-on');
        stm.front = 1 - stm.front;
        setTimeout(function () {
          if (stmAlive(id) && stm.gen === gen) { try { front.pause(); } catch (e) {} }
        }, 340);
      };
      back.src = STM_BASE + file;
      try { back.load(); } catch (e) {}
    }

    function stmStatus(t) { if (stm) stm.statusEl.textContent = t || ''; }

    /* ⚠️ লেখা সবসময় textContent-এ — মডেলের উত্তর কখনো innerHTML-এ নয় */
    function stmCaption(who, text) {
      if (!stm) return;
      stm.capWho.textContent = who || '';
      stm.capText.textContent = text || '';
      stm.cap.hidden = !stm.cc || !text;
    }

    function paintStmMic() {
      if (!stm) return;
      var on = !stm.paused;
      stm.micB.classList.toggle('is-off', !on);
      stm.micB.classList.toggle('is-live', !!stm.listening);
      stm.micB.setAttribute('aria-pressed', on ? 'true' : 'false');
      stm.micB.innerHTML = '<i class="ti ' + (on ? 'ti-microphone' : 'ti-microphone-off') + '" aria-hidden="true"></i>';
      stm.micB.setAttribute('aria-label', on ? 'শোনা থামান' : 'আবার শুনুন');
      stm.micB.title = on ? 'শোনা থামান' : 'আবার শুনুন';
    }

    /* বলা — মুখের ক্লিপ বাক্যে বাক্যে নড়ে ও থামে */
    function stmSay(text, mood, gesture, done) {
      if (!stm) return;
      var id = stm.id;
      stm.mood = STM_MOODS[mood] ? mood : 'neutral';
      stm.stage.setAttribute('data-mood', stm.mood);
      if (stm.face) stm.face.mood(stm.mood);
      stm.speaking = true;
      if (gesture && gesture !== 'none' && STM_GESTS[gesture]) {
        stmShow(gesture, { once: true, then: function () {
          if (stmAlive(id)) stmShow(stm.speaking ? stmTalkState() : 'idle');
        } });
      } else {
        stmShow(stmTalkState());
      }
      stmStatus('বলছি…');
      var idleT = null;
      speak(text, {
        force: true,
        onWord: function () { if (stmAlive(id) && stm.face) stm.face.word(); },
        onChunk: function (on, chunk) {
          if (!stmAlive(id)) return;
          clearTimeout(idleT);
          if (on) {
            stm.speaking = true;
            stm.el.classList.add('is-talking');
            if (stm.face) stm.face.talk(true);
            stmCaption('হাসানা', chunk);
            if (stm.state === 'idle') stmShow(stmTalkState());
          } else {
            /* পরের বাক্য ~৪০০ms-এর মধ্যে না এলে মুখ থামে */
            idleT = setTimeout(function () {
              if (!stmAlive(id)) return;
              stm.speaking = false;
              stm.el.classList.remove('is-talking');
              if (stm.face) stm.face.talk(false);
              if (/^talk/.test(stm.state)) stmShow('idle');
            }, 400);
          }
        },
        onDone: function (started) {
          clearTimeout(idleT);
          if (!stmAlive(id)) return;
          stm.speaking = false;
          stm.el.classList.remove('is-talking');
          if (stm.face) stm.face.talk(false);
          /* কণ্ঠ চলেনি (ব্রাউজারে কণ্ঠ নেই) — উত্তর যেন হারিয়ে না যায় */
          if (!started) { stm.cap.hidden = false; stm.capWho.textContent = 'হাসানা'; stm.capText.textContent = text; }
          if (done) done(started);
        }
      });
    }

    function stmListen() {
      if (!stm || !SR || stm.paused || stm.listening || stm.busy) return;
      var id = stm.id, got = '';
      var r = new SR();
      r.lang = window.KH_VOICE_LANG || 'bn-BD';
      r.interimResults = true;
      r.continuous = false;
      r.maxAlternatives = 1;
      r.onstart = function () {
        if (!stmAlive(id)) return;
        stm.listening = true;
        stm.el.classList.add('is-listening');
        stmShow('listen');
        stmStatus('শুনছি… বলুন');
        paintStmMic();
      };
      r.onresult = function (ev) {
        if (!stmAlive(id)) return;
        var intr = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          var t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) got += t; else intr += t;
        }
        stmCaption('আপনি', (got + intr).trim());
      };
      r.onerror = function (ev) {
        if (!stmAlive(id)) return;
        var e = ev && ev.error;
        if (e === 'not-allowed' || e === 'service-not-allowed') {
          stm.paused = true;
          stm.denied = true;
        } else if (e === 'no-speech') {
          stm.empty = (stm.empty || 0) + 1;
        }
      };
      r.onend = function () {
        if (!stmAlive(id)) return;
        stm.listening = false;
        stm.el.classList.remove('is-listening');
        stm.rec = null;
        var t = got.trim();
        if (t) { stm.empty = 0; paintStmMic(); stmAsk(t); return; }
        if (stm.denied) {
          stmShow('idle');
          stmStatus('মাইকের অনুমতি পাওয়া যায়নি — ঠিকানা বারের 🔒 আইকনে গিয়ে মাইক্রোফোন Allow করুন');
        } else if (stm.paused) {
          stmShow('idle');
          stmStatus('থামানো আছে — কথা বলতে মাইকে চাপুন');
        } else if ((stm.empty || 0) >= 3) {
          /* টানা তিনবার নীরবতা — মাইক অকারণে খোলা রাখা হয় না */
          stm.paused = true;
          stmShow('idle');
          stmStatus('কিছু শুনতে পাইনি — আবার বলতে মাইকে চাপুন');
        } else {
          setTimeout(function () { if (stmAlive(id)) stmListen(); }, 350);
        }
        paintStmMic();
      };
      stm.rec = r;
      try { r.start(); } catch (e) {}
    }

    function stmStopListen() {
      if (stm && stm.rec) { try { stm.rec.abort(); } catch (e) {} }
    }

    async function stmAsk(q) {
      if (!stm) return;
      var id = stm.id;
      stm.busy = true;
      stmShow('think');
      stmStatus('ভাবছি…');
      var token = await stmToken();
      var base = window.KH_FN_BASE || 'https://fgczixybyrzkrsoqrgdl.supabase.co/functions/v1';
      var reply = '', mood = 'neutral', gesture = 'none', needLogin = false;
      try {
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;
        var ctl = new AbortController();
        var timer = setTimeout(function () { ctl.abort(); }, 50000);
        var res = await fetch(base + '/kh-chat', {
          method: 'POST', headers: headers, signal: ctl.signal,
          body: JSON.stringify({ q: q, visitor: vid, history: history.slice(-8), mode: 'avatar' })
        });
        clearTimeout(timer);
        var out = await res.json();
        reply = (out && out.reply) || '';
        mood = (out && out.mood) || 'neutral';
        gesture = (out && out.gesture) || 'none';
        needLogin = !!(out && out.need_login);
      } catch (e) { reply = ''; }
      if (!stmAlive(id)) return;
      stm.busy = false;
      if (needLogin) { stmGate(); return; }
      if (!reply) {
        reply = 'দুঃখিত, এই মুহূর্তে উত্তর আনতে পারছি না। একটু পরে আবার বলুন।';
        mood = 'empathy'; gesture = 'none';
      } else {
        history.push({ role: 'user', content: q });
        history.push({ role: 'assistant', content: reply });
        if (history.length > 16) history = history.slice(-16);
      }
      stmSay(reply, mood, gesture, function () {
        if (!stmAlive(id)) return;
        if (!stm.paused) setTimeout(function () { if (stmAlive(id)) stmListen(); }, 400);
        else { stmShow('idle'); stmStatus('থামানো আছে — কথা বলতে মাইকে চাপুন'); }
      });
    }

    /* লগইন না থাকলে — পর্দা খোলে, কিন্তু আলাপ নয় */
    function stmGate() {
      if (!stm) return;
      stm.gate.hidden = false;
      stm.el.classList.add('is-gated');
      stmShow('idle');
      stmStatus('');
      stm.ctrl.hidden = true;
      try { stm.gate.querySelector('a').focus(); } catch (e) {}
    }

    async function openStm() {
      if (stm) return;
      /* চ্যাট প্যানেলের মাইক ও কণ্ঠ থামানো — দুটি মাইক একসাথে নয় */
      stopListen();
      speakSeq++; try { speechSynthesis.cancel(); } catch (e) {}
      talking(false);

      var el = document.createElement('div');
      el.className = 'kh-stm';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-label', 'হাসানার সাথে মুখোমুখি কথা');
      var here = encodeURIComponent(location.pathname.split('/').pop() || 'index.html');
      el.innerHTML =
        '<div class="kh-stm-bg" aria-hidden="true"></div>' +
        '<div class="kh-stm-top">' +
          /* ⚠️ দর্শক যেন কখনো মানুষ ভেবে ভুল না করেন — চিহ্নটি সবসময় থাকে */
          '<span class="kh-stm-badge"><i class="ti ti-sparkles" aria-hidden="true"></i>AI সহায়িকা · হাসানা</span>' +
          '<button type="button" class="kh-stm-cc" aria-pressed="false" title="যা বলা হচ্ছে তা লেখায় দেখান">' +
            '<i class="ti ti-badge-cc" aria-hidden="true"></i><span>লেখা</span></button>' +
          '<button type="button" class="kh-stm-x" aria-label="বন্ধ করুন"><i class="ti ti-x" aria-hidden="true"></i></button>' +
        '</div>' +
        '<div class="kh-stm-stage" data-state="idle" data-mood="neutral">' +
          '<video class="kh-stm-v is-on" muted playsinline preload="auto" aria-hidden="true"></video>' +
          '<video class="kh-stm-v" muted playsinline preload="auto" aria-hidden="true"></video>' +
          '<div class="kh-stm-photo" aria-hidden="true"><span class="kh-av"></span></div>' +
          '<div class="kh-stm-wave" aria-hidden="true"><b></b><b></b><b></b><b></b><b></b></div>' +
          '<div class="kh-stm-cap" hidden><b></b><span></span></div>' +
          '<div class="kh-stm-gate" hidden>' +
            '<i class="ti ti-lock" aria-hidden="true"></i>' +
            '<p>মুখোমুখি কথা বলার সুবিধাটি কেবল সদস্যদের জন্য।<br>অনুগ্রহ করে লগইন করুন।</p>' +
            '<a class="kh-stm-login" href="user-login.html?next=' + here + '">লগইন করুন</a>' +
          '</div>' +
        '</div>' +
        '<p class="kh-stm-status" aria-live="polite"></p>' +
        '<p class="kh-stm-note" hidden>AI দিয়ে তৈরি প্রতিকৃতি — কোনো সত্যিকারের ব্যক্তির ছবি নয়।</p>' +
        '<div class="kh-stm-ctrl">' +
          '<button type="button" class="kh-stm-mic" aria-pressed="true"></button>' +
          '<button type="button" class="kh-stm-end"><i class="ti ti-phone-off" aria-hidden="true"></i><span>কথা শেষ</span></button>' +
        '</div>';
      document.body.appendChild(el);
      document.body.classList.add('kh-stm-lock');

      var cc = false;
      try { cc = localStorage.getItem('kh_stm_cc') === '1'; } catch (e) {}
      stm = {
        id: ++stmSeq, el: el,
        stage: el.querySelector('.kh-stm-stage'),
        vids: Array.prototype.slice.call(el.querySelectorAll('.kh-stm-v')),
        front: 0, gen: 0, state: 'idle', lastFile: '', mood: 'neutral',
        cap: el.querySelector('.kh-stm-cap'),
        capWho: el.querySelector('.kh-stm-cap b'),
        capText: el.querySelector('.kh-stm-cap span'),
        statusEl: el.querySelector('.kh-stm-status'),
        gate: el.querySelector('.kh-stm-gate'),
        ctrl: el.querySelector('.kh-stm-ctrl'),
        micB: el.querySelector('.kh-stm-mic'),
        ccB: el.querySelector('.kh-stm-cc'),
        cc: cc, paused: false, listening: false, speaking: false, busy: false, empty: 0
      };
      var id = stm.id;

      function paintCC() {
        stm.ccB.classList.toggle('is-on', stm.cc);
        stm.ccB.setAttribute('aria-pressed', stm.cc ? 'true' : 'false');
        stm.cap.hidden = !stm.cc || !stm.capText.textContent;
      }
      paintCC();
      paintStmMic();

      stm.ccB.onclick = function () {
        stm.cc = !stm.cc;
        try { localStorage.setItem('kh_stm_cc', stm.cc ? '1' : '0'); } catch (e) {}
        paintCC();
      };
      el.querySelector('.kh-stm-x').onclick = closeStm;
      el.querySelector('.kh-stm-end').onclick = closeStm;
      stm.micB.onclick = function () {
        if (!stm) return;
        stm.denied = false;
        if (stm.paused) {
          stm.paused = false; stm.empty = 0; paintStmMic();
          /* কথার মাঝে চাপলে তাঁর কথা থামিয়ে শোনা শুরু */
          if (stm.speaking) { speakSeq++; try { speechSynthesis.cancel(); } catch (e) {} stm.speaking = false; stm.el.classList.remove('is-talking'); if (stm.face) stm.face.talk(false); }
          if (!stm.busy) stmListen();
        } else {
          stm.paused = true; stmStopListen(); paintStmMic();
          if (!stm.speaking && !stm.busy) { stmShow('idle'); stmStatus('থামানো আছে — কথা বলতে মাইকে চাপুন'); }
        }
      };
      setTimeout(function () { try { el.querySelector('.kh-stm-x').focus(); } catch (e) {} }, 60);

      stmStatus('সংযোগ হচ্ছে…');
      var token = await stmToken();
      if (!stmAlive(id)) return;
      if (!token) { stmGate(); return; }

      var clips = await stmLoadClips();
      if (!stmAlive(id)) return;
      el.classList.toggle('is-photo', !clips);
      el.querySelector('.kh-stm-note').hidden = !!clips;
      if (!clips) stm.face = stmFace(el.querySelector('.kh-stm-photo'));
      if (clips && clips._poster) stm.vids.forEach(function (v) { v.poster = STM_BASE + clips._poster; });
      if (clips) stmShow('idle');

      stmSay('আসসালামু আলাইকুম! আমি হাসানা। কর্জে হাসানা ফাউন্ডেশন বা আপনার নিজের হিসাব নিয়ে যা জানতে চান, নির্দ্বিধায় বলুন — আমি শুনছি।',
        'smile', 'greet', function () {
          if (stmAlive(id) && !stm.paused) setTimeout(function () { if (stmAlive(id)) stmListen(); }, 300);
        });
    }

    function closeStm() {
      if (!stm) return;
      var s = stm;
      stm = null;                                  /* সব কলব্যাক এখানেই থামে */
      speakSeq++; try { speechSynthesis.cancel(); } catch (e) {}
      talking(false);
      if (s.rec) { try { s.rec.abort(); } catch (e) {} }
      if (s.face) { try { s.face.destroy(); } catch (e) {} }
      s.vids.forEach(function (v) {
        try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
      });
      s.el.remove();
      document.body.classList.remove('kh-stm-lock');
      try { stmB.focus(); } catch (e) {}
    }

    function paintChips() {
      chips.innerHTML = '';
      if (history.length) return;              /* কথা শুরু হলে আর দেখায় না */
      BOT_TIPS.forEach(function (t) {
        var c = document.createElement('button');
        c.type = 'button';
        c.className = 'kh-bot-chip';
        c.textContent = t;
        c.onclick = function () { input.value = t; ask('text'); };
        chips.appendChild(c);
      });
    }

    /* ══ 🔁 অডিওর বিনিময়ে অডিও, লেখার বিনিময়ে লেখা ═══════════════
       (ব্যবহারকারীর সিদ্ধান্ত, ১৫ সেপ্টেম্বর ২০২৬)
       • কণ্ঠে প্রশ্ন → পর্দায় কেবল **প্রশ্নটি** বসে, উত্তর শুধু কণ্ঠে
       • লিখে প্রশ্ন → শুধু লেখা, কণ্ঠ একেবারেই নয়
       ⚠️ কণ্ঠ যদি কোনো কারণে না চলে (মিউট, পুরনো ব্রাউজার, কণ্ঠ নেই)
          তখন উত্তরটি লেখায় দেখানো হয় — নাহলে উত্তরটাই হারিয়ে যেত। */
    function voiceReply(text) {
      var w = document.createElement('div');
      w.className = 'kh-bot-vrep';
      var b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<i class="ti ti-volume" aria-hidden="true"></i>' +
                    '<span>কণ্ঠে উত্তর দেওয়া হয়েছে — লেখায় দেখুন</span>';
      b.onclick = function () { w.remove(); say(text, 'bot'); };
      w.appendChild(b);
      body.appendChild(w);
      body.scrollTop = body.scrollHeight;
      return function () { if (w.parentNode) { w.remove(); say(text, 'bot'); } };
    }

    async function ask(mode) {
      var q = (input.value || '').trim();
      if (!q || busy) return;
      var voiceMode = (mode === 'voice');
      stopListen();            /* পাঠানোর সময় আর শোনা নয় — নিজের কণ্ঠ ধরত */
      busy = true; send.disabled = true;
      input.value = '';
      say(q, 'me');            /* প্রশ্নটি দুই মোডেই দেখা যায় */
      paintChips();
      typing(true);

      var token = '';
      try {
        var db = sb();
        if (db && db.auth) {
          var s = await db.auth.getSession();
          token = (s && s.data && s.data.session && s.data.session.access_token) || '';
        }
      } catch (e) {}

      var base = window.KH_FN_BASE || 'https://fgczixybyrzkrsoqrgdl.supabase.co/functions/v1';
      var reply = '';
      try {
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = 'Bearer ' + token;
        var ctl = new AbortController();
        var timer = setTimeout(function () { ctl.abort(); }, 50000);
        var res = await fetch(base + '/kh-chat', {
          method: 'POST', headers: headers, signal: ctl.signal,
          body: JSON.stringify({ q: q, visitor: vid, history: history.slice(-8) })
        });
        clearTimeout(timer);
        var out = await res.json();
        reply = (out && out.reply) || '';
      } catch (e) {
        reply = '';
      }

      typing(false);
      busy = false; send.disabled = false;

      if (!reply) {
        /* ত্রুটির বার্তা সবসময় লেখায় — এটি উত্তর নয়, তাই নিয়মের বাইরে */
        say('দুঃখিত, এখন উত্তর আনতে পারছি না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।', 'err');
        if (voiceMode) afterSpeak();
        input.focus();
        return;
      }

      history.push({ role: 'user', content: q });
      history.push({ role: 'assistant', content: reply });
      if (history.length > 16) history = history.slice(-16);

      if (!voiceMode) {
        say(reply, 'bot');     /* ⚠️ লেখার প্রশ্নে কণ্ঠ নয় — speak() ডাকা হয় না */
        input.focus();
        return;
      }

      var reveal = voiceReply(reply);
      if (!canSpeak()) { reveal(); afterSpeak(); return; }
      /* কণ্ঠ শুরু না হলে ~২ সেকেন্ড পর লেখাটাই দেখিয়ে দেওয়া হয় */
      var guard = setTimeout(reveal, 2000);
      speak(reply, {
        onStart: function () { clearTimeout(guard); },
        onDone: function (started) {
          clearTimeout(guard);
          if (!started) reveal();
          afterSpeak();
        }
      });
    }

    function open() {
      panel.classList.add('kh-open');
      if (!body.children.length) {
        say('আসসালামু আলাইকুম! আমি হাসানা সহায়িকা। কর্জে হাসানা ফাউন্ডেশন, আমাদের সেবা বা আপনার নিজের হিসাব — যা জানতে চান জিজ্ঞেস করুন।', 'bot');
        paintChips();
      }
      setTimeout(function () { input.focus(); }, 120);
    }
    function close() {
      panel.classList.remove('kh-open');
      talking(false);
      stopListen();                              /* প্যানেল বন্ধ = মাইকও বন্ধ */
      speakSeq++;
      try { speechSynthesis.cancel(); } catch (e) {}
    }

    btn.onclick = function () {
      if (panel.classList.contains('kh-open')) close(); else open();
    };
    panel.querySelector('.kh-bot-head-x').onclick = close;
    muteB.onclick = function () {
      muted = !muted;
      try { localStorage.setItem('kh_bot_mute', muted ? '1' : '0'); } catch (e) {}
      if (muted) { speakSeq++; try { speechSynthesis.cancel(); } catch (e) {} talking(false); }
      paintMute();
    };

    /* 🎙️ মাইক ও হ্যান্ডস-ফ্রি — কেবল সমর্থিত ব্রাউজারে দেখা যায় */
    if (SR) {
      micB.hidden = false;
      paintVoice();
      micB.onclick = function () {
        if (listening) stopListen(); else startListen();
      };
      /* 🧕 Speak to Me — শোনা ও বলা দুটোই লাগে, তাই কেবল দুটো থাকলেই */
      if ('speechSynthesis' in window) {
        panel.querySelector('.kh-bot-stmrow').hidden = false;
        stmB.onclick = function () { openStm(); };
      }
    }

    /* ⚠️ লেখার পথ — সবসময় 'text', তাই এখানে কণ্ঠ কখনো চলে না */
    send.onclick = function () { ask('text'); };
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); ask('text'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (stm) { closeStm(); return; }          /* আগে মুখোমুখি পর্দা, তারপর প্যানেল */
      if (panel.classList.contains('kh-open')) close();
    });
  };

  /* ══════════════════════════════════════════════════════════
     💸 টাকা দেওয়ার মাধ্যম — `KHUI.payPicker()` (২১ সেপ্টে ২০২৬)

     এক কম্পোনেন্ট, চার জায়গা: দান · সঞ্চয় জমা · ঋণের কিস্তি ·
     অ্যাডমিন এন্ট্রি। আগে প্রতিটি জায়গায় আলাদা ছিল —
     `donation.html`-এ ৬টি বাটন, `borrower-portal.html`-এ একটি
     সাদামাটা `<select>`, আর সঞ্চয় জমায় **কিছুই ছিল না** (শুধু
     "bKash/Nagad TrxID" লেখা একটি ঘর)।

     ⚠️⚠️ টাকা এই সাইটে **কাটা হয় না** (ব্যবহারকারীর সিদ্ধান্ত)।
     সদস্য বাইরে পাঠান, এখানে মাধ্যম + TrxID লেখেন, অ্যাডমিন
     মিলিয়ে অনুমোদন করেন। তাই ৩D কার্ডটি **ফাউন্ডেশনের** তথ্য
     দেখায় — দাতার কার্ড নম্বর/CVV কখনো চাওয়া হয় না (PCI-DSS)।

     ⚠️ ফাউন্ডেশনের তথ্য আসে `public_pay_methods()` RPC থেকে, যা
     `app_settings.pay_methods`-এর **কেবল চালু** মাধ্যমগুলো দেয়।
     **কোনো নম্বর কোডে হার্ডকোড করা নেই** — অ্যাডমিন তথ্য না
     দেওয়া পর্যন্ত ঐ মাধ্যম দাতার সামনে আসেই না।
     ══════════════════════════════════════════════════════════ */
  var PAY_DEF = [
    { id:'bkash',  name:'বিকাশ',            mk:'B',  grp:'mfs',  ref:'TrxID',
      hint:'বিকাশ অ্যাপ → Send Money → নিচের নম্বরে পাঠিয়ে TrxID লিখুন।' },
    { id:'nagad',  name:'নগদ',              mk:'N',  grp:'mfs',  ref:'TrxID',
      hint:'নগদ অ্যাপ → Send Money → নিচের নম্বরে পাঠিয়ে TrxID লিখুন।' },
    { id:'rocket', name:'রকেট',             mk:'R',  grp:'mfs',  ref:'TrxID',
      hint:'রকেট → Send Money → নিচের নম্বরে পাঠিয়ে TrxID লিখুন।' },
    { id:'upay',   name:'উপায়',             mk:'U',  grp:'mfs',  ref:'TrxID',
      hint:'উপায় অ্যাপ → Send Money → নিচের নম্বরে পাঠিয়ে TrxID লিখুন।' },
    { id:'bqr',    name:'বাংলা কিউআর',      mk:'ti-qrcode', grp:'qr', ref:'TrxID',
      hint:'যেকোনো ব্যাংক বা MFS অ্যাপ থেকে QR স্ক্যান করে পাঠান, তারপর TrxID লিখুন।' },
    { id:'bank',   name:'ব্যাংক ট্রান্সফার', mk:'ti-building-bank', grp:'bank', ref:'রেফারেন্স নম্বর',
      hint:'অনলাইন ব্যাংকিং, চেক বা শাখায় জমা — স্লিপের রেফারেন্স নম্বরটি লিখুন।' },
    { id:'card',   name:'কার্ড / POS',      mk:'ti-credit-card', grp:'bank', ref:'অনুমোদন নম্বর',
      hint:'কার্ড বা POS-এ পরিশোধের পর স্লিপের অনুমোদন (approval) নম্বরটি লিখুন।' },
    { id:'cash',   name:'কার্যালয়ে নগদ',    mk:'ti-cash', grp:'cash', ref:'রশিদ নম্বর',
      hint:'কার্যালয়ে নগদ দিলে যে রশিদ পেয়েছেন, তার নম্বরটি লিখুন।',
      offline:'এটি অনলাইনে হয় না — কার্যালয়ে গিয়ে নগদ দিতে হয়। ঠিকানা নিচের ' +
              '“প্রতিষ্ঠানের হিসাব বিবরণী”-তে আছে; রশিদ পেলে তার নম্বরটি এখানে লিখুন।' },
    { id:'agent',  name:'এজেন্ট ব্যাংকিং',  mk:'ti-building-store', grp:'cash', ref:'রশিদ নম্বর',
      hint:'এজেন্ট আউটলেটে জমা দিয়ে রশিদের নম্বরটি লিখুন।',
      offline:'এটি অনলাইনে হয় না — এজেন্ট আউটলেটে জমা দিতে হয়। আউটলেট ও হিসাব ' +
              'নম্বর নিচের “প্রতিষ্ঠানের হিসাব বিবরণী”-তে; রশিদের নম্বরটি এখানে লিখুন।' }
  ];
  KHUI.PAY_METHODS = PAY_DEF;

  /* প্রতিটি মাধ্যমের কার্ডে কোন কোন সারি বসবে — সেটিংসের কি → লেবেল */
  var PAY_ROWS = {
    bkash:  [['number','নম্বর', 1]],
    nagad:  [['number','নম্বর', 1]],
    rocket: [['number','নম্বর', 1]],
    upay:   [['number','নম্বর', 1]],
    bqr:    [['merchant','মার্চেন্ট', 0]],
    bank:   [['account_name','হিসাবের নাম', 0], ['account_no','হিসাব নম্বর', 1],
             ['bank','ব্যাংক', 0], ['branch','শাখা', 0], ['routing','রাউটিং নম্বর', 1],
             ['swift','SWIFT', 1]],
    card:   [],
    cash:   [['office','কার্যালয়', 0], ['hours','সময়', 0]],
    agent:  [['bank','ব্যাংক', 0], ['outlet','আউটলেট', 0], ['account_no','হিসাব নম্বর', 1]]
  };

  /* কাচের পর্দার মাথায় কোন কাজটি চলছে তা লেখা হয় */
  var PURPOSE_LABEL = {
    donation:  'দান',
    savings:   'সঞ্চয়ের কিস্তি',
    repayment: 'ঋণের কিস্তি'
  };

  var payCache = null;                 /* একবার এনে সব পিকারে কাজে লাগে */

  KHUI.payMethodsInfo = async function (force) {
    if (payCache && !force) return payCache;
    var db = sb();
    if (!db) return (payCache = {});
    /* ⚠️ `rpc()`-এ `.catch()` নেই (প্রকল্পের ৪ নম্বর নিয়ম) */
    try {
      var r = await db.rpc('public_pay_methods');
      payCache = (r && !r.error && r.data) ? r.data : {};
    } catch (e) { payCache = {}; }
    return payCache;
  };

  function payEsc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function payMk(def) {
    var inner = def.mk.indexOf('ti-') === 0
      ? '<i class="ti ' + def.mk + '" aria-hidden="true"></i>' : payEsc(def.mk);
    return '<span class="kh-pay-mk kh-mk-' + def.id + '">' + inner + '</span>';
  }

  /* ── ফাউন্ডেশনের হিসাবের সারিগুলো (বাটনের আড়ালে থাকে) ───── */
  function payRowsHTML(def, info) {
    var rows = '', list = PAY_ROWS[def.id] || [];
    for (var i = 0; i < list.length; i++) {
      var k = list[i][0], label = list[i][1], mono = list[i][2];
      var v = (info[k] || '').toString().trim();
      if (!v) continue;                              /* ফাঁকা ঘর দেখানো হয় না */
      rows +=
        '<div class="kh-pay-row"><div><small>' + payEsc(label) + '</small>' +
        '<b class="' + (mono ? 'kh-pay-mono' : '') + '">' + payEsc(v) + '</b></div>' +
        '<button type="button" class="kh-pay-copy" data-copy="' + payEsc(v) + '">' +
        '<i class="ti ti-copy" aria-hidden="true"></i>কপি</button></div>';
    }
    return rows;
  }

  /* ── ⚠️⚠️ ডেমো তথ্যের লাল সতর্কবার্তা — আর্থিক কারণে বাধ্যতামূলক।
        ভুয়া নম্বরে কেউ সত্যিই টাকা পাঠিয়ে দিলে তা ফেরানো যাবে না। ── */
  function payDemoHTML(info) {
    return info && info.demo === true
      ? '<div class="kh-pay-demo"><i class="ti ti-alert-triangle" aria-hidden="true"></i>' +
        '<span>এটি <b>ডেমো</b> তথ্য — এই নম্বর/হিসাবে টাকা পাঠাবেন না। ' +
        'আসল তথ্য বসানো হলে এই বার্তাটি চলে যাবে।</span></div>'
      : '';
  }

  /* ── বাংলা QR — **সবসময় খোলা** (ব্যবহারকারীর সিদ্ধান্ত: ২১ সেপ্টে ২০২৬)
        অন্য মাধ্যম বাছা থাকলেও এই ঘরটি লুকানো হয় না, কারণ QR
        স্ক্যান করা সবচেয়ে সহজ পথ।
     ⚠️ ছবি না থাকলে **স্ক্যানযোগ্য নকল QR আঁকা হয় না** — সেটি
        স্ক্যান করে কেউ বিভ্রান্ত হতেন। বদলে স্পষ্ট প্লেসহোল্ডার। ── */
  function payQrHTML(info) {
    info = info || {};
    var img = (info.image || '').trim();
    return '<div class="kh-pay-qrbox' + (info.demo === true ? ' is-demo' : '') + '">' +
      '<div class="kh-pay-qrhead">' +
        '<span class="kh-pay-mk kh-mk-bqr"><i class="ti ti-qrcode" aria-hidden="true"></i></span>' +
        '<div><b>বাংলা কিউআর</b>' +
        '<small>' + payEsc(info.merchant || 'কর্জে হাসানা ফাউন্ডেশন') + '</small></div>' +
      '</div>' +
      payDemoHTML(info) +
      '<div class="kh-pay-qr-wrap">' + (
        img
          ? '<span class="kh-pay-qr" role="img" aria-label="বাংলা কিউআর কোড" ' +
            'style="background-image:url(&quot;' + payEsc(img) + '&quot;)"></span>'
          : '<span class="kh-pay-qr kh-pay-qr--ph" role="img" ' +
            'aria-label="ডেমো কিউআর — আসল কোড এখনো বসানো হয়নি">' +
            '<i class="ti ti-qrcode" aria-hidden="true"></i><em>ডেমো QR</em></span>'
      ) + '</div>' +
      '<p class="kh-pay-qrnote">যেকোনো ব্যাংক বা MFS অ্যাপ খুলে এই কোডটি স্ক্যান করুন।</p>' +
    '</div>';
  }

  /* ── নির্বাচিত মাধ্যমের ৩D কার্ড ─────────────────────────────
     ⚠️ কার্ডটি এখন **গেটওয়েতে যাওয়ার** কার্ড — দাতার কার্ড নম্বর,
        Expiry বা CVV কখনো চাওয়া হয় না। সেগুলো টাইপ হয় গেটওয়ের
        নিজের পাতায় (PCI-DSS — নিজের পাতায় নিলে SAQ-D স্তরে পড়তে হয়,
        যা একটি দাতব্য ফাউন্ডেশনের পক্ষে বহন করা অসম্ভব)।           */
  function payCardHTML(def, info, st) {
    info = info || {}; st = st || {};
    var inkBand = (def.id === 'nagad' || def.id === 'upay') ? ' on-ink' : '';
    var online  = info.online === true && st.gwOn;
    var body;

    if (online) {
      body =
        '<div class="kh-pay-go-wrap">' +
          '<p class="kh-pay-golead">' + payEsc(def.name) +
            '-এর নিজের পাতায় নিয়ে যাওয়া হবে, সেখানেই পরিশোধ সম্পন্ন হবে।</p>' +
          '<button type="button" class="kh-pay-go">' +
            '<i class="ti ti-lock" aria-hidden="true"></i>' +
            '<span class="kh-pay-gotxt">এখনই পরিশোধ করুন</span>' +
            '<b class="kh-pay-goamt"></b>' +
          '</button>' +
          (st.sandbox
            ? '<p class="kh-pay-sbx"><i class="ti ti-flask" aria-hidden="true"></i>' +
              '<span><b>পরীক্ষামূলক (স্যান্ডবক্স)</b> — এখানে আসল টাকা কাটা হয় না। ' +
              'ফাউন্ডেশনের মার্চেন্ট অ্যাকাউন্ট চালু হলে এই বার্তাটি চলে যাবে।</span></p>'
            : '') +
          '<p class="kh-pay-goerr" role="alert"></p>' +
        '</div>';
    } else {
      body =
        '<div class="kh-pay-go-wrap">' +
          '<p class="kh-pay-golead">' + payEsc(def.offline || def.hint) + '</p>' +
        '</div>';
    }

    return '<div class="kh-pay-card kh-pc-' + def.id + '">' +
      '<div class="kh-pay-band' + inkBand + '">' + payMk(def) +
        '<b>' + payEsc(def.name) + '</b>' +
        '<span>' + (online ? 'অনলাইনে পরিশোধ' : 'নিজে পাঠিয়ে দিন') + '</span></div>' +
      (online ? '' : payDemoHTML(info)) +
      body +
    '</div>';
  }

  /* ══ দাতার তথ্যের ধাপ (২৩ সেপ্টেম্বর ২০২৬) ═══════════════════
     ব্যবহারকারীর চাওয়া ছিল "প্রথমে ইনফরমেশন ইনপুট, তারপর প্রসেস দিলে
     এসএসএল-এ যাবে ও তথ্য অটো ফিল হবে"।

     ⚠️⚠️ কার্ডের নম্বর/Expiry/CVV এখানে **নেওয়া হয় না এবং নেওয়া যাবে
        না**। দুটি স্বাধীন কারণ:
        ① SSLCommerz-এর সেশন API-তে কার্ডের কোনো প্যারামিটারই নেই —
          তাদের পাতায় ও তথ্য আগেভাগে বসানোর কোনো পথ নেই (হোস্টেড
          গেটওয়ের পুরো উদ্দেশ্যই সেটি);
        ② নিজের পাতায় কার্ড নিলে PCI-DSS-এর SAQ-D স্তরে পড়তে হয়, আর
          CVV সংরক্ষণ/প্রেরণ অনুমোদনের পরে সর্বাবস্থায় নিষিদ্ধ।
        যা **সত্যিই** অটো-ফিল হয় তা হলো `cus_*` ঘরগুলো — নাম, মোবাইল,
        ই-মেইল ও ঠিকানা। সেগুলোই এখানে নেওয়া হয়।                     */
  var PAY_CUS = [
    ['name',     'নাম',            'আপনার পূর্ণ নাম',        1, 1],
    ['mobile',   'মোবাইল নম্বর',    '01XXXXXXXXX',           1, 0],
    ['email',    'ই-মেইল',         'রশিদ এই ঠিকানায় যাবে',   0, 0],
    ['address',  'ঠিকানা',         'গ্রাম / বাড়ি ও সড়ক',    0, 1],
    ['city',     'শহর বা জেলা',    'যেমন ফরিদপুর',           0, 0],
    ['postcode', 'পোস্ট কোড',      'যেমন ৭৮০০',              0, 0]
  ];

  function payCusHTML(hostId, fields) {
    return '<div class="kh-pay-cus" hidden>' +
      '<div class="kh-pay-cushead">' +
        '<i class="ti ti-user-check" aria-hidden="true"></i>' +
        '<div><b>আপনার তথ্য</b>' +
        '<small>গেটওয়ের পাতায় এই ঘরগুলো আগে থেকেই পূরণ অবস্থায় খুলবে</small></div>' +
      '</div>' +
      '<div class="kh-pay-cusgrid">' +
        fields.map(function (f) {
          var id = hostId + '_cus_' + f[0];
          return '<div class="kh-pay-f' + (f[4] ? ' is-wide' : '') + '" data-cus="' + f[0] + '">' +
            '<label for="' + id + '">' + payEsc(f[1]) +
              (f[3] ? ' <em>*</em>' : '') + '</label>' +
            '<input id="' + id + '" type="text" autocomplete="' + (
              f[0] === 'name' ? 'name' : f[0] === 'mobile' ? 'tel' :
              f[0] === 'email' ? 'email' : f[0] === 'postcode' ? 'postal-code' :
              f[0] === 'city' ? 'address-level2' : 'street-address'
            ) + '" ' +
            (f[0] === 'mobile' ? 'inputmode="numeric" maxlength="11" ' : '') +
            (f[0] === 'postcode' ? 'inputmode="numeric" maxlength="10" ' : '') +
            'placeholder="' + payEsc(f[2]) + '">' +
          '</div>';
        }).join('') +
      '</div>' +
      '<p class="kh-pay-cusbad" role="alert"></p>' +
      '<p class="kh-pay-cusnote"><i class="ti ti-shield-lock" aria-hidden="true"></i>' +
        '<span>কার্ডের নম্বর, মেয়াদ বা CVV <b>কখনো এই পাতায় চাওয়া হয় না</b> — ' +
        'সেগুলো কেবল গেটওয়ের নিজের নিরাপদ পাতায় দেবেন। কেউ এই সাইটে ' +
        'কার্ডের নম্বর চাইলে বুঝবেন সেটি আমাদের পাতা নয়।</span></p>' +
    '</div>';
  }

  /* গেটওয়ের অবস্থা — মাধ্যম ও গেটওয়ে একবারেই আনা হয় */
  var payCfg = null;
  KHUI.payConfig = async function (force) {
    if (payCfg && !force) return payCfg;
    var db = sb();
    if (!db) return (payCfg = { methods: {}, gateway: { enabled: false, manual_enabled: true } });
    /* ⚠️ `rpc()`-এ `.catch()` নেই (প্রকল্পের ৪ নম্বর নিয়ম) */
    try {
      var r = await db.rpc('public_pay_config');
      payCfg = (r && !r.error && r.data) ? r.data
             : { methods: {}, gateway: { enabled: false, manual_enabled: true } };
    } catch (e) {
      payCfg = { methods: {}, gateway: { enabled: false, manual_enabled: true } };
    }
    payCache = payCfg.methods || {};
    return payCfg;
  };

  /* ══ মূল ফাংশন ══════════════════════════════════════════════
     `KHUI.payPicker(host, opts)` → একটি হ্যান্ডেল:
       .value()    → {method, reference}
       .validate() → ম্যানুয়াল পথের যাচাই; ঠিক থাকলে value, নাহলে null
       .pay()      → গেটওয়েতে পাঠায় (অনলাইন মাধ্যম হলে)
       .online()   → নির্বাচিত মাধ্যমে গেটওয়ে চলে কি না
       .reset() · .method() · .onChange(fn)

     opts:
       title, refRequired (ডিফল্ট true), only:[ids]
       purpose  : 'donation' | 'savings' | 'repayment'
       amount   : সংখ্যা অথবা ফাংশন (গেটওয়েতে পাঠানোর আগে ডাকা হয়)
       payload  : অবজেক্ট অথবা ফাংশন — start_payment-এ যাবে
       beforePay: ফাংশন → false দিলে গেটওয়েতে যাওয়া আটকে যায়
                  (যেমন দানের ফর্ম অসম্পূর্ণ থাকলে)
       prefill  : অবজেক্ট/ফাংশন → {name, mobile, email, address, city,
                  postcode} — দাতার তথ্যের ঘরগুলো আগেভাগে ভরে দেয়।
                  লগইন থাকলে এর পরে `get_my_profile`ও ভরে দেয় (খালি
                  ঘরই কেবল, ব্যবহারকারীর লেখা কখনো মোছা হয় না)।
     ══════════════════════════════════════════════════════════ */
  KHUI.payPicker = async function (host, opts) {
    opts = opts || {};
    host = typeof host === 'string' ? document.getElementById(host) : host;
    if (!host) return null;

    var cfg  = await KHUI.payConfig();
    var info = cfg.methods || {};
    var gwc  = cfg.gateway || {};
    var st   = { gwOn: gwc.enabled === true, sandbox: gwc.mode !== 'live' };
    var manualOn = gwc.manual_enabled !== false;

    var defs = PAY_DEF.filter(function (d) {
      if (opts.only && opts.only.indexOf(d.id) < 0) return false;
      return !!info[d.id];
    });

    host.classList.add('kh-pay');
    var head = '<p class="kh-pay-h"><i class="ti ti-wallet" aria-hidden="true"></i>' +
      payEsc(opts.title || 'টাকা কীভাবে দিতে চান?') +
      '<small>' + (st.gwOn ? 'মাধ্যম বাছুন' : 'রেকর্ডের জন্য') + '</small></p>';

    /* ⚠️ কোনো মাধ্যম চালু না থাকলে ফাঁকা পর্দা দেখানো হয় না —
       স্পষ্ট করে বলা হয় কী করতে হবে। */
    if (!defs.length) {
      host.innerHTML = head +
        '<div class="kh-pay-empty"><i class="ti ti-alert-triangle" aria-hidden="true"></i>' +
        '<div>টাকা পাঠানোর কোনো মাধ্যম এখনো চালু করা হয়নি। ' +
        'অনুগ্রহ করে ফাউন্ডেশনের সাথে যোগাযোগ করুন — ' +
        'অথবা অ্যাডমিন হলে <b>জেনারেল সেটিংস → টাকা নেওয়ার মাধ্যম</b> ' +
        'থেকে নম্বর ও হিসাবের তথ্য বসিয়ে দিন।</div></div>';
      return { value: function () { return { method: '', reference: '' }; },
               validate: function () { return null; },
               pay: function () {}, online: function () { return false; },
               reset: function () {}, method: function () { return ''; },
               onChange: function () {}, empty: true };
    }

    var refReq = opts.refRequired !== false;
    var qrInfo = info.bqr;
    var cusDefs = PAY_CUS.filter(function (f) {
      return !opts.cusFields || opts.cusFields.indexOf(f[0]) >= 0;
    });

    host.innerHTML = head +
      '<div class="kh-pay-tiles" role="radiogroup" aria-label="টাকা দেওয়ার মাধ্যম">' +
        defs.map(function (d, i) {
          /* ডেমো মাধ্যমে টাইলের কোণে ছোট লাল বিন্দু — তালিকা দেখেই
             বোঝা যায় কোনগুলোর তথ্য এখনো আসল নয় */
          var im  = info[d.id] || {};
          var dot = im.demo === true && im.online !== true
            ? '<span class="kh-pay-dot" title="ডেমো তথ্য"></span>' : '';
          var bolt = (st.gwOn && im.online === true)
            ? '<i class="ti ti-bolt kh-pay-bolt" title="অনলাইনে সাথে সাথে" aria-hidden="true"></i>' : '';
          return '<div class="kh-pay-tile' + (i === 0 ? ' is-on' : '') + '" role="radio" tabindex="0" ' +
                 'aria-checked="' + (i === 0) + '" data-pm="' + d.id + '">' + dot + bolt +
                 payMk(d) + '<b>' + payEsc(d.name) + '</b></div>';
        }).join('') +
      '</div>' +
      '<div class="kh-pay-stage"></div>' +
      /* দাতার তথ্য — একবারই বসে, অনলাইন মাধ্যম হলে দেখানো হয়।
         ⚠️ `paint()`-এ নতুন করে আঁকা হয় না, কেবল `hidden` বদলায় —
            নাহলে মাধ্যম বদলালেই লেখা তথ্য মুছে যেত।
         ⚠️ `opts.cusFields` দিয়ে কেবল দরকারি ঘরগুলো দেখানো যায় —
            যেমন `donation.html`-এ নাম/মোবাইল/ই-মেইল আগেই পেজের ফর্মে
            আছে, তাই সেখানে ঘরগুলো দুবার দেখানো হয় না। */
      payCusHTML(host.id || 'khpay', cusDefs) +
      /* বাংলা QR — সবক্ষেত্রেই খোলা */
      (qrInfo ? payQrHTML(qrInfo) : '') +
      /* প্রতিষ্ঠানের হিসাব বিবরণী — বাটনের আড়ালে */
      '<details class="kh-pay-acc"><summary>' +
        '<i class="ti ti-receipt-2" aria-hidden="true"></i>' +
        'প্রতিষ্ঠানের হিসাব বিবরণী<em>নিজে পাঠাতে চাইলে</em></summary>' +
        '<div class="kh-pay-accbody"></div>' +
      '</details>' +
      /* ম্যানুয়াল পথ — নিজে পাঠিয়ে TrxID লেখা */
      (manualOn
        ? '<div class="kh-pay-manual"><div class="kh-pay-f">' +
            '<label for="' + host.id + '_ref">রেফারেন্স / TrxID' +
            (refReq ? ' <em>*</em>' : '') + '</label>' +
            '<input id="' + host.id + '_ref" type="text" autocomplete="off" spellcheck="false" ' +
            'inputmode="text" placeholder="যেমন 9F2K7X1A0B">' +
            '<p class="kh-pay-hint"></p>' +
          '</div></div>'
        : '');

    var tiles = host.querySelectorAll('.kh-pay-tile');
    var stage = host.querySelector('.kh-pay-stage');
    var accB  = host.querySelector('.kh-pay-accbody');
    /* ⚠️⚠️ নির্বাচক অবশ্যই `.kh-pay-manual`-এর ভেতরে সীমাবদ্ধ।
       দাতার তথ্যের ঘরগুলোও `.kh-pay-f` ক্লাস ব্যবহার করে এবং DOM-এ
       **আগে** বসে — সীমা না দিলে `host.querySelector('.kh-pay-f input')`
       রেফারেন্সের বদলে **ঠিকানার ঘরটি** ধরে ফেলত। তখন ঠিকানায় লেখা
       বাংলা অক্ষর TrxID-র নিয়মে (`[^A-Za-z0-9-/]`) কেটে গিয়ে ঘরটি
       ফাঁকা হয়ে যেত, আর TrxID-র যাচাইও ভুল ঘরে বসত।
       (লাইভে টাইপ করে ধরা পড়েছে — ২৩ সেপ্টেম্বর ২০২৬।) */
    var fld   = host.querySelector('.kh-pay-manual .kh-pay-f');
    var input = host.querySelector('.kh-pay-manual .kh-pay-f input');
    var label = host.querySelector('.kh-pay-manual .kh-pay-f label');
    var hint  = host.querySelector('.kh-pay-manual .kh-pay-hint');
    var cur   = defs[0];
    var cbs   = [];
    var busy  = false;

    /* ── দাতার তথ্যের ঘরগুলো ─────────────────────────────────── */
    var cusBox = host.querySelector('.kh-pay-cus');
    var cusBad = host.querySelector('.kh-pay-cusbad');
    var cusIn  = {};
    if (cusBox) {
      cusDefs.forEach(function (f) {
        var w = cusBox.querySelector('[data-cus="' + f[0] + '"]');
        var i = w && w.querySelector('input');
        if (!i) return;
        cusIn[f[0]] = i;
        i.addEventListener('input', function () {
          /* ⚠️ মোবাইল ও পোস্ট কোডে **বাংলা অঙ্কও** ইংরেজিতে বদলে দেওয়া হয় —
             অনেকে বাংলা কী-বোর্ডে ৳/০১৭… লেখেন, আর গেটওয়ে বাংলা অঙ্ক নেয় না। */
          if (f[0] === 'mobile' || f[0] === 'postcode') {
            var v = i.value.replace(/[০-৯]/g, function (d) {
              return String('০১২৩৪৫৬৭৮৯'.indexOf(d));
            }).replace(/[^0-9]/g, '').slice(0, f[0] === 'mobile' ? 11 : 10);
            if (v !== i.value) {
              var p = i.selectionStart - (i.value.length - v.length);
              i.value = v;
              try { i.setSelectionRange(p, p); } catch (e) {}
            }
          }
          w.classList.remove('is-bad');
          if (cusBad) cusBad.textContent = '';
        });
      });
    }

    function cusValues() {
      var o = {};
      cusDefs.forEach(function (f) {
        o[f[0]] = cusIn[f[0]] ? cusIn[f[0]].value.trim() : '';
      });
      return o;
    }

    /* ঘর ভরে দেওয়া — খালি ঘরই কেবল ভরা হয়, ব্যবহারকারীর লেখা মোছা হয় না */
    function cusFill(src, force) {
      if (!src) return;
      cusDefs.forEach(function (f) {
        var i = cusIn[f[0]];
        var v = src[f[0]];
        if (!i || v == null || v === '') return;
        if (!force && i.value.trim()) return;
        i.value = String(v).trim();
      });
    }

    /* ⚠️ যাচাই ক্লায়েন্টে **ও** সার্ভারে — এখানকারটি কেবল দাতাকে
       আগেভাগে জানানোর জন্য; আসল সীমা `start_payment`-এ। */
    function cusValidate() {
      if (!cusBox || cusBox.hidden) return cusValues();
      var v = cusValues(), bad = null, msg = '';
      cusDefs.forEach(function (f) {
        var w = cusBox.querySelector('[data-cus="' + f[0] + '"]');
        if (w) w.classList.remove('is-bad');
      });
      /* ⚠️ কেবল **দেখানো** ঘরগুলোই যাচাই হয় — `donation.html`-এ নাম ও
         মোবাইল পেজের নিজের ফর্মে আছে, সেগুলো `donorFormOk()` দেখে। */
      if ('name' in v && v.name.length < 2) { bad = 'name'; msg = 'আপনার নামটি লিখুন।'; }
      else if ('mobile' in v && !/^01[3-9]\d{8}$/.test(v.mobile)) {
        bad = 'mobile'; msg = 'মোবাইল নম্বরটি ১১ সংখ্যার হতে হবে, ০১ দিয়ে শুরু।';
      } else if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) {
        bad = 'email'; msg = 'ই-মেইল ঠিকানাটি ঠিক মনে হচ্ছে না।';
      }
      if (bad) {
        var w2 = cusBox.querySelector('[data-cus="' + bad + '"]');
        if (w2) w2.classList.add('is-bad');
        if (cusBad) cusBad.textContent = msg;
        if (cusIn[bad]) { try { cusIn[bad].focus(); } catch (e) {} }
        try {
          cusBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (e) {}
        return null;
      }
      if (cusBad) cusBad.textContent = '';
      return v;
    }

    /* প্রোফাইল থেকে অটো-ফিল — লগইন থাকলে।
       ⚠️ `rpc()`-এ `.catch()` নেই (প্রকল্পের ৪ নম্বর নিয়ম)। */
    (async function cusPrefill() {
      if (!cusBox) return;
      /* আগে পেজের নিজের তথ্য (যেমন দানের ফর্মে লেখা নাম) */
      try {
        var p = typeof opts.prefill === 'function' ? await opts.prefill() : opts.prefill;
        cusFill(p);
      } catch (e) {}
      var db = sb();
      if (!db) return;
      try {
        var s = await db.auth.getSession();
        if (!s || !s.data || !s.data.session) return;
        var r = await db.rpc('get_my_profile');
        var d = (r && !r.error && r.data) || null;
        if (Array.isArray(d)) d = d[0];
        if (!d) return;
        cusFill({
          name:    d.full_name,
          mobile:  d.mobile,
          email:   d.email,
          address: d.address,
          city:    d.district
        });
      } catch (e) {}
    })();

    /* ⚠️ রেফারেন্সে শুধু অক্ষর-সংখ্যা-হাইফেন — TrxID-তে বাংলা বা
       বিরামচিহ্ন ঢুকলে অ্যাডমিন মিলিয়ে দেখতে পারেন না। */
    if (input) {
      input.addEventListener('input', function () {
        var clean = input.value.replace(/[^A-Za-z0-9\-\/]/g, '').toUpperCase().slice(0, 40);
        if (clean !== input.value) {
          var pos = input.selectionStart - (input.value.length - clean.length);
          input.value = clean;
          try { input.setSelectionRange(pos, pos); } catch (e) {}
        }
        fld.classList.remove('is-bad');
      });
    }

    function wireCopy(scope) {
      /* কপি বাটন — `navigator.clipboard` না থাকলেও যেন ভাঙে না */
      scope.querySelectorAll('.kh-pay-copy').forEach(function (b) {
        b.addEventListener('click', function () {
          var txt = b.dataset.copy || '';
          var done = function () {
            b.classList.add('is-done');
            b.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i>কপি হয়েছে';
            setTimeout(function () {
              b.classList.remove('is-done');
              b.innerHTML = '<i class="ti ti-copy" aria-hidden="true"></i>কপি';
            }, 1600);
          };
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(txt).then(done, function () {});
              return;
            }
          } catch (e) {}
          var t = document.createElement('textarea');
          t.value = txt; t.style.cssText = 'position:fixed;left:-9999px';
          document.body.appendChild(t); t.select();
          try { document.execCommand('copy'); done(); } catch (e) {}
          t.remove();
        });
      });
    }

    function curAmount() {
      var a = typeof opts.amount === 'function' ? opts.amount() : opts.amount;
      a = Number(a);
      return isFinite(a) && a > 0 ? a : 0;
    }

    function paintAmount() {
      var b = stage.querySelector('.kh-pay-goamt');
      if (!b) return;
      var a = curAmount();
      b.textContent = a ? '৳' + KHUI.bn(a.toLocaleString('en-US')) : '';
    }

    /* ── গেটওয়েতে পাঠানো ────────────────────────────────────
       ⚠️ অঙ্ক এখান থেকে **পাঠানো হয় বটে, কিন্তু সার্ভারই চূড়ান্ত করে**
          (`start_payment`) — সঞ্চয়ে লক করা কিস্তি, কিস্তিতে বকেয়া,
          দানে ৳১০–৳৫,০০,০০০ সীমা। ব্রাউজার কিছু বাড়াতে-কমাতে পারে না। */
    async function pay() {
      if (busy) return;
      var err = stage.querySelector('.kh-pay-goerr');
      var btn = stage.querySelector('.kh-pay-go');
      var say = function (m) { if (err) err.textContent = m || ''; };
      say('');

      if (typeof opts.beforePay === 'function') {
        var ok = false;
        try { ok = await opts.beforePay(cur.id); } catch (e) { ok = false; }
        if (ok === false) return;
      }

      /* ⚠️ দাতার তথ্য আগে যাচাই — ভুল নম্বর নিয়ে গেটওয়েতে পাঠালে
         দাতা ওখানে গিয়ে আটকে যেতেন, আর লেনদেনের সেশনটিও নষ্ট হত। */
      var cus = cusValidate();
      if (cus === null) return;

      var db = sb();
      if (!db) { say('সংযোগ পাওয়া যাচ্ছে না — পেজটি রিফ্রেশ করুন।'); return; }

      busy = true;
      if (btn) {
        btn.classList.add('is-busy');
        btn.querySelector('.kh-pay-gotxt').textContent = 'গেটওয়েতে নিয়ে যাচ্ছি…';
      }

      /* ⚠️ কাচের পর্দাটি এখানেই ওঠে — এটিই ঐ নকশার "Processing"
         অবস্থা। গেটওয়েতে পৌঁছানো পর্যন্ত দর্শক এটিই দেখেন।
         ⚠️⚠️ নাম অবশ্যই `cpStage` — `stage` নয়। উপরে (৩৯৩৭ লাইনে)
         `var stage = host.querySelector('.kh-pay-stage')` আছে, অর্থাৎ
         পিকারের নিজের ঘর। এখানে `var stage` লিখলে **হয়েস্টিংয়ের কারণে**
         এই ফাংশনের একদম প্রথম লাইনেই (`stage.querySelector(...)`)
         `undefined.querySelector` হয়ে ক্র্যাশ করত — পরিশোধের বাটনে
         চাপলে কিছুই হত না, কাচের পর্দাও উঠত না। */
      var cpStage = null;
      try {
        cpStage = KHUI.payStage({
          state: 'busy',
          purposeLabel: PURPOSE_LABEL[opts.purpose || 'donation'] || '',
          amount: curAmount(),
          method: cur.id,
          /* কার্ডের গায়ে দাতার নিজের লেখা নামটিই বসে */
          name: cus.name ||
                (typeof opts.payerName === 'function' ? opts.payerName() : opts.payerName) || '',
          sandbox: st.sandbox
        });
      } catch (e) {}

      var unbusy = function () {
        busy = false;
        if (cpStage) { try { cpStage.close(); } catch (e) {} }
        if (btn) {
          btn.classList.remove('is-busy');
          btn.querySelector('.kh-pay-gotxt').textContent = 'এখনই পরিশোধ করুন';
        }
      };

      try {
        var pl = typeof opts.payload === 'function' ? opts.payload() : opts.payload;
        /* ⚠️ দাতার ঘরগুলো **পরে** বসানো হয় — পেজের পুরনো payload-এ
           একই নামের ঘর থাকলে (যেমন দানের ফর্মের নাম) দাতার এই ধাপে
           লেখা মানটিই শেষ কথা, কারণ এটিই গেটওয়েতে দেখা যাবে।
           ⚠️⚠️ কার্ড-সংক্রান্ত কোনো ঘর এখানে নেই এবং যোগ করা যাবে না —
           সার্ভারও (`start_payment`) কেবল সাদা-তালিকার ঘরগুলোই রাখে। */
        var keep = {};
        Object.keys(cus || {}).forEach(function (k) {
          if (cus[k] !== '' && cus[k] != null) keep[k] = cus[k];
        });
        pl = Object.assign({}, pl || {}, keep);
        var r = await db.rpc('start_payment', {
          p_purpose: opts.purpose || 'donation',
          p_method:  cur.id,
          p_amount:  curAmount() || null,
          p_payload: pl || {}
        });
        if (r.error) throw new Error(r.error.message || 'সেশন তৈরি হয়নি');
        var tran = r.data && r.data.tran_id;
        if (!tran) throw new Error('লেনদেনের পরিচয় পাওয়া যায়নি');

        /* ফেরার পেজ যেন জানে কোন লেনদেন — গেটওয়ে থেকে ফিরতে সময় লাগে */
        try { localStorage.setItem('kh_pay_tran', tran); } catch (e) {}
        /* লেনদেন নম্বরটি কার্ডের গায়ে বসে (কার্ড নম্বরের জায়গায়) */
        if (cpStage) { try { cpStage.set({ state: 'busy', tran: tran }); } catch (e) {} }

        var f = await db.functions.invoke('pay-start', { body: { tran_id: tran } });
        var out = f.data || {};
        /* ⚠️ supabase-js নন-2xx উত্তরে `data` null করে দেয় — তাই ফাংশনের
           নিজের বাংলা বার্তাটি হারিয়ে যেত। `error.context` হলো আসল
           Response, ওখান থেকে বার্তাটি তুলে আনা হয়। */
        if (f.error) {
          var m = '';
          try {
            if (f.error.context && typeof f.error.context.json === 'function') {
              var j = await f.error.context.json();
              m = (j && j.error) || '';
            }
          } catch (e2) {}
          throw new Error(m || 'গেটওয়েতে পৌঁছানো যাচ্ছে না');
        }
        if (!out.ok || !out.url) throw new Error(out.error || 'গেটওয়ে সেশন তৈরি হয়নি');

        location.href = out.url;       /* এখানেই পেজ ছেড়ে যাওয়া */
      } catch (e) {
        say(String((e && e.message) || e) || 'কিছু একটা ভুল হয়েছে');
        unbusy();
      }
    }

    function paint() {
      stage.innerHTML = payCardHTML(cur, info[cur.id] || {}, st);
      paintAmount();
      wireCopy(stage);
      var go = stage.querySelector('.kh-pay-go');
      if (go) go.addEventListener('click', pay);

      /* দাতার তথ্যের ঘর কেবল অনলাইন মাধ্যমেই দরকার — ম্যানুয়াল পথে
         (নিজে পাঠিয়ে TrxID লেখা) গেটওয়েতে কিছু যায় না, তাই লুকানো। */
      if (cusBox) {
        cusBox.hidden = !cusDefs.length ||
                        !(st.gwOn && (info[cur.id] || {}).online === true);
        if (cusBox.hidden && cusBad) cusBad.textContent = '';
      }

      /* হিসাব বিবরণীতে নির্বাচিত মাধ্যমের সারিগুলো */
      var rows = payRowsHTML(cur, info[cur.id] || {});
      accB.innerHTML = rows
        ? payDemoHTML(info[cur.id]) + rows +
          '<p class="kh-pay-accnote">' + payEsc((info[cur.id] || {}).note || cur.hint) + '</p>'
        : '<p class="kh-pay-accnote">এই মাধ্যমে আলাদা কোনো হিসাব নম্বর নেই — ' +
          'উপরের অনলাইন পরিশোধ অথবা বাংলা QR ব্যবহার করুন।</p>';
      wireCopy(accB);

      if (label) label.innerHTML = payEsc(cur.ref) + (refReq ? ' <em>*</em>' : '');
      if (hint)  hint.textContent = cur.hint;
      if (input) {
        input.placeholder = cur.grp === 'mfs' ? 'যেমন 9F2K7X1A0B'
                          : cur.id === 'bank' ? 'স্লিপের রেফারেন্স'
                          : 'রশিদ / অনুমোদন নম্বর';
      }
      cbs.forEach(function (fn) { try { fn(cur.id); } catch (e) {} });
    }

    function pick(id) {
      var d = defs.filter(function (x) { return x.id === id; })[0];
      if (!d || d.id === cur.id) return;
      cur = d;
      tiles.forEach(function (t) {
        var on = t.dataset.pm === id;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-checked', on);
      });
      paint();
    }
    tiles.forEach(function (t) {
      t.addEventListener('click', function () { pick(t.dataset.pm); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(t.dataset.pm); }
      });
    });
    paint();

    return {
      empty: false,
      value:  function () { return { method: cur.id, reference: input ? input.value.trim() : '' }; },
      method: function () { return cur.id; },
      online: function () { return st.gwOn && (info[cur.id] || {}).online === true; },
      pay:    pay,
      refresh: paintAmount,
      /* দাতার তথ্য — পেজ চাইলে পড়তে বা ভরে দিতে পারে */
      customer: cusValues,
      fillCustomer: function (o) { cusFill(o, true); },
      reset:  function () { if (input) { input.value = ''; fld.classList.remove('is-bad'); } },
      onChange: function (fn) { if (typeof fn === 'function') cbs.push(fn); },
      validate: function () {
        var v = input ? input.value.trim() : '';
        if (refReq && !v) {
          if (fld) fld.classList.add('is-bad');
          if (hint) hint.textContent = cur.ref +
            'টি লিখুন — এটি ছাড়া অ্যাডমিন মিলিয়ে দেখতে পারবেন না। ' +
            'অথবা উপরের “এখনই পরিশোধ করুন” দিয়ে অনলাইনে দিন।';
          if (input) input.focus();
          return null;
        }
        return { method: cur.id, reference: v };
      }
    };
  };

  /* ══════════════════════════════════════════════════════════
     💳 কাচের পেমেন্ট পর্দা — `KHUI.payStage()` (২২ সেপ্টেম্বর ২০২৬)

     ব্যবহারকারীর প্রশ্ন: *"এত কস্ট করে যে কার্ড পেমেন্ট এর স্ক্রীন
     তৈরী করা হলো সেটা কোথায়?"* — কার্ডের ঘরগুলো সরানোর সময় পুরো
     পর্দাটার নতুন ঠিকানা দেওয়া হয়নি, তাই সেটি কার্যত হারিয়ে
     গিয়েছিল। এখন গেটওয়ের প্রবাহে তার **দুটি অবস্থা** ফিরে এসেছে:

       `busy` — "এখনই পরিশোধ করুন" চাপার পর, গেটওয়েতে যাওয়া পর্যন্ত
       `done` / `bad` — ফেরার পেজে (`payment-return.html`)

     ⚠️ ফর্ম-অবস্থাটি (কার্ড নম্বর) **ফেরানো যাবে না** — নিজের পাতায়
        কার্ড নম্বর নিলে PCI-DSS-এর SAQ-D স্তরে পড়তে হয়।
     ⚠️ কার্ডের গায়ে তাই লেনদেন নম্বর বসে (কার্ড নম্বরের জায়গায়),
        নাম ও তারিখ আগের ঘরেই — নকশা হুবহু অটুট (ব্যবহারকারীর পছন্দ)।

     ব্যবহার:
       var st = KHUI.payStage({ state:'busy', amount, tran, name, method });
       st.set({ state:'done', title, note, actions:[{text,href,main}] });
       st.close();
     ══════════════════════════════════════════════════════════ */
  var CP_ICON = {
    logo:  'ti-heart-handshake',
    wave:  'ti-wifi'
  };

  function cpGroup(s) {
    /* লেনদেন নম্বরটিকে কার্ড নম্বরের মতো ৪-৪-৪-৪ করে সাজানো */
    return String(s || '').replace(/(.{4})/g, '$1 ').trim();
  }
  function cpToday() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return KHUI.bn(p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + String(d.getFullYear()).slice(2));
  }
  function cpMoney(a) {
    var n = Number(a);
    return isFinite(n) && n > 0 ? '৳' + KHUI.bn(n.toLocaleString('en-US')) : '';
  }
  function cpMethodName(id) {
    var m = (KHUI.PAY_METHODS || []).filter(function (x) { return x.id === id; })[0];
    return m ? m.name : '';
  }

  KHUI.payStage = function (opts) {
    opts = opts || {};
    var host = document.createElement('div');
    host.className = 'kh-cp';
    host.setAttribute('role', 'dialog');
    host.setAttribute('aria-modal', 'true');
    host.setAttribute('aria-live', 'polite');

    host.innerHTML =
      '<div class="kh-cp-silk" aria-hidden="true"></div>' +
      '<div class="kh-cp-veil" aria-hidden="true"></div>' +
      '<div class="kh-cp-glow" aria-hidden="true"></div>' +
      '<div class="kh-cp-wrap">' +
        '<span class="kh-cp-br kh-cp-br--tl" aria-hidden="true"></span>' +
        '<span class="kh-cp-br kh-cp-br--br" aria-hidden="true"></span>' +
        '<div class="kh-cp-pane">' +
          '<div class="kh-cp-head">' +
            '<span class="kh-cp-logo"><i class="ti ' + CP_ICON.logo + '" aria-hidden="true"></i></span>' +
            '<span class="kh-cp-brand">কর্জে হাসানা ফাউন্ডেশন' +
              '<span class="kh-cp-sub"></span></span>' +
          '</div>' +
          '<div class="kh-cp-rule" aria-hidden="true"></div>' +
          '<div class="kh-cp-stage">' +
            '<div class="kh-cp-card3d"><div class="kh-cp-face">' +
              '<div class="kh-cp-crow">' +
                '<span class="kh-cp-chip" aria-hidden="true">' +
                  '<span class="kh-cp-chipbar"></span><span class="kh-cp-chipbar"></span></span>' +
                '<i class="ti ' + CP_ICON.wave + ' kh-cp-wave" aria-hidden="true"></i>' +
                '<span class="kh-cp-tier">PLATINUM</span>' +
              '</div>' +
              '<div class="kh-cp-pan"></div>' +
              '<div class="kh-cp-foot">' +
                '<span><small class="kh-cp-namelab">নাম</small><b class="kh-cp-name">—</b></span>' +
                '<span><small>তারিখ</small><b class="kh-cp-date">—</b></span>' +
                '<span class="kh-cp-mk"></span>' +
              '</div>' +
            '</div></div>' +
            '<div class="kh-cp-result">' +
              '<svg class="kh-cp-spin" viewBox="0 0 44 44" aria-hidden="true">' +
                '<circle class="trk" cx="22" cy="22" r="19"/><circle class="arc" cx="22" cy="22" r="19"/></svg>' +
              '<svg class="kh-cp-tick" viewBox="0 0 48 48" aria-hidden="true" style="display:none">' +
                '<circle cx="24" cy="24" r="20"/><path d="M15 24.5 21.5 31 33 19"/></svg>' +
              '<h3 class="kh-cp-title"></h3>' +
              '<p class="kh-cp-note"></p>' +
              '<p class="kh-cp-sbx" style="display:none">' +
                '<i class="ti ti-flask" aria-hidden="true"></i><span></span></p>' +
              '<div class="kh-cp-acts"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(host);
    /* ব্যাকগ্রাউন্ড স্ক্রল বন্ধ — পর্দাটি পুরো পাতা ঢেকে রাখে */
    var oldOv = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { host.classList.add('is-in'); });

    var $ = function (s) { return host.querySelector(s); };

    function set(o) {
      o = o || {};
      var st = o.state || 'busy';
      host.classList.toggle('is-busy', st === 'busy');
      host.classList.toggle('is-done', st === 'done');
      host.classList.toggle('is-bad',  st === 'bad');

      if (o.purposeLabel !== undefined) $('.kh-cp-sub').textContent = o.purposeLabel || '';
      if (o.tran !== undefined)  $('.kh-cp-pan').textContent  = cpGroup(o.tran) || '•••• •••• ••••';
      if (o.nameLabel !== undefined) $('.kh-cp-namelab').textContent = o.nameLabel || 'নাম';
      if (o.name !== undefined)  $('.kh-cp-name').textContent = (o.name || '').trim() || '—';
      if (o.date !== undefined || o.tran !== undefined) $('.kh-cp-date').textContent = o.date || cpToday();
      if (o.method !== undefined) $('.kh-cp-mk').textContent = cpMethodName(o.method) || '';

      /* ⚠️ সব লেখা `textContent`-এ — নাম বা বার্তা কখনো innerHTML-এ নয় */
      $('.kh-cp-title').textContent = o.title || (st === 'busy' ? '' : '');
      $('.kh-cp-title').style.display = o.title ? '' : 'none';

      var note = $('.kh-cp-note');
      note.textContent = o.note || '';
      note.style.display = o.note ? '' : 'none';

      $('.kh-cp-spin').style.display = st === 'busy' ? '' : 'none';
      var tick = $('.kh-cp-tick');
      tick.style.display = st === 'done' || st === 'bad' ? '' : 'none';
      tick.classList.toggle('is-bad', st === 'bad');

      var sbx = $('.kh-cp-sbx');
      if (o.sandbox !== undefined) {
        sbx.style.display = o.sandbox ? '' : 'none';
        sbx.querySelector('span').textContent =
          'এটি একটি পরীক্ষামূলক (স্যান্ডবক্স) লেনদেন — আসল কোনো টাকা কাটা হয়নি।';
      }

      if (o.actions) {
        $('.kh-cp-acts').innerHTML = o.actions.map(function (a) {
          return '<a class="' + (a.main ? 'is-main' : '') + '" href="' + payEsc(a.href || '#') + '">' +
                 (a.icon ? '<i class="ti ' + payEsc(a.icon) + '" aria-hidden="true"></i>' : '') +
                 payEsc(a.text || '') + '</a>';
        }).join('');
      }
      return api;
    }

    function close() {
      host.classList.remove('is-in');
      document.body.style.overflow = oldOv;
      setTimeout(function () { if (host.parentNode) host.remove(); }, 300);
    }

    var api = { el: host, set: set, close: close };

    /* প্রথম অবস্থা */
    set({
      state: opts.state || 'busy',
      purposeLabel: opts.purposeLabel || '',
      tran: opts.tran || '',
      nameLabel: opts.nameLabel || 'নাম',
      name: opts.name || '',
      method: opts.method || '',
      sandbox: !!opts.sandbox,
      title: opts.title || '',
      note: opts.note || (opts.state === 'busy' || !opts.state
        ? (cpMoney(opts.amount) ? cpMoney(opts.amount) + ' — নিরাপদ পেমেন্ট পাতায় নিয়ে যাওয়া হচ্ছে…'
                                : 'নিরাপদ পেমেন্ট পাতায় নিয়ে যাওয়া হচ্ছে…')
        : ''),
      actions: opts.actions || []
    });
    return api;
  };

  /* ══════════════════════════════════════════════════════════
     ✉️ ফুটারের সাবস্ক্রিপশন — কাগজের উড়োজাহাজ (`plume`)

     ফুটারের পুরনো `.ft-nl` ঘরটিকেই বদলে দেয়, তাই কোনো HTML-এ
     হাত দিতে হয় না। বাদ দিতে `<body data-kh-sub="off">`।

     ⚠️ জ্যামিতিটি ভিডিও থেকে হুবহু নেওয়া — `HALF[]`-এ `a` হলো
        উল্লম্ব ভাঁজরেখা থেকে দূরত্ব (০ = রেখা, ১ = বাইরের কিনারা,
        মাপ W/2), `b` হলো উপর-নিচ (+.5 উপরে)। তাই `r` = বাটনের
        অর্ধেক আয়তক্ষেত্র, `t` = নিচে খাঁজসহ অন্তর্লিখিত ত্রিভুজ।
     ══════════════════════════════════════════════════════════ */
  var PLUME_HALF = [
    { r: [0,  .5], t: [0,     .5 ] },   /* A — চূড়া */
    { r: [1,  .5], t: [1,    -.5 ] },   /* Q — বাইরের নিচের কোণ */
    { r: [1, -.5], t: [ .242, -.5] },   /* P — খাঁজের বাইরের দিক */
    { r: [0, -.5], t: [ .048, -.44] }   /* D — খাঁজের ভিতরের দিক */
  ];
  var PLUME_TRI = [[0, 1, 2], [0, 2, 3]];
  var PL_D = Math.PI / 180;
  var PL_DIH = 72 * PL_D, PL_AX = 50 * PL_D, PL_AY = 30 * PL_D, PL_AZ = 62 * PL_D;
  var PL_CAM = 300;

  KHUI.mountSubscribe = function () {
    if (document.body.dataset.khSub === 'off') return;
    var host = document.getElementById('khSubscribe') || document.querySelector('.ft-nl');
    if (!host || host.dataset.khPlume) return;

    /* পুরনো ঘরের placeholder থাকলে সেটিই রাখা হয় */
    var old = host.querySelector('input');
    var ph  = (old && old.getAttribute('placeholder')) || 'your@email.com';
    host.dataset.khPlume = '1';
    /* ⚠️ `ft-nl` ক্লাসটি সরাতেই হবে — `index.html`-এর ইনলাইন
       `<style>`-এ `.ft-nl input` (০,১,১) ও `.ft-nl button` আছে, যা
       `.plume__input` (০,১,০)-কে হারিয়ে দেয় এবং পুরনো সোনালি
       বাটন-চেহারাই ফিরিয়ে আনে। ক্লাস সরালে ঐ নিয়মগুলো আর মেলে না। */
    host.classList.remove('ft-nl');
    host.classList.add('plume', 'plume--gold');
    host.innerHTML =
      /* ⚠️ `data-kh-skip="1"` — নাহলে `enhanceEmails()` এখানে প্রিমিয়াম
         ই-মেইল UI বসায়: টিক চিহ্নটি `position:absolute` হয়ে `.plume`-এর
         ডান কিনারায় গিয়ে Subscribe বাটনের উপর পড়ে, আর ডোমেইন-চিপগুলো
         পিলের ভেতর আঁটে না। লাইভে পরীক্ষা করে ধরা পড়েছে (`.ft-nl`-এ
         `kh-email-host` ক্লাস বসে গিয়েছিল)। */
      '<input class="plume__input" type="email" data-kh-skip="1" autocomplete="email" spellcheck="false" placeholder="' +
        String(ph).replace(/"/g, '&quot;') + '" aria-label="ই-মেইল ঠিকানা">' +
      '<span class="plume__seat">' +
        '<button class="plume__btn" type="button">' +
          '<span class="plume__face"></span>' +
          '<span class="plume__words"><span>Subscribe</span><span>আবার দিন</span></span>' +
        '</button>' +
        '<svg class="plume__plane" viewBox="0 0 1 1" aria-hidden="true">' +
          '<polygon class="plume__facet"/><polygon class="plume__facet"/>' +
          '<polygon class="plume__facet"/><polygon class="plume__facet"/></svg>' +
      '</span>' +
      '<svg class="plume__trail" viewBox="0 0 1 1" aria-hidden="true"></svg>' +
      '<span class="plume__done"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/>' +
        '</svg>হয়ে গেছে</span>';

    /* নোটের ঘরটি pill-এর বাইরে, ঠিক নিচে */
    var note = document.createElement('p');
    note.className = 'plume__note';
    note.setAttribute('aria-live', 'polite');
    if (host.parentNode) host.parentNode.insertBefore(note, host.nextSibling);

    var input  = host.querySelector('.plume__input');
    var btn    = host.querySelector('.plume__btn');
    var plane  = host.querySelector('.plume__plane');
    var trail  = host.querySelector('.plume__trail');
    var facets = plane.querySelectorAll('.plume__facet');
    var seat   = host.querySelector('.plume__seat');

    var cs   = getComputedStyle(host);
    var LIT  = (cs.getPropertyValue('--paper-lit')  || '#f7b23f').trim();
    var DARK = (cs.getPropertyValue('--paper-dark') || '#a25c10').trim();

    function lerp(a, b, t) { return a + (b - a) * t; }
    function rot3(p, ax, ay, az) {
      var x = p.x, y = p.y, z = p.z, c, s, t;
      c = Math.cos(ax); s = Math.sin(ax); t = y * c - z * s; z = y * s + z * c; y = t;
      c = Math.cos(ay); s = Math.sin(ay); t = x * c + z * s; z = -x * s + z * c; x = t;
      c = Math.cos(az); s = Math.sin(az); t = x * c - y * s; y = x * s + y * c; x = t;
      return { x: x, y: y, z: z };
    }
    function project(p) { var s = PL_CAM / (PL_CAM - p.z); return { x: p.x * s, y: p.y * s }; }
    function shade(p0, p1, p2) {
      var ux = p1.x - p0.x, uy = p1.y - p0.y, uz = p1.z - p0.z;
      var vx = p2.x - p0.x, vy = p2.y - p0.y, vz = p2.z - p0.z;
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      var len = Math.hypot(nx, ny, nz) || 1;
      return Math.abs((nx * -0.32 + ny * -0.46 + nz * 0.83) / len);
    }
    function hex(c) { return [parseInt(c.substr(1,2),16), parseInt(c.substr(3,2),16), parseInt(c.substr(5,2),16)]; }
    function mix(c1, c2, t) {
      var A = hex(c1), B = hex(c2);
      return 'rgb(' + Math.round(lerp(A[0],B[0],t)) + ',' + Math.round(lerp(A[1],B[1],t)) + ',' + Math.round(lerp(A[2],B[2],t)) + ')';
    }

    function paint(k, dih, ax, ay, az) {
      var box = seat.getBoundingClientRect(), W = box.width, H = box.height;
      var cos = Math.cos(dih), sin = Math.sin(dih), quads = [];
      for (var s = 0; s < 2; s++) {
        var sign = s ? -1 : 1, row = [];
        for (var i = 0; i < PLUME_HALF.length; i++) {
          var v = PLUME_HALF[i];
          var a = lerp(v.r[0], v.t[0], k) * sign;
          var b = lerp(v.r[1], v.t[1], k);
          var xf = a * (W / 2);
          row.push({ x: xf * cos, y: -b * H, z: Math.abs(xf) * sin });
        }
        for (var t = 0; t < 2; t++) {
          var idx = PLUME_TRI[t];
          var vv = [row[idx[0]], row[idx[1]], row[idx[2]]].map(function (p) { return rot3(p, ax, ay, az); });
          quads.push({ v: vv, depth: (vv[0].z + vv[1].z + vv[2].z) / 3 });
        }
      }
      /* ⚠️ পেছনেরটা আগে আঁকা — নাহলে ঘোরার সময় ভুল মুখ উপরে পড়ে */
      quads.sort(function (m, n) { return m.depth - n.depth; });
      for (var q = 0; q < quads.length; q++) {
        var a2 = project(quads[q].v[0]), b2 = project(quads[q].v[1]), c2 = project(quads[q].v[2]);
        facets[q].setAttribute('points',
          a2.x.toFixed(2)+','+a2.y.toFixed(2)+' '+b2.x.toFixed(2)+','+b2.y.toFixed(2)+' '+c2.x.toFixed(2)+','+c2.y.toFixed(2));
        facets[q].setAttribute('fill',
          mix(DARK, LIT, Math.min(1, shade(quads[q].v[0], quads[q].v[1], quads[q].v[2]) * 1.18)));
      }
    }

    function eOut(t) { return 1 - Math.pow(1 - t, 3); }
    function eInOut(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
    function eIn(t) { return t * t * t; }

    var VALID = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    var busy = false;

    function arm() { if (!busy) host.classList.toggle('is-armed', VALID.test(input.value.trim())); }
    input.addEventListener('input', function () { host.classList.remove('is-retry', 'is-done'); note.textContent = ''; note.classList.remove('kh-bad'); arm(); });
    input.addEventListener('focus', function () { host.classList.add('is-live'); });
    input.addEventListener('blur',  function () { if (!busy && !input.value) host.classList.remove('is-live'); });

    function run() {
      if (busy) return;
      var value = input.value.trim();
      if (!VALID.test(value)) {
        host.classList.add('is-live', 'is-retry');
        note.textContent = 'ঠিকানাটি একবার দেখে নিন।';
        note.classList.add('kh-bad');
        input.focus(); return;
      }
      busy = true;
      host.classList.add('is-live', 'is-folding');
      host.classList.remove('is-done', 'is-retry');
      note.textContent = ''; note.classList.remove('kh-bad');
      input.disabled = true; btn.disabled = true;

      var FOLD = 280, TURN = 240, HOLD = 380, FLY = 280;
      var T1 = FOLD, T2 = T1 + TURN, T3 = T2 + HOLD, T4 = T3 + FLY;
      var t0 = performance.now();

      trail.innerHTML = '';
      var dashes = [];
      for (var i = 0; i < 4; i++) {
        var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        trail.appendChild(ln); dashes.push(ln);
      }
      function pose(px, py, sc) {
        plane.style.setProperty('--px', px.toFixed(2) + 'px');
        plane.style.setProperty('--py', py.toFixed(2) + 'px');
        plane.style.setProperty('--sc', sc.toFixed(3));
      }
      function frame(now) {
        var el = now - t0;
        if (el < T1) { var p = el / T1; paint(eOut(p), PL_DIH * eInOut(p), 0, 0, 0); pose(0, 0, 1); return requestAnimationFrame(frame); }
        if (el < T2) { var q = eInOut((el - T1) / TURN); paint(1, PL_DIH, PL_AX*q, PL_AY*q, PL_AZ*q); pose(0, 0, 1 - .10*q); return requestAnimationFrame(frame); }
        if (el < T3) { var h = (el - T2) / HOLD; paint(1, PL_DIH, PL_AX, PL_AY, PL_AZ + Math.sin(h*Math.PI*2)*.045);
                       pose(Math.sin(h*Math.PI*2)*1.8, -Math.sin(h*Math.PI*3)*1.4, .90); return requestAnimationFrame(frame); }
        if (el < T4) {
          host.classList.add('is-flying');
          var f = (el - T3) / FLY, e = eIn(f);
          paint(1, PL_DIH, PL_AX, PL_AY, PL_AZ - .07 * e);
          pose(190 * e, -130 * e, .90 - .42 * e);
          plane.style.opacity = f > .70 ? String(Math.max(0, 1 - (f - .70) / .30)) : '1';
          for (var j = 0; j < dashes.length; j++) {
            var back = (j + 1) * 0.10;
            var s1 = Math.max(0, e - back), s2 = Math.max(0, e - back - 0.055);
            dashes[j].setAttribute('x1', (190*s1).toFixed(1)); dashes[j].setAttribute('y1', (-130*s1).toFixed(1));
            dashes[j].setAttribute('x2', (190*s2).toFixed(1)); dashes[j].setAttribute('y2', (-130*s2).toFixed(1));
            dashes[j].style.opacity = String(Math.max(0, .5 - j * .1) * (1 - f));
          }
          return requestAnimationFrame(frame);
        }
        plane.style.opacity = '';
        host.classList.remove('is-folding', 'is-flying', 'is-armed');
        trail.innerHTML = '';
        host.classList.add('is-done');
        note.textContent = 'ধন্যবাদ! নতুন খবর ' + value + ' ঠিকানায় যাবে।';
        input.disabled = false;
        setTimeout(function () { busy = false; btn.disabled = false; }, 200);
      }
      requestAnimationFrame(frame);
    }

    btn.addEventListener('click', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
    paint(0, 0, 0, 0, 0);
    window.addEventListener('resize', function () { if (!busy) paint(0, 0, 0, 0, 0); });
  };

  function boot() {
    if (document.body.dataset.khNav !== 'off') {
      KHUI.mountNav({ scrollReveal: document.body.dataset.khNav === 'scroll' });
      if (document.body.dataset.khChat !== 'off') KHUI.mountChat();
    }
    /* 🤖 হাসানা সহায়িকা — নেভবার থাকুক বা না থাকুক, নিজের পতাকাতেই চলে */
    KHUI.mountAssistant();
    if (document.body.dataset.khGlow !== 'off') KHUI.mountGlow();
    if (document.body.dataset.khUser !== 'off') KHUI.mountUserChip();
    KHUI.enhancePasswords(document);
    /* ✉️ ফুটারের সাবস্ক্রিপশন — `.ft-nl` বা `#khSubscribe` ঘর থাকলেই বসে।
       ⚠️ `enhanceEmails()`-এর **আগে** চলতে হবে: পুরনো `.ft-nl`-এর ঘরটি
       আগে প্রিমিয়াম ই-মেইল UI পেয়ে যেত, আর `innerHTML` বদলালে সেই
       মোড়ক ছিঁড়ে গিয়ে `kh-email-host` ক্লাসটি পড়ে থাকত। */
    try { KHUI.mountSubscribe(); } catch (e) {}
    KHUI.enhanceEmails(document);
    KHUI.makeTablesScrollable(document);
    KHUI._watchTables();
    /* অ্যাডমিন প্যানেলে দরকার নেই — পেজে data-kh-visits="off" দিলে বাদ যাবে */
    if (document.body.dataset.khVisits !== 'off') KHUI.mountVisitorCounter();
    /* লাইভ ড্যাশবোর্ড — পেজে `#khStats` ঘর থাকলেই বসে */
    if (document.body.dataset.khStats !== 'off' && document.getElementById('khStats')) {
      KHUI.mountPublicStats();
    }
    /* সেকশন-ব্রেকের রেখা — ⚠️ ছবি/ফন্ট বসার পর মাপ নিতে হয়,
       নাহলে উচ্চতা কম দেখে সেকশনগুলো বাদ পড়ে যায়।
       ⚠️ **দুবার** চালানো হয়: `#khStats`-এর মত ঘর RPC-র উত্তর
       আসার পর ভরে, প্রথম পাসে তার উচ্চতা ০ থাকে বলে বাদ পড়ত
       (রিভিউয়ে ধরা পড়ে)। দ্বিতীয় পাস নিরাপদ — আগের রেখা দেখলে
       গণনা রিসেট হয়, তাই একই জায়গায় দুবার বসে না। */
    (function () {
      var run = function () { try { KHUI.mountSectionBreaks(); } catch (e) {} };
      var go = function () { setTimeout(run, 60); setTimeout(run, 1500); };
      if (document.readyState === 'complete') go();
      else window.addEventListener('load', go);
    })();
    /* স্বাক্ষরের স্মরণিকা — লগইন বসতে একটু সময় দিয়ে */
    if (document.body.dataset.khSig !== 'off') {
      setTimeout(function () { KHUI.mountSignatureReminder(); }, 1400);
    }
    KHUI.startPresence();

    /* পেজে data-kh-requires থাকলে অতিথিকে সাইন আপে পাঠানো */
    var need = document.body.dataset.khRequires;
    if (need) setTimeout(function () { KHUI.requireAccount(need); }, 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.KHUI = KHUI;
})();
