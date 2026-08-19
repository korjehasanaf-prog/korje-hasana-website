# কর্জে হাসানা ফাউন্ডেশন — ডেভেলপমেন্ট নির্দেশনা

## 🎨 থীম নিয়ম (বাধ্যতামূলক — প্রতিটি ফিচারে)

যেকোনো নতুন ফিচার, পেজ, বা কম্পোনেন্ট তৈরির সময় **ডার্ক ও লাইট — দুই থীমেই** কাজ করতে হবে।

1. **দুই থীমেই যাচাই করতে হবে।** লাইট থীম চালু হয় `<html data-theme="light">` দিয়ে; ডার্ক থীম ডিফল্ট। নতুন কোনো রঙ/সারফেস যোগ করলে `kh-ui.css`-এর `html[data-theme="light"]` অংশে তার লাইট-ভ্যারিয়েন্টও যোগ করতে হবে।

2. **সাদা লেখা = রঙিন পটভূমি।** কোনো বাটন, চিপ, ব্যাজ বা লেবেলের ফন্ট কালার সাদা (বা হালকা) হলে সেটির পটভূমি অবশ্যই রঙিন/গ্র্যাডিয়েন্ট হতে হবে — থীম যেটাই হোক। সাদা পটভূমিতে সাদা লেখা কখনো নয়।

3. **কনট্রাস্ট।** লেখা ও পটভূমির কনট্রাস্ট অন্তত ৪.৫:১ হতে হবে (WCAG AA)। সন্দেহ হলে মেপে নিতে হবে।

4. **হার্ডকোড রঙ এড়ানো।** সরাসরি `#fff`/`#000` না দিয়ে যথাসম্ভব থীম ভেরিয়েবল (`--kh-*`) বা উভয় থীমের নিয়ম ব্যবহার করতে হবে।

## 🎨 ব্র্যান্ড রঙ (Aurora থীম)

- গোলাপি `#d6336c` · কমলা `#e95420` · অ্যাম্বার `#f08c28` · বেগুনি `#7048e8`
- গাঢ় বেস: প্লাম `#241539`, `#160d26`
- ব্র্যান্ড গ্র্যাডিয়েন্ট বাটন: `linear-gradient(112deg,#d6336c,#a021c9 48%,#e83e8c)` বা কাছাকাছি

## 🏗️ আর্কিটেকচার

- **shared kit:** `kh-ui.css` + `kh-ui.js` — নেভবার, চ্যাট, থীম টগল, কার্সর গ্লো, পাসওয়ার্ড মিটার, প্রিমিয়াম ইমেইল ইনপুট, ফর্ম অটো-ফিল। নতুন সাইট-ব্যাপী কম্পোনেন্ট এখানেই যোগ করতে হবে যাতে সব পেজে একসাথে আসে।
- সব পেজ এই দুটি ফাইল `</body>`-এর আগে লোড করে।
- **ব্যাকএন্ড:** Supabase (`fgczixybyrzkrsoqrgdl`)। ব্যক্তিগত/আর্থিক টেবিলে RLS আবশ্যক; anon-কে শুধু প্রয়োজনীয় SELECT/INSERT দিতে হবে; SECURITY DEFINER ফাংশনে `auth.uid()` যাচাই ও `IS DISTINCT FROM` ব্যবহার (NULL ফাঁক এড়াতে)।

## ⚠️ যে ভুলগুলো আগে হয়েছে — আর করা যাবে না

1. **প্রতিটি পেজে সুপাবেস লোড করতে হবে।** `kh-ui.js`-এর লগইন-চিপ, অটোফিল, সেটিংস — সবই `_db` ছাড়া চলে না। তাই প্রতিটি HTML-এ `kh-ui.js`-এর **আগে**:
   `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` ও `<script src="_supabase.js"></script>`
   (index/about/contact/loan-application-এ এগুলো ছিল না — নেভবারে নাম দেখাত না, ফর্ম অটোফিল হত না।)

2. **`const _db` window-এ যায় না।** `_supabase.js`-এ তাই স্পষ্টভাবে `window._db = _db;` আছে — সরানো যাবে না। শেয়ার্ড কোডে সবসময় `sb()` হেল্পার (`KHUI.db()`) ব্যবহার করতে হবে, সরাসরি `window._db` নয়।

3. **`insert().select()` করতে হলে SELECT policy লাগে।** `donations`-এ INSERT policy ছিল কিন্তু SELECT ছিল না — ফলে `insert().select().single()` পুরো লেনদেন রোলব্যাক করত এবং **দান নীরবে হারিয়ে যেত**। তাই লেনদেন লেখার কাজ SECURITY DEFINER RPC দিয়ে করতে হবে (`record_donation`, `record_loan_payment`), সরাসরি `from().insert()` নয়।

