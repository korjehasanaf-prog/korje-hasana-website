/* ══════════════════════════════════════════════════════════
   কর্জে হাসানা ফাউন্ডেশন — Shared UI Kit (JS)
   Requires: kh-ui.css, Tabler Icons webfont
   Exposes:  window.KHUI
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KHUI = {};

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

    // hover preview of the pill
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('mouseenter', function () {
        pill.style.left = a.offsetLeft + 'px';
        pill.style.width = a.offsetWidth + 'px';
        nav.querySelectorAll('a').forEach(function (x) { x.style.color = ''; });
        a.style.color = '#a62a55';
      });
    });
    nav.addEventListener('mouseleave', function () {
      nav.querySelectorAll('a').forEach(function (x) { x.style.color = ''; });
      place();
    });

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
          (masked ? KHUI.bn(masked) + ' নম্বরে ' + KHUI.bn(LEN) + ' সংখ্যার কোড পাঠানো হয়েছে'
                  : KHUI.bn(LEN) + ' সংখ্যার যাচাই কোডটি লিখুন') +
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
            sub.textContent = masked
              ? KHUI.bn(masked) + ' নম্বরে ' + KHUI.bn(LEN) + ' সংখ্যার কোড পাঠানো হয়েছে'
              : KHUI.bn(LEN) + ' সংখ্যার যাচাই কোডটি লিখুন';
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

  function boot() {
    if (document.body.dataset.khNav !== 'off') {
      KHUI.mountNav({ scrollReveal: document.body.dataset.khNav === 'scroll' });
      if (document.body.dataset.khChat !== 'off') KHUI.mountChat();
    } else if (document.body.dataset.khTheme !== 'off') {
      KHUI.mountThemeButton();
    }
    if (document.body.dataset.khGlow !== 'off') KHUI.mountGlow();
    KHUI.enhancePasswords(document);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.KHUI = KHUI;
})();
