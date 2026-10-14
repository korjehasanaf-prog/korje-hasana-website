/* kh-must-change.js — অস্থায়ী (SMS) পাসওয়ার্ডে থাকা গ্রাহককে প্রথমবার পাসওয়ার্ড বদলাতে বাধ্য করে।
   লগইন করা অবস্থায় প্রতিটি পেজে user_profiles.must_change_password যাচাই করে;
   সত্য হলে change-password.html-এ পাঠায়। নেটওয়ার্ক ত্রুটিতে আটকায় না (fail-open):
   আসল নিরাপত্তা ডাটাবেস ট্রিগার ও RPC দিয়ে আগে থেকেই বসানো আছে। */
(function () {
  'use strict';
  if (document.body && document.body.getAttribute('data-kh-must-change') === 'off') return;
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var SKIP = { 'change-password.html': 1, 'reset-password.html': 1 };
  if (SKIP[page]) return;

  var checking = false;
  function check() {
    var db = window._db;
    if (!db || !db.auth || checking) return;
    checking = true;
    db.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s) return null;
      return db.from('user_profiles').select('must_change_password').eq('id', s.user.id).maybeSingle()
        .then(function (res) {
          if (res && res.data && res.data.must_change_password === true) {
            location.replace('change-password.html');
          }
        });
    }).catch(function () { /* ignore */ }).then(function () { checking = false; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check);
  else check();
  /* লগইনের পর (সেশন তৈরি হলে) আবার যাচাই */
  var bind = function () {
    var db = window._db;
    if (db && db.auth && db.auth.onAuthStateChange) {
      db.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN') setTimeout(check, 0); });
    }
  };
  if (window._db) bind(); else document.addEventListener('DOMContentLoaded', bind);
})();