4. **supabase-js-এর `rpc()`/`from()`-এ `.catch()` নেই।** `await _db.rpc(x).catch(...)` লিখলে পেজ ক্র্যাশ করে (একবার লগইনে "সংযোগ ত্রুটি" দেখিয়েছিল)। `try { await ... } catch {}` ব্যবহার করতে হবে।

4. **রিডাইরেক্ট লুপ এড়ানো।** কোনো পেজ প্রোফাইল না পেলে লগইন পেজে পাঠাবে না — বরং সেখানেই ব্যবস্থা (যেমন `my-dashboard.html`-এর "সদস্য প্রোফাইল তৈরি করুন" ফর্ম) বা বার্তা দেখাবে। লোডিং গেট যেন কখনো আটকে না থাকে (টাইমআউট + `catch`-এ ফলব্যাক)।

5. **ক্যাশ-বাস্টিং।** `kh-ui.css`/`kh-ui.js`-এ বড় পরিবর্তনের পর সব পেজে `?v=` সংখ্যা বাড়াতে হবে, নাহলে ব্রাউজার পুরনো ফাইল ধরে রাখে।

## 🔔 রিমাইন্ডার সিস্টেম (মাসিক সঞ্চয় ও ঋণের কিস্তি)

- **নিয়ম:** `app_settings` → `savings_rules` (`due_day`, `grace_days`, `min_monthly`, `reminder_enabled`) ও `loan_rules`। সুপার অ্যাডমিন → জেনারেল সেটিংস থেকে বদলায়।
- **বকেয়া হিসাব:** `generate_due_reminders()` → `reminders` টেবিল। pg_cron job `kh_daily_due_scan` প্রতিদিন UTC ০২:১৫ (BD ৮:১৫) চালায়।
- **ই-মেইল:** Edge Function `send-reminders` (Gmail SMTP)। সিক্রেট: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `REMINDER_CRON_SECRET`। হেডার `x-reminder-secret` ছাড়া কল করলে 401।
- **অ্যাডমিন:** dashboard.html → "বকেয়া রিমাইন্ডার" প্যানেল (তালিকা, হিসাব, এখনই পাঠানো)।
- SMS পরে যোগ হবে — `reminders.channel` কলামে `'sms'` রাখার জায়গা আছে।

## 🧾 ডিজিটাল ভাউচার ও OCR

- **ভাউচার:** `KHUI.voucher({title,no,amount,name,code,mobile,photo,rows,status,note})` — kh-ui.js-এ। সঞ্চয় জমা/উত্তোলনে স্বয়ংক্রিয়ভাবে দেখায়; দানের ভাউচার donation.html-এ আলাদা (সেখানে ছবি `paintVoucherMember()` বসায়)। সব ইনপুট `vEsc()` দিয়ে এসকেপ হয় — XSS পরীক্ষিত।
- ভাউচারের ভেতরটা সবসময় সাদা কাগজের মতো (দুই থীমে এক), কারণ এটি প্রিন্ট হয়। প্রিন্ট নতুন উইন্ডোতে HTML হিসেবে — টেক্সট ঝকঝকে থাকে।
- **ভাউচার ই-মেইল:** Edge Function `send-voucher` (verify_jwt চালু)। `KHUI.sendVoucherMail(kind, id)` — kind: `donation` · `savings` · `loan_disburse` · `loan_repayment`। ই-মেইল ঠিকানা **কখনো request body থেকে নেওয়া হয় না** (spam রোধ); সদস্য শুধু নিজের লেনদেন পাঠাতে পারেন, অ্যাডমিন সংশ্লিষ্ট ব্যক্তির ঠিকানায়। ভাউচারে `email:{kind,id}` দিলে বাটন আপনাআপনি আসে।
- **ক্যামেরা:** `KHUI.camera({facing,title,guide,onShot})` — লাইভ প্রিভিউ, সেলফিতে ওভাল গাইড ও মিরর (সংরক্ষণে সোজা), পেছনের ক্যামেরায় কার্ড ফ্রেম। প্রোফাইল ছবি ও NID — দুটোতেই ক্যামেরা বা গ্যালারি বেছে নেওয়া যায়।
- **OCR:** `kh-ocr.js` → `KHOCR.readNID(file,{onProgress})`. সম্পূর্ণ ব্রাউজারে (Tesseract.js CDN), ছবি কোথাও আপলোড হয় না।
  ধাপ: স্মার্ট আপস্কেল ২২০০px → পার্সেন্টাইল স্ট্রেচ → আনশার্প → **Sauvola অভিযোজিত থ্রেশহোল্ড (সমতল-এলাকা গার্ডসহ)** → ৩ পাস (eng PSM6 · eng PSM4 · ben+eng PSM6) → স্কোর দিয়ে সেরা ফল।
  `KHOCR.extract(text)` NID (১০/১৩/১৭), জন্ম তারিখ (ইংরেজি ও বাংলা মাস), নাম, পিতা/মাতা, রক্তের গ্রুপ বের করে; OCR-এর সাধারণ ভুল (O→0, l→1) সংশোধন করে।

