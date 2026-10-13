/* Korje Hasana — অ্যাপ ডাউনলোড বাটন ও সুপার-এডমিন রিলিজ ম্যানেজার
 * ব্যবহার: kh-ui.js-এর পরে লোড করুন.  <script src="kh-app-downloads.js?v=66" defer></script>
 */
(function () {
  'use strict';

  var SB_URL = 'https://fgczixybyrzkrsoqrgdl.supabase.co';
  var SB_KEY = 'sb_publishable_rVcvOlXzVeRF8aSY3DMziQ_nNdNFACZ';
  var PLATFORMS = {
    android: { label: 'Android (APK)', icon: 'ti-brand-android' },
    ios: { label: 'iPhone (iOS)', icon: 'ti-brand-apple' }
  };
  var _linksPromise = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- ডাউনলোড লিংক (পাবলিক RPC) ---------- */
  function getLinks(force) {
    if (force || !_linksPromise) {
      _linksPromise = fetch(SB_URL + '/rest/v1/rpc/app_download_links', {
        method: 'POST',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
        body: '{}'
      }).then(function (r) { return r.ok ? r.json() : {}; })
        .catch(function () { return {}; });
    }
    return _linksPromise;
  }

  function buttonsHTML(links, compact) {
    return Object.keys(PLATFORMS).map(function (p) {
      var meta = PLATFORMS[p];
      var rel = links && links[p];
      var cls = 'kh-app-btn' + (compact ? ' kh-app-btn--compact' : '');
      if (!rel || !rel.url) {
        return '<span class="' + cls + ' is-disabled" aria-disabled="true"><i class="ti ' + meta.icon + '"></i>' +
          '<span><small>শীঘ্রই আসছে</small>' + esc(meta.label) + '</span></span>';
      }
      return '<a class="' + cls + '" href="' + esc(rel.url) + '" target="_blank" rel="noopener">' +
        '<i class="ti ' + meta.icon + '"></i><span><small>ডাউনলোড · v' + esc(rel.version) + '</small>' +
        esc(meta.label) + '</span></a>';
    }).join('');
  }

  function renderAll() {
    var targets = document.querySelectorAll('[data-kh-app]');
    if (!targets.length) return;
    getLinks().then(function (links) {
      targets.forEach(function (el) {
        el.innerHTML = buttonsHTML(links, true);
      });
    });
  }

  /* ---------- হেডার ড্রপডাউন ---------- */
  function bindDropdown() {
    var btn = document.querySelector('.kh-app-dd-btn');
    var menu = document.getElementById('khAppDdMenu');
    if (!btn || !menu) return;
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
      if (!menu.contains(e.target) && !btn.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  /* ---------- সুপার-এডমিন: রিলিজ ম্যানেজার ---------- */
  function mountAdmin(container, sb) {
    if (!container || !sb) return;
    container.innerHTML =
      '<form class="kh-ar-form" id="khArForm">' +
        '<div class="kh-ar-row">' +
          '<label>প্ল্যাটফর্ম<select name="platform">' +
            '<option value="android">Android (APK)</option>' +
            '<option value="ios">iPhone (iOS)</option>' +
          '</select></label>' +
          '<label>ভার্সন<input name="version" required placeholder="যেমন 1.0.1" maxlength="20"></label>' +
        '</div>' +
        '<label>ফাইল আপলোড (APK / AAB / IPA)<input name="file" type="file" accept=".apk,.aab,.ipa"></label>' +
        '<label>অথবা সরাসরি ডাউনলোড লিংক (https)<input name="url" type="url" placeholder="https://..."></label>' +
        '<label>নোট (ঐচ্ছিক)<input name="notes" maxlength="200"></label>' +
        '<button type="submit" class="kh-ar-submit">প্রকাশ করুন</button>' +
        '<p class="kh-ar-msg" role="status"></p>' +
      '</form>' +
      '<div class="kh-ar-list"></div>';

    var form = container.querySelector('#khArForm');
    var msg = form.querySelector('.kh-ar-msg');
    var list = container.querySelector('.kh-ar-list');

    function say(text, bad) {
      msg.textContent = text;
      msg.style.color = bad ? '#dc2626' : '';
    }

    async function load() {
      var r = await sb.rpc('admin_list_app_releases');
      if (r.error) { list.innerHTML = '<p class="kh-ar-msg">তালিকা আনা যায়নি: ' + esc(r.error.message) + '</p>'; return; }
      var rows = r.data || [];
      if (!rows.length) { list.innerHTML = '<p class="kh-ar-msg">এখনো কোনো রিলিজ নেই।</p>'; return; }
      list.innerHTML = '<table class="kh-ar-table"><thead><tr><th>প্ল্যাটফর্ম</th><th>ভার্সন</th><th>তারিখ</th><th>লিংক</th></tr></thead><tbody>' +
        rows.map(function (x) {
          var p = PLATFORMS[x.platform] ? PLATFORMS[x.platform].label : x.platform;
          return '<tr' + (x.is_current ? ' class="is-current"' : '') + '><td>' + esc(p) + '</td><td>' + esc(x.version) +
            (x.is_current ? ' <small>(বর্তমান)</small>' : '') + '</td><td>' + esc(String(x.created_at || '').slice(0, 10)) +
            '</td><td><a href="' + esc(x.file_url) + '" target="_blank" rel="noopener">খুলুন</a></td></tr>';
        }).join('') + '</tbody></table>';
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var platform = String(fd.get('platform') || '');
      var version = String(fd.get('version') || '').trim();
      var file = fd.get('file');
      var url = String(fd.get('url') || '').trim();
      var notes = String(fd.get('notes') || '').trim() || null;
      var fileName = null;
      if (!version) { say('ভার্সন লিখুন', true); return; }
      try {
        if (file && file.size) {
          say('ফাইল আপলোড হচ্ছে…');
          var safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          var path = platform + '/' + version + '-' + Date.now() + '-' + safe;
          var up = await sb.storage.from('app-releases').upload(path, file, {
            contentType: file.type || 'application/octet-stream',
            upsert: false
          });
          if (up.error) throw up.error;
          url = sb.storage.from('app-releases').getPublicUrl(path).data.publicUrl;
          fileName = file.name;
        }
        if (!url) { say('একটি ফাইল আপলোড করুন অথবা লিংক দিন', true); return; }
        say('প্রকাশ হচ্ছে…');
        var r = await sb.rpc('admin_publish_app_release', {
          p_platform: platform, p_version: version, p_url: url, p_notes: notes, p_file_name: fileName
        });
        if (r.error) throw r.error;
        say('প্রকাশিত হয়েছে। ওয়েবসাইটের ডাউনলোড বাটন এখন নতুন লিংক দেখাবে।');
        form.reset();
        getLinks(true);
        renderAll();
        load();
      } catch (err) {
        say('ব্যর্থ: ' + (err && err.message ? err.message : err), true);
      }
    });

    load();
  }

  /* ---------- শুরু ---------- */
  function init() {
    bindDropdown();
    renderAll();
  }

  window.KHAppRelease = { getLinks: getLinks, mountAdmin: mountAdmin };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
