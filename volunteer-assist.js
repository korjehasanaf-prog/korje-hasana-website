/* volunteer-assist.js — ভলেন্টিয়ার "অ্যাসিস্ট মোড" ও "আমার ব্যাচ" (volunteer.html: #assist, #batch)
   • অনুমোদিত ভলেন্টিয়ার ছাড়া কিছু দেখানো হয় না।
   • গ্রাহকের পাসওয়ার্ড ভলেন্টিয়ার কখনো দেখে না: নতুন গ্রাহকের অস্থায়ী পাসওয়ার্ড শুধু SMS-এ যায় (edge function)।
   • নগদ গ্রহণ নেই: সব জমায় মাধ্যম + রেফারেন্স লাগে; সব কিছু অ্যাডমিন অনুমোদনের আগে 'pending'।
   • নিয়ম বলবৎ সার্ভারে (RPC/ট্রিগার); এই ফাইল শুধু UI।  */
(function () {
  'use strict';

  var FN = SUPABASE_URL + '/functions/v1/';
  var $ = function (id) { return document.getElementById(id); };
  var S = { vol: null, user: null, custs: [], accts: [], tab: 'new', otpPending: null, otpOk: null };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dt(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return String(s).slice(0, 10); } }
  function num(v) { return Number(v) || 0; }
  function fv(f, n) { return f.elements[n] ? String(f.elements[n].value || '').trim() : ''; }
  function note(el, text, ok) { if (el) el.innerHTML = '<div class="vol-msg ' + (ok ? 'ok' : 'err') + '">' + esc(text) + '</div>'; }
  function locked(text) { return '<div class="vol-locked"><i class="ti ti-lock"></i> ' + esc(text) + '</div>'; }
  function opts(list, sel) {
    return list.map(function (p) { return '<option value="' + esc(p[0]) + '"' + (p[0] === sel ? ' selected' : '') + '>' + esc(p[1]) + '</option>'; }).join('');
  }

  var METHODS = [['bkash', 'বিকাশ'], ['nagad', 'নগদ'], ['rocket', 'রকেট'], ['upay', 'উপায়'], ['gpay', 'জি-পে'], ['bqr', 'QR (বিকাশ/নগদ)'], ['bank', 'ব্যাংক ট্রান্সফার'], ['card', 'কার্ড'], ['agent', 'এজেন্ট']];
  var METHODS_X = METHODS.concat([['other', 'অন্যান্য']]);
  var KIND = { signup: 'নতুন গ্রাহক নিবন্ধন', savings_open: 'সঞ্চয় হিসাব খোলা', savings_deposit: 'সঞ্চয় জমা', donation: 'দান', loan_application: 'ঋণ আবেদন', instalment_submit: 'কিস্তি জমা' };
  var ST = { approved: 'অনুমোদিত', pending: 'যাচাই বাকি', rejected: 'প্রত্যাখ্যাত', unknown: 'অজানা' };
  var ST_ACC = { active: 'সক্রিয়', pending_approval: 'অনুমোদনের অপেক্ষায়', frozen: 'স্থগিত', closed: 'বন্ধ' };
  var TABS = [['new', 'নতুন গ্রাহক'], ['open', 'সঞ্চয় হিসাব খোলা'], ['dep', 'সঞ্চয়ে জমা'], ['don', 'দান'], ['loan', 'ঋণ আবেদন'], ['inst', 'কিস্তি জমা'], ['mine', 'আমার গ্রাহক']];

  /* ডাটাবেসের RPC — বাংলা ত্রুটি বার্তা সরাসরি দেখানো হয় */
  async function rpcRaw(name, args) {
    try {
      var r = await window._db.rpc(name, args || {});
      if (r.error) return { error: r.error.message || 'ত্রুটি হয়েছে' };
      return { data: r.data };
    } catch (e) { return { error: 'সংযোগ ত্রুটি — ইন্টারনেট দেখুন।' }; }
  }
  /* edge function (assist-create-account / assist-otp) — লগইন টোকেন সহ */
  async function edge(fn, body) {
    try {
      var s = await window._db.auth.getSession();
      var tok = s.data && s.data.session ? s.data.session.access_token : '';
      var res = await fetch(FN + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok, 'apikey': SUPABASE_ANON },
        body: JSON.stringify(body)
      });
      var j = await res.json().catch(function () { return {}; });
      if (!res.ok || (j && j.error)) return { error: (j && j.error) || 'ত্রুটি হয়েছে' };
      return { data: j };
    } catch (e) { return { error: 'সংযোগ ত্রুটি — ইন্টারনেট দেখুন।' }; }
  }

  async function loadLists() {
    var c = await rpcRaw('vol_my_customers');
    S.custs = (c.data || []);
    var a = await rpcRaw('vol_my_accounts');
    S.accts = (a.data || []);
  }
  function custSelect(id) {
    if (!S.custs.length) return '<div class="vol-empty">আপনার মাধ্যমে নিবন্ধিত কোনো গ্রাহক নেই। আগে "নতুন গ্রাহক" থেকে নিবন্ধন করুন।</div>';
    return '<label>গ্রাহক *<select id="' + id + '" required><option value="">— নির্বাচন করুন —</option>' +
      S.custs.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.must_change ? ' disabled' : '') + '>' + esc(c.full_name || 'গ্রাহক') + ' · ' + esc(c.mobile_masked || '') +
          (c.must_change ? ' (পাসওয়ার্ড বদলানো বাকি)' : '') + '</option>';
      }).join('') + '</select></label>';
  }
  function pickedCust(id) { var el = $(id); return el && el.value ? el.value : ''; }

  /* ---------- কাঠামো ---------- */
  function renderShell() {
    var box = $('volAssist');
    if (!box) return;
    if (!S.user || !S.vol) { box.innerHTML = locked('অ্যাসিস্ট মোড ব্যবহারের জন্য অনুমোদিত ভলেন্টিয়ার হিসেবে লগইন করুন।'); return; }
    if (S.vol.status !== 'approved') { box.innerHTML = locked('অনুমোদনের পর অ্যাসিস্ট মোড চালু হবে।'); return; }
    box.innerHTML =
      '<div class="vol-msg ok" style="margin-bottom:12px">আপনি গ্রাহকের পক্ষে কাজ করছেন। সব জমা ও আবেদন অ্যাডমিন অনুমোদনের পর চূড়ান্ত হবে। নগদ টাকা গ্রহণ করা যাবে না।</div>' +
      '<div class="vol-tabs" id="vaTabs">' + TABS.map(function (t) {
        return '<button type="button" data-t="' + t[0] + '"' + (t[0] === S.tab ? ' class="on"' : '') + '>' + esc(t[1]) + '</button>';
      }).join('') + '</div><div id="vaBody"></div>';
    box.querySelectorAll('#vaTabs button').forEach(function (b) {
      b.addEventListener('click', function () { S.tab = b.dataset.t; S.otpPending = null; S.otpOk = null; renderShell(); });
    });
    loadLists().then(function () { renderTab(); });
  }
  function renderTab() {
    var b = $('vaBody'); if (!b) return;
    var map = { 'new': tabNew, open: tabOpen, dep: tabDeposit, don: tabDonation, loan: tabLoan, inst: tabInstalment, mine: tabMine };
    (map[S.tab] || tabNew)(b);
  }

  /* ১. নতুন গ্রাহক — অস্থায়ী পাসওয়ার্ড শুধু SMS-এ */
  function tabNew(b) {
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-user-plus"></i> নতুন গ্রাহকের হিসাব খুলুন</h3>' +
      '<p style="margin-bottom:10px">গ্রাহকের জন্য একটি অস্থায়ী পাসওয়ার্ড তৈরি হবে এবং শুধু গ্রাহকের মোবাইলে SMS যাবে। আপনি এটি দেখতে পাবেন না। গ্রাহক প্রথমবার লগইনে নিজের পাসওয়ার্ড বদলাবেন।</p>' +
      '<form id="vaNewForm" class="vol-form">' +
      '<div class="vol-two"><label>পূর্ণ নাম *<input name="full_name" required maxlength="120"></label>' +
      '<label>মোবাইল (০১XXXXXXXXX) *<input name="mobile" required inputmode="numeric" placeholder="017XXXXXXXX"></label></div>' +
      '<div class="vol-two"><label>ই-মেইল (ঐচ্ছিক)<input name="email" type="email"></label>' +
      '<label>এনআইডি (১০/১৩/১৭ সংখ্যা) *<input name="nid" required inputmode="numeric" maxlength="17"></label></div>' +
      '<div class="vol-two"><label>ঠিকানা *<input name="address" required minlength="5" maxlength="300"></label>' +
      '<label>জেলা *<input name="district" required maxlength="60"></label></div>' +
      '<div><button class="vol-btn sm" type="submit"><i class="ti ti-device-floppy"></i> হিসাব খুলুন ও SMS পাঠান</button></div><div id="vaMsg"></div></form></div>';
    $('vaNewForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button'); btn.disabled = true;
      var r = await edge('assist-create-account', {
        full_name: fv(f, 'full_name'), mobile: fv(f, 'mobile'), email: fv(f, 'email'),
        nid: fv(f, 'nid'), address: fv(f, 'address'), district: fv(f, 'district')
      });
      btn.disabled = false;
      if (r.error) return note($('vaMsg'), r.error, false);
      note($('vaMsg'), 'হিসাব খোলা হয়েছে। অস্থায়ী পাসওয়ার্ড SMS-এ পাঠানো হয়েছে (' + (r.data.sms_sent_to || '') + ')। গ্রাহক প্রথমবার লগইনে পাসওয়ার্ড বদলাবেন।', true);
      f.reset();
      await loadLists(); renderBatch();
    });
  }

  /* ২. সঞ্চয় হিসাব খোলা (প্রথম জমাসহ) */
  function tabOpen(b) {
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-building-bank"></i> সঞ্চয় হিসাব খোলা (প্রথম জমাসহ)</h3>' +
      '<p style="margin-bottom:10px">অ্যাডমিন অনুমোদন না দেওয়া পর্যন্ত হিসাব "অনুমোদনের অপেক্ষায়" থাকবে।</p>' +
      '<form id="vaOpenForm" class="vol-form">' + custSelect('vaOpenCust') +
      '<div class="vol-two"><label>স্কীম *<select name="scheme">' + opts([['monthly', 'মাসিক'], ['daily', 'দৈনিক'], ['fortnightly', 'পাক্ষিক'], ['flexible', 'ফ্লেক্সিবল']], 'monthly') + '</select></label>' +
      '<label>কিস্তির পরিমাণ (টাকা)<input name="instalment" type="number" min="0" step="1"></label></div>' +
      '<div class="vol-two"><label>টাকা দেওয়ার মাধ্যম *<select name="method">' + opts(METHODS) + '</select></label>' +
      '<label>রেফারেন্স / ট্রানজ্যাকশন নম্বর *<input name="reference" required maxlength="80"></label></div>' +
      '<label>প্রথম জমার পরিমাণ (ফ্লেক্সিবল স্কীমে আবশ্যক; অন্যথায় কিস্তির সমান ধরা হবে)<input name="amount" type="number" min="0" step="1"></label>' +
      '<fieldset class="vol-fs"><legend><b>নমিনি (কমপক্ষে ১ জন; অংশের যোগফল ১০০)</b></legend>' +
      '<div class="vol-two"><label>নাম *<input name="n_name" required></label><label>সম্পর্ক *<input name="n_rel" required></label></div>' +
      '<div class="vol-two"><label>মোবাইল *<input name="n_mobile" required inputmode="numeric"></label><label>অংশ (%) *<input name="n_share" type="number" value="100" min="1" max="100" required></label></div>' +
      '</fieldset>' +
      '<label>নোট (ঐচ্ছিক)<input name="notes" maxlength="200"></label>' +
      '<div><button class="vol-btn sm" type="submit"><i class="ti ti-send"></i> হিসাব খোলার আবেদন পাঠান</button></div><div id="vaMsg"></div></form></div>';
    var f0 = $('vaOpenForm');
    if (!S.custs.length) return;
    f0.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, cust = pickedCust('vaOpenCust');
      if (!cust) return note($('vaMsg'), 'গ্রাহক নির্বাচন করুন।', false);
      var btn = f.querySelector('button'); btn.disabled = true;
      var r = await rpcRaw('vol_assist_open_savings', {
        p_customer: cust, p_scheme: fv(f, 'scheme'), p_instalment: num(fv(f, 'instalment')),
        p_nominees: [{ full_name: fv(f, 'n_name'), relation: fv(f, 'n_rel'), mobile: fv(f, 'n_mobile'), share: num(fv(f, 'n_share')) }],
        p_method: fv(f, 'method'), p_reference: fv(f, 'reference'), p_notes: fv(f, 'notes'), p_amount: num(fv(f, 'amount'))
      });
      btn.disabled = false;
      if (r.error) return note($('vaMsg'), r.error, false);
      note($('vaMsg'), 'হিসাব খোলার আবেদন জমা হয়েছে (হিসাব নম্বর ' + (r.data.account_no || '') + ')। অ্যাডমিন অনুমোদনের অপেক্ষায়।', true);
      f.reset();
      await loadLists(); renderBatch();
    });
  }

  /* ৩. বিদ্যমান হিসাবে জমা */
  function tabDeposit(b) {
    if (!S.accts.length) { b.innerHTML = '<div class="vol-empty">আপনার মাধ্যমে খোলা কোনো হিসাব নেই।</div>'; return; }
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-cash-banknote"></i> সঞ্চয় হিসাবে জমা</h3>' +
      '<form id="vaDepForm" class="vol-form"><label>হিসাব *<select name="acct" required>' +
      S.accts.map(function (a) {
        return '<option value="' + esc(a.id) + '">' + esc(a.account_no) + ' · ' + esc(a.holder_name || '') + ' · ' + esc(a.scheme_type) + ' (' + esc(ST_ACC[a.status] || a.status) + ')</option>';
      }).join('') + '</select></label>' +
      '<div class="vol-two"><label>টাকা দেওয়ার মাধ্যম *<select name="method">' + opts(METHODS) + '</select></label><label>রেফারেন্স *<input name="reference" required maxlength="80"></label></div>' +
      '<div class="vol-two"><label>পরিমাণ (ফ্লেক্সিবল হলে আবশ্যক)<input name="amount" type="number" min="0"></label><label>নোট<input name="notes" maxlength="200"></label></div>' +
      '<div><button class="vol-btn sm" type="submit"><i class="ti ti-send"></i> জমার আবেদন পাঠান</button></div><div id="vaMsg"></div></form></div>';
    $('vaDepForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button'); btn.disabled = true;
      var r = await rpcRaw('vol_assist_deposit', { p_account: fv(f, 'acct'), p_method: fv(f, 'method'), p_reference: fv(f, 'reference'), p_notes: fv(f, 'notes'), p_amount: num(fv(f, 'amount')) });
      btn.disabled = false;
      if (r.error) return note($('vaMsg'), r.error, false);
      note($('vaMsg'), 'জমার আবেদন পাঠানো হয়েছে। অ্যাডমিন যাচাই করবেন।', true);
      f.reset(); await loadLists(); renderBatch();
    });
  }

  /* ৪. দান */
  function tabDonation(b) {
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-heart-handshake"></i> দান গ্রহণ (অফিসিয়াল মাধ্যমে)</h3>' +
      '<form id="vaDonForm" class="vol-form"><div class="vol-two"><label>দাতার নাম<input name="name" maxlength="120"></label><label>মোবাইল (ঐচ্ছিক)<input name="mobile" inputmode="numeric"></label></div>' +
      '<div class="vol-two"><label>পরিমাণ (টাকা) *<input name="amount" type="number" min="1" required></label>' +
      '<label>উদ্দেশ্য *<select name="purpose">' + opts([['general', 'সাধারণ তহবিল'], ['loan_fund', 'ঋণ তহবিল'], ['emergency', 'জরুরি সহায়তা'], ['zakat', 'যাকাত'], ['sadaqah', 'সাদাকা']], 'general') + '</select></label></div>' +
      '<div class="vol-two"><label>মাধ্যম *<select name="method">' + opts(METHODS_X) + '</select></label><label>রেফারেন্স *<input name="reference" required maxlength="80"></label></div>' +
      '<label style="grid-template-columns:auto 1fr;align-items:center"><input type="checkbox" name="anon"> নাম গোপন রাখুন</label>' +
      '<div><button class="vol-btn sm" type="submit"><i class="ti ti-send"></i> দানের তথ্য জমা দিন</button></div><div id="vaMsg"></div></form></div>';
    $('vaDonForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, btn = f.querySelector('button'); btn.disabled = true;
      var r = await rpcRaw('vol_assist_donation', {
        p_name: fv(f, 'name'), p_mobile: fv(f, 'mobile'), p_amount: num(fv(f, 'amount')), p_method: fv(f, 'method'),
        p_reference: fv(f, 'reference'), p_purpose: fv(f, 'purpose'), p_is_anonymous: !!f.elements.anon.checked
      });
      btn.disabled = false;
      if (r.error) return note($('vaMsg'), r.error, false);
      note($('vaMsg'), 'দানের তথ্য জমা হয়েছে (' + (r.data.donation_no || '') + ')। অ্যাডমিন নিশ্চিত করলে চূড়ান্ত হবে।', true);
      f.reset(); renderBatch();
    });
  }

  /* ৫. ঋণ আবেদন — গ্রাহকের ওটিপি যাচাই সহ */
  function tabLoan(b) {
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-file-invoice"></i> ঋণের আবেদন (গ্রাহকের পক্ষে)</h3>' +
      '<p style="margin-bottom:10px">ধাপ ১: গ্রাহককে ওটিপি পাঠান। ধাপ ২: গ্রাহক যে কোড পাবেন তা নিয়ে যাচাই করুন। ধাপ ৩: আবেদন জমা দিন। গ্রাহকের পাসওয়ার্ড বদলানো থাকতে হবে।</p>' +
      '<form id="vaLoanForm" class="vol-form">' + custSelect('vaLoanCust') +
      '<div class="vol-two"><label>ঋণের ধরন *<select name="loan_type">' + opts([['Agriculture', 'কৃষি'], ['Business', 'ব্যবসা'], ['Education', 'শিক্ষা'], ['Medical', 'চিকিৎসা'], ['Family need', 'পারিবারিক প্রয়োজন'], ['Emergency', 'জরুরি']], 'Business') + '</select></label>' +
      '<label>পরিমাণ (৳, সর্বনিম্ন ৳৫,০০০) *<input name="amount" type="number" min="5000" step="1" required></label></div>' +
      '<div class="vol-two"><label>মেয়াদ (মাস) *<input name="duration" type="number" min="1" max="60" required></label>' +
      '<label>কিস্তির ধরন *<select name="installment_kind">' + opts([['monthly', 'মাসিক'], ['biweekly', 'পাক্ষিক'], ['weekly', 'সাপ্তাহিক']], 'monthly') + '</select></label></div>' +
      '<div class="vol-two"><label>প্রথম কিস্তির তারিখ *<input name="first_installment_date" type="date" required></label>' +
      '<label>কিস্তি পরিশোধের মোবাইল (১১ সংখ্যা) *<input name="repayment_mobile" inputmode="numeric" maxlength="14" required></label></div>' +
      '<div class="vol-two"><label>মাসিক আয় (টাকা, ঐচ্ছিক)<input name="monthly_income" type="number" min="0"></label><label>পেশা (ঐচ্ছিক)<input name="occupation" maxlength="120"></label></div>' +
      '<label>ঋণের উদ্দেশ্য *<textarea name="purpose" required maxlength="500"></textarea></label>' +
      '<fieldset class="vol-fs"><legend><b>গ্যারান্টর (পরিমাণ অনুযায়ী লাগবে; সার্ভার সংখ্যা যাচাই করবে)</b></legend>' +
      [0, 1, 2].map(function (i) {
        return '<div class="vol-two"><label>নাম<input name="g' + i + '_name"></label><label>সম্পর্ক<input name="g' + i + '_rel"></label></div>' +
          '<div class="vol-two"><label>মোবাইল<input name="g' + i + '_mobile" inputmode="numeric"></label><label>এনআইডি<input name="g' + i + '_nid" inputmode="numeric"></label></div>';
      }).join('') + '</fieldset>' +
      '<div class="vol-card" style="padding:12px"><b>গ্রাহকের ওটিপি যাচাই</b>' +
      '<div class="vol-two" style="margin-top:8px"><label>কোড পাঠানোর মাধ্যম<select id="vaOtpCh"><option value="sms">SMS (মোবাইল)</option><option value="email">ই-মেইল</option></select></label>' +
      '<div style="align-self:end"><button class="vol-btn ghost sm" type="button" id="vaOtpSend"><i class="ti ti-message"></i> ওটিপি পাঠান</button></div></div>' +
      '<div id="vaOtpRow"></div><div id="vaOtpMsg"></div></div>' +
      '<div><button class="vol-btn sm" type="submit" id="vaLoanSub"><i class="ti ti-send"></i> ঋণের আবেদন জমা দিন</button></div><div id="vaMsg"></div></form></div>';
    if (!S.custs.length) return;
    var sel = $('vaLoanCust'), form = $('vaLoanForm');
    var resetOtp = function () { S.otpPending = null; S.otpOk = null; var r = $('vaOtpRow'); if (r) r.innerHTML = ''; };
    sel.addEventListener('change', resetOtp);
    $('vaOtpSend').addEventListener('click', async function () {
      var cust = pickedCust('vaLoanCust');
      if (!cust) return note($('vaOtpMsg'), 'আগে গ্রাহক নির্বাচন করুন।', false);
      var btn = this; btn.disabled = true;
      var r = await edge('assist-otp', { action: 'send', customer_user_id: cust, channel: $('vaOtpCh').value });
      btn.disabled = false;
      if (r.error) return note($('vaOtpMsg'), r.error, false);
      S.otpPending = { otp_id: r.data.otp_id, cust: cust };
      S.otpOk = null;
      $('vaOtpRow').innerHTML = '<div class="vol-two" style="margin-top:8px"><label>গ্রাহকের কাছ থেকে পাওয়া কোড (৬ সংখ্যা)<input id="vaOtpCode" inputmode="numeric" maxlength="6"></label>' +
        '<div style="align-self:end"><button class="vol-btn sm" type="button" id="vaOtpVerify"><i class="ti ti-check"></i> যাচাই করুন</button></div></div>';
      note($('vaOtpMsg'), 'কোড পাঠানো হয়েছে। কোড মেয়াদ ১০ মিনিট।', true);
      $('vaOtpVerify').addEventListener('click', async function () {
        var code = ($('vaOtpCode').value || '').replace(/\D/g, '');
        if (code.length !== 6) return note($('vaOtpMsg'), '৬ সংখ্যার কোড লিখুন।', false);
        var v = await edge('assist-otp', { action: 'verify', otp_id: S.otpPending.otp_id, code: code });
        if (v.error) return note($('vaOtpMsg'), v.error, false);
        S.otpOk = { otp_id: S.otpPending.otp_id, cust: S.otpPending.cust };
        note($('vaOtpMsg'), 'গ্রাহকের ওটিপি যাচাই হয়েছে। এখন আবেদন জমা দিতে পারেন।', true);
      });
    });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = e.target, cust = pickedCust('vaLoanCust');
      if (!cust) return note($('vaMsg'), 'গ্রাহক নির্বাচন করুন।', false);
      if (!S.otpOk || S.otpOk.cust !== cust) return note($('vaMsg'), 'আগে গ্রাহকের ওটিপি পাঠিয়ে যাচাই করুন।', false);
      var p = {
        loan_type: fv(f, 'loan_type'), amount: num(fv(f, 'amount')), duration: num(fv(f, 'duration')),
        installment_kind: fv(f, 'installment_kind'), first_installment_date: fv(f, 'first_installment_date'),
        purpose: fv(f, 'purpose'), repayment_mobile: fv(f, 'repayment_mobile').replace(/\D/g, ''), refs: []
      };
      if (fv(f, 'monthly_income')) p.monthly_income = num(fv(f, 'monthly_income'));
      if (fv(f, 'occupation')) p.occupation = fv(f, 'occupation');
      [0, 1, 2].forEach(function (i) {
        var g = { name: fv(f, 'g' + i + '_name'), relation: fv(f, 'g' + i + '_rel'), mobile: fv(f, 'g' + i + '_mobile'), nid: fv(f, 'g' + i + '_nid') };
        if (g.name || g.relation || g.mobile || g.nid) p.refs.push(g);
      });
      var btn = $('vaLoanSub'); btn.disabled = true;
      var r = await rpcRaw('vol_assist_loan_application', { p_customer: cust, p: p, p_otp_id: S.otpOk.otp_id });
      btn.disabled = false;
      if (r.error) return note($('vaMsg'), r.error, false);
      note($('vaMsg'), 'ঋণের আবেদন জমা হয়েছে (' + (r.data.app_no || '') + ')। অ্যাডমিন পর্যালোচনা করবেন।', true);
      S.otpOk = null; S.otpPending = null;
      f.reset(); renderBatch();
    });
  }

  /* ৬. কিস্তি জমা — ঋণ নম্বর দিয়ে বাকি কিস্তি; নগদ নয়, মাধ্যম ও রেফারেন্স */
  function tabInstalment(b) {
    b.innerHTML = '<div class="vol-card"><h3><i class="ti ti-coin"></i> কিস্তি জমা (মাধ্যম ও রেফারেন্স)</h3>' +
      '<p style="margin-bottom:10px">ঋণ নম্বর লিখে বাকি কিস্তি খুঁজুন। নগদ টাকা গ্রহণ করা যাবে না; জমা অ্যাডমিন যাচাইয়ের পর চূড়ান্ত হবে।</p>' +
      '<form id="vaLoanNoForm" class="vol-form" style="grid-template-columns:1fr auto;align-items:end"><label>ঋণ নম্বর *<input name="loan_no" required maxlength="40"></label>' +
      '<button class="vol-btn sm" type="submit"><i class="ti ti-search"></i> খুঁজুন</button></form>' +
      '<div id="vaInstList"></div><div id="vaMsg"></div></div>';
    $('vaLoanNoForm').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await rpcRaw('vol_instalments_by_loan', { p_loan_no: fv(e.target, 'loan_no') });
      var box = $('vaInstList');
      if (r.error) { box.innerHTML = ''; return note($('vaMsg'), r.error, false); }
      $('vaMsg').innerHTML = '';
      var list = (r.data && r.data.instalments) || [];
      if (!list.length) { box.innerHTML = '<div class="vol-empty">এই ঋণের কোনো বাকি কিস্তি নেই।</div>'; return; }
      box.innerHTML = '<form id="vaInstForm" class="vol-form" style="margin-top:12px"><label>কোন কিস্তি *<select name="rep" required>' +
        list.map(function (x) {
          return '<option value="' + esc(x.id) + '" data-due="' + num(x.amount_due) + '">কিস্তি ' + esc(x.installment_no) + ' · ' + esc(dt(x.due_date)) + ' · ৳' + esc(x.amount_due) + '</option>';
        }).join('') + '</select></label>' +
        '<div class="vol-two"><label>মাধ্যম *<select name="method">' + opts(METHODS_X) + '</select></label><label>রেফারেন্স *<input name="reference" required maxlength="80"></label></div>' +
        '<label>পরিমাণ (টাকা) *<input name="amount" type="number" min="1" required></label>' +
        '<div><button class="vol-btn sm" type="submit"><i class="ti ti-send"></i> কিস্তি জমার আবেদন পাঠান</button></div><div id="vaMsg2"></div></form>';
      var sel = box.querySelector('select[name="rep"]');
      var amt = box.querySelector('input[name="amount"]');
      amt.value = sel.options[sel.selectedIndex].dataset.due || '';
      sel.addEventListener('change', function () { amt.value = sel.options[sel.selectedIndex].dataset.due || ''; });
      $('vaInstForm').addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var f = ev.target, btn = f.querySelector('button'); btn.disabled = true;
        var rr = await rpcRaw('vol_assist_instalment_submit', { p_repayment_id: fv(f, 'rep'), p_method: fv(f, 'method'), p_reference: fv(f, 'reference'), p_amount: num(fv(f, 'amount')) });
        btn.disabled = false;
        if (rr.error) return note($('vaMsg2'), rr.error, false);
        note($('vaMsg2'), 'কিস্তি জমার আবেদন পাঠানো হয়েছে। অ্যাডমিন যাচাই করবেন।', true);
        renderBatch();
      });
    });
  }

  /* ৭. আমার গ্রাহক — নাম ও মাসked মোবাইল; সম্পূর্ণ মোবাইল/NID নয় */
  function tabMine(b) {
    if (!S.custs.length) { b.innerHTML = '<div class="vol-empty">আপনার মাধ্যমে নিবন্ধিত কোনো গ্রাহক নেই।</div>'; return; }
    b.innerHTML = '<div class="vol-list">' + S.custs.map(function (c) {
      return '<div class="vol-card vol-item"><div style="flex:1;min-width:200px"><div class="t">' + esc(c.full_name || 'গ্রাহক') +
        '</div><div class="m">মোবাইল: ' + esc(c.mobile_masked || '') + ' · নিবন্ধন: ' + esc(dt(c.assisted_at)) + '</div></div>' +
        '<span class="vol-chip ' + (c.must_change ? 'pending' : 'approved') + '">' + (c.must_change ? 'পাসওয়ার্ড বদলানো বাকি' : 'সক্রিয়') + '</span></div>';
    }).join('') + '</div>';
  }

  /* ---------- আমার ব্যাচ (অবদানের রেকর্ড) ---------- */
  async function renderBatch() {
    var box = $('volBatch'); if (!box) return;
    if (!S.user || !S.vol) { box.innerHTML = locked('ব্যাচ দেখতে ভলেন্টিয়ার হিসেবে লগইন করুন।'); return; }
    if (S.vol.status !== 'approved') { box.innerHTML = locked('অনুমোদনের পর আপনার অবদানের রেকর্ড দেখা যাবে।'); return; }
    var r = await rpcRaw('vol_my_contributions');
    if (r.error) return note(box, r.error, false);
    var d = r.data || {}, items = d.items || [], tot = d.totals || {};
    var cnt = Object.keys(tot).reduce(function (s, k) { return s + num(tot[k]); }, 0);
    var kinds = Object.keys(tot).map(function (k) { return esc(KIND[k] || k) + ': ' + num(tot[k]); }).join(' · ');
    box.innerHTML = '<div class="vol-grid" style="margin-bottom:14px">' +
      '<div class="vol-card"><h3>মোট অবদান</h3><p style="font-size:26px;font-weight:700">' + cnt + '</p><p>সব ধরনের জমা ও আবেদন</p></div>' +
      '<div class="vol-card"><h3>অনুমোদিত</h3><p style="font-size:26px;font-weight:700">' + num(d.approved) + '</p><p>অ্যাডমিন যাচাই সম্পন্ন</p></div>' +
      '<div class="vol-card"><h3>গ্রাহক</h3><p style="font-size:26px;font-weight:700">' + S.custs.length + '</p><p>আপনার মাধ্যমে নিবন্ধিত</p></div></div>' +
      '<div class="vol-card"><h3>ধরন অনুযায়ী</h3><p>' + (kinds || 'এখনো কোনো অবদান নেই') + '</p></div>' +
      (items.length ? '<div class="vol-list">' + items.map(function (x) {
        return '<div class="vol-card vol-item"><div style="flex:1;min-width:200px"><div class="t">' + esc(KIND[x.kind] || x.kind) + '</div>' +
          '<div class="m">' + esc(dt(x.created_at)) + (x.amount ? ' · ৳' + esc(x.amount) : '') + '</div></div>' +
          '<span class="vol-chip ' + esc(x.status) + '">' + esc(ST[x.status] || x.status) + '</span></div>';
      }).join('') + '</div>' : '<div class="vol-empty">এখনো কোনো অবদান রেকর্ড হয়নি।</div>') +
      '<p class="vol-lead" style="margin-top:12px">এই রেকর্ড ভবিষ্যতে রেটিং ও সেবা পয়েন্টের ভিত্তি হবে।</p>';
  }

  /* ---------- পেজ থেকে ডাকা ---------- */
  var style = document.createElement('style');
  style.textContent = '.vol-fs{border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:12px;margin:0}.vol-fs legend{padding:0 6px}';
  document.head.appendChild(style);

  window.KHVolAssist = {
    render: function (user, vol) { S.user = user; S.vol = vol; renderShell(); renderBatch(); }
  };
  if (window.__khVolState) window.KHVolAssist.render(window.__khVolState.user, window.__khVolState.vol);
})();
