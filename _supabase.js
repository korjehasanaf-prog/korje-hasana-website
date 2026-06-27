/**
 * ============================================================
 * কর্জে হাসানা ফাউন্ডেশন — Supabase Shared Client
 * _supabase.js — include this in every HTML page
 * ============================================================
 *
 * HOW TO USE:
 * 1. Replace SUPABASE_URL and SUPABASE_ANON_KEY with your real values
 *    (from Supabase Dashboard → Project Settings → API)
 * 2. Add these two lines to the <head> of every HTML file:
 *
 *    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *    <script src="_supabase.js"></script>
 *
 * 3. Use KH.* functions anywhere in that page's JS.
 * ============================================================
 */

// ── CONFIG ──────────────────────────────────────────────────
const SUPABASE_URL  = 'https://fgczixybyrzkrsoqrgdl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnY3ppeHlieXJ6a3Jzb3FyZ2RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTAwNTgsImV4cCI6MjA5ODEyNjA1OH0._nrfrctpQ0zCO09zJXHY_Drg0RgYybNCVgE1DlpRdCc';

// ── CLIENT INIT ─────────────────────────────────────────────
const { createClient } = supabase;
const _db = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// ── GLOBAL NAMESPACE ────────────────────────────────────────
window.KH = {};

// ────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────

/** Login with email + password. Returns { session, error } */
KH.login = async (email, password) => {
  const { data, error } = await _db.auth.signInWithPassword({ email, password });
  if (error) return { session: null, error };

  // Fetch admin profile
  const { data: profile } = await _db
    .from('admin_users')
    .select('*')
    .eq('auth_id', data.user.id)
    .single();

  return { session: data.session, user: data.user, profile, error: null };
};

/** Logout */
KH.logout = async () => {
  await _db.auth.signOut();
  window.location.href = 'admin.html';
};

/** Get current session and profile */
KH.getSession = async () => {
  const { data: { session } } = await _db.auth.getSession();
  if (!session) return { session: null, profile: null };

  const { data: profile } = await _db
    .from('admin_users')
    .select('*')
    .eq('auth_id', session.user.id)
    .single();

  return { session, user: session.user, profile };
};

/** Check if logged in (redirect to login if not) */
KH.requireAuth = async (redirectTo = 'admin.html') => {
  const { session, profile } = await KH.getSession();
  if (!session) { window.location.href = redirectTo; return null; }
  return { session, profile };
};

// ────────────────────────────────────────────────────────────
// DASHBOARD KPIs
// ────────────────────────────────────────────────────────────

/** Get dashboard stats from v_dashboard_kpis view */
KH.getDashboardKPIs = async () => {
  const { data, error } = await _db.from('v_dashboard_kpis').select('*').single();
  return { data, error };
};

// ────────────────────────────────────────────────────────────
// LOAN APPLICATIONS
// ────────────────────────────────────────────────────────────

