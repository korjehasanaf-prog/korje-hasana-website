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
    KHUI._addNavAdminItem();
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
    KHUI._addNavAdminItem();
  };

  /* ⚠️ মোবাইলে অ্যাডমিন লগইনের কোনো পথ ছিল না (১৩ সেপ্টেম্বর ২০২৬)।
     "Admin" বাটনটি আছে `.topbar`-এ, আর মোবাইলে `.topbar { display:none }` —
     তাই অ্যাডমিনকে ডেস্কটপ খুঁজতে হত অথবা হাতে URL লিখতে হত।
     এখন হ্যামবার্গার মেনুর একদম শেষে একটি আলাদা আইটেম বসে।
     লগইন থাকুক বা না থাকুক — দুই অবস্থাতেই, কারণ একজন অ্যাডমিন
     সদস্য হিসেবেও লগইন করা থাকতে পারেন। */
  KHUI._addNavAdminItem = function () {
    if (document.body.dataset.khAdminLink === 'off') return;
    if (/admin-login\.html/i.test(location.pathname)) return;   /* ঐ পেজে অর্থহীন */
    document.querySelectorAll('.nav-links').forEach(function (list) {
      if (list.querySelector('.kh-navadmin')) return;
      var a = document.createElement('a');
      a.className = 'kh-navadmin';
      a.href = 'admin-login.html';
      a.innerHTML = '<i class="ti ti-shield-lock" aria-hidden="true"></i> অ্যাডমিন লগইন';
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

  function boot() {
    if (document.body.dataset.khNav !== 'off') {
      KHUI.mountNav({ scrollReveal: document.body.dataset.khNav === 'scroll' });
      if (document.body.dataset.khChat !== 'off') KHUI.mountChat();
    }
    if (document.body.dataset.khGlow !== 'off') KHUI.mountGlow();
    if (document.body.dataset.khUser !== 'off') KHUI.mountUserChip();
    KHUI.enhancePasswords(document);
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
