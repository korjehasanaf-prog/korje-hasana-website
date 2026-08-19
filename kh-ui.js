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
  };

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

    var rowsHtml = (cfg.rows || []).map(function (r) {
      return '<div class="kh-vch-cell"><div class="kh-vch-lbl">' + vEsc(r[0]) + '</div>' +
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

        '<div class="kh-vch-acts">' +
          '<button type="button" class="kh-vch-btn kh-vch-print"><i class="ti ti-printer"></i> প্রিন্ট / PDF</button>' +
          (cfg.email ? '<button type="button" class="kh-vch-btn kh-vch-mail"><i class="ti ti-mail"></i> ই-মেইলে পাঠান</button>' : '') +
          '<button type="button" class="kh-vch-btn kh-vch-alt kh-vch-close"><i class="ti ti-x"></i> বন্ধ করুন</button>' +
        '</div>' +
        '<div class="kh-vch-mailmsg" style="display:none"></div>' +
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

    /* ই-মেইলে পাঠানো */
    var mailBtn = back.querySelector('.kh-vch-mail');
    if (mailBtn) {
      /* লেনদেন সফল হলেই নিজে থেকে পাঠানো (autoEmail:false দিলে বন্ধ) */
      if (cfg.email && cfg.autoEmail !== false) {
        setTimeout(function () { mailBtn.click(); }, 400);
      }
      mailBtn.onclick = function () {
        var msgEl = back.querySelector('.kh-vch-mailmsg');
        function say(t, ok) {
          msgEl.style.display = 'block';
          msgEl.textContent = t;
          msgEl.className = 'kh-vch-mailmsg' + (ok === true ? ' kh-ok' : (ok === false ? ' kh-err' : ''));
        }
        mailBtn.disabled = true;
        mailBtn.innerHTML = '<i class="ti ti-loader-2 kh-spin"></i> পাঠানো হচ্ছে…';
        say('ই-মেইল পাঠানো হচ্ছে…');
        KHUI.sendVoucherMail(cfg.email.kind, cfg.email.id).then(function (r) {
          say('✓ ভাউচারটি ' + (r.sent_to || 'আপনার ই-মেইলে') + ' পাঠানো হয়েছে।', true);
          mailBtn.innerHTML = '<i class="ti ti-mail-check"></i> পাঠানো হয়েছে';
        }).catch(function (e) {
          say('পাঠানো যায়নি: ' + (e && e.message ? e.message : 'আবার চেষ্টা করুন'), false);
          mailBtn.disabled = false;
          mailBtn.innerHTML = '<i class="ti ti-mail"></i> ই-মেইলে পাঠান';
        });
      };
    }

    KHUI._closeVoucher = close;
    return back;
  };

  /* ভাউচার ই-মেইল — Edge Function কল (লগইন আবশ্যক) */
  KHUI.sendVoucherMail = function (kind, id) {
    var db = sb();
    if (!db || !db.auth) return Promise.reject(new Error('সংযোগ নেই'));
    return db.auth.getSession().then(function (s) {
      var sess = s && s.data && s.data.session;
      if (!sess) throw new Error('আগে লগইন করুন');
      var url = (window.KH_FN_BASE || 'https://fgczixybyrzkrsoqrgdl.supabase.co/functions/v1') + '/send-voucher';
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sess.access_token
        },
        body: JSON.stringify({ kind: kind, id: id })
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
  };

  /* ══════════════════════════════════════════════════════
     5 ── WHATSAPP CHAT WIDGET
     ══════════════════════════════════════════════════════ */

  var WA_NUMBER = '8801711515952';   // wa.me format: country code + number, digits only

  var CHAT_CHIPS = [
    { label: 'ঋণের আবেদন',  msg: 'আসসালামু আলাইকুম। আমি সুদমুক্ত ঋণের আবেদন করতে চাই।' },
    { label: 'সঞ্চয় স্কিম',  msg: 'আসসালামু আলাইকুম। সঞ্চয় স্কিম সম্পর্কে জানতে চাই।' },
    { label: 'দান করব',      msg: 'আসসালামু আলাইকুম। আমি দান করতে চাই।' },
    { label: 'কিস্তি পরিশোধ', msg: 'আসসালামু আলাইকুম। কিস্তি পরিশোধ সম্পর্কে জানতে চাই।' }
  ];

  KHUI.mountChat = function (opts) {
    opts = opts || {};
    if (document.querySelector('.kh-chat-launch')) return;
    var wa = (opts.number || WA_NUMBER).replace(/\D/g, '');

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
  KHUI.mountThemeButton = function () {
    if (document.querySelector('.kh-theme-btn')) return;
    var b = document.createElement('button');
    b.className = 'kh-theme-btn kh-theme-float';
    b.setAttribute('aria-label', 'থিম পরিবর্তন করুন');
    b.innerHTML = '<i class="ti ti-moon" aria-hidden="true"></i>';
    b.onclick = function () { KHUI.toggleTheme(); };
    document.body.appendChild(b);
    KHUI._syncThemeIcon();
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

  function boot() {
    if (document.body.dataset.khNav !== 'off') {
      KHUI.mountNav({ scrollReveal: document.body.dataset.khNav === 'scroll' });
      if (document.body.dataset.khChat !== 'off') KHUI.mountChat();
    } else if (document.body.dataset.khTheme !== 'off') {
      KHUI.mountThemeButton();
    }
    if (document.body.dataset.khGlow !== 'off') KHUI.mountGlow();
    if (document.body.dataset.khUser !== 'off') KHUI.mountUserChip();
    KHUI.enhancePasswords(document);
    KHUI.enhanceEmails(document);
    KHUI.makeTablesScrollable(document);
    KHUI._watchTables();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.KHUI = KHUI;
})();