/** List all applications. Pass status filter or 'all' */
KH.getApplications = async (status = 'all', limit = 200) => {
  let q = _db.from('loan_applications')
    .select('*, borrowers(name, name_bn, mobile, nid)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  return { data: data || [], error };
};

/** Get single application by ID */
KH.getApplication = async (id) => {
  const { data, error } = await _db
    .from('loan_applications')
    .select('*, borrowers(*)')
    .eq('id', id)
    .single();
  return { data, error };
};

/**
 * Submit a new loan application (public, no auth required)
 * @param {object} form — from loan-application.html form
 */
KH.submitApplication = async (form) => {
  const appNo = 'KH-APP-' + String(Date.now()).slice(-6);
  const { data, error } = await _db.from('loan_applications').insert({
    app_no:           appNo,
    applicant_name:   form.name,
    applicant_nid:    form.nid,
    applicant_mobile: form.mobile,
    purpose:          form.purpose,
    purpose_detail:   form.purpose_detail,
    amount_requested: parseFloat(form.amount),
    tenure_months:    parseInt(form.tenure) || 12,
    monthly_income:   parseFloat(form.income) || null,
    existing_loans:   form.existing_loans,
    disbursement_mode: form.disbursement_mode || 'goods',
    vendor_name:      form.vendor_name,
    item_description: form.item_description,
    status:           'pending'
  }).select().single();
  return { data, error, appNo };
};

/** Update application status */
KH.updateApplicationStatus = async (id, status, notes = '') => {
  const update = { status, updated_at: new Date().toISOString() };
  if (status === 'approved') {
    update.approved_at = new Date().toISOString();
  } else if (status === 'rejected') {
    update.rejected_at = new Date().toISOString();
    update.rejection_reason = notes;
  }
  if (notes) update.review_notes = notes;
  const { data, error } = await _db
    .from('loan_applications').update(update).eq('id', id).select().single();
  return { data, error };
};

// ────────────────────────────────────────────────────────────
// BORROWERS
// ────────────────────────────────────────────────────────────

/** Search borrower by NID, mobile, or ref_no (for borrower portal) */
KH.findBorrower = async (query) => {
  const q = query.trim();
  const { data, error } = await _db
    .from('borrowers')
    .select('*')
    .or(`nid.eq.${q},mobile.eq.${q},ref_no.ilike.${q}`)
    .limit(1)
    .single();
  return { data, error };
};

/** Get all borrowers (admin) */
KH.getBorrowers = async (limit = 200) => {
  const { data, error } = await _db
    .from('borrowers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

/** Create borrower */
KH.createBorrower = async (form) => {
  const refNo = 'KH-B-' + String(Date.now()).slice(-4).padStart(4, '0');
  const { data, error } = await _db.from('borrowers').insert({
    ref_no:    refNo,
    name:      form.name,
    name_bn:   form.name_bn,
    nid:       form.nid,
    mobile:    form.mobile,
    email:     form.email,
    address:   form.address,
    upazila:   form.upazila,
    district:  form.district,
    occupation: form.occupation,
    guarantor_name:   form.guarantor_name,
    guarantor_mobile: form.guarantor_mobile,
    guarantor_nid:    form.guarantor_nid,
    notes:     form.notes
  }).select().single();
  return { data, error, refNo };
};

/** Update borrower */
KH.updateBorrower = async (id, form) => {
  const { data, error } = await _db
    .from('borrowers').update(form).eq('id', id).select().single();
  return { data, error };
};

/** Delete borrower */
KH.deleteBorrower = async (id) => {
  const { error } = await _db.from('borrowers').delete().eq('id', id);
  return { error };
};

// ────────────────────────────────────────────────────────────
// LOANS
// ────────────────────────────────────────────────────────────

/** Get all loans (active_loans view) */
KH.getLoans = async (status = 'all') => {
  let q;
  if (status === 'active') {
    q = _db.from('v_active_loans').select('*').order('disbursement_date', { ascending: false });
  } else {
    q = _db.from('loans').select('*, borrowers(name, name_bn, mobile, nid, district)')
      .order('created_at', { ascending: false });
    if (status !== 'all') q = q.eq('status', status);
  }
  const { data, error } = await q;
  return { data: data || [], error };
};

/** Get loan + repayment schedule for borrower */
KH.getLoanByBorrower = async (borrowerId) => {
  const { data: loans, error: le } = await _db
    .from('loans')
    .select('*')
    .eq('borrower_id', borrowerId)
    .order('created_at', { ascending: false });

  if (le || !loans?.length) return { loan: null, schedule: [], error: le };

  const loan = loans[0];
  const { data: schedule, error: se } = await _db
    .from('repayments')
    .select('*')
    .eq('loan_id', loan.id)
    .order('installment_no', { ascending: true });

  return { loan, schedule: schedule || [], error: se };
};

/**
 * Disburse a loan — creates loan record + generates all EMI rows
 * @param {object} form — disbursement form data
 */
KH.disburseLoan = async (form) => {
  const loanNo = 'KH-L-' + String(Date.now()).slice(-4).padStart(4, '0');
  const monthlyEmi = Math.ceil(parseFloat(form.principal) / parseInt(form.tenure_months));
  const disbDate = new Date(form.disbursement_date);
  const firstEmiDate = new Date(disbDate);
  firstEmiDate.setMonth(firstEmiDate.getMonth() + 1);
  const lastEmiDate = new Date(firstEmiDate);
  lastEmiDate.setMonth(lastEmiDate.getMonth() + parseInt(form.tenure_months) - 1);

  // Create loan record
  const { data: loan, error: le } = await _db.from('loans').insert({
    loan_no:          loanNo,
    application_id:   form.application_id || null,
    borrower_id:      form.borrower_id,
    principal:        parseFloat(form.principal),
    tenure_months:    parseInt(form.tenure_months),
    monthly_emi:      monthlyEmi,
    disbursement_date: form.disbursement_date,
    first_emi_date:   firstEmiDate.toISOString().split('T')[0],
    last_emi_date:    lastEmiDate.toISOString().split('T')[0],
    disbursement_mode: form.disbursement_mode || 'goods',
    vendor_name:      form.vendor_name,
    bill_no:          form.bill_no,
    item_description: form.item_description,
    notes:            form.notes,
    status:           'active'
  }).select().single();

  if (le) return { loan: null, error: le };

  // Generate EMI schedule
  const emis = [];
  for (let i = 1; i <= parseInt(form.tenure_months); i++) {
    const dueDate = new Date(firstEmiDate);
    dueDate.setMonth(dueDate.getMonth() + (i - 1));
    emis.push({
      loan_id:        loan.id,
      borrower_id:    form.borrower_id,
      installment_no: i,
      due_date:       dueDate.toISOString().split('T')[0],
      amount_due:     monthlyEmi,
      is_paid:        false
    });
  }

  const { error: ee } = await _db.from('repayments').insert(emis);
  return { loan, error: ee };
};

// ────────────────────────────────────────────────────────────
// REPAYMENTS
// ────────────────────────────────────────────────────────────

/** Record an EMI payment */
KH.recordPayment = async (repaymentId, { amountPaid, paymentMethod, transactionRef, notes }) => {
  const { data, error } = await _db
    .from('repayments')
    .update({
      amount_paid:     parseFloat(amountPaid),
      payment_date:    new Date().toISOString().split('T')[0],
      payment_method:  paymentMethod || 'cash',
      transaction_ref: transactionRef,
      is_paid:         true,
      notes
    })
    .eq('id', repaymentId)
    .select().single();

  if (!error && data) {
    // Update loan paid_amount and paid_installments
    await _db.rpc('update_loan_after_payment', { p_loan_id: data.loan_id });
  }
  return { data, error };
};

/** Get upcoming EMIs (next 7 days + overdue) */
KH.getUpcomingEMIs = async () => {
  const { data, error } = await _db.from('v_upcoming_emis').select('*');
  return { data: data || [], error };
};

/** Get full repayment schedule for a loan */
KH.getRepaymentSchedule = async (loanId) => {
  const { data, error } = await _db
    .from('repayments')
    .select('*')
    .eq('loan_id', loanId)
    .order('installment_no');
  return { data: data || [], error };
};

// ────────────────────────────────────────────────────────────
// DONORS
// ────────────────────────────────────────────────────────────

/** Get all donors */
KH.getDonors = async () => {
  const { data, error } = await _db
    .from('donors')
    .select('*')
    .order('total_donated', { ascending: false });
  return { data: data || [], error };
};

/** Create or find donor, then record donation */
KH.submitDonation = async (form) => {
  const donationNo = 'KH-DON-' + String(Date.now()).slice(-6);

  // Find or create donor
  let donorId = null;
  if (!form.is_anonymous && form.mobile) {
    const { data: existing } = await _db
      .from('donors').select('id, total_donated').eq('mobile', form.mobile).single();

    if (existing) {
      donorId = existing.id;
      // Update total donated
      await _db.from('donors').update({
        total_donated: (existing.total_donated || 0) + parseFloat(form.amount),
        last_donated_at: new Date().toISOString()
      }).eq('id', donorId);
    } else {
      const donorNo = 'KH-D-' + String(Date.now()).slice(-4).padStart(4, '0');
      const { data: newDonor } = await _db.from('donors').insert({
        donor_no:    donorNo,
        name:        form.name,
        mobile:      form.mobile,
        email:       form.email,
        address:     form.address,
        district:    form.district,
        is_anonymous: false,
        total_donated: parseFloat(form.amount),
        last_donated_at: new Date().toISOString()
      }).select().single();
      if (newDonor) donorId = newDonor.id;
    }
  }

  // Record donation
  const { data, error } = await _db.from('donations').insert({
    donation_no:     donationNo,
    donor_id:        donorId,
    donor_name:      form.is_anonymous ? 'Anonymous' : form.name,
    donor_mobile:    form.mobile,
    amount:          parseFloat(form.amount),
    payment_method:  form.payment_method || 'bkash',
    transaction_ref: form.transaction_ref,
    purpose:         form.purpose || 'general',
    is_anonymous:    form.is_anonymous || false,
    status:          'confirmed',
    confirmed_at:    new Date().toISOString()
  }).select().single();

  return { data, error, donationNo };
};

// ────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ────────────────────────────────────────────────────────────

/** Log a sent notification */
KH.logNotification = async ({ loanId, repaymentId, borrowerId, borrowerName, borrowerMobile, channel, template, message, status, errorMessage }) => {
  const { data, error } = await _db.from('notification_log').insert({
    loan_id:         loanId,
    repayment_id:    repaymentId,
    borrower_id:     borrowerId,
    borrower_name:   borrowerName,
    borrower_mobile: borrowerMobile,
    channel, template, message,
    status:          status || 'sent',
    error_message:   errorMessage,
    sent_at:         new Date().toISOString()
  }).select().single();
  return { data, error };
};

/** Get notification history */
KH.getNotificationLog = async (limit = 100) => {
  const { data, error } = await _db
    .from('notification_log')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

// ────────────────────────────────────────────────────────────
// LEDGER
// ────────────────────────────────────────────────────────────

/** Get fund ledger entries */
KH.getLedger = async (limit = 200) => {
  const { data, error } = await _db
    .from('fund_ledger')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  return { data: data || [], error };
};

/** Add ledger entry */
KH.addLedgerEntry = async (entry) => {
  const { data, error } = await _db.from('fund_ledger').insert(entry).select().single();
  return { data, error };
};

// ────────────────────────────────────────────────────────────
// ADMIN USERS
// ────────────────────────────────────────────────────────────

/** Get all admin users */
KH.getAdminUsers = async () => {
  const { data, error } = await _db
    .from('admin_users')
    .select('id, name, email, role, phone, is_active, created_at')
    .order('created_at');
  return { data: data || [], error };
};

/** Create admin user (requires Supabase Auth + admin_users insert) */
KH.createAdminUser = async ({ email, password, name, role, phone }) => {
  // Note: creating auth.users requires service_role key (must be done via Supabase Dashboard
  // or server-side function). Here we only insert the profile row.
  const { data, error } = await _db.from('admin_users').insert({
    name, email, role: role || 'admin', phone, is_active: true
  }).select().single();
  return { data, error };
};

// ────────────────────────────────────────────────────────────
// UTILITY HELPERS
// ────────────────────────────────────────────────────────────

/** Format number as BDT with ৳ sign */
KH.bdt = (n) => '৳' + Number(n || 0).toLocaleString('bn-BD');

/** Format date as Bengali readable */
KH.fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
};

/** Days from today to a date */
KH.daysUntil = (dateStr) => {
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
};

/** Generate a reference number */
KH.genRef = (prefix) => prefix + '-' + String(Date.now()).slice(-6);

/** Toast notification (uses existing .toast if present in page) */
KH.toast = (msg, type = 'success') => {
  let t = document.querySelector('.kh-toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'kh-toast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:12px 20px;border-radius:10px;font-size:.9rem;z-index:9999;opacity:0;transition:opacity .3s;font-family:Inter,sans-serif;max-width:320px';
    document.body.appendChild(t);
  }
  const colors = { success: '#145230', error: '#7f1d1d', info: '#1e3a5f', warning: '#78350f' };
  t.style.background = colors[type] || colors.success;
  t.style.color = '#fff';
  t.style.border = `1px solid ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#9ED8B0'}`;
  t.textContent = msg;
  t.style.opacity = '1';
  setTimeout(() => { t.style.opacity = '0'; }, 3500);
};

/** Show/hide loading overlay */
KH.loading = (show) => {
  let ov = document.getElementById('kh-overlay');
  if (!ov && show) {
    ov = document.createElement('div');
    ov.id = 'kh-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,15,26,.7);display:flex;align-items:center;justify-content:center;z-index:9998;backdrop-filter:blur(2px)';
    ov.innerHTML = '<div style="color:#9ED8B0;font-size:1rem;font-family:Inter,sans-serif">লোড হচ্ছে…</div>';
    document.body.appendChild(ov);
  }
  if (ov) ov.style.display = show ? 'flex' : 'none';
};

// Expose db for advanced use
KH._db = _db;

console.log('✅ কর্জে হাসানা — Supabase client loaded');
