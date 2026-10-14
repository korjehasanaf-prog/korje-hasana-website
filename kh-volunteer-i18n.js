/* Korje Hasana — ভলেন্টিয়ার ম্যানেজমেন্ট: EN / বাং অনুবাদ (kh-i18n-data.js-এর সাথে যুক্ত হয়)।
 * এই ফাইল kh-i18n-data.js-এর পরে ও kh-i18n.js-এর আগে লোড হতে হবে।
 * সাইটের আগের জোড়া বদলায় না: যে লেখা আগে থেকে আছে, সেটি অপরিবর্তিত থাকে।
 */
(function () {
  'use strict';
  var D = window.KH_I18N;
  if (!D) return;
  D.bn2en = D.bn2en || {};
  D.en2bn = D.en2bn || {};
  D.patterns = D.patterns || [];

  var BN_EN = {
    /* ---- সাইট চ্যাট উইজেট (সব পেজে একই) ---- */
    "আরও অপশন": "More options",
    "মেসেজ লিখুন...": "Type a message...",
    "মেসেজ": "Message",
    "ছবি পাঠান": "Send image",
    "ইমোজি": "Emoji",
    "পাঠান": "Send",
    "ভয়েস মেসেজ": "Voice message",
    "কণ্ঠস্বর": "Voice",
    "Speak to Me — হাসানার সাথে মুখোমুখি কথা বলুন": "Speak to Me — talk face to face with Hasana",
    "আপনার প্রশ্ন লিখুন…": "Type your question…",
    "প্রশ্ন": "Question",

    /* ---- হেডার মেনু (kh-volunteer.js) ---- */
    "ভলেন্টিয়ার ম্যানেজমেন্ট": "Volunteer Management",
    "ভলেন্টিয়ার পরিচিতি ও শপথ": "Volunteer intro & oath",
    "সার্টিফিকেট ও যাচাই": "Certificates & verification",
    "ভলেন্টিয়ার চ্যানেল": "Volunteer channel",
    "রেটিং ও সেবা পয়েন্ট": "Ratings & service points",
    "সেবার কাজ": "Service tasks",
    "নিবন্ধন ও আমার প্রোফাইল": "Registration & my profile",
    "নিবন্ধন ও প্রোফাইল": "Registration & profile",
    "নিবন্ধন ও প্রোফাইল ": "Registration & profile",

    /* ---- volunteer.html: পরিচিতি, আদর্শ, শপথ ---- */
    "ন্যায়, কল্যাণ ও সহমর্মিতার পথে একসাথে। হিলফুল ফুজুলের আদর্শে গড়া স্বেচ্ছাসেবী পরিবার, যারা মজলুমের পাশে দাঁড়ায় এবং সমাজে সুবিচার ও সচেতনতা ছড়ায়।": "Together on the path of justice, welfare and compassion. A volunteer family built on the ideals of Hilful Fudul, standing beside the oppressed and spreading justice and awareness in society.",
    "আদর্শ ও শপথ": "Ideals & oath",
    "সেবার অঙ্গীকার": "Service pledge",
    "আমাদের আদর্শ": "Our ideals",
    "হিলফুল ফুজুলের মূল কথা ছিল: কোনো দুর্বল ও মজলুম ব্যক্তির হক নষ্ট হলে জাতি, গোত্র বা পরিচয় নির্বিশেষে সবাই তার পাশে দাঁড়াবে। আমরা সেই চেতনায় কাজ করি।": "The core principle of Hilful Fudul was that when the rights of any weak or oppressed person are violated, everyone stands by them regardless of tribe, lineage or identity. We work in that spirit.",
    "মজলুমের পাশে দাঁড়ানো": "Standing with the oppressed",
    "ঋণ বা বকেয়া নিয়ে কোনো সদস্য বিপদে পড়লে তাকে সহায়তা ও সঠিক পথ দেখানো।": "When a member is in trouble over a loan or arrears, to support them and show the right way.",
    "সবার জন্য ন্যায়": "Justice for all",
    "জাতি, ধর্ম, লিঙ্গ বা অবস্থান নির্বিশেষে সেবা। কোনো ভেদাভেদ নয়।": "Service regardless of ethnicity, religion, gender or status. No discrimination.",
    "দুর্বলের হক": "Rights of the weak",
    "যোগ্য দরিদ্র মানুষ খুঁজে বের করা, যাতে সহায়তা তাদের কাছেই পৌঁছায়।": "Finding deserving poor people, so that support reaches them.",
    "সম্মানজনক আদায়": "Dignified recovery",
    "কিস্তি ও বকেয়া আদায়ে কোনো হয়রানি, চাপ বা বলপ্রয়োগ নিষিদ্ধ। আলাপ ও বোঝাপড়াই পথ।": "No harassment, pressure or force in collecting instalments and arrears. Dialogue and understanding are the way.",
    "যৌথ অঙ্গীকার": "Shared commitment",
    "নিবন্ধনের সময় শপথ নেওয়া হয় এবং প্রতি বছর নবায়নের সময় পুনরায় শপথ।": "An oath is taken at registration and renewed every year at renewal.",
    "সমাজ গড়া": "Building society",
    "আর্থিক সাক্ষরতা, সঞ্চয়ের অভ্যাস ও সুদমুক্ত অর্থায়ন নিয়ে সচেতনতা ছড়ানো।": "Spreading awareness of financial literacy, saving habits and interest-free finance.",
    "ভলেন্টিয়ারের শপথ": "Volunteer's oath",
    "আমি মজলুম ও দুর্বল মানুষের পাশে দাঁড়াব এবং সাধ্যমতো তাদের হক রক্ষায় কাজ করব।": "I will stand by the oppressed and the weak, and work to protect their rights to the best of my ability.",
    "জাতি, ধর্ম, লিঙ্গ বা অবস্থান নির্বিশেষে সবার সাথে ন্যায্য ও সম্মানজনক আচরণ করব।": "I will treat everyone fairly and respectfully, regardless of ethnicity, religion, gender or status.",
    "সদস্যদের তথ্য ও গোপনীয়তা রক্ষা করব এবং নিজের স্বার্থে তা ব্যবহার করব না।": "I will protect members' information and privacy, and will not use it for personal gain.",
    "কোনো টাকা-পয়সা নিজের হাতে গ্রহণ করব না। আমানত ও দান কেবল প্রতিষ্ঠানের অফিসিয়াল চ্যানেলে জমা হবে।": "I will not accept any money in my own hands. Deposits and donations will be made only through the organisation's official channels.",
    "কিস্তি আদায়ে কোনো প্রকার হয়রানি বা বলপ্রয়োগ করব না।": "I will not harass anyone or use force when collecting instalments.",
    "প্রতিষ্ঠানের আদর্শ, শৃঙ্খলা ও নির্দেশনা মেনে চলব।": "I will follow the organisation's ideals, discipline and guidance.",

    /* ---- ভলেন্টিয়ারের কাজ (আদর্শ-সেকশন) ---- */
    "ভলেন্টিয়ারের কাজ": "Volunteer work",
    "ঋণের ব্যবহার যাচাই": "Verify loan use",
    "ঋণের টাকা নির্ধারিত কাজে ব্যবহার হচ্ছে কি না, মাঠ পর্যায়ে যাচাই।": "Field verification of whether loan money is being used for its intended purpose.",
    "যোগ্য সদস্য খোঁজা ও যোগ্যতা যাচাই": "Finding eligible members & checking eligibility",
    "প্রয়োজনীয় ও ঋণ পাওয়ার যোগ্য মানুষ চিহ্নিত করা এবং যাচাই করা।": "Identifying and verifying people who need a loan and are eligible for one.",
    "কিস্তি ও বকেয়া আদায়ে সহায়তা": "Help with instalment & arrears recovery",
    "সম্মানজনক আলোচনার মাধ্যমে কিস্তি আদায়ে প্রতিষ্ঠানকে সহায়তা।": "Helping the organisation recover instalments through respectful discussion.",
    "সচেতনতা ও প্রচার": "Awareness & promotion",
    "বিভিন্ন কর্মসূচি ও সুদমুক্ত সঞ্চয়-ঋণের ধারণা সমাজে ছড়িয়ে দেওয়া।": "Spreading programmes and the idea of interest-free savings and loans in society.",
    "আমানত ও দান সংগ্রহ": "Collecting deposits & donations",
    "অফিসিয়াল ব্যাংক বা মোবাইল ব্যাংকিং চ্যানেলের মাধ্যমে আমানত ও দান সংগ্রহে সহায়তা।": "Helping collect deposits and donations through official bank or mobile banking channels.",

    /* ---- উপরের নেভিগেশন / সাধারণ ---- */
    "লোড হচ্ছে…": "Loading…",
    "খোলা কাজে নিজে যোগ দিন, অথবা এডমিন আপনাকে নির্দিষ্ট কাজ দিতে পারবেন। কাজ শেষে জমা দিলে এডমিন যাচাই করে রেটিং দেবেন।": "Join an open task yourself, or the admin may assign you a specific task. When you submit a finished task, the admin will verify it and give you a rating.",
    "সার্টিফিকেট": "Certificates",
    "সার্টিফিকেট যাচাই": "Verify certificate",
    "সার্টিফিকেট যাচাই করুন": "Verify a certificate",
    "সার্টিফিকেট নম্বর (যেমন KHV-C-2026-00001) লিখে আসলতা যাচাই করুন।": "Enter a certificate number (e.g. KHV-C-2026-00001) to check that it is genuine.",
    "সার্টিফিকেট ও যাচাই": "Certificates & verification",
    "সার্টিফিকেট নম্বর": "Certificate number",
    "যাচাই": "Verify",
    "Registered · সমাজসেবা অধিদফতর · NGOAB (pending)": "Registered · Department of Social Services · NGOAB (pending)",

    /* ---- কাজের ক্যাটাগরি ---- */
    "সার্ভে ও তথ্য সংগ্রহ": "Survey & data collection",
    "প্রশিক্ষণ ও সভা পরিচালনা": "Training & meeting facilitation",
    "সচেতনতা প্রচার": "Awareness campaign",
    "ডিজিটাল/মোবাইল সাপোর্ট": "Digital / mobile support",
    "হিসাব ও কাগজপত্র": "Accounts & paperwork",
    "সামাজিক যোগাযোগ": "Community outreach",
    "পরামর্শ ও মধ্যস্থতা": "Counselling & mediation",
    "যোগ্য সদস্য খোঁজা": "Finding eligible members",
    "ঋণ প্রাপ্তির যোগ্যতা যাচাই": "Verifying loan eligibility",
    "সচেতনতা বৃদ্ধি": "Raising awareness",
    "প্রচার ও প্রসার": "Promotion & outreach",
    "আমানত ও দান সংগ্রহ (অফিসিয়াল চ্যানেলে)": "Collecting deposits & donations (official channels)",
    "ঋণ ব্যবহার যাচাই": "Verify loan use",
    "যোগ্যতা যাচাই": "Eligibility check",
    "কিস্তি/বকেয়া আদায়": "Instalment / arrears recovery",
    "কিস্তি/বকেয়া": "Instalments / arrears",
    "সচেতনতা": "Awareness",
    "আমানত ও দান": "Deposits & donations",
    "প্রচার": "Promotion",
    "অন্যান্য": "Other",

    /* ---- স্ট্যাটাস ---- */
    "আবেদন পর্যালোচনাধীন": "Under review",
    "অনুমোদিত": "Approved",
    "অনুমোদিত ভলেন্টিয়ার": "Approved volunteer",
    "স্থগিত": "Suspended",
    "বাতিল": "Cancelled",
    "খোলা": "Open",
    "চলছে": "In progress",
    "জমা দেওয়া (যাচাই বাকি)": "Submitted (verification pending)",
    "জমা (যাচাই বাকি)": "Submitted (verification pending)",
    "যাচাইকৃত": "Verified",
    "অজানা": "Unknown",

    /* ---- বার্তা ও ত্রুটি ---- */
    "আগে লগইন করুন।": "Please log in first.",
    "নিবন্ধনের আগে শপথে সম্মতি দিন।": "Please agree to the oath before registering.",
    "আপনি ইতিমধ্যে ভলেন্টিয়ার হিসেবে নিবন্ধিত।": "You are already registered as a volunteer.",
    "এই সুবিধা শুধু অনুমোদিত ভলেন্টিয়ারদের জন্য।": "This feature is for approved volunteers only.",
    "এই কাজটি এখন আর পাওয়া যাচ্ছে না।": "This task is no longer available.",
    "আপনার একটি সার্টিফিকেট আবেদন ইতিমধ্যে অপেক্ষমাণ আছে।": "A certificate application of yours is already pending.",
    "সার্টিফিকেটটি এখনো অনুমোদিত হয়নি।": "This certificate has not been approved yet.",
    "প্রোফাইল পাওয়া যায়নি বা বাতিল করা হয়েছে।": "Profile not found or has been cancelled.",
    "হোয়াটসঅ্যাপ লিংক সঠিক নয়।": "The WhatsApp link is not valid.",
    "এই তথ্য ইতিমধ্যে আছে।": "This information already exists.",
    "ত্রুটি হয়েছে — ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।": "An error occurred — check your internet connection and try again.",
    "সংযোগ ত্রুটি — ইন্টারনেট দেখুন।": "Connection error — check your internet.",
    "সংযোগ ত্রুটি — আবার চেষ্টা করুন।": "Connection error — please try again.",
    "ইমেইল বা পাসওয়ার্ড সঠিক নয়।": "Email or password is incorrect.",
    "ত্রুটি": "Error",
    "ঠিক আছে": "OK",

    /* ---- লগইন / সাইন-আপ ---- */
    "নতুন অ্যাকাউন্ট": "New account",
    "লগইন করুন": "Log in",
    "পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)": "Password (at least 8 characters)",
    "অ্যাকাউন্ট খুলুন": "Create account",
    "অ্যাকাউন্ট খোলার পর ইমেইলে যাচাই লিংক আসতে পারে। যাচাইয়ের পর লগইন করে ভলেন্টিয়ার আবেদন পূরণ করুন।": "After you create an account, a verification link may be sent to your email. After verifying, log in and fill in the volunteer application.",
    "অ্যাকাউন্ট খোলা যায়নি:": "Could not create account:",
    "অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলের যাচাই লিংকে ক্লিক করে এখানে লগইন করুন।": "Account created. Click the verification link in your email, then log in here.",
    "লগআউট": "Log out",
    "সাইন আউট": "Sign out",
    "আপনি কি নিশ্চিত?": "Are you sure?",
    "না": "No",
    "হ্যাঁ": "Yes",

    /* ---- নিবন্ধন ফর্ম ---- */
    "পূর্ণ নাম *": "Full name *",
    "মোবাইল নম্বর *": "Mobile number *",
    "মোবাইল নম্বর": "Mobile number",
    "মোবাইল": "Mobile",
    "শিক্ষাগত যোগ্যতা": "Education",
    "জেলা": "District",
    "উপজেলা / থানা": "Upazila / Thana",
    "ঠিকানা": "Address",
    "আমার দক্ষতা": "My skills",
    "কোন কাজে আগ্রহী": "Areas of interest",
    "কখন সময় দিতে পারবেন": "When can you volunteer?",
    "সপ্তাহে ১–২ দিন": "1–2 days a week",
    "সপ্তাহে ৩–৫ দিন": "3–5 days a week",
    "ছুটির দিনে": "On holidays",
    "যখন সুযোগ হয়": "When possible",
    "সংক্ষিপ্ত পরিচিতি": "Short bio",
    "ভলেন্টিয়ার হিসেবে নিবন্ধন": "Register as a volunteer",
    "আবেদন জমার পর এডমিন যাচাই করে অনুমোদন দেবেন। অনুমোদনের পর আপনি কাজ, সার্টিফিকেট ও চ্যানেল ব্যবহার করতে পারবেন। জাতীয় পরিচয়পত্রের নম্বর চাওয়া হয় না।": "After you submit, an admin will review and approve your application. Once approved, you can use tasks, certificates and the channel. We do not ask for your National ID number.",
    "আমি উপরের শপথ পড়েছি, বুঝেছি এবং মেনে চলতে সম্মত।": "I have read and understood the oath above, and agree to abide by it.",
    "আবেদন জমা দিন": "Submit application",
    "আবেদন জমা হয়েছে। এডমিন অনুমোদন দিলে এখানে সব সুবিধা খুলে যাবে।": "Application submitted. All features will open here once an admin approves it.",
    "আবেদন পাঠান": "Send application",
    "আবেদন পাঠানো হয়েছে। এডমিন অনুমোদন দিলে সার্টিফিকেট ডাউনলোড করা যাবে।": "Application sent. You can download the certificate once an admin approves it.",
    "পূর্ণ নাম ও মোবাইল নম্বর দিন।": "Please enter your full name and mobile number.",
    "উদ্দেশ্য ও সেবার তারিখ (YYYY-MM-DD) দিন।": "Please enter the purpose and service dates (YYYY-MM-DD).",
    "প্রোফাইল সংরক্ষিত হয়েছে।": "Profile saved.",
    "প্রোফাইল সংরক্ষণ হয়েছে।": "Profile saved.",
    "প্রোফাইল হালনাগাদ": "Update profile",
    "সংরক্ষণ করুন": "Save",
    "সংরক্ষণ": "Save",
    "আমার প্রোফাইল": "My profile",

    /* ---- প্রোফাইল / আইডি কার্ড ---- */
    "অনুমোদিত ভলেন্টিয়ার ": "Approved volunteer",
    "আপনার আবেদন যাচাইয়ের অপেক্ষায় আছে। অনুমোদনের পর কাজ ও সার্টিফিকেটের সুবিধা খুলবে।": "Your application is awaiting review. Task and certificate features will open once it is approved.",
    "আপনার ভলেন্টিয়ার সুবিধা সাময়িক স্থগিত আছে। বিস্তারিত জানতে প্রতিষ্ঠানের সাথে যোগাযোগ করুন।": "Your volunteer access is temporarily suspended. Please contact the organisation for details.",
    "আপনার আবেদন বাতিল হয়েছে। প্রয়োজনে প্রতিষ্ঠানের সাথে যোগাযোগ করুন।": "Your application has been cancelled. Please contact the organisation if needed.",
    "ভলেন্টিয়ার আইডি QR": "Volunteer ID QR",
    "নাম:": "Name:",
    "সময়কাল:": "Period:",
    "সনদ নম্বর:": "Certificate no.:",
    "সনদ নম্বর: ": "Certificate no.: ",
    "দক্ষতা:": "Skills:",
    "আগ্রহ:": "Interests:",
    "সময়:": "Availability:",
    "রেটিং:": "Rating:",
    "শপথ:": "Oath:",
    "পয়েন্ট:": "Points:",

    /* ---- সেবার কাজ ---- */
    "কাজ": "Tasks",
    "কাজের তালিকা দেখতে ভলেন্টিয়ার হিসেবে লগইন ও অনুমোদন দরকার।": "To see the task list, you need to log in and be an approved volunteer.",
    "অনুমোদনের পর এখানে সেবার কাজ দেখা যাবে।": "Service tasks will appear here after approval.",
    "এখন কোনো খোলা কাজ নেই।": "No open tasks right now.",
    "কাজটি নিন": "Take task",
    "কাজ জমা দিন": "Submit task",
    "কাজ জমা হয়েছে। এডমিন যাচাই করে রেটিং দেবেন।": "Task submitted. The admin will verify it and give you a rating.",
    "কাজটি আপনার নামে নেওয়া হয়েছে।": "The task has been assigned to you.",
    "আমার কাজ": "My task",
    "আপনার কাজ": "Your task",
    "শেষ তারিখ:": "Due:",
    "শেষ তারিখ": "Due date",
    "শেষ:": "Due:",
    "দায়িত্ব:": "Assigned to:",
    "পয়েন্ট (সর্বোচ্চ কাজের মান)": "Points (max task value)",
    "এলাকা": "Area",

    /* ---- সার্টিফিকেট ---- */
    "সার্টিফিকেটের আবেদন": "Certificate application",
    "সার্টিফিকেটের আবেদন করতে ভলেন্টিয়ার হিসেবে লগইন করুন।": "Log in as a volunteer to apply for a certificate.",
    "অনুমোদিত ভলেন্টিয়াররা সার্টিফিকেটের জন্য আবেদন করতে পারবেন।": "Approved volunteers can apply for a certificate.",
    "একটি আবেদন ইতিমধ্যে অপেক্ষমাণ আছে।": "One application is already pending.",
    "উদ্দেশ্য *": "Purpose *",
    "উদ্দেশ্য:": "Purpose:",
    "উদ্দেশ্য": "Purpose",
    "যেমন: চাকরির আবেদন / শিক্ষাপ্রতিষ্ঠানে আবেদন": "e.g. job application / school application",
    "সেবার শুরু *": "Service start *",
    "সেবার শেষ *": "Service end *",
    "সেবার শুরু * (YYYY-MM-DD)": "Service start * (YYYY-MM-DD)",
    "সেবার শেষ * (YYYY-MM-DD)": "Service end * (YYYY-MM-DD)",
    "মোট সময় (ঘণ্টা)": "Total time (hours)",
    "মোট ঘণ্টা": "Total hours",
    "মোট ঘণ্টা:": "Total hours:",
    "মোট ঘণ্টা: ": "Total hours: ",
    "ঘণ্টা:": "Hours:",
    "ঘণ্টা": "hours",
    "সার্টিফিকেট ডাউনলোড (PDF)": "Download certificate (PDF)",
    "সার্টিফিকেট সংরক্ষণ বা শেয়ার": "Save or share certificate",
    "PDF তৈরি করা যায়নি। আবার চেষ্টা করুন।": "Could not create the PDF. Please try again.",
    "এখনো কোনো সার্টিফিকেট আবেদন নেই।": "No certificate applications yet.",
    "কারণ:": "Reason:",
    "পপআপ ব্লক হয়েছে। ব্রাউজারে অনুমতি দিয়ে আবার চেষ্টা করুন।": "Pop-up blocked. Allow pop-ups in your browser and try again.",
    "এই নম্বরে কোনো অনুমোদিত সার্টিফিকেট পাওয়া যায়নি।": "No approved certificate was found for this number.",
    "সার্টিফিকেট বৈধ ✔": "Certificate valid ✔",
    "যাচাই:": "Verify:",

    /* ---- চ্যানেল ---- */
    "ভলেন্টিয়ার চ্যানেল দেখতে অনুমোদিত ভলেন্টিয়ার হিসেবে লগইন করুন।": "Log in as an approved volunteer to view the channel.",
    "অনুমোদনের পর চ্যানেলের ঘোষণা ও হোয়াটসঅ্যাপ গ্রুপের লিংক পাবেন।": "After approval, you will see channel announcements and the WhatsApp group link.",
    "হোয়াটসঅ্যাপ গ্রুপে যোগ দিন": "Join WhatsApp group",
    "হোয়াটসঅ্যাপ গ্রুপের লিংক শীঘ্রই যুক্ত করা হবে।": "The WhatsApp group link will be added soon.",
    "এখনো কোনো ঘোষণা নেই।": "No announcements yet.",
    "ভলেন্টিয়ার গ্রুপ": "Volunteer group",
    "এডমিনের ঘোষণা ও নির্দেশনা এখানে ও হোয়াটসঅ্যাপ গ্রুপে পাবেন।": "Admin announcements and instructions are posted here and in the WhatsApp group.",

    /* ---- রেটিং ---- */
    "রেটিং দেখতে ভলেন্টিয়ার হিসেবে লগইন করুন।": "Log in as a volunteer to see ratings.",
    "অনুমোদনের পর আপনার রেটিং ও সেবা পয়েন্ট দেখা যাবে।": "Your ratings and service points will be visible after approval.",
    "গড় রেটিং": "Average rating",
    "/ ৫": "/ 5",
    "মোট মূল্যায়ন": "Total evaluations",
    "মূল্যায়ন": "Evaluations",
    "যাচাইকৃত কাজ": "Verified tasks",
    "সেবা পয়েন্ট": "Service points",
    "কাজের মান ও সময় অনুযায়ী": "Based on task quality and time",
    "এখনো কোনো যাচাইকৃত কাজ নেই। কাজ শেষ করে জমা দিলে এখানে রেটিং দেখা যাবে।": "No verified tasks yet. Ratings will appear here once you complete and submit tasks.",

    /* ---- অ্যাডমিন পেজ ---- */
    "ভলেন্টিয়ার ম্যানেজমেন্ট (অ্যাডমিন) | কর্জে হাসানা ফাউন্ডেশন": "Volunteer Management (Admin) | Korje Hasana Foundation",
    "ভলেন্টিয়ার ম্যানেজমেন্ট | কর্জে হাসানা ফাউন্ডেশন": "Volunteer Management | Korje Hasana Foundation",
    "সুপার অ্যাডমিন প্যানেল": "Super admin panel",
    "সুপার অ্যাডমিন লগইন": "Super admin login",
    "এই পেজ শুধু সুপার অ্যাডমিনদের জন্য।": "This page is for super admins only.",
    "ভলেন্টিয়ার আবেদন": "Volunteer applications",
    "কাজ ও রেটিং": "Tasks & ratings",
    "চ্যানেল ও হোয়াটসঅ্যাপ": "Channel & WhatsApp",
    "প্রত্যাখ্যাত": "Rejected",
    "প্রত্যাখ্যান": "Reject",
    "প্রত্যাখ্যানের কারণ (ঐচ্ছিক):": "Reason for rejection (optional):",
    "নতুন কাজ যোগ করুন": "Add a new task",
    "কাজের শিরোনাম *": "Task title *",
    "নতুন ফর্ম": "New form",
    "সব কাজ": "All tasks",
    "নির্দিষ্ট ভলেন্টিয়ার (ঐচ্ছিক)": "Specific volunteer (optional)",
    "— খোলা রাখুন —": "— Leave open —",
    "ভলেন্টিয়ার চ্যানেলে ঘোষণা": "Announcement to volunteer channel",
    "এখানে লেখা ঘোষণা শুধু ভলেন্টিয়ার চ্যানেলে যাবে। প্রতিষ্ঠানের সাধারণ নোটিশ/খবর সাধারণ ঘোষণা থেকেই যায়।": "Announcements written here go only to the volunteer channel. General organisation notices and news stay in the general announcements.",
    "বার্তা *": "Message *",
    "পোস্ট করুন": "Post",
    "পোস্ট করা ঘোষণা": "Posted announcements",
    "পোস্ট করা ঘোষণা ভলেন্টিয়ারদের চ্যানেলে তাৎক্ষণিক দেখাবে।": "Posted announcements appear in the volunteer channel immediately.",
    "ঘোষণা পোস্ট হয়েছে।": "Announcement posted.",
    "হোয়াটসঅ্যাপ গ্রুপ লিংক": "WhatsApp group link",
    "গ্রুপের ইনভাইট লিংক (https://chat.whatsapp.com/…) দিন। অনুমোদিত ভলেন্টিয়ারদের প্রোফাইলে এই বাটনটি দেখাবে। গ্রুপে বার্তা পাঠাতে এডমিন নিজের হোয়াটসঅ্যাপ থেকে গ্রুপে পোস্ট করবেন।": "Enter the group invite link (https://chat.whatsapp.com/…). This button will show in approved volunteers' profiles. To send messages to the group, the admin posts from their own WhatsApp.",
    "ইনভাইট লিংক": "Invite link",
    "লিংক সরান": "Remove link",
    "হোয়াটসঅ্যাপ লিংক সংরক্ষিত হয়েছে।": "WhatsApp link saved.",
    "লিংক সরানো হয়েছে।": "Link removed.",
    "এই আবেদন বাতিল করবেন?": "Cancel this application?",
    "অনুমোদন": "Approve",
    "অনুমোদন ও সনদ তৈরি": "Approve & issue certificate",
    "সম্পাদনা": "Edit",
    "যাচাই ও রেটিং": "Verify & rate",
    "কাজ সম্পাদনা": "Edit task",
    "রেটিং দিন (১ থেকে ৫):": "Rating (1 to 5):",
    "১ থেকে ৫ এর মধ্যে সংখ্যা দিন।": "Enter a number from 1 to 5.",
    "রেটিং ১ থেকে ৫ এর মধ্যে হতে হবে।": "Rating must be between 1 and 5.",
    "মন্তব্য (ঐচ্ছিক):": "Comment (optional):",
    "কাজ সংরক্ষিত হয়েছে।": "Task saved.",
    "এটি ইতিমধ্যে নিষ্পত্তি হয়েছে।": "This has already been settled.",
    "আগে ভলেন্টিয়ারকে অনুমোদন দিন।": "Approve the volunteer first.",
    "কাজটি কোনো ভলেন্টিয়ারকে দেওয়া হয়নি বা জমা/চলমান নেই।": "This task has not been assigned to a volunteer, or it is not submitted or in progress.",
    "লিংকটি https://chat.whatsapp.com/ দিয়ে শুরু হতে হবে।": "The link must start with https://chat.whatsapp.com/.",
    "এই অ্যাকাউন্টের সুপার অ্যাডমিন অনুমতি নেই।": "This account does not have super admin permission.",
    "মোট ভলেন্টিয়ার": "Total volunteers",
    "অপেক্ষমাণ আবেদন": "Pending applications",
    "অপেক্ষমাণ সার্টিফিকেট": "Pending certificates",
    "খোলা/চলমান কাজ": "Open / in-progress tasks",
    "যাচাই বাকি কাজ": "Tasks awaiting verification",
    "মোট সেবা পয়েন্ট": "Total service points",
    "এই তালিকায় কিছু নেই।": "Nothing in this list.",
    "এখনো কোনো কাজ নেই।": "No tasks yet.",
    "উদ্দেশ্য:": "Purpose:",
    "দক্ষতা: ": "Skills: ",
    " · আগ্রহ: ": " · Interests: ",
    "সময়: ": "Availability: ",
    " · রেটিং: ": " · Rating: ",
    " · শপথ: ": " · Oath: ",
    " · শেষ: ": " · Due: ",
    "সময়কাল:": "Period:",
    " · পয়েন্ট: ": " · Points: "
  };

  /* গতিশীল লেখা: কাউন্ট, সংখ্যা ও টুকরো বাক্য (ক্রমানুসারে — প্রথম মিল প্রযোজ্য) */
  var PATS = [
    ["\\(([০-৯0-9]+) টি রেটিং\\) · সেবা পয়েন্ট:", "($1 ratings) · Service points:"],
    ["^\\(?([০-৯0-9]+) টি রেটিং\\)", "($1 ratings)"],
    ["·\\s*সেবা পয়েন্ট:", "· Service points:"],
    ["([০-৯0-9.]+) ঘণ্টা(?![\\u0980-\\u09FF])", "$1 hrs"],
    ["^কারণ:", "Reason:"],
    ["·\\s*ঘণ্টা:", "· Hours:"],
    ["·\\s*শেষ তারিখ:", "· Due:"],
    ["·\\s*নম্বর:", "· No.:"],
    ["·\\s*পয়েন্ট:", "· Points:"],
    ["^দক্ষতা:", "Skills:"],
    ["·\\s*আগ্রহ:", "· Interests:"],
    ["(^|·\\s*)সময়:", "$1Availability:"],
    ["·\\s*রেটিং:", "· Rating:"],
    ["·\\s*শপথ:", "· Oath:"],
    ["সপ্তাহে ([০-৯–\\-]+) দিন", "$1 days a week"],
  ];

  function add(map, k, v) {
    if (!Object.prototype.hasOwnProperty.call(map, k)) map[k] = v;
  }
  Object.keys(BN_EN).forEach(function (bn) {
    var en = BN_EN[bn];
    /* ফাঁকা সহ ও ফাঁকা ছাড়া, দুটোই রাখি — DOM-এর টুকরো-লেখার জন্য */
    add(D.bn2en, bn, en);
    add(D.bn2en, bn.trim(), en);
    add(D.en2bn, en, bn.trim());
  });
  /* কাজের ক্যাটাগরি লেখার শুরুতে থাকলে (যেমন "ঋণ ব্যবহার যাচাই · সদর") */
  var CAT_KEYS = ["ঋণ ব্যবহার যাচাই", "যোগ্য সদস্য খোঁজা", "ঋণ প্রাপ্তির যোগ্যতা যাচাই", "যোগ্যতা যাচাই",
    "কিস্তি/বকেয়া আদায়", "কিস্তি/বকেয়া", "কিস্তি ও বকেয়া আদায়ে সহায়তা", "সচেতনতা", "সচেতনতা বৃদ্ধি",
    "প্রচার ও প্রসার", "প্রচার", "আমানত ও দান", "আমানত ও দান সংগ্রহ", "আমানত ও দান সংগ্রহ (অফিসিয়াল চ্যানেলে)",
    "সার্ভে ও তথ্য সংগ্রহ", "প্রশিক্ষণ ও সভা পরিচালনা", "সচেতনতা প্রচার", "ডিজিটাল/মোবাইল সাপোর্ট",
    "হিসাব ও কাগজপত্র", "সামাজিক যোগাযোগ", "পরামর্শ ও মধ্যস্থতা", "অন্যান্য"];
  CAT_KEYS.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (k) {
    if (!BN_EN[k]) return;
    var esc = k.replace(/[\\\/.*+?^${}()|[\]]/g, '\\$&');
    PATS.push(["(^|:\\s|·\\s)" + esc + "(?=\\s*(·|$))", "$1" + BN_EN[k]]);
  });

  PATS.forEach(function (p) {
    var exists = D.patterns.some(function (q) { return q[0] === p[0]; });
    if (!exists) D.patterns.push(p);
  });

  /* <title> — শুধু এই পেজের শিরোনাম বদলায় */
  var TITLE_EN = {};
  Object.keys(BN_EN).forEach(function (k) {
    if (/ \| কর্জে হাসানা ফাউন্ডেশন$/.test(k)) TITLE_EN[k] = BN_EN[k];
  });
  var titleBn = document.title;
  function setTitle() {
    var lang = 'en';
    try { lang = localStorage.getItem('kh_lang') === 'bn' ? 'bn' : 'en'; } catch (e) {}
    var en = TITLE_EN[titleBn];
    if (!en) return;
    document.title = lang === 'en' ? en : titleBn;
  }
  document.addEventListener('khlangchange', setTitle);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setTitle);
  else setTitle();
})();