## 📱 মোবাইল রেসপনসিভ (kh-ui.css সেকশন ১১.৯৫)

- **টপবার মোবাইলে লুকানো থাকে** (`.topbar{display:none}`), তাই লগইন/প্রোফাইল হ্যামবার্গার মেনুতে (`.nav-links`) বসে — `KHUI._addNavMenuItems()` (লগইন থাকলে) ও `KHUI._addNavLoginItem()` (না থাকলে)।
- **গ্লাস নেভে `a span{display:none}` ছিল** — এতে প্রোফাইল ছবির রিংও লুকিয়ে যেত; এখন `span:not(.kh-gav-ring)`।
- সব বহু-কলাম গ্রিডের নাম kh-ui.css-এর ৮২০px/৬৪০px ব্লকে তালিকাভুক্ত (নতুন গ্রিড ক্লাস বানালে ওখানে যোগ করতে হবে)।
- **চওড়া টেবিল** `KHUI.makeTablesScrollable()` নিজে থেকেই `.kh-scrollx`-এ মুড়ে দেয় (MutationObserver দিয়ে নতুন টেবিলও ধরা পড়ে) — CSS-এ parent selector নেই বলে JS লাগে।
- ইনপুটে `font-size:16px` (iOS জুম ঠেকাতে), বাটনে `min-height:44px`, `body{padding-bottom:78px}` (গ্লাস নেভের জন্য), অ্যাডমিন সাইডবার মোবাইলে উপরে সরে আসে।

## 🔑 পাসওয়ার্ড রিসেট

- সদস্য: user-login → "পাসওয়ার্ড ভুলে গেছেন?" · অ্যাডমিন: admin-login → একই লিংক। ই-মেইল ঠিকানা আবশ্যক (মোবাইল alias-এ হয় না)।
- `resetPasswordForEmail(email, {redirectTo: /reset-password.html})` — দুই পথ: **৬ সংখ্যার কোড** (`verifyOtp type:'recovery'`, টেমপ্লেটে `{{ .Token }}` থাকলে) অথবা **ই-মেইলের লিংক**।
- `reset-password.html` নিজেই hash/query থেকে টোকেন নিয়ে `setSession()`/`exchangeCodeForSession()` করে (কারণ `_supabase.js`-এ `detectSessionInUrl:false`), তারপর `updateUser({password})`। মেয়াদোত্তীর্ণ লিংক ও সেশনহীন অবস্থাতেও বাংলা বার্তা দেখায়।

## 🗄️ গুরুত্বপূর্ণ DB ফাংশন

`create_user_profile`, `get_my_profile`, `update_my_profile` (প্রোফাইল না থাকলে নিজেই তৈরি করে — `p_mobile` লাগে),
`get_my_overview`, `touch_my_login`, `record_donation`, `record_loan_payment`, `get_my_loan_schedule`,
`create_depositor`, `set_my_savings_scheme`, `get_savings_overview`,
`set_app_setting` (super_admin only), `generate_due_reminders`,
`adjust_account_balance`, `get_balance_summary`, `verify_borrower*`, `approve_identity_claim`।
সবগুলোতে `SECURITY DEFINER` + `SET search_path = public` + `auth.uid()` যাচাই।
স্টোরেজ বাকেট: `avatars` (পাবলিক) ও `nid-docs` (প্রাইভেট — শুধু নিজে ও অ্যাডমিন)।

## 🚀 ডিপ্লয়

`push-to-github.bat` সব ফাইল GitHub রিপোতে কপি করে কমিট ও পুশ করে → Vercel-এ অটো ডিপ্লয়। নতুন ফাইল বানালে স্ক্রিপ্টে তার কপি লাইন যোগ করতে হবে।

## ✅ যাচাই

- প্রতিটি পরিবর্তনের পর: HTML/CSS/JS সিনট্যাক্স, দুই থীমে কনট্রাস্ট, ও (সম্ভব হলে) jsdom/happy-dom দিয়ে আচরণ পরীক্ষা।
- ব্রাউজারে চোখে দেখা যায় না — তাই কোড ও কনট্রাস্ট মেপে যাচাই করতে হবে, এবং ব্যবহারকারীকে লাইভে দেখতে বলতে হবে।
