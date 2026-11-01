/* ============================================================
   رابط کاربری: فرم‌ها، ذخیره‌سازی، نتایج و جانشینی
   ============================================================ */
const DOCTOR = { name: 'دکتر حسن صادقی', code: '۳۳۵۳۷' };
const LS_KEY = 'spartina.patients.v1';
const DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];
const TABS = [['مشخصات'], ['درمان و عوارض'], ['سوابق و آزمایش‌ها'], ['طب ایرانی', 'اختیاری'], ['ترجیحات غذایی'], ['نتایج و برنامه']];
const TABS_BB = [['مشخصات'], ['تمرین و هدف'], ['سوابق و آزمایش‌ها'], ['طب ایرانی', 'اختیاری'], ['ترجیحات غذایی'], ['نتایج و برنامه']];
const isBB = () => P && P.prog === 'bb';
const MEAL_COLOR = { breakfast: '#F0A133', snack1: '#14B8A6', lunch: '#C7375A', snack2: '#0E9F9A', dinner: '#2D3C9A', snack3: '#5B2B83', pre: '#E0592A' };

const LABS = [
  ['fbs', 'قند ناشتا (FBS)', 'mg/dL'], ['hba1c', 'HbA1c', '%'], ['chol', 'کلسترول کل', 'mg/dL'], ['tg', 'تری‌گلیسرید', 'mg/dL'],
  ['ldl', 'LDL', 'mg/dL'], ['hdl', 'HDL', 'mg/dL'], ['alt', 'ALT', 'U/L'], ['ast', 'AST', 'U/L'], ['cr', 'کراتینین', 'mg/dL'],
  ['egfr', 'eGFR (اگر دارید)', 'mL/min'], ['tsh', 'TSH', 'mIU/L'], ['vitd', 'ویتامین D', 'ng/mL'], ['ferritin', 'فریتین', 'ng/mL'],
  ['hb', 'هموگلوبین', 'g/dL'], ['b12', 'ویتامین B12', 'pg/mL'], ['ua', 'اسید اوریک', 'mg/dL'],
];

let DB = { patients: {} };
let P = null, tab = 0, dayTab = 0, saveTimer = null, searchQ = '', viewMode = 'plan';

/* ---------------- فایل HTML اختصاصی بیمار ----------------
   نسخه‌ی تمیز همین صفحه پیش از هر رندر نگه داشته می‌شود تا فایل بیمار از روی آن ساخته شود.
   در فایل بیمار، داده‌ها در <script id="pt-embed"> قرار می‌گیرند و صفحه در «حالت بیمار» باز می‌شود. */
const SRC = (() => { const c = document.documentElement.cloneNode(true); const e = c.querySelector('#pt-embed'); if (e) e.remove(); return '<!doctype html>\n' + c.outerHTML; })();
const PT = window.PATIENT_EMBED || null;
const PT_KEY = PT ? 'spartina.pt.' + PT.patient.id : '';
function patientHtml(p, orig) {
  const data = JSON.stringify({ type: 'spartina-patient-html', v: 1, patient: p, orig: orig || p.plan }).replace(/</g, '\\u003c');
  return SRC.replace(/<body[^>]*>/, m => `${m}\n<script id="pt-embed">window.PATIENT_EMBED=${data};<\/script>`);
}
const safeName = s => (s || 'بیمار').replace(/[\\/:*?"<>|]/g, '');
function exportPatientHtml() {
  if (!ready()) return;
  ensurePlan(false); persist(true);
  download(`برنامه-غذایی-${safeName(P.name)}.html`, patientHtml(P, PT ? PT.orig : null), 'text/html');
  toast(PT ? 'فایل با تغییرات شما ذخیره شد.' : 'فایل اختصاصی بیمار دانلود شد؛ آن را برای بیمار بفرستید.');
}
/* ---------------- فرم پذیرش (بیمار در خانه پر می‌کند) ----------------
   همان صفحه با تگ pt-embed که window.INTAKE_EMBED را تعریف می‌کند، در «حالت فرم» باز می‌شود؛ بیمار فقط مراحل ۱ تا ۵ را
   می‌بیند (بدون بخش‌های مخصوص پزشک) و در آخر پاسخ را به‌صورت فایل کوچک JSON یا یک کد متنی برای پزشک می‌فرستد.
   اگر فایل فرم بدون اطلاعات بیمار روی سایت گذاشته شود، نوع برنامه را می‌شود با ?p=sp یا ?p=bb در لینک تعیین کرد.
   «در مطب»: همین فرم روی دستگاه پزشک باز می‌شود (IN.clinic) و پاسخ‌ها مستقیم در پرونده ذخیره می‌شود؛ فایلی رد و بدل نمی‌شود. */
let IN = window.INTAKE_EMBED || null;
if (IN && !IN.prog) { const q = new URLSearchParams(location.search).get('p'); if (q === 'sp' || q === 'bb') IN.prog = q; }
const IN_KEY = IN ? 'spartina.in.' + (IN.id || 'generic') : '';
function startClinicIntake(kind) {
  if (kind !== 'p' || !P) { P = newPatient(); P.prog = kind; }
  IN = { clinic: 1, id: P.id, prog: P.prog, mods: [...inMods] };
  document.body.classList.add('pt', 'intake');
  tab = 0; tsub = 0; tsec = 0;
  persist(true); renderAll(); scrollTo(0, 0);
}
function endClinicIntake(done) {
  IN = null;
  document.body.classList.remove('pt', 'intake');
  if (done) { P.intakeAt = Date.now(); P.plan = null; }
  tab = done && ready() ? 5 : 0;
  persist(true); renderAll(); scrollTo(0, 0);
  if (done) toast(`فرم ${P.name || 'بیمار'} در پرونده ثبت شد؛ هشدارها و برنامه را بررسی کنید.`);
}
const IN_FIELDS = ['id', 'prog', 'name', 'phone', 'age', 'sex', 'height', 'weight', 'waist', 'goal', 'activity', 'dose', 'doseWeek', 'startDate', 'side', 'hx', 'labs', 'allergy', 'dislikes', 'mizajQ', 'note', 'info', 'tibbA'];
function intakeHtml(meta) {
  const data = JSON.stringify({ type: 'spartina-intake', v: 1, ...meta }).replace(/</g, '\\u003c');
  return SRC.replace(/<body[^>]*>/, m => `${m}\n<script id="pt-embed">window.INTAKE_EMBED=${data};<\/script>`);
}
function exportIntake(kind) {
  // kind: 'sp' یا 'bb' = فرم خام؛ 'p' = فرم برای پرونده‌ی باز
  const meta = kind === 'p' && P ? { id: P.id, name: P.name, phone: P.phone, prog: P.prog, sex: P.sex } : { prog: kind };
  meta.mods = [...inMods];
  const nm = kind === 'p' && P ? safeName(P.name) : (kind === 'bb' ? 'بدنسازی' : 'اسپارتینا');
  download(`فرم-پذیرش-${nm}.html`, intakeHtml(meta), 'text/html');
  toast('فایل فرم پذیرش دانلود شد؛ آن را برای بیمار بفرستید.');
}
function intakeReply() {
  const p = {};
  IN_FIELDS.forEach(k => { if (P[k] !== undefined) p[k] = P[k]; });
  if (P.prog === 'bb') { const b = bbOf(P); p.bb = { goal: b.goal, days: b.days, time: b.time, bf: b.bf, foods: b.foods || [] }; }
  return { type: 'spartina-intake-reply', v: 1, sent: Date.now(), patient: p };
}
// کد متنی پاسخ: «SPI1:» + base64 متن JSON (UTF-8)
function intakeCode() {
  const bytes = new TextEncoder().encode(JSON.stringify(intakeReply()));
  let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return 'SPI1:' + btoa(s);
}
function decodeIntake(code) {
  const b = atob(code.trim().replace(/^SPI1:/, '').replace(/\s+/g, ''));
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))));
}
async function sendIntake(mode) {
  if (!ready()) { toast('نام، سن، جنسیت، قد و وزن را در مرحله‌ی ۱ کامل کنید.'); tab = 0; renderMain(); return; }
  persist(true);
  const name = `فرم-پاسخ-${safeName(P.name)}.json`, json = JSON.stringify(intakeReply());
  if (mode === 'share') {
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'فرم پذیرش', text: `فرم پذیرش ${P.name}` }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    toast('ارسال مستقیم در این مرورگر ممکن نیست؛ فایل ذخیره شد، آن را در واتساپ یا تلگرام بفرستید.');
  }
  download(name, json);
  if (mode !== 'share') toast('فایل پاسخ ذخیره شد؛ آن را برای پزشک بفرستید.');
}
async function copyIntakeCode() {
  if (!ready()) { toast('نام، سن، جنسیت، قد و وزن را در مرحله‌ی ۱ کامل کنید.'); return; }
  persist(true);
  const code = intakeCode(), box = $('#incode');
  if (box) { box.value = code; box.style.display = 'block'; box.select(); }
  try { await navigator.clipboard.writeText(code); toast('کد کپی شد؛ آن را در واتساپ یا تلگرام برای پزشک بفرستید.'); }
  catch (e) { toast('کد زیر را انتخاب و کپی کنید.'); }
}
/* پزشک: نشاندن پاسخ فرم در پرونده. بخش‌های مخصوص پزشک (مکمل‌ها، پاکسازی، مزاج دستی، تنظیم دستی) دست نمی‌خورند. */
function mergeIntake(r) {
  const ip = r.patient || {};
  let p = ip.id && DB.patients[ip.id];
  if (!p) { p = newPatient(); if (ip.id) p.id = ip.id; }
  IN_FIELDS.forEach(k => { if (k !== 'id' && ip[k] !== undefined) p[k] = ip[k]; });
  if (ip.bb) p.bb = Object.assign(bbOf(p), ip.bb);
  p.intakeAt = r.sent || Date.now();
  p.plan = null;
  DB.patients[p.id] = p; saveDB();
  P = p; tab = 5; dayTab = 0;
  toast(`فرم ${p.name || 'بیمار'} در پرونده نشست؛ هشدارها و برنامه را بررسی کنید.`);
}
// بخش‌های طب ایرانی که در فرم پذیرش می‌آیند (مزاج جبلی همیشه هست)
const inMods = new Set();
let inWhere = 'home'; // بیمار فرم را کجا پر می‌کند: home = در خانه (فایل برای بیمار)، clinic = در مطب (روی همین دستگاه)
const IN_MOD_FA = [['sette', 'سته‌ی ضروریه'], ['organ', 'مزاج اعضا'], ['humor', 'غلبه‌ی اخلاط']];
function openIntakeMenu(el) {
  closePopover();
  const pop = document.createElement('div');
  pop.className = 'pop';
  const fill = () => {
    const home = inWhere === 'home';
    pop.innerHTML = `<h4>فرم پذیرش برای بیمار</h4>
    <p class="empty" style="margin:0 0 6px">بیمار فرم را کجا پر می‌کند؟</p>
    <div class="chips" style="margin-bottom:10px"><span class="chip ${home ? 'on' : ''}" data-inwhere="home">🏠 در خانه</span><span class="chip ${home ? '' : 'on'}" data-inwhere="clinic">🏥 در مطب</span></div>
    <p class="empty" style="margin:0 0 6px">مزاج جبلی همیشه در فرم هست. بخش‌های دیگر طب ایرانی:</p>
    <div class="chips" style="margin-bottom:8px">${IN_MOD_FA.map(([k, t]) => `<span class="chip ${inMods.has(k) ? 'on' : ''}" data-inmod="${k}">${t}</span>`).join('')}</div>
    ${home ? `${P && P.name ? `<button data-in="p"><span>فرم برای «${esc(P.name)}»</span><small>نام و نوع برنامه از قبل پر شده</small></button>` : ''}
    <button data-in="sp"><span>فرم خام — همراه اسپارتینا</span><small>برای بیمار تازه</small></button>
    <button data-in="bb"><span>فرم خام — بدنسازی</span><small>برای ورزشکار تازه</small></button>
    <button data-in="paste"><span>📋 چسباندن کد پاسخ بیمار</span><small>اگر بیمار به‌جای فایل، کد فرستاده</small></button>
    <p class="empty" style="margin:8px 0 0">یک فایل دانلود می‌شود که برای بیمار می‌فرستید. فایل پاسخ (JSON) بیمار را با «باز کردن پرونده» باز کنید.</p>`
      : `${P && P.name ? `<button data-in="p"><span>فرم برای «${esc(P.name)}»</span><small>در همین پرونده ثبت می‌شود</small></button>` : ''}
    <button data-in="sp"><span>بیمار تازه — همراه اسپارتینا</span><small>پرونده‌ی تازه ساخته می‌شود</small></button>
    <button data-in="bb"><span>بیمار تازه — بدنسازی</span><small>پرونده‌ی تازه ساخته می‌شود</small></button>
    <p class="empty" style="margin:8px 0 0">فرم روی همین دستگاه باز می‌شود و بخش‌های مخصوص پزشک پنهان است. دستگاه را به بیمار بدهید؛ در پایان با «تحویل به پزشک» پاسخ‌ها مستقیم در پرونده ثبت می‌شود.</p>`}`;
  };
  fill();
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect();
  pop.style.top = (r.bottom + 6) + 'px';
  pop.style.left = Math.max(10, Math.min(r.left, innerWidth - 330)) + 'px';
  pop.onclick = e => {
    const w = e.target.closest('[data-inwhere]');
    if (w) { e.stopPropagation(); inWhere = w.dataset.inwhere; fill(); return; } // بعد از fill عنصر کلیک‌شده جدا می‌شود؛ نباید کلیک بیرونی حساب شود
    const m = e.target.closest('[data-inmod]');
    if (m) { const k = m.dataset.inmod; inMods.has(k) ? inMods.delete(k) : inMods.add(k); m.classList.toggle('on'); return; }
    const b = e.target.closest('[data-in]'); if (!b) return;
    closePopover();
    if (inWhere === 'clinic') { startClinicIntake(b.dataset.in); return; }
    if (b.dataset.in !== 'paste') { exportIntake(b.dataset.in); return; }
    const code = prompt('کد پاسخ فرم بیمار را اینجا بچسبانید (با SPI1: شروع می‌شود):');
    if (!code) return;
    try { const j = decodeIntake(code); if (j.type !== 'spartina-intake-reply') throw 0; mergeIntake(j); renderAll(); } catch (er) { toast('این کد معتبر نیست.'); }
  };
}

function exportDocx() {
  if (!ready()) return;
  ensurePlan(false); persist(true);
  download(`برنامه-غذایی-${safeName(P.name)}.docx`, buildDocx(P, getT(), P.plan));
  toast('فایل Word دانلود شد.');
}

/* ---------------- ذخیره‌سازی ---------------- */
function loadDB() { try { const s = localStorage.getItem(LS_KEY); if (s) DB = JSON.parse(s); } catch (e) { DB = { patients: {} }; } if (!DB.patients) DB.patients = {}; }
function saveDB() { try { localStorage.setItem(LS_KEY, JSON.stringify(DB)); } catch (e) { toast('ذخیره در مرورگر ممکن نشد؛ از «ذخیره در لپ‌تاپ» استفاده کنید.'); } }
function persist(now) {
  if (!P) return;
  P.updated = Date.now();
  if (PT) { try { localStorage.setItem(PT_KEY, JSON.stringify(P)); } catch (e) { } return; }
  if (IN && !IN.clinic) { try { localStorage.setItem(IN_KEY, JSON.stringify(P)); } catch (e) { } return; }
  DB.patients[P.id] = P;
  clearTimeout(saveTimer);
  if (now) { saveDB(); renderSide(); } else saveTimer = setTimeout(() => { saveDB(); renderSide(); }, 400);
}
function newPatient() {
  return {
    id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), created: Date.now(), updated: Date.now(),
    prog: 'sp', bb: { goal: 'recomp', days: [0, 2, 4], time: 'afternoon', bf: '', ppk: '', creatine: false },
    name: '', phone: '', age: '', sex: 'f', height: '', weight: '', waist: '', goal: '', activity: 1,
    dose: 2.5, doseWeek: 1, startDate: '', side: {}, allowSupp: false, hx: {}, labs: {}, allergy: {}, dislikes: [],
    mizajQ: {}, mizajManual: '', ovr: {}, visits: [], plan: null, planKey: '', note: '',
  };
}
function download(name, data, type = 'application/json') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: type + ';charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const fileDate = () => new Date().toISOString().slice(0, 10);
function exportPatient() {
  if (!P) return;
  persist(true);
  download(`پرونده-${(P.name || 'بیمار').replace(/[\\/:*?"<>|]/g, '')}-${fileDate()}.json`, JSON.stringify({ type: 'spartina-patient', v: 1, patient: P }, null, 1));
  toast('فایل پرونده دانلود شد؛ آن را در پوشه‌ی پرونده‌ها نگه دارید.');
}
function exportAll() {
  download(`پشتیبان-همه-بیماران-${fileDate()}.json`, JSON.stringify({ type: 'spartina-backup', v: 1, patients: DB.patients }, null, 1));
  toast(`پشتیبان ${fa(Object.keys(DB.patients).length)} پرونده دانلود شد.`);
}
function importFile(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      let txt = rd.result;
      // فایل HTML بیمار (شاید با تغییرات خود بیمار) هم قابل بازکردن است
      if (/^\s*</.test(txt)) { const m = txt.match(/window\.PATIENT_EMBED=(\{[\s\S]*?\});<\/script>/); if (!m) throw new Error(); txt = JSON.stringify({ type: 'spartina-patient', patient: JSON.parse(m[1]).patient }); }
      const j = JSON.parse(txt);
      if (j.type === 'spartina-backup') { Object.assign(DB.patients, j.patients); saveDB(); toast(`${fa(Object.keys(j.patients).length)} پرونده بارگذاری شد.`); }
      else if (j.type === 'spartina-intake-reply' && j.patient) mergeIntake(j);
      else if (j.type === 'spartina-patient' && j.patient) { DB.patients[j.patient.id] = j.patient; saveDB(); P = j.patient; tab = 0; toast('پرونده باز شد.'); }
      else throw new Error();
      renderAll();
    } catch (e) { toast('این فایل پرونده‌ی معتبر نیست.'); }
  };
  rd.readAsText(file);
}

/* ---------------- کمکی‌ها ---------------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function getPath(o, p) { return p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o); }
function setPath(o, p, v) { const ks = p.split('.'); let x = o; ks.slice(0, -1).forEach(k => { if (x[k] == null || typeof x[k] !== 'object') x[k] = {}; x = x[k]; }); x[ks[ks.length - 1]] = v; }
function toEn(s) { return String(s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace('/', '.'); }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2800); }
function ready() { return P && P.name && +P.age > 0 && +P.height > 0 && +P.weight > 0 && P.sex; }

function inp(k, label, o = {}) {
  const v = getPath(P, k);
  return `<div class="fld"><label class="${o.req ? 'req' : ''}">${label}${o.u ? ` <span class="u">(${o.u})</span>` : ''}</label>
    <input data-k="${k}" ${o.num ? 'inputmode="decimal" data-num="1"' : ''} value="${esc(v == null ? '' : v)}" placeholder="${o.ph || ''}"></div>`;
}
function tog(k, label, cls = '') { return `<span class="chip ${cls} ${getPath(P, k) ? 'on' : ''}" data-tog="${k}">${label}</span>`; }
function pick(k, v, label, sub) {
  const on = String(getPath(P, k)) === String(v);
  return `<span class="chip ${sub ? 'big' : ''} ${on ? 'on' : ''}" data-set="${k}" data-v="${v}">${sub ? `<b>${label}</b><small>${sub}</small>` : label}</span>`;
}

/* ---------------- اهداف با اعمال تغییر دستی ---------------- */
function getT() {
  const T = computeTargets(P);
  const o = P.ovr || {};
  if (+o.kcal > 0) T.kcal = +o.kcal;
  if (+o.prot > 0) T.prot = +o.prot;
  if (+o.water > 0) T.water = +o.water;
  if (+o.kcal > 0 || +o.prot > 0) {
    T.fat = round(T.kcal * T.fatPct / 100 / 9, 1);
    T.carb = round((T.kcal - T.prot * 4 - T.fat * 9) / 4, 1);
    T.fiber = round(14 * T.kcal / 1000, 1);
    T.pctP = Math.round(T.prot * 4 / T.kcal * 100); T.pctC = Math.round(T.carb * 4 / T.kcal * 100); T.pctF = 100 - T.pctP - T.pctC;
  }
  return T;
}
function planKeyOf() {
  return JSON.stringify([P.age, P.sex, P.height, P.weight, P.activity, P.dose, P.doseWeek, P.side, P.hx, P.labs, P.allergy, P.dislikes, P.allowSupp, P.ovr, P.prog, P.prog === 'bb' && P.bb ? [P.bb.goal, P.bb.days, P.bb.time, P.bb.bf, P.bb.ppk] : null]);
}
function ensurePlan(force) {
  const key = planKeyOf();
  if (force || !P.plan || P.planKey !== key) {
    P.plan = generatePlan(P, getT());
    P.planKey = key;
    persist(true);
    return true;
  }
  return false;
}

/* ---------------- رندر ---------------- */
const LOGO = `<svg viewBox="0 0 48 48"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F6C26B"/><stop offset="1" stop-color="#F0A133"/></linearGradient></defs>
  <rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="url(#lg)" stroke-width="2.5"/><rect x="10" y="10" width="28" height="28" rx="3" fill="none" stroke="url(#lg)" stroke-width="2.5" transform="rotate(45 24 24)"/>
  <circle cx="24" cy="24" r="6" fill="#14B8A6"/><path d="M24 19c2 2 2 8 0 10-2-2-2-8 0-10z" fill="#fff"/></svg>`;

function renderTop() {
  if (PT) {
    $('#topbar').innerHTML = `<div class="brand">${LOGO}<div><b>برنامه‌ی تغذیه‌ی ${esc(P.name)}</b><small>زیر نظر ${DOCTOR.name} · شماره نظام پزشکی ${DOCTOR.code}</small></div></div>
      <div class="sp"></div>
      <button class="tbtn ${viewMode === 'compare' ? 'gold' : ''}" data-act="togglecompare">${viewMode === 'compare' ? '📋 بازگشت به رژیم' : '⚖️ مقایسه برندها'}</button>
      <button class="tbtn" data-act="exporthtml">💾 ذخیره‌ی تغییرات</button>
      <button class="tbtn" data-act="docx">📄 فایل Word</button>
      <button class="tbtn gold" data-act="pdf">⬇ دریافت PDF</button>`;
    return;
  }
  if (IN) {
    $('#topbar').innerHTML = `<div class="brand">${LOGO}<div><b>فرم پذیرش${P.prog === 'bb' ? ' · بدنسازی' : ''}</b><small>${DOCTOR.name} · شماره نظام پزشکی ${DOCTOR.code}</small></div></div><div class="sp"></div>
      ${IN.clinic ? '<button class="tbtn" data-act="inexit" title="بدون تحویل، به پرونده برمی‌گردد">خروج (پزشک)</button>' : ''}`;
    return;
  }
  $('#topbar').innerHTML = `<div class="brand">${LOGO}<div><b>برنامه‌ی تغذیه · اسپارتینا و بدنسازی</b><small>${DOCTOR.name} · شماره نظام پزشکی ${DOCTOR.code}</small></div></div>
    <div class="sp"></div>
    <button class="tbtn ${viewMode === 'compare' ? 'gold' : ''}" data-act="togglecompare">${viewMode === 'compare' ? '📋 بازگشت به پرونده و رژیم' : '⚖️ مقایسه برندها'}</button>
    <button class="tbtn" data-act="new">＋ بیمار جدید</button>
    <button class="tbtn" data-act="intake">📨 فرم پذیرش</button>
    <button class="tbtn" data-act="open">📂 باز کردن پرونده</button>
    <button class="tbtn" data-act="export" ${P ? '' : 'disabled'}>💾 ذخیره در لپ‌تاپ</button>
    <button class="tbtn" data-act="backup">🗂 پشتیبان همه</button>
    <a href="/SpartinaDiet_Standalone.html" download="SpartinaDiet.html" class="tbtn" style="text-decoration:none" title="دانلود فایل تک‌صفحه‌ای آفلاین برای باز کردن با مرورگر بدون اینترنت">📦 دانلود فایل آفلاین</a>
    <a href="/SpartinaDiet_Updated.zip" download="SpartinaDiet_Updated.zip" class="tbtn" style="text-decoration:none" title="دانلود کل سورس‌کد و فایل‌های پروژه در قالب ZIP">🗜️ دانلود سورس (ZIP)</a>
    <button class="tbtn gold" data-act="pdf" ${ready() ? '' : 'disabled'}>⬇ دریافت PDF</button>`;
}

function renderSide() {
  const list = Object.values(DB.patients).sort((a, b) => b.updated - a.updated)
    .filter(x => !searchQ || (x.name || '').includes(searchQ) || (x.phone || '').includes(searchQ));
  $('#side').innerHTML = `<h3>پرونده‌های ذخیره‌شده (${fa(Object.keys(DB.patients).length)})</h3>
    <input class="search" id="search" placeholder="جستجوی نام یا تلفن…" value="${esc(searchQ)}">
    ${list.length ? list.map(x => `<button class="pt ${P && P.id === x.id ? 'on' : ''}" data-open="${x.id}"><b>${esc(x.name || 'بدون نام')}</b>
      <small>${x.weight ? fa(x.weight) + ' کیلو · ' : ''}${x.prog === 'bb' ? '💪 ' + (BB_GOAL[(x.bb || {}).goal] || BB_GOAL.recomp).t.split(' ')[0] : 'دوز ' + fa(x.dose)} · ${jalali(x.updated)}</small></button>`).join('')
      : '<div class="empty">هنوز پرونده‌ای ثبت نشده است. با «بیمار جدید» شروع کنید.</div>'}
    <div style="margin-top:14px; padding:10px 12px; border-radius:10px; background:var(--turqs); border:1px solid #BDE8E3; font-size:12px; line-height:1.8">
      <b style="color:var(--turq); display:block; margin-bottom:2px">📥 استخراج برنامه:</b>
      <a href="/SpartinaDiet_Standalone.html" download="SpartinaDiet.html" style="color:var(--lapis); font-weight:700; display:block">⬇️ دانلود فایل مستقل آفلاین (HTML)</a>
      <a href="/SpartinaDiet_Updated.zip" download="SpartinaDiet_Updated.zip" style="color:var(--lapis); font-weight:700; display:block">📦 دانلود کل کدهای پروژه (ZIP)</a>
    </div>
    <div style="margin-top:10px">
      <button class="btn gold sm" data-act="viewcompare" style="width:100%; justify-content:center">⚖️ مقایسه برندهای مکمل (وی و کراتین)</button>
    </div>
    <p class="empty" style="margin-top:14px;border-top:1px dashed var(--line);padding-top:10px">پرونده‌ها در همین مرورگر نگه داشته می‌شوند. برای اطمینان، هر پرونده را با «ذخیره در لپ‌تاپ» در یک پوشه نگه دارید و هر چند وقت یک بار «پشتیبان همه» بگیرید.</p>
    ${P ? `<button class="btn ghost sm" data-act="del" style="color:var(--pome)">حذف این پرونده از مرورگر</button>` : ''}`;
}

function renderMain() {
  if (viewMode === 'compare') {
    $('#main').innerHTML = compareView();
    if (typeof updateCmpVisualChart === 'function') {
      setTimeout(updateCmpVisualChart, 0);
    }
    return;
  }
  if (P && !P.prog) P.prog = 'sp';
  if (P && !P.micOff) P.micOff = (P.bb && P.bb.micOff) || {}; // پرونده‌های نسخه‌ی قبل
  if (PT) { $('#main').innerHTML = patientView(); return; }
  if (!P) {
    $('#main').innerHTML = `<div class="card" style="text-align:center;padding:50px 20px">${LOGO.replace('<svg', '<svg style="width:90px;height:90px"')}
      <h2 style="margin-top:12px">به برنامه‌ی تغذیه خوش آمدید</h2>
      <p class="lead">برنامه‌ی همراه درمان با اسپارتینا یا برنامه‌ی ویژه‌ی بدنسازان. برای شروع یک پرونده‌ی جدید بسازید یا یک پرونده‌ی ذخیره‌شده را باز کنید.</p>
      <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap">
        <button class="btn pri" data-act="new">＋ ساخت پرونده‌ی جدید</button>
        <button class="btn ghost" data-act="open">📂 باز کردن فایل پرونده</button>
        <button class="btn gold" data-act="viewcompare">⚖️ مقایسه برندهای مکمل (وی و کراتین)</button>
      </div></div>`;
    return;
  }
  if (IN) { $('#main').innerHTML = intakeView(); return; }
  const steps = `<nav class="steps">${(isBB() ? TABS_BB : TABS).map((t, i) => `<button class="step ${i === tab ? 'on' : ''}" data-tab="${i}"><i>${fa(i + 1)}</i>${t[0]}${t[1] ? ` <span class="opt">(${t[1]})</span>` : ''}</button>`).join('')}</nav>`;
  const body = [tabProfile, isBB() ? tabTrain : tabTreat, tabHistory, tabTibb, tabPrefs, tabResults][tab]();
  const nav = `<div class="nav">${tab > 0 ? `<button class="btn ghost" data-tab="${tab - 1}">→ مرحله‌ی قبل</button>` : '<span></span>'}
    ${tab < 5 ? `<button class="btn pri" data-tab="${tab + 1}">مرحله‌ی بعد ←</button>` : ''}</div>`;
  $('#main').innerHTML = steps + body + nav;
}

function renderAll() { renderTop(); renderSide(); renderMain(); }

/* ---------- حالت فرم پذیرش ---------- */
function intakeView() {
  const T6 = [['مشخصات'], [isBB() ? 'تمرین و هدف' : 'درمان و عوارض'], ['سوابق و آزمایش‌ها'], [(IN.mods || []).length ? 'مزاج و سبک زندگی' : 'مزاج', 'اختیاری'], ['ترجیحات غذایی'], ['ارسال برای پزشک']];
  const steps = `<nav class="steps">${T6.map((t, i) => `<button class="step ${i === tab ? 'on' : ''}" data-tab="${i}"><i>${fa(i + 1)}</i>${t[0]}${t[1] ? ` <span class="opt">(${t[1]})</span>` : ''}</button>`).join('')}</nav>`;
  const hello = tab === 0 ? `<section class="card pt-hero"><h2>سلام${P.name ? ' ' + esc(P.name) : ''} 🌿</h2>
    <p class="lead" style="margin:0">${IN.clinic ? `این فرم برای تنظیم برنامه‌ی ${isBB() ? 'تغذیه‌ی ورزشی' : 'غذایی'} شماست. هر مرحله را با حوصله پر کنید. اگر سؤالی برایتان روشن نبود، از پزشک یا منشی بپرسید. در مرحله‌ی آخر «تحویل به پزشک» را بزنید.`
      : `این فرم را ${DOCTOR.name} برای تنظیم برنامه‌ی ${isBB() ? 'تغذیه‌ی ورزشی' : 'غذایی'} شما فرستاده است. هر مرحله را با حوصله پر کنید؛ پاسخ‌ها روی همین گوشی نگه داشته می‌شوند و می‌توانید بعداً ادامه دهید. در مرحله‌ی آخر، پاسخ را برای پزشک بفرستید.`}</p></section>` : '';
  const body = [tabProfile, isBB() ? tabTrain : tabTreat, tabHistory, tabTibb, tabPrefs, IN.clinic ? tabHandover : tabSend][tab]();
  const nav = `<div class="nav">${tab > 0 ? `<button class="btn ghost" data-tab="${tab - 1}">→ مرحله‌ی قبل</button>` : '<span></span>'}
    ${tab < 5 ? `<button class="btn pri" data-tab="${tab + 1}">مرحله‌ی بعد ←</button>` : ''}</div>`;
  return steps + hello + body + nav;
}
function tabSend() {
  const miss = [['name', 'نام'], ['age', 'سن'], ['height', 'قد'], ['weight', 'وزن']].filter(([k]) => !(P[k] && (k === 'name' || +P[k] > 0))).map(x => x[1]);
  const nMz = MIZAJ_Q.filter(q => (P.mizajQ || {})[q.id] != null).length;
  return `<section class="card"><h2>ارسال برای پزشک</h2>
    ${miss.length ? `<div class="alert red">این موارد در مرحله‌ی ۱ کامل نشده است: ${miss.join('، ')}</div>` : '<div class="alert teal">✓ اطلاعات اصلی کامل است.</div>'}
    <p class="lead">پرسشنامه‌ی مزاج: ${fa(nMz)} از ${fa(MIZAJ_Q.length)} سؤال پاسخ داده شده${nMz < MIZAJ_Q.length ? ' (اختیاری است، ولی هرچه کامل‌تر باشد بهتر است)' : ''}.</p>
    <div class="outs-g">
      <button class="out" data-act="insend"><i>📤</i><b>ارسال برای پزشک</b><small>واتساپ، تلگرام یا هر برنامه‌ای که با آن با پزشک در تماس هستید را انتخاب کنید</small></button>
      <button class="out" data-act="insave"><i>💾</i><b>ذخیره‌ی فایل پاسخ</b><small>اگر ارسال مستقیم کار نکرد، فایل را ذخیره کنید و در چت برای پزشک بفرستید</small></button>
      <button class="out" data-act="incode"><i>📋</i><b>کپی کد پاسخ</b><small>یک متن کپی می‌شود؛ آن را مثل یک پیام برای پزشک بفرستید</small></button>
    </div>
    <textarea id="incode" readonly rows="4" style="display:none;width:100%;margin-top:12px;direction:ltr;font-size:11px"></textarea>
    <p class="lead" style="margin:12px 0 0">اطلاعات شما فقط روی همین گوشی است و جز برای پزشکتان به جایی فرستاده نمی‌شود. اگر بعداً چیزی را عوض کردید، دوباره ارسال کنید.</p></section>`;
}

// پایان فرم در مطب: پاسخ‌ها از قبل در پرونده ذخیره شده‌اند؛ این دکمه فقط فرم را می‌بندد و پرونده را به پزشک نشان می‌دهد
function tabHandover() {
  const miss = [['name', 'نام'], ['age', 'سن'], ['height', 'قد'], ['weight', 'وزن']].filter(([k]) => !(P[k] && (k === 'name' || +P[k] > 0))).map(x => x[1]);
  const nMz = MIZAJ_Q.filter(q => (P.mizajQ || {})[q.id] != null).length;
  return `<section class="card"><h2>پایان فرم</h2>
    ${miss.length ? `<div class="alert red">این موارد در مرحله‌ی ۱ کامل نشده است: ${miss.join('، ')}</div>` : '<div class="alert teal">✓ اطلاعات اصلی کامل است.</div>'}
    <p class="lead">پرسشنامه‌ی مزاج: ${fa(nMz)} از ${fa(MIZAJ_Q.length)} سؤال پاسخ داده شده${nMz < MIZAJ_Q.length ? ' (اختیاری است، ولی هرچه کامل‌تر باشد بهتر است)' : ''}.</p>
    <p class="lead">اگر همه‌چیز را پر کرده‌اید، دکمه‌ی زیر را بزنید و دستگاه را به پزشک یا منشی بدهید.</p>
    <button class="btn pri" data-act="indone">✓ تحویل به پزشک</button></section>`;
}

/* ---------- مرحله ۱ ---------- */
function tabProfile() {
  const bmi = +P.weight && +P.height ? P.weight / Math.pow(P.height / 100, 2) : null;
  return `${IN && IN.prog ? '' : `<section class="card"><h2>نوع برنامه</h2><div class="chips">${pick('prog', 'sp', 'همراه درمان با اسپارتینا', 'کاهش وزن با تیرزپاتاید، بر اساس دوز و عوارض')}${pick('prog', 'bb', '💪 بدنسازی', 'کات، حجم یا ریکامپ؛ بدون دارو، با وعده‌های قبل و بعد از تمرین')}</div></section>`}
    <section class="card"><h2>${IN ? 'مشخصات شما' : isBB() ? 'مشخصات ورزشکار' : 'مشخصات بیمار'}</h2><p class="lead">اطلاعات پایه برای محاسبه‌ی انرژی، پروتئین و آب مورد نیاز.</p>
    <div class="grid">${inp('name', 'نام و نام خانوادگی', { req: 1 })}${inp('phone', 'تلفن تماس', { ph: 'اختیاری' })}
    ${inp('age', 'سن', { req: 1, num: 1, u: 'سال' })}${inp('height', 'قد', { req: 1, num: 1, u: 'سانتی‌متر' })}
    ${inp('weight', 'وزن فعلی', { req: 1, num: 1, u: 'کیلوگرم' })}${inp('waist', 'دور کمر', { num: 1, u: 'سانتی‌متر' })}
    ${inp('goal', 'وزن هدف', { num: 1, u: 'کیلوگرم' })}</div>
    <div class="sub">جنسیت</div><div class="chips">${pick('sex', 'f', 'زن')}${pick('sex', 'm', 'مرد')}</div>
    <div class="sub">سطح فعالیت بدنی</div><div class="chips">${ACT.map((a, i) => pick('activity', i, a.t, a.d)).join('')}</div>
    ${bmi ? `<div class="alert teal" style="margin-top:16px">نمایه‌ی توده‌ی بدن (BMI): <b>${fa(bmi, 1)}</b> — ${bmiClass(bmi)}</div>` : ''}
  </section>
  <section class="card"><h2>اطلاعات تکمیلی <span class="draft">اختیاری</span></h2><p class="lead">برای پرونده و بخش طب ایرانی؛ در محاسبه‌ی برنامه‌ی غذایی اثری ندارد.</p>
    <div class="grid">${inp('info.birthDate', 'تاریخ تولد', { ph: 'مثلاً ۱۳۷۰/۰۵/۱۲' })}${inp('info.birthPlace', 'محل تولد')}
    ${inp('info.job', 'شغل')}${inp('info.edu', 'تحصیلات')}${inp('info.children', 'تعداد فرزند', { num: 1 })}</div>
    <div class="sub">وضعیت تأهل</div><div class="chips">${pick('info.marital', 'single', 'مجرد')}${pick('info.marital', 'married', 'متأهل')}</div>
    <div class="sub">گروه خونی</div><div class="chips">${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => pick('info.blood', g, `<span dir="ltr">${g}</span>`)).join('')}</div>
  </section>`;
}
function bmiClass(b) { return b < 18.5 ? 'کم‌وزن' : b < 25 ? 'طبیعی' : b < 30 ? 'اضافه‌وزن' : b < 35 ? 'چاقی درجه ۱' : b < 40 ? 'چاقی درجه ۲' : 'چاقی درجه ۳'; }

/* ---------- مرحله ۲ ---------- */
function tabTreat() {
  const ph = treatmentPhase(P);
  return `<section class="card"><h2>درمان با اسپارتینا (تیرزپاتاید)</h2><p class="lead">برنامه‌ی غذایی با مرحله‌ی دوز و عوارض گوارشی تنظیم می‌شود.</p>
    <div class="sub">دوز فعلی هفتگی (میلی‌گرم)</div><div class="chips">${DOSES.map(d => pick('dose', d, fa(d, 1) + ' میلی‌گرم')).join('')}</div>
    <div class="sub">چندمین هفته در این دوز است؟</div><div class="chips">${[1, 2, 3, 4].map(w => pick('doseWeek', w, w === 4 ? 'هفته‌ی ۴ یا بیشتر' : 'هفته‌ی ' + fa(w))).join('')}</div>
    <div class="grid" style="margin-top:14px">${inp('startDate', 'تاریخ شروع درمان', { ph: 'مثلاً ۱۴۰۵/۰۷/۰۱' })}</div>
    <div class="alert gold" style="margin-top:16px"><div><b>${ph.title}</b><br>${ph.desc}</div></div>
    <div class="sub">عوارض فعلی (هر کدام وجود دارد را انتخاب کنید)</div><div class="chips">${SIDE.map(([k, t]) => tog('side.' + k, t, 'warn')).join('')}</div>
    ${IN ? '' : `<div class="sub">مکمل پروتئین</div><div class="chips">${tog('allowSupp', 'مصرف پودر پروتئین (وی) مجاز است')}</div>`}
  </section>`;
}

/* ---------- مرحله ۲ (بدنسازی) ---------- */
function tabTrain() {
  P.bb = bbOf(P);
  const b = P.bb, T = ready() ? getT() : null;
  const dayChips = DAYS.map((d, i) => `<span class="chip ${b.days.includes(i) ? 'on' : ''}" data-bbday="${i}">${d}</span>`).join('');
  return `<section class="card"><h2>هدف ورزشکار</h2><p class="lead">انرژی و پروتئین برنامه بر اساس هدف تنظیم می‌شود.</p>
    <div class="chips">${pick('bb.goal', 'cut', 'کات', 'چربی‌سوزی با حفظ عضله · انرژی ۲۰٪ کمتر از مصرف')}${pick('bb.goal', 'recomp', 'ریکامپ', 'کاهش چربی و حفظ عضله · انرژی برابر مصرف')}${pick('bb.goal', 'bulk', 'حجم', 'عضله‌سازی · انرژی ۱۰٪ بیشتر از مصرف')}</div>
    <div class="grid" style="margin-top:14px">${inp('bb.bf', 'درصد چربی بدن', { num: 1, u: '٪', ph: 'اختیاری' })}${IN ? '' : inp('bb.ppk', 'پروتئین به ازای هر کیلو وزن', { num: 1, u: 'گرم', ph: T ? 'خودکار: ' + fa(T.prot / +P.weight, 1) : 'خودکار' })}</div>
    <p class="lead" style="margin:8px 0 0">اگر درصد چربی را بدانید (مثلاً از دستگاه آنالیز بدن)، متابولیسم پایه و پروتئین دقیق‌تر حساب می‌شود.</p></section>
    <section class="card"><h2>برنامه‌ی تمرین</h2>
    <div class="sub">روزهای تمرین (${fa(b.days.length)} روز در هفته)</div><div class="chips">${dayChips}</div>
    <div class="sub">ساعت تمرین</div><div class="chips">${pick('bb.time', 'morning', 'صبح', '۶ تا ۱۰')}${pick('bb.time', 'noon', 'ظهر', '۱۰ تا ۱۴')}${pick('bb.time', 'afternoon', 'عصر', '۱۴ تا ۱۸')}${pick('bb.time', 'evening', 'شب', '۱۸ به بعد')}</div>
    <div class="alert teal" style="margin-top:14px">در روزهای تمرین یک وعده‌ی «قبل از تمرین» حدود ۱ تا ۲ ساعت پیش از تمرین، و وعده‌ی اصلی بعدی به‌عنوان «بعد از تمرین» با پروتئین و کربوهیدرات بیشتر چیده می‌شود.</div>
    <div class="sub">سطح فعالیت کل روز (با احتساب تمرین)</div><div class="chips">${ACT.map((a, i) => pick('activity', i, a.t, a.d)).join('')}</div></section>
    <section class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px">
        <h2 style="margin:0">سبد غذاهای انتخابی شما در برنامه بدنسازی</h2>
        <span style="font-size:12px;color:var(--muted);background:var(--saffs);padding:3px 10px;border-radius:999px;border:1px solid #F6D9A5">${b.foods && b.foods.length ? fa(b.foods.length) + ' قلم غذا برگزیده شده' : 'همه غذاها (انتخاب خودکار)'}</span>
      </div>
      <p class="lead">دقیقاً غذاهایی را که می‌خواهید در وعده‌های روزانه شما باشد تیک بزنید؛ موتور هوشمند برنامه، رژیم شما را منحصراً از میان همین غذاها (متناسب با توان مالی و سلیقه غذایی شما) با مقادیر گرمی استاندارد می‌چیند.</p>
      <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:14px">
        <button type="button" class="btn sm ghost" data-bbpreset="classic">⚡️ کلاسیک بدنسازی (مرغ، برنج، سفیده، جودوسر)</button>
        <button type="button" class="btn sm ghost" data-bbpreset="budget">💰 اقتصادی و کم‌هزینه (تخم‌مرغ، کشک، عدس، سیب‌زمینی)</button>
        <button type="button" class="btn sm ghost" data-bbpreset="premium">⭐ پریمیوم (فیله گوساله، سالمون، بوقلمون، وی)</button>
        <button type="button" class="btn sm ghost" data-bbpreset="clear">🔄 پاک کردن همه (انتخاب آزاد و خودکار)</button>
      </div>
      ${(typeof BB_FOOD_CATEGORIES !== 'undefined' ? BB_FOOD_CATEGORIES : []).map(cat => `
        <div class="sub" style="margin-top:10px">${cat.title}</div>
        <div class="chips">
          ${cat.items.map(([fid, name]) => {
            const on = (b.foods || []).includes(fid);
            return `<span class="chip ${on ? 'on' : ''}" data-bbfood="${fid}">${on ? '✓ ' : '＋ '}${name}</span>`;
          }).join('')}
        </div>
      `).join('')}
    </section>
    ${IN ? '' : `<section class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px">
        <h2 style="margin:0">مکمل‌های ورزشی <span class="draft">با تأیید پزشک</span></h2>
        <button type="button" class="btn gold sm" onclick="openSuppBrandModal('all')">🏷️ تصاویر، برندها و رتبه‌بندی کیفی مکمل‌ها</button>
      </div>
      <p class="lead">فقط مواردی که انتخاب کنید، با پروتکل کامل مصرف در PDF و Word می‌آید. پروتئین وی در برنامه‌ی غذایی هم حساب می‌شود. مکمل‌های ریزمغذی (ویتامین‌ها و املاح) بر اساس آزمایش‌ها و برنامه، در صفحه‌ی «نتایج و برنامه» پیشنهاد می‌شوند.</p>
      <div class="supp-g">${BB_SUPPS.map(s => {
        const k = s.tog || 'bb.sup.' + s.k, on = !!getPath(P, k);
        const brandCat = { whey: 'whey', casein: 'whey', creatine: 'creatine', caffeine: 'pre', citrulline: 'pre', betaAlanine: 'pre', bcaa: 'bcaa_eaa', eaa: 'bcaa_eaa', collagen: 'collagen', zma: 'zma_ashwa', ashwagandha: 'zma_ashwa' }[s.k] || 'all';
        return `<button class="supp ${on ? 'on' : ''}" data-tog="${k}">
          <b>${on ? '☑' : '☐'} ${s.n}</b>
          <small>${s.what}</small>
          <span class="supp-brand-link" onclick="event.stopPropagation(); openSuppBrandModal('${brandCat}')">👁️ تصاویر و رتبه‌بندی برندها</span>
        </button>`;
      }).join('')}</div>
      ${b.sup.creatine && T && (T.egfr && T.egfr < 60 || (P.hx || {}).ckd) ? '<div class="alert red" style="margin-top:12px">⚠ عملکرد کلیه کاهش یافته است؛ کراتین فقط با نظر نفرولوژیست.</div>' : ''}
      ${b.sup.caffeine && ((P.hx || {}).htn || (P.hx || {}).cvd) ? '<div class="alert red" style="margin-top:12px">⚠ فشار خون بالا یا بیماری قلبی: کافئین پیش از تمرین با احتیاط و با نظر پزشک.</div>' : ''}
    </section>
    <section class="card"><h2>دوره‌ی پاکسازی <span class="draft">اختیاری</span></h2>
    <p class="lead">برنامه‌ی پیش از صبحانه (سکنجبین عنابی یا کاسنی با اسفرزه) و پیش از ناهار و شام (زردچوبه، عسل، آبلیمو و گلاب)، همراه راهنمای مراقبت از کبد و کلیه و گیاهان و مکمل‌هایی که ورزشکاران به کار می‌برند. اگر فعال شود، دو صفحه به PDF و Word اضافه می‌شود.</p>
    <div class="chips">${tog('bb.detox.on', 'دوره‌ی پاکسازی در برنامه بیاید')}</div>
    ${b.detox.on ? `<div class="grid" style="margin-top:12px">${inp('bb.detox.days', 'طول دوره', { num: 1, u: 'روز', ph: '۱۴' })}</div>` : ''}
    ${b.detox.on && (+(P.labs || {}).fbs >= 126 || (P.hx || {}).dm) ? '<div class="alert red" style="margin-top:12px">⚠ دیابت: سکنجبین و عسل قند دارند؛ با احتیاط.</div>' : ''}
    ${b.detox.on && (P.hx || {}).gall ? '<div class="alert red" style="margin-top:12px">⚠ بیماری کیسه‌ی صفرا: زردچوبه با احتیاط.</div>' : ''}</section>`}`;
}

/* ---------- مرحله ۳ ---------- */
function tabHistory() {
  const egfr = egfrCKDEPI(+P.labs.cr, +P.age, P.sex);
  return `<section class="card"><h2>سوابق پزشکی</h2><p class="lead">برای هشدارها و تنظیم ایمن برنامه.</p>
    ${(() => { const list = HX.filter(([k]) => !(HX_FEMALE.includes(k) && P.sex === 'm')), cut = list.findIndex(([k]) => k === 'binge'); const chip = ([k, t]) => tog('hx.' + k, t, ['mtc', 'pregnant', 'pancreatitis'].includes(k) ? 'warn' : ''); return `<div class="chips">${list.slice(0, cut).map(chip).join('')}</div>
    <div class="sub">مشکلات دیگر${IN ? '' : ' <small style="font-weight:400;color:var(--muted)">(برای هر کدام در صفحه‌ی «نتایج و برنامه» مکمل پیشنهاد می‌شود)</small>'}</div><div class="chips">${list.slice(cut).map(chip).join('')}</div>`; })()}
    <div class="grid" style="margin-top:14px"><div class="fld" style="grid-column:1/-1"><label>داروهای دیگر / توضیحات</label><textarea data-k="note" rows="2">${esc(P.note)}</textarea></div></div></section>
    <section class="card"><h2>آزمایش‌ها <span class="draft">اختیاری</span></h2><p class="lead">هر کدام را که دارید وارد کنید؛ خالی گذاشتن اشکالی ندارد.</p>
    <div class="grid">${LABS.map(([k, t, u]) => inp('labs.' + k, t, { num: 1, u })).join('')}</div>
    ${egfr ? `<div class="alert teal" style="margin-top:14px">eGFR محاسبه‌شده از کراتینین (CKD-EPI 2021): <b>${fa(Math.round(egfr))}</b></div>` : ''}</section>`;
}

/* ---------- مرحله ۴ ---------- */
function tabPrefs() {
  const groups = {};
  Object.keys(META).forEach(id => { const g = META[id].g; if (g === 'spice' || g === 'supp') return; (groups[g] = groups[g] || []).push(id); });
  const ex = new Set(P.dislikes || []);
  return `<section class="card"><h2>محدودیت‌ها و حساسیت‌ها</h2><p class="lead">غذاهای مربوط به‌طور خودکار از برنامه حذف می‌شوند.</p>
    <div class="chips">${ALLERGY.filter(a => a[0] !== 'nosupp').map(([k, t]) => tog('allergy.' + k, t, 'warn')).join('')}</div></section>
    ${mizajSuggestCard()}
    <section class="card"><h2>${IN ? 'غذاهایی که دوست ندارید' : 'غذاهایی که بیمار دوست ندارد'}</h2><p class="lead">روی هر غذا بزنید تا از برنامه حذف شود (خط‌خورده = حذف). بقیه‌ی غذاها را برنامه به‌طور خودکار انتخاب می‌کند و بعداً هم می‌توانید هر قلم را جایگزین کنید.</p>
    ${Object.entries(groups).map(([g, ids]) => `<div class="sub">${GROUP_FA[g]}</div><div class="chips">${ids.map(id => `<span class="chip ${ex.has(id) ? 'ex' : ''}" data-dis="${id}">${FOOD[id] ? META[id].s : id}</span>`).join('')}</div>`).join('')}
  </section>`;
}

/* ---------- مرحله ۵ ---------- */
const MIZAJ_KEYS = ['hot-wet', 'hot-dry', 'cold-wet', 'cold-dry', 'hot-mid', 'cold-mid', 'mid-wet', 'mid-dry', 'mid-mid'];
// یک سطر دوقطبی ۰ تا ۱۰ با گزینه‌ی «نمی‌دانم». پاسخ همیشه به شکل اصلی ذخیره می‌شود (۰ = جمله‌ی r، ۱۰ = جمله‌ی l)؛
// flip فقط جای دو جمله را در صفحه عوض می‌کند تا اثر جای ثابت (همیشه گرمی در چپ) از بین برود.
function bipolarRow(num, rt, lt, a, flip, attr, note = '') {
  const val = mizajVal(a), disp = val == null ? null : flip ? 10 - val : val;
  const nums = Array.from({ length: 11 }, (_, n) => `<button class="mzn ${n < 5 ? 'r' : n > 5 ? 'l' : 'm'} ${disp === n ? 'on' : ''}" ${attr} data-v="${flip ? 10 - n : n}">${fa(n)}</button>`).join('');
  const [R, L] = flip ? [lt, rt] : [rt, lt];
  return `<div class="mq3 ${a == null ? 'un' : ''}"><i>${fa(num)}</i><div class="mzt r ${disp != null && disp < 5 ? 'on' : ''}">${R}</div><div class="mzs"><span class="mzr">${nums}</span><button class="mzn x ${a === 'x' ? 'on' : ''}" ${attr} data-v="x">نمی‌دانم</button></div><div class="mzt l ${disp != null && disp > 5 ? 'on' : ''}">${L}${note ? `<br><small style="color:var(--muted);font-weight:400">${note}</small>` : ''}</div></div>`;
}
function tabMizaj() {
  const ans = P.mizajQ || {};
  const r = mizajScore(ans);
  const man = P.mizajManual && MIZAJ_NAME[P.mizajManual] ? P.mizajManual : '';
  const fin = mizajOf(P);
  const av = mizajAvoid(fin);
  const nAns = MIZAJ_Q.filter(q => ans[q.id] != null).length;
  // نوار سهم دو کیفیت هر محور (مجموع = ۱۰۰٪)
  const gauge = (pct, lo, hi, col) => `<div class="mg"><span>${lo} ${fa(100 - pct, 1)}٪</span><div class="mg-b"><i style="right:${pct}%;background:${col}"></i></div><span>${hi} ${fa(pct, 1)}٪</span></div>`;
  let cat = '';
  const nH = MIZAJ_Q.filter(q => q.ax === 'h').length;
  const rows = MIZAJ_Q.map((q, qi) => {
    const a = ans[q.id];
    const head = (qi === 0 ? `<h3 class="mz-sec">🔥 بخش اول: محور گرمی و سردی (سؤال‌های ۱ تا ${fa(nH)})</h3>` : qi === nH ? `<h3 class="mz-sec">💧 بخش دوم: محور تری و خشکی (سؤال‌های ${fa(nH + 1)} تا ${fa(MIZAJ_Q.length)})</h3>` : '')
      + (q.cat !== cat ? `<div class="sub">${(cat = q.cat)}</div>` : '');
    return head + bipolarRow(qi + 1, q.r, q.l, a, qi % 2 === 1, `data-mq="${q.id}"`);
  }).join('');
  // اگر اختلاف یک محور بین ۵ تا ۱۰ درصد باشد، یادآوری «نزدیک به اعتدال»
  const near = r ? [['گرمی و سردی', r.hot], ['تری و خشکی', r.wet]].filter(([, p]) => Math.abs(p - 50) <= 5 && Math.abs(p - 50) > MIZAJ_TOL * 50).map(([t]) => t) : [];
  const nX = MIZAJ_Q.filter(q => ans[q.id] === 'x').length;
  return `<section class="card"><h2>پرسشنامه‌ی مزاج‌شناسی <span class="draft">اختیاری</span></h2>
    <p class="lead">این پرسشنامه <b>سرشت</b> شما را می‌سنجد، نه حال امروز را. به حالت طبیعی خودتان <b>پیش از ۲۰ تا ۲۵ سالگی، پیش از اضافه‌وزن و پیش از شروع دارو</b> فکر کنید. در هر سطر با یک عدد از ۰ تا ۱۰ نشان دهید به کدام جمله نزدیک‌ترید: <b>۰</b> = جمله‌ی سمت راست کاملاً صدق می‌کند، <b>۵</b> = بین این دو، <b>۱۰</b> = جمله‌ی سمت چپ کاملاً صدق می‌کند. جای جمله‌ها در سطرها عوض می‌شود؛ هر سطر را جدا بخوانید. اگر جواب را نمی‌دانید (مثلاً درباره‌ی نوزادی)، «نمی‌دانم» را بزنید و حدس نزنید. با زدن دوباره‌ی همان گزینه، پاسخ پاک می‌شود.</p>
    <div class="mz-prog">${fa(nAns)} از ${fa(MIZAJ_Q.length)} سؤال پاسخ داده شده${nX ? ` (${fa(nX)} «نمی‌دانم»)` : ''}<div class="mg-b"><i style="right:0;width:${nAns / MIZAJ_Q.length * 100}%;background:var(--turq);height:100%;border-radius:99px;top:0;transform:none"></i></div></div>
    ${rows}
    ${IN ? '' : r ? `<div class="mres"><b style="font-size:18px">نتیجه‌ی پرسشنامه: ${MIZAJ_NAME[r.key]}</b><small style="display:block;margin-bottom:8px">${fa(r.nh)} پاسخ در محور گرمی و سردی · ${fa(r.nw)} پاسخ در محور تری و خشکی · اختلاف کمتر از ${fa(MIZAJ_TOL * 100)}٪ = معتدل${near.length ? ` · محور ${near.join(' و ')} نزدیک به اعتدال است (اختلاف کمتر از ۱۰٪)؛ با معاینه تأیید کنید` : ''}</small>
      ${gauge(r.hot, 'سردی', 'گرمی', 'var(--pome)')}${gauge(r.wet, 'خشکی', 'تری', 'var(--turq)')}</div>` : nAns ? `<p class="lead" style="margin-top:12px">برای نمایش نتیجه، دست‌کم نیمی از سؤال‌های هر بخش باید پاسخ عددی داشته باشد (گرمی و سردی: ${fa(mizajNeed('h'))}، تری و خشکی: ${fa(mizajNeed('w'))} سؤال). «نمی‌دانم» شمرده نمی‌شود.</p>` : ''}
    <div style="margin-top:12px"><button class="btn ghost sm" data-act="mizclear">پاک کردن پاسخ‌ها</button></div></section>
    ${IN ? '' : `<section class="card"><h2>تعیین دستی مزاج توسط پزشک</h2>
    <p class="lead">اگر نتیجه‌ی پرسشنامه با تشخیص شما یکی نیست، مزاج را خودتان انتخاب کنید. انتخاب دستی بر نتیجه‌ی پرسشنامه مقدم است.</p>
    <div class="chips"><span class="chip ${man ? '' : 'on'}" data-act="mizauto">خودکار (از پرسشنامه)</span>${MIZAJ_KEYS.map(k => `<span class="chip ${man === k ? 'on' : ''}" data-set="mizajManual" data-v="${k}">${MIZAJ_NAME[k]}</span>`).join('')}</div>
    ${fin ? `<div class="mres"><b style="font-size:18px">مزاج نهایی: ${MIZAJ_NAME[fin.key]}</b><br><small>${fin.manual ? 'تعیین دستی پزشک' : 'بر اساس پرسشنامه'}${av.length ? ` · ${fa(av.length)} غذا برای پرهیز پیشنهاد شده؛ در مرحله‌ی بعد مراجعه‌کننده تصمیم می‌گیرد.` : ''}</small></div>` : ''}
    </section>`}`;
}

function mizajSuggestCard() {
  const mz = mizajOf(P), av = mizajAvoid(mz);
  if (!av.length) return '';
  const ex = new Set(P.dislikes || []);
  const n = av.filter(id => ex.has(id)).length;
  return `<section class="card"><h2>پیشنهاد پرهیز بر اساس مزاج <span class="draft">فقط پیشنهاد</span></h2>
    <p class="lead">${IN ? 'بر اساس پاسخ‌های پرسشنامه' : `برای مزاج <b>${MIZAJ_NAME[mz.key]}</b>`} معمولاً کم‌کردن این غذاها پیشنهاد می‌شود. هیچ‌کدام خودکار حذف نشده‌اند؛ مراجعه‌کننده هر کدام را که بخواهد با یک ضربه حذف می‌کند (خط‌خورده = حذف از برنامه).</p>
    <div class="chips">${av.map(id => `<span class="chip ${ex.has(id) ? 'ex' : ''}" data-dis="${id}">${META[id].s}</span>`).join('')}</div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost sm" data-act="mizall">حذف همه‌ی پیشنهادها</button>${n ? `<button class="btn ghost sm" data-act="miznone">برگرداندن همه به برنامه</button>` : ''}<small style="align-self:center;color:var(--muted)">${fa(n)} از ${fa(av.length)} مورد حذف شده</small></div></section>`;
}

/* ---------- مرحله ۶ ---------- */
function tabResults() {
  if (!ready()) return `<section class="card"><div class="alert red">برای دیدن نتایج، نام، سن، جنسیت، قد و وزن را در مرحله‌ی ۱ کامل کنید.</div></section>`;
  const T = getT();
  const fresh = ensurePlan(false);
  const plan = P.plan;
  const avg = weekAvg(plan);
  const D = T.dri;
  const kpi = (c, v, u, t) => `<div class="kpi ${c}"><b>${v}</b><span>${u}<br>${t}</span></div>`;
  const visits = (P.visits || []).slice().reverse();
  return `
  ${T.warns.map(w => `<div class="alert red">⚠ <div>${w}</div></div>`).join('')}
  ${fresh ? `<div class="alert teal">✓ برنامه‌ی هفتگی بر اساس آخرین اطلاعات ساخته شد.</div>` : ''}
  <section class="card"><h2>نیازهای روزانه</h2><p class="lead">${T.ph.title} — ${T.ph.desc}</p>
    <div class="kpis">
      ${kpi('c1', fa(T.kcal), 'کیلوکالری', 'انرژی روزانه')}
      ${kpi('c2', fa(T.prot), 'گرم پروتئین', isBB() ? `${fa(T.prot / +P.weight, 1)} گرم/کیلو` : `${fa(T.pctP)}٪ انرژی`)}
      ${kpi('c3', fa(T.carb), 'گرم کربوهیدرات', isBB() ? `${fa(T.carb / +P.weight, 1)} گرم/کیلو` : `${fa(T.pctC)}٪ انرژی`)}
      ${kpi('c4', fa(T.fat), 'گرم چربی', `${fa(T.pctF)}٪ انرژی`)}
      ${kpi('c5', fa(T.fiber), 'گرم فیبر', 'در روز')}
      ${kpi('c6', fa(T.water / 1000, 1), 'لیتر آب', `≈ ${fa(Math.round(T.water / 250))} لیوان`)}
    </div>
    <div class="mini">
      ${isBB() ? `<div>BMI<b>${fa(T.bmi, 1)}</b></div>${T.lbm ? `<div>توده‌ی بدون چربی<b>${fa(T.lbm, 1)} کیلو</b></div>` : ''}
      <div>متابولیسم پایه<b>${fa(Math.round(T.bmr))} کیلوکالری</b></div><div>مصرف کل روزانه<b>${fa(Math.round(T.tdee))} کیلوکالری</b></div>
      <div>${T.kcal >= T.tdee ? 'مازاد' : 'کسری'} انرژی<b>${fa(Math.abs(Math.round(T.kcal - T.tdee)))} کیلوکالری</b></div><div>پروتئین بر پایه‌ی<b>${T.pBasis}</b></div><div>تعداد وعده<b>${fa(T.meals)}</b></div>`
      : `<div>BMI<b>${fa(T.bmi, 1)}</b></div><div>وزن ایده‌آل<b>${fa(T.ibw, 1)} کیلو</b></div><div>وزن تعدیل‌شده<b>${fa(T.adj, 1)} کیلو</b></div>
      <div>متابولیسم پایه<b>${fa(Math.round(T.bmr))} کیلوکالری</b></div><div>مصرف کل روزانه<b>${fa(Math.round(T.tdee))} کیلوکالری</b></div>
      <div>کسری انرژی<b>${fa(Math.round(T.tdee - T.kcal))} کیلوکالری</b></div><div>تعداد وعده<b>${fa(T.meals)}</b></div>`}
    </div>
    ${T.notes.length ? `<div class="sub">نکات</div>${T.notes.map(n => `<div class="alert gold">• <div>${n}</div></div>`).join('')}` : ''}
    <details class="ovr"><summary>تنظیم دستی توسط پزشک (اختیاری)</summary><div class="grid" style="margin-top:10px">
      ${inp('ovr.kcal', 'انرژی', { num: 1, u: 'کیلوکالری', ph: fa(computeTargets(P).kcal) })}${inp('ovr.prot', 'پروتئین', { num: 1, u: 'گرم', ph: fa(computeTargets(P).prot) })}${inp('ovr.water', 'آب', { num: 1, u: 'میلی‌لیتر', ph: fa(computeTargets(P).water) })}
    </div><p class="lead" style="margin:8px 0 0">پس از تغییر، برنامه به‌طور خودکار دوباره ساخته می‌شود.</p></details>
  </section>

  ${planCard(T, true)}
  ${micCard(T, avg)}
  ${resultsTail(T, avg, D, visits)}`;
}
/* مکمل‌های پیشنهادی (ویتامین، املاح و مکمل‌های مربوط به سوابق پزشکی): پیش‌فرض همه در PDF می‌آیند؛ پزشک می‌تواند هر کدام را حذف کند */
function micCard(T, avg) {
  const list = micSupp(P, T, avg), off = micOffOf(P);
  if (!isBB() && !list.length) return '';
  return `<section class="card">
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:6px">
      <h2 style="margin:0">مکمل‌های پیشنهادی <span class="draft">پیشنهاد سیستم</span></h2>
      <div style="display:flex; gap:8px; flex-wrap:wrap">
        <button type="button" class="btn pri sm" data-act="viewcompare">⚖️ صفحه تخصصی مقایسه ۳۰ برند مکمل</button>
        <button type="button" class="btn gold sm" onclick="openSuppBrandModal('all')">🏷️ تصاویر و رتبه‌بندی کیفی</button>
      </div>
    </div>
    <p class="lead">بر اساس آزمایش‌ها، محدودیت‌های غذایی و میانگین ریزمغذی‌های همین برنامه. کمبود در آزمایش یا پوشش کمتر از ${fa(MIC_REQ * 100)}٪ مقدار مرجع: <b>حتماً مصرف شود</b>؛ پوشش ${fa(MIC_REQ * 100)} تا ${fa(MIC_OPT * 100)}٪: <b>در صورت تمایل</b>. روی هر مورد بزنید تا از PDF حذف یا دوباره اضافه شود.</p>
    ${list.length ? `<table class="mic"><tr><th></th><th>مکمل</th><th>چرا</th><th>مقدار پیشنهادی</th></tr>${list.map(m => {
      const cat = m.k === 'vitd' ? 'vitd' : (m.k === 'b12' || m.k === 'multi') ? 'multi' : 'all';
      return `<tr class="${off[m.k] ? 'off' : ''}">
        <td><span class="chip ${off[m.k] ? '' : 'on'}" data-tog="micOff.${m.k}">${off[m.k] ? 'حذف‌شده' : 'در PDF'}</span></td>
        <td><b>${m.n}</b><br><span class="lvl lvl-${m.lvl}">${MIC_LVL[m.lvl]}</span> <button type="button" class="supp-brand-link" onclick="openSuppBrandModal('${cat}')">👁️ برندها</button></td>
        <td>${m.why}${m.ev ? `<br><small style="color:var(--muted)">شواهد: ${m.ev}</small>` : ''}</td>
        <td>${m.dose}<br><small>${m.caution}</small></td>
      </tr>`;
    }).join('')}</table>`
      : '<p class="empty">با اطلاعات فعلی کمبودی دیده نشد. اگر آزمایش ویتامین D، فریتین یا B12 دارید، در مرحله‌ی ۳ وارد کنید.</p>'}
  </section>`;
}
function planCard(T, doctor) {
  const day = P.plan.days[dayTab];
  const dt = dayTotals(day);
  const bar = (v, t, col) => { const pc = t ? Math.min(v / t * 100, 130) : 0; return `<div class="bar"><i style="width:${Math.min(pc, 100)}%;background:${col}"></i></div>`; };
  return `<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
    <div><h2>برنامه‌ی غذایی هفتگی</h2><p class="lead" style="margin:0">روی هر قلم بزنید تا جایگزین انتخاب شود؛ با زدن علامت ✕ روی هر غذا (مانند چای، نان و...) می‌توانید آن را حذف کنید؛ با دکمه‌ی «＋ افزودن» نیز می‌توانید قلم جدید اضافه نمایید.</p></div>
    ${doctor ? '<button class="btn gold sm" data-act="regen">↻ ساخت برنامه‌ی تازه</button>' : '<button class="btn ghost sm" data-act="ptreset">↺ برگرداندن برنامه‌ی اصلی پزشک</button>'}</div>
    <div class="daytabs" style="margin-top:14px">${DAYS.map((d, i) => `<button class="daytab ${i === dayTab ? 'on' : ''}" data-day="${i}">${d}${P.plan.days[i].train ? ' 💪' : ''}</button>`).join('')}</div>
    ${P.prog === 'bb' ? `<div class="alert ${day.train ? 'gold' : 'teal'}" style="margin:10px 0 0">${day.train ? `💪 روز تمرین (${BB_TIME[bbOf(P).time]}) — وعده‌ی «قبل از تمرین» و وعده‌ی «بعد از تمرین» مشخص شده‌اند.` : 'روز استراحت — وعده‌های معمولی.'}</div>` : ''}
    <div class="totbar">
      <div class="tb">انرژی ${fa(Math.round(dt.kcal))} از ${fa(T.kcal)}${bar(dt.kcal, T.kcal, 'var(--lapis2)')}</div>
      <div class="tb">پروتئین ${fa(Math.round(dt.p))} از ${fa(T.prot)}${bar(dt.p, T.prot, 'var(--pome)')}</div>
      <div class="tb">کربوهیدرات ${fa(Math.round(dt.c))} از ${fa(T.carb)}${bar(dt.c, T.carb, 'var(--saff)')}</div>
      <div class="tb">چربی ${fa(Math.round(dt.f))} از ${fa(T.fat)}${bar(dt.f, T.fat, 'var(--plum)')}</div>
    </div>
    ${day.meals.map((m, mi) => {
      const mt = mealTotals(m.items);
      return `<div class="meal">
        <div class="meal-h">
          <span class="ic" style="background:${MEAL_COLOR[m.slot]}">${SLOT_ICON[m.slot]}</span>
          <div><small>${slotLabel(m)}</small><b>${m.name}</b></div>
          <span class="k">${fa(Math.round(mt.kcal))} کیلوکالری · ${fa(Math.round(mt.p))} گرم پروتئین</span>
          <button class="ic-btn" title="وعده‌ی دیگر" data-regmeal="${mi}">↻</button>
        </div>
        <div class="items">${m.items.length ? m.items.map((it, ii) => {
          const h = [household(it.id, it.g), rawTxt(it.id, it.g)].filter(Boolean).join(' · ');
          const fName = (FOOD[it.id] ? FOOD[it.id].fa : it.id).replace(/\s*\(.*\)/, '');
          return `<span class="it ${(META[it.id] && (META[it.id].t || []).includes('approx')) ? 'apx' : ''}" data-it="${mi},${ii}" title="برای جایگزینی یا حذف کلیک کنید">
            <span class="it-txt">${fName} <b>${fa(it.g, 1)} گرم</b>${h ? ` <small>(${h})</small>` : ''}</span>
            <button type="button" class="it-del" data-delitem="${mi},${ii}" title="حذف «${fName}» از این وعده" aria-label="حذف">✕</button>
          </span>`;
        }).join('') : '<span style="color:var(--muted);font-size:12.5px;padding:4px 0">اقلام این وعده خالی است. با دکمه‌ی زیر قلم جدید اضافه کنید.</span>'}</div>
        <div class="meal-foot">
          <button type="button" class="btn-add-item" data-additem="${mi}">＋ افزودن قلم به این وعده</button>
          <span style="font-size:11.5px;color:var(--muted)">روی ✕ هر قلم بزنید تا حذف شود</span>
        </div>
      </div>`;
    }).join('')}
    <p class="lead" style="margin:10px 0 0;font-size:12px">وزن‌ها پخته یا آماده‌ی مصرف است؛ «گرم خام» برای وزن‌کردن پیش از پخت است و از نسبت پروتئین یا کربوهیدرات خام و پخته در USDA حساب شده (تقریبی). اقلامی که علامت ≈ دارند، داده‌ی تقریبی از منابع ایرانی دارند.</p>
  </section>`;
}
function resultsTail(T, avg, D, visits) {
  return `<section class="card"><h2>ریزمغذی‌ها — میانگین روزانه‌ی برنامه</h2><p class="lead">مقایسه با مقدار مرجع دریافت (DRI) برای سن و جنس بیمار. برای برخی اقلام (مثل نان‌های ایرانی) داده‌ی ریزمغذی در منبع ثبت نشده، پس اعداد حداقلی‌اند.</p>
    <table class="mic"><tr><th>ماده‌ی مغذی</th><th>برنامه</th><th>مرجع</th><th style="width:40%">پوشش</th></tr>
    ${DRI_KEYS.map(k => { const [, n, u] = NUTR.find(x => x[0] === k); const pc = avg[k] / D[k] * 100; return `<tr><td>${n}</td><td>${fa(avg[k], avg[k] < 10 ? 1 : 0)} <small>${u}</small></td><td>${fa(D[k])}</td><td><div class="pbar"><i class="${pc < 70 ? 'lo' : ''}" style="width:${Math.min(pc, 100)}%"></i></div> <small>${fa(Math.round(pc))}٪</small></td></tr>`; }).join('')}
    <tr><td>سدیم (فقط از مواد غذایی، بدون نمک افزوده)</td><td>${fa(Math.round(avg.na))} <small>میلی‌گرم</small></td><td>کمتر از ${fa(D.na)}</td><td></td></tr>
    <tr><td>فیبر</td><td>${fa(avg.fib, 1)} <small>گرم</small></td><td>${fa(T.fiber)}</td><td><div class="pbar"><i style="width:${Math.min(avg.fib / T.fiber * 100, 100)}%"></i></div></td></tr></table>
  </section>

  <section class="card"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><div><h2>ویزیت‌ها و روند وزن</h2><p class="lead" style="margin:0">هر بار که بیمار مراجعه کرد، وزن و دوز را به‌روز کنید و ویزیت را ثبت کنید.</p></div>
    <button class="btn pri sm" data-act="visit">＋ ثبت ویزیت امروز</button></div>
    ${visits.length ? `<table class="mic" style="margin-top:12px"><tr><th>تاریخ</th><th>وزن</th><th>تغییر از شروع</th><th>دور کمر</th><th>${isBB() ? 'هدف' : 'دوز'}</th><th></th></tr>
    ${visits.map((v, i) => `<tr><td>${jalali(v.date)}</td><td>${fa(v.weight, 1)}</td><td>${fa(v.weight - P.visits[0].weight, 1)}</td><td>${fa(v.waist)}</td><td>${v.goal ? BB_GOAL[v.goal].t.split(' ')[0] : fa(v.dose, 1) + ' mg'}</td><td><button class="ic-btn" data-delvisit="${P.visits.length - 1 - i}" title="حذف">✕</button></td></tr>`).join('')}</table>` : '<p class="empty">هنوز ویزیتی ثبت نشده است.</p>'}
  </section>
  <section class="card outs"><h2>خروجی‌ها برای بیمار</h2>
    <div class="outs-g">
      <button class="out" data-act="pdf"><i>⬇</i><b>PDF</b><small>۱۵ صفحه‌ی رنگی برای چاپ یا فرستادن</small></button>
      <button class="out" data-act="exporthtml"><i>📱</i><b>فایل اختصاصی بیمار (HTML)</b><small>روی گوشی یا کامپیوتر باز می‌شود؛ بیمار خودش غذاها را با معادل هم‌ارز عوض می‌کند و PDF و Word می‌گیرد</small></button>
      <button class="out" data-act="docx"><i>📄</i><b>فایل Word</b><small>متن کامل برنامه، قابل ویرایش آزاد در Word</small></button>
      <button class="out" data-act="both"><i>⚡</i><b>فایل بیمار + Word با هم</b><small>دو فایل با یک کلیک دانلود می‌شود؛ PDF را جداگانه از دکمه‌ی PDF بگیرید</small></button>
      <button class="out" data-act="inp"><i>📨</i><b>فرم پذیرش برای همین بیمار</b><small>بیمار سوابق، آزمایش‌ها، پرسشنامه و ترجیحاتش را در خانه پر می‌کند و برایتان برمی‌گرداند</small></button>
    </div>
    <p class="lead" style="margin:10px 0 0">اگر بیمار فایل HTML را تغییر داد و برایتان فرستاد، با «باز کردن پرونده» همان فایل را باز کنید تا تغییراتش در پرونده بیاید.</p></section>`;
}

/* ---------------- حالت بیمار (فایل HTML اختصاصی) ---------------- */
function patientView() {
  const T = getT();
  if (!P.plan) ensurePlan(false);
  const kpi = (c, v, u, t) => `<div class="kpi ${c}"><b>${v}</b><span>${u}<br>${t}</span></div>`;
  return `<section class="card pt-hero"><h2>سلام ${esc(P.name)} 🌿</h2>
    <p class="lead">این برنامه‌ی غذایی هفت‌روزه‌ی شماست که ${DOCTOR.name} برایتان تنظیم کرده است. هر غذایی را که دوست ندارید، لمس کنید و یکی از جایگزین‌های هم‌ارز را انتخاب کنید؛ مقدار جایگزین طوری حساب می‌شود که تعادل برنامه به هم نخورد.</p>
    <div class="kpis">
      ${kpi('c1', fa(T.kcal), 'کیلوکالری', 'انرژی روزانه')}
      ${kpi('c2', fa(T.prot), 'گرم پروتئین', 'در روز')}
      ${kpi('c3', fa(T.carb), 'گرم کربوهیدرات', 'در روز')}
      ${kpi('c4', fa(T.fat), 'گرم چربی', 'در روز')}
      ${kpi('c5', fa(T.fiber), 'گرم فیبر', 'در روز')}
      ${kpi('c6', fa(T.water / 1000, 1), 'لیتر آب', `≈ ${fa(Math.round(T.water / 250))} لیوان`)}
    </div></section>
  ${planCard(T, false)}
  <section class="card"><h2>بعد از تغییر</h2><ul class="howto">
    <li>تغییرات روی همین دستگاه خودکار نگه داشته می‌شود.</li>
    <li>برای نگه‌داشتن یک نسخه یا فرستادن برای پزشک، «💾 ذخیره‌ی تغییرات» را بزنید؛ یک فایل تازه دانلود می‌شود.</li>
    <li>«⬇ دریافت PDF» نسخه‌ی رنگی و قابل چاپ برنامه را می‌سازد و «📄 فایل Word» نسخه‌ای می‌دهد که آزادانه ویرایش می‌شود.</li>
  </ul></section>`;
}

/* ---------------- رویدادها ---------------- */
function closePopover() { const p = $('.pop'); if (p) p.remove(); }
function openSwap(el, mi, ii) {
  closePopover();
  const T = getT();
  const item = P.plan.days[dayTab].meals[mi].items[ii];
  if (!item) return;
  const opts = swapOptions(P, T, item.id).map(id => swapItem(item, id));
  const pop = document.createElement('div');
  pop.className = 'pop';
  const itemName = (META[item.id] && META[item.id].s) || (FOOD[item.id] && FOOD[item.id].fa) || item.id;
  pop.innerHTML = `<h4>جایگزین «${itemName}» (هم‌ارز ${item.r === 'P' ? 'پروتئین' : item.r === 'F' ? 'چربی' : item.r === 'V' || item.r === 'X' ? 'مقدار' : 'انرژی'})</h4>
    <div class="pop-list">
      ${opts.length ? opts.map(o => `<button type="button" data-swap="${o.id}" data-g="${o.g}"><span>${FOOD[o.id].fa}</span><small>${fa(o.g, 1)} گرم</small></button>`).join('') : '<p class="empty" style="padding:6px 10px;margin:0">جایگزین مجازی وجود ندارد.</p>'}
    </div>
    <div class="pop-sec">
      <button type="button" class="pop-del-btn" data-delpop="${mi},${ii}">🗑️ حذف این قلم («${itemName}») از وعده</button>
      <button type="button" class="pop-avoid-btn" data-avoidpop="${mi},${ii}">🚫 حذف از کل برنامه و افزودن به پرهیزها</button>
    </div>`;
  document.body.appendChild(pop);
  const r = el.getBoundingClientRect();
  pop.style.top = Math.min(r.bottom + 6, innerHeight - pop.offsetHeight - 10) + 'px';
  pop.style.left = Math.max(10, Math.min(r.left, innerWidth - 330)) + 'px';
  pop.onclick = e => {
    const b = e.target.closest('[data-swap]');
    if (b) {
      P.plan.days[dayTab].meals[mi].items[ii] = swapItem(item, b.dataset.swap);
      persist(true); closePopover(); renderMain();
      return;
    }
    const del = e.target.closest('[data-delpop]');
    if (del) {
      const [mIdx, iIdx] = del.dataset.delpop.split(',').map(Number);
      const m = P.plan.days[dayTab].meals[mIdx];
      if (m && m.items && m.items[iIdx]) {
        m.items.splice(iIdx, 1);
        persist(true);
        closePopover();
        toast(`«${itemName}» از این وعده حذف شد.`);
        renderMain();
      }
      return;
    }
    const av = e.target.closest('[data-avoidpop]');
    if (av) {
      const [mIdx, iIdx] = av.dataset.avoidpop.split(',').map(Number);
      const targetId = item.id;
      P.dislikes = P.dislikes || [];
      if (!P.dislikes.includes(targetId)) P.dislikes.push(targetId);
      if (P.plan && P.plan.days) {
        P.plan.days.forEach(d => {
          (d.meals || []).forEach(m => {
            for (let k = m.items.length - 1; k >= 0; k--) {
              if (m.items[k].id === targetId) m.items.splice(k, 1);
            }
          });
        });
      }
      persist(true);
      closePopover();
      toast(`«${itemName}» از کل برنامه حذف شد و به فهرست پرهیزها افزوده شد.`);
      renderMain();
      return;
    }
  };
}

document.addEventListener('click', e => {
  const delBtn = e.target.closest('[data-delitem]');
  if (delBtn) {
    e.stopPropagation();
    e.preventDefault();
    closePopover();
    const [mi, ii] = delBtn.dataset.delitem.split(',').map(Number);
    const m = P.plan.days[dayTab].meals[mi];
    if (m && m.items && m.items[ii]) {
      const it = m.items[ii];
      const name = (META[it.id] && META[it.id].s) || (FOOD[it.id] && FOOD[it.id].fa) || 'قلم غذایی';
      m.items.splice(ii, 1);
      persist(true);
      toast(`«${name}» از وعده حذف شد.`);
      renderMain();
    }
    return;
  }
  const addBtn = e.target.closest('[data-additem]');
  if (addBtn) {
    e.stopPropagation();
    e.preventDefault();
    openAddFoodModal(+addBtn.dataset.additem);
    return;
  }
  if (!e.target.closest('.pop') && !e.target.closest('[data-it]')) closePopover();
  const t = e.target.closest('[data-act],[data-tab],[data-tog],[data-set],[data-dis],[data-miz],[data-mq],[data-ta],[data-tflag],[data-tsub],[data-tsec],[data-bbday],[data-open],[data-day],[data-it],[data-regmeal],[data-delvisit]');
  if (!t) return;
  const d = t.dataset;
  if (d.act) {
    const a = d.act;
    if (a === 'togglecompare') { viewMode = (viewMode === 'compare') ? 'plan' : 'compare'; renderAll(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (a === 'viewcompare') { viewMode = 'compare'; renderAll(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (a === 'viewplan') { viewMode = 'plan'; renderAll(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
    else if (a === 'new') { P = newPatient(); tab = 0; dayTab = 0; viewMode = 'plan'; persist(true); renderAll(); }
    else if (a === 'open') $('#fileIn').click();
    else if (a === 'export') exportPatient();
    else if (a === 'backup') exportAll();
    else if (a === 'exporthtml') exportPatientHtml();
    else if (a === 'docx') exportDocx();
    else if (a === 'both') { exportPatientHtml(); setTimeout(exportDocx, 700); }
    else if (a === 'intake') openIntakeMenu(t);
    else if (a === 'tibbpdf') openTibbPreview();
    else if (a === 'inp') exportIntake('p');
    else if (a === 'insend') sendIntake('share');
    else if (a === 'insave') sendIntake('save');
    else if (a === 'incode') copyIntakeCode();
    else if (a === 'indone') { if (ready()) endClinicIntake(true); else { toast('نام، سن، جنسیت، قد و وزن را در مرحله‌ی ۱ کامل کنید.'); tab = 0; renderMain(); } }
    else if (a === 'inexit') { if (confirm('فرم بسته شود و به پرونده برگردید؟ پاسخ‌های واردشده در پرونده می‌ماند.')) endClinicIntake(false); }
    else if (a === 'ptreset') { if (confirm('همه‌ی تغییرات شما پاک شود و برنامه‌ی اصلی پزشک برگردد؟')) { P.plan = JSON.parse(JSON.stringify(PT.orig)); persist(true); renderMain(); } }
    else if (a === 'pdf') { if (ready()) openPreview(); }
    else if (a === 'regen') { ensurePlan(true); toast('برنامه‌ی تازه ساخته شد.'); renderMain(); }
    else if (a === 'mizclear') { if (confirm('همه‌ی پاسخ‌های پرسشنامه پاک شود؟')) { P.mizajQ = {}; persist(true); renderMain(); } }
    else if (a === 'mizauto') { P.mizajManual = ''; persist(true); renderMain(); }
    else if (a === 'mizall' || a === 'miznone') {
      const av = mizajAvoid(mizajOf(P)), s = new Set(P.dislikes || []);
      av.forEach(id => a === 'mizall' ? s.add(id) : s.delete(id));
      P.dislikes = [...s]; persist(true); renderMain();
    }
    else if (a === 'visit') { P.visits = P.visits || []; P.visits.push(isBB() ? { date: Date.now(), weight: +P.weight, waist: +P.waist || null, goal: bbOf(P).goal } : { date: Date.now(), weight: +P.weight, waist: +P.waist || null, dose: +P.dose, doseWeek: +P.doseWeek }); persist(true); toast('ویزیت ثبت شد.'); renderMain(); }
    else if (a === 'del') { if (confirm('این پرونده از مرورگر حذف شود؟ (فایل‌های ذخیره‌شده در لپ‌تاپ حذف نمی‌شوند)')) { delete DB.patients[P.id]; saveDB(); P = null; renderAll(); } }
    return;
  }
  if (d.tab != null) { tab = +d.tab; renderMain(); renderTop(); scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (d.open) { P = DB.patients[d.open]; tab = 0; dayTab = 0; renderAll(); return; }
  if (d.day != null) { dayTab = +d.day; renderMain(); return; }
  if (d.it) { const [mi, ii] = d.it.split(',').map(Number); openSwap(t, mi, ii); return; }
  if (d.regmeal != null) { const m = P.plan.days[dayTab].meals; m[+d.regmeal] = regenMeal(P, getT(), m[+d.regmeal]); persist(true); renderMain(); return; }
  if (d.delvisit != null) { P.visits.splice(+d.delvisit, 1); persist(true); renderMain(); return; }
  if (d.ta != null) {
    // پاسخ‌های طب ایرانی (سته‌ی ضروریه، مزاج اعضا، اخلاط)؛ زدن دوباره‌ی همان گزینه پاک می‌کند
    const [mod, grp, key] = d.ta.split('|'), A = tibbA(P), g = A[mod][grp] = A[mod][grp] || {}, v = d.v === 'x' ? 'x' : +d.v;
    if (g[key] === v) delete g[key]; else g[key] = v;
    persist(true); const y = scrollY; renderMain(); scrollTo(0, y); return;
  }
  if (d.tflag != null) { const A = tibbA(P); A.flags[d.tflag] = !A.flags[d.tflag]; persist(true); const y = scrollY; renderMain(); scrollTo(0, y); return; }
  if (d.tsub != null || d.tsec != null) {
    if (d.tsub != null) { tsub = +d.tsub; tsec = 0; } else tsec = +d.tsec;
    renderMain(); const m = $('.tsub') || $('.tsec'); if (m) m.scrollIntoView({ block: 'start' }); return;
  }
  if (d.mq != null) {
    // پاسخ پرسشنامه‌ی مزاج؛ بدون رندر کل صفحه تا جای اسکرول حفظ شود
    P.mizajQ = P.mizajQ || {};
    const v = d.v === 'x' ? 'x' : +d.v, o = P.mizajQ[d.mq];
    if (o === v || (v !== 'x' && mizajVal(o) === v)) delete P.mizajQ[d.mq]; else P.mizajQ[d.mq] = v;
    persist(true);
    const y = scrollY; renderMain(); scrollTo(0, y);
    return;
  }
  if (d.bbday != null) { P.bb = bbOf(P); const i = +d.bbday, s = new Set(P.bb.days); s.has(i) ? s.delete(i) : s.add(i); P.bb.days = [...s].sort(); }
  else if (d.bbfood != null) {
    P.bb = bbOf(P);
    const fid = d.bbfood;
    const s = new Set(P.bb.foods || []);
    s.has(fid) ? s.delete(fid) : s.add(fid);
    P.bb.foods = [...s];
    P.plan = null;
    persist(true);
    const y = scrollY;
    renderMain();
    scrollTo(0, y);
    return;
  }
  else if (d.bbpreset != null) {
    P.bb = bbOf(P);
    if (d.bbpreset === 'clear') {
      P.bb.foods = [];
    } else if (d.bbpreset === 'classic') {
      P.bb.foods = ['F01', 'F10', 'F09', 'F22', 'F24', 'F40', 'N12', 'F29', 'N01', 'N02'];
    } else if (d.bbpreset === 'budget') {
      P.bb.foods = ['F09', 'F10', 'IR01', 'IR02', 'F17', 'F18', 'F21', 'F22', 'F26', 'F31', 'F35', 'N10', 'N04', 'N27'];
    } else if (d.bbpreset === 'premium') {
      P.bb.foods = ['F04', 'F07', 'F03', 'F08', 'F16', 'F22', 'F28', 'F27', 'F42', 'F38', 'N47', 'N12', 'N14', 'N37', 'F46'];
    }
    P.plan = null;
    persist(true);
    const y = scrollY;
    renderMain();
    scrollTo(0, y);
    toast('سبد غذایی با موفقیت تنظیم شد.');
    return;
  }
  else if (d.tog) setPath(P, d.tog, !getPath(P, d.tog));
  else if (d.set) { const v = d.v; setPath(P, d.set, isNaN(v) ? v : +v); }
  else if (d.dis) { const s = new Set(P.dislikes || []); s.has(d.dis) ? s.delete(d.dis) : s.add(d.dis); P.dislikes = [...s]; }
  persist(true); renderMain(); renderTop();
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'search') { searchQ = t.value.trim(); const pos = t.selectionStart; renderSide(); const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos); return; }
  if (!t.dataset.k || !P) return;
  let v = t.value;
  if (t.dataset.num) { v = toEn(v).trim(); v = v === '' ? '' : (isNaN(+v) ? v : +v); }
  setPath(P, t.dataset.k, v);
  persist(false);
  renderTop();
});
document.addEventListener('change', e => {
  // پس از پایان ویرایش، صفحه را به‌روز کن تا محاسبه‌ها (BMI، eGFR، نتایج) نمایش داده شوند؛ فوکوس حفظ می‌شود
  if (!(e.target.dataset && e.target.dataset.k)) return;
  setTimeout(() => {
    const a = document.activeElement, k = a && a.dataset ? a.dataset.k : null;
    renderMain();
    if (k) { const el = document.querySelector(`[data-k="${k}"]`); if (el) el.focus(); }
  }, 0);
});
$('#fileIn').addEventListener('change', e => { if (e.target.files[0]) importFile(e.target.files[0]); e.target.value = ''; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePopover(); closePreview(); closeSuppBrandModal(); closeSuppImgLightbox(); closeAddFoodModal(); if (typeof closeSideCompareModal === 'function') closeSideCompareModal(); if (typeof closeCmpDetailModal === 'function') closeCmpDetailModal(); } });
const sbm = document.getElementById('suppBrandModal');
if (sbm) { sbm.addEventListener('click', e => { if (e.target === sbm) closeSuppBrandModal(); }); }
const silm = document.getElementById('suppImgLightbox');
if (silm) { silm.addEventListener('click', e => { if (e.target === silm) closeSuppImgLightbox(); }); }
const afm = document.getElementById('addFoodModal');
if (afm) { afm.addEventListener('click', e => { if (e.target === afm) closeAddFoodModal(); }); }
const ccm = document.getElementById('cmpCompareModal');
if (ccm) { ccm.addEventListener('click', e => { if (e.target === ccm && typeof closeSideCompareModal === 'function') closeSideCompareModal(); }); }
const cdm = document.getElementById('cmpDetailModal');
if (cdm) { cdm.addEventListener('click', e => { if (e.target === cdm && typeof closeCmpDetailModal === 'function') closeCmpDetailModal(); }); }

function openPreview() {
  const T = getT();
  ensurePlan(false);
  $('#report').innerHTML = buildReport(P, T, P.plan);
  $('#preview').classList.add('on');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(autoFit);
}
function closePreview() { $('#preview').classList.remove('on'); document.body.style.overflow = ''; }

let suppBrandCat = 'all';
function openSuppBrandModal(cat = 'all') {
  suppBrandCat = cat;
  renderSuppBrandModal();
  const m = document.getElementById('suppBrandModal');
  if (m) {
    m.classList.add('on');
    document.body.style.overflow = 'hidden';
  }
}
function closeSuppBrandModal() {
  const m = document.getElementById('suppBrandModal');
  if (m) m.classList.remove('on');
  if (!$('#preview') || !$('#preview').classList.contains('on')) {
    document.body.style.overflow = '';
  }
}
function renderSuppBrandModal() {
  const m = document.getElementById('suppBrandModalBody');
  if (!m) return;
  const filtered = suppBrandCat === 'all'
    ? SUPP_BRANDS
    : (suppBrandCat === 'iranian'
      ? SUPP_BRANDS.filter(b => b.isIranian)
      : SUPP_BRANDS.filter(b => b.cat === suppBrandCat));

  const catChips = SUPP_CATEGORIES.map(c =>
    `<button type="button" class="chip ${suppBrandCat === c.id ? 'on' : ''}" onclick="openSuppBrandModal('${c.id}')">${c.n}</button>`
  ).join('');

  const brandCards = filtered.map(b => `
    <div class="brand-card">
      <div class="bc-visual">
        <div class="bc-img-container" onclick="openSuppImgLightbox('${b.id}')" title="مشاهده تصویر بزرگ، بارگذاری یا تغییر عکس مکمل">
          <img class="bc-img" id="bc-img-${b.id}" src="${getBrandImg(b)}" alt="${b.nameFa} - ${b.nameEn}" loading="lazy" onerror="handleSuppImgError(this, '${b.id}')" />
          <div class="bc-img-badge">${b.isIranian ? '🇮🇷 ایران' : 'محصول'}</div>
          <div class="bc-img-overlay">
            <span class="bc-zoom-btn">🔍 بزرگ‌نمایی / تغییر عکس</span>
          </div>
        </div>
        <span class="bc-rank">رتبه ${fa(b.rank)} در دسته</span>
        <button type="button" class="bc-upload-link" onclick="openSuppImgLightbox('${b.id}')">📷 تغییر عکس</button>
      </div>
      <div class="bc-info">
        <div class="bc-origin-row">
          ${b.isIranian ? '<span class="bc-iran-tag">🇮🇷 برند داروسازی ایران (مجوز TTAC)</span>' : '<span class="bc-global-tag">🌐 برند معتبر بین‌المللی</span>'}
          ${b.darukadeScore ? `<span class="bc-store-tag">داروکده: <b>${fa(b.darukadeScore, 1)} ★</b></span>` : ''}
          ${b.mosbatesabzScore ? `<span class="bc-store-tag">مثبت‌سبز: <b>${fa(b.mosbatesabzScore, 1)} ★</b></span>` : ''}
        </div>
        <div class="bc-head">
          <div>
            <h3 class="bc-title">${b.nameFa}</h3>
            <div class="bc-sub">${b.nameEn} · <b>کشور سازنده: ${b.origin}</b></div>
          </div>
          <div class="bc-score-box">
            <span class="bc-score">${fa(b.score, 1)}</span>
            <span class="bc-stars">★★★★★</span>
          </div>
        </div>
        <div class="bc-badge">${b.badge}</div>
        <div class="bc-meta">
          <span><b>فرم بسته‌بندی:</b> ${b.form}</span>
          <span><b>خلوص آزمایشگاهی:</b> ${b.purity}</span>
          ${b.proteinPerServing ? `<span><b>دوز / ترکیب فعال:</b> ${b.proteinPerServing}</span>` : ''}
          ${b.darukadeReviews ? `<span style="color:#047857; font-weight:700"><b>نظرات خریداران:</b> ${b.darukadeReviews}</span>` : ''}
        </div>
        <div class="bc-certs">
          ${(b.certs || []).map(c => `<span class="bc-cert">✓ ${c}</span>`).join('')}
        </div>
        <div class="bc-pros"><b>مزیت اصلی:</b> ${b.pros}</div>
        ${b.cons ? `<div class="bc-cons"><b>نکته خرید / احتیاط:</b> ${b.cons}</div>` : ''}
      </div>
    </div>
  `).join('');

  m.innerHTML = `
    <div class="sbm-header">
      <div>
        <h2 style="margin:0 0 4px; color:var(--lapis)">🏷️ گالری تصاویر، ارزیابی و رتبه‌بندی کیفی برندهای مکمل</h2>
        <p style="margin:0; font-size:13.5px; color:var(--muted)">
          بررسی و رتبه‌بندی داروخانه‌های آنلاین معتبر ایران (داروکده، مثبت‌سبز) و مراجع بین‌المللی همراه با نشان شکل بسته‌بندی و تست‌های خلوص سازمان غذا و دارو (TTAC). روی دسته‌بندی‌ها کلیک کنید تا برندها فیلتر شوند.
        </p>
      </div>
      <button type="button" class="btn ghost sm" onclick="closeSuppBrandModal()">✕ بستن</button>
    </div>
    <div class="chips" style="margin:14px 0 18px">${catChips}</div>
    <div class="brand-grid">${brandCards || '<p style="color:var(--muted)">موردی در این دسته یافت نشد.</p>'}</div>
    <div class="sbm-footer">
      <b>⚠️ توصیه‌ی حیاتی پزشک برای خرید مکمل در ایران:</b>
      مکمل‌های ورزشی از پرتقلب‌ترین اقلام مصرفی در بازار غیررسمی هستند. حتماً مکمل را از <b>داروخانه</b> با برچسب زرد و سفید اصالت <b>TTAC</b> تهیه فرمایید. با خراشیدن لایه اسکرچ و ارسال کد ۱۶ رقمی به شماره ۲۰۰۰۸۸۲۲ یا اسکن بارکد در سامانه ttac.ir، اصالت و تاریخ فرآورده را تأیید کنید.
    </div>
  `;
}

function openSuppImgLightbox(brandId) {
  const b = SUPP_BRANDS.find(x => x.id === brandId);
  if (!b) return;
  const m = document.getElementById('suppImgLightbox');
  const body = document.getElementById('suppImgLightboxBody');
  if (!m || !body) return;

  const currentImg = getBrandImg(b);

  body.innerHTML = `
    <div class="sbm-header">
      <div>
        <h3 style="margin:0 0 4px; color:var(--lapis); font-size:17px">🖼️ تصویر و مشخصات محصول: ${b.nameFa}</h3>
        <p style="margin:0; font-size:12.5px; color:var(--muted)">${b.nameEn} · کشور سازنده: ${b.origin} · رتبه ${fa(b.rank)} در دسته‌بندی</p>
      </div>
      <button type="button" class="btn ghost sm" onclick="closeSuppImgLightbox()">✕ بستن</button>
    </div>

    <div class="lightbox-img-box">
      <img id="lightbox-main-img" src="${currentImg}" alt="${b.nameFa}" onerror="handleSuppImgError(this, '${b.id}')" />
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px; background:#F8FAFC; border:1px solid #E2E8F0; padding:10px 14px; border-radius:10px;">
      <div style="font-size:13px; font-weight:700; color:var(--ink)">
        امتیاز کیفی: <b style="color:#B45309; font-size:15px">${fa(b.score, 1)}</b> از ۵ · رتبه کیفیت: <span style="background:#FEF08A; padding:2px 8px; border-radius:99px; font-weight:800">${b.tier}</span>
      </div>
      <div style="font-size:12px; color:var(--muted)">
        ${b.form} · ${b.purity}
      </div>
    </div>

    ${b.isIranian ? `
      <div style="background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:12.5px; color:#065F46">
        <b style="display:block; margin-bottom:4px">🇮🇷 استعلام رتبه‌بندی در داروخانه‌های معتبر ایران:</b>
        <div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:4px">
          <span>⭐ امتیاز داروکده: <b>${fa(b.darukadeScore || 4.8, 1)} از ۵</b></span>
          <span>⭐ امتیاز مثبت‌سبز: <b>${fa(b.mosbatesabzScore || 4.8, 1)} از ۵</b></span>
          <span>🛡️ دارای پروانه رسمی IRC و برچسب اصالت TTAC</span>
        </div>
        <div style="font-size:11.5px; color:#047857">${b.darukadeReviews || 'دارای رضایت بالا در میان کاربران داروخانه‌های آنلاین'}</div>
      </div>
    ` : ''}

    <div style="background:#FFFBF2; border:1px solid #F5E0B3; border-radius:12px; padding:14px; margin-bottom:16px;">
      <h4 style="margin:0 0 8px; font-size:13.5px; color:#8A5A0C">بارگذاری یا تغییر تصویر این مکمل:</h4>
      
      <div style="margin-bottom:12px;">
        <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--ink)">🔗 آدرس اینترنتی تصویر (Image URL):</label>
        <div style="display:flex; gap:8px;">
          <input type="url" id="supp-img-url-input" class="input sm" style="flex:1" placeholder="مثال: https://.../product.jpg" value="${currentImg.startsWith('http') ? currentImg : ''}" />
          <button type="button" class="btn sm primary" onclick="saveSuppImgFromUrl('${b.id}')">ذخیره لینک</button>
        </div>
      </div>

      <div style="margin-bottom:10px;">
        <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:var(--ink)">📁 یا بارگذاری فایل عکس از لپ‌تاپ یا گوشی:</label>
        <input type="file" id="supp-img-file-input" accept="image/*" style="font-size:12px" onchange="uploadSuppImgFile('${b.id}', this)" />
      </div>

      <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px; border-top:1px dashed #E5D5BA; padding-top:8px;">
        <button type="button" class="btn ghost sm" onclick="resetSuppImg('${b.id}')">🔄 بازنشانی به تصویر پیش‌فرض</button>
      </div>
    </div>

    <div style="text-align:left">
      <button type="button" class="btn secondary sm" onclick="closeSuppImgLightbox()">بستن پنجره</button>
    </div>
  `;

  m.classList.add('on');
}

function closeSuppImgLightbox() {
  const m = document.getElementById('suppImgLightbox');
  if (m) m.classList.remove('on');
}

function saveSuppImgFromUrl(brandId) {
  const inp = document.getElementById('supp-img-url-input');
  if (!inp) return;
  const url = inp.value.trim();
  if (url) {
    try {
      localStorage.setItem('spartina_supp_img_' + brandId, url);
      const b = SUPP_BRANDS.find(x => x.id === brandId);
      if (b) b.image = url;
    } catch (e) {
      console.error(e);
    }
  }
  renderSuppBrandModal();
  openSuppImgLightbox(brandId);
}

function uploadSuppImgFile(brandId, fileInput) {
  if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    try {
      localStorage.setItem('spartina_supp_img_' + brandId, dataUrl);
      const b = SUPP_BRANDS.find(x => x.id === brandId);
      if (b) b.image = dataUrl;
    } catch (err) {
      console.error(err);
    }
    renderSuppBrandModal();
    openSuppImgLightbox(brandId);
  };
  reader.readAsDataURL(file);
}

function resetSuppImg(brandId) {
  try {
    localStorage.removeItem('spartina_supp_img_' + brandId);
    const b = SUPP_BRANDS.find(x => x.id === brandId);
    if (b) b.image = makeSuppBrandImageUri(b);
  } catch (e) {
    console.error(e);
  }
  renderSuppBrandModal();
  openSuppImgLightbox(brandId);
}

function handleSuppImgError(imgEl, brandId) {
  if (!imgEl) return;
  imgEl.onerror = null;
  const b = SUPP_BRANDS.find(x => x.id === brandId);
  if (b) {
    imgEl.src = makeSuppBrandImageUri(b);
  }
}

/* ---------------- پنجره افزودن قلم به وعده ---------------- */
let addFoodMealIdx = 0;
let addFoodSelectedId = 'N69'; // پیش‌فرض: چای
let addFoodSearchQ = '';

const QUICK_ADD_FOODS = [
  { id: 'N69', name: 'چای', g: 240, desc: '۱ لیوان' },
  { id: 'F47', name: 'قهوه', g: 240, desc: '۱ فنجان' },
  { id: 'F30', name: 'خرما', g: 24, desc: '۱ عدد' },
  { id: 'F31', name: 'نان سنگک', g: 60, desc: '۲ کف دست' },
  { id: 'F32', name: 'نان بربری', g: 60, desc: '۲ کف دست' },
  { id: 'F09', name: 'تخم‌مرغ', g: 50, desc: '۱ عدد' },
  { id: 'F14', name: 'پنیر سفید', g: 30, desc: '۱ قوطی کبریت' },
  { id: 'F39', name: 'گردو', g: 10, desc: '۲ عدد مغز' },
  { id: 'N01', name: 'خیار', g: 100, desc: '۱ عدد متوسط' },
  { id: 'N02', name: 'گوجه‌فرنگی', g: 120, desc: '۱ عدد متوسط' },
  { id: 'N27', name: 'سیب', g: 180, desc: '۱ عدد' },
  { id: 'F11', name: 'ماست کم‌چرب', g: 150, desc: '۱ کاسه کوچک' },
  { id: 'F42', name: 'روغن زیتون', g: 5, desc: '۱ قاشق مرباخوری' },
];

function defaultRatioForFood(id) {
  const meta = META[id] || {};
  if (['poultry', 'red', 'fish', 'egg', 'supp'].includes(meta.g)) return 'P';
  if (['fat', 'oil', 'nut'].includes(meta.g)) return 'F';
  if (['grain', 'bread', 'tuber', 'fruit', 'dried'].includes(meta.g)) return 'C';
  if (['veg', 'herb', 'bev', 'spice'].includes(meta.g)) return 'V';
  return 'C';
}

function openAddFoodModal(mealIdx) {
  addFoodMealIdx = mealIdx;
  addFoodSearchQ = '';
  addFoodSelectedId = 'N69';
  renderAddFoodModal();
  const m = document.getElementById('addFoodModal');
  if (m) {
    m.classList.add('on');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      const inp = document.getElementById('afSearchInp');
      if (inp) inp.focus();
    }, 100);
  }
}

function closeAddFoodModal() {
  const m = document.getElementById('addFoodModal');
  if (m) m.classList.remove('on');
  if ((!$('#preview') || !$('#preview').classList.contains('on')) &&
      (!$('#suppBrandModal') || !$('#suppBrandModal').classList.contains('on'))) {
    document.body.style.overflow = '';
  }
}

function selectAddFood(foodId, defaultG = null) {
  addFoodSelectedId = foodId;
  renderAddFoodModal(defaultG);
}

function renderAddFoodModal(customGram = null) {
  const body = document.getElementById('addFoodModalBody');
  if (!body) return;
  const meal = P.plan.days[dayTab].meals[addFoodMealIdx];
  const mealName = meal ? meal.name : 'این وعده';

  const allIds = Object.keys(FOOD);
  const q = addFoodSearchQ.trim().toLowerCase();
  const filteredIds = q
    ? allIds.filter(id => {
        const f = FOOD[id];
        const m = META[id];
        return (f.fa && f.fa.toLowerCase().includes(q)) ||
               (m && m.s && m.s.toLowerCase().includes(q)) ||
               (f.name && f.name.toLowerCase().includes(q));
      })
    : QUICK_ADD_FOODS.map(x => x.id);

  const selectedMeta = META[addFoodSelectedId] || {};
  const selectedFood = FOOD[addFoodSelectedId] || { fa: addFoodSelectedId, kcal: 0, p: 0, c: 0, f: 0 };
  const quickEntry = QUICK_ADD_FOODS.find(x => x.id === addFoodSelectedId);
  const defaultGramVal = customGram != null
    ? customGram
    : (quickEntry ? quickEntry.g : ((selectedMeta.hu && selectedMeta.hu[0] && selectedMeta.hu[0][0]) || 100));

  const huTxt = [household(addFoodSelectedId, defaultGramVal), rawTxt(addFoodSelectedId, defaultGramVal)].filter(Boolean).join(' · ');

  body.innerHTML = `
    <div class="sbm-header">
      <div>
        <h3 style="margin:0 0 4px; color:var(--lapis); font-size:17px">＋ افزودن غذا یا نوشیدنی به «${mealName}»</h3>
        <p style="margin:0; font-size:12.5px; color:var(--muted)">روز ${DAYS[dayTab]} · می‌توانید چای، نان، لبنیات یا هر غذای دلخواه دیگر را جستجو و اضافه کنید.</p>
      </div>
      <button type="button" class="btn ghost sm" onclick="closeAddFoodModal()">✕ بستن</button>
    </div>

    <div style="margin-top:14px">
      <input type="search" id="afSearchInp" class="af-search" placeholder="🔍 جستجوی غذا یا نوشیدنی (مثلاً: چای، تخم‌مرغ، نان، ماست، موز...)" value="${esc(addFoodSearchQ)}" oninput="handleAfSearch(this.value)" />
    </div>

    <div style="font-size:11.5px; font-weight:700; color:var(--muted); margin-bottom:6px">پیشنهادهای پرکاربرد:</div>
    <div class="af-quick">
      ${QUICK_ADD_FOODS.map(x => `
        <button type="button" class="af-quick-btn ${addFoodSelectedId === x.id ? 'on' : ''}" style="${addFoodSelectedId === x.id ? 'background:var(--turqs); border-color:var(--turq); color:var(--turq); font-weight:800' : ''}" onclick="selectAddFood('${x.id}', ${x.g})">
          ${x.name} <small style="opacity:.7">(${fa(x.g)}g)</small>
        </button>
      `).join('')}
    </div>

    <div style="font-size:11.5px; font-weight:700; color:var(--muted); margin-bottom:6px">نتایج فهرست غذاها (${fa(filteredIds.length)}):</div>
    <div class="af-list">
      ${filteredIds.length ? filteredIds.map(id => {
        const f = FOOD[id];
        const m = META[id];
        const sName = (m && m.s) || f.fa.replace(/\s*\(.*\)/, '');
        const isSel = id === addFoodSelectedId;
        return `
          <div class="af-item ${isSel ? 'selected' : ''}" onclick="selectAddFood('${id}')">
            <span><b>${sName}</b> <small style="color:var(--muted)">(${f.fa})</small></span>
            <span style="font-size:12px; color:var(--muted)">${fa(Math.round(f.kcal))} kcal/100g · ${fa(f.p, 1)}g پروتئین</span>
          </div>
        `;
      }).join('') : '<div style="padding:12px; text-align:center; color:var(--muted); font-size:13px">موردی با این نام پیدا نشد.</div>'}
    </div>

    <div class="af-config">
      <label>غذا یا نوشیدنی انتخاب‌شده: <b style="color:var(--turq); font-size:14px">${selectedFood.fa}</b></label>
      <div class="af-gram-row">
        <span>مقدار مصرف:</span>
        <input type="number" id="afGramInp" class="af-gram-inp" min="1" max="2000" step="1" value="${defaultGramVal}" />
        <span>گرم</span>
        ${huTxt ? `<small style="color:var(--muted); margin-inline-start:6px">(${huTxt})</small>` : ''}
      </div>
      <div style="margin-top:8px; font-size:12px; color:var(--muted)">
        انرژی تقریبی: <b style="color:var(--lapis2)">${fa(Math.round(selectedFood.kcal * defaultGramVal / 100))} kcal</b> · 
        پروتئین: <b style="color:var(--pome)">${fa(Math.round(selectedFood.p * defaultGramVal / 100 * 10) / 10, 1)}g</b> · 
        کربوهیدرات: <b style="color:var(--saff)">${fa(Math.round(selectedFood.c * defaultGramVal / 100 * 10) / 10, 1)}g</b> · 
        چربی: <b style="color:var(--plum)">${fa(Math.round(selectedFood.f * defaultGramVal / 100 * 10) / 10, 1)}g</b>
      </div>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px">
      <button type="button" class="btn ghost sm" onclick="closeAddFoodModal()">انصراف</button>
      <button type="button" class="btn pri" onclick="confirmAddFood()">✓ افزودن به وعده</button>
    </div>
  `;
}

function handleAfSearch(val) {
  addFoodSearchQ = val;
  const q = val.trim().toLowerCase();
  if (q) {
    const allIds = Object.keys(FOOD);
    const found = allIds.find(id => {
      const f = FOOD[id];
      const m = META[id];
      return (f.fa && f.fa.toLowerCase().includes(q)) || (m && m.s && m.s.toLowerCase().includes(q));
    });
    if (found) addFoodSelectedId = found;
  }
  renderAddFoodModal();
  const inp = document.getElementById('afSearchInp');
  if (inp) {
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  }
}

function confirmAddFood() {
  const gInp = document.getElementById('afGramInp');
  const g = gInp ? Math.max(1, +gInp.value || 100) : 100;
  const food = FOOD[addFoodSelectedId];
  if (!food) return;

  const meal = P.plan.days[dayTab].meals[addFoodMealIdx];
  if (!meal) return;

  const ratio = defaultRatioForFood(addFoodSelectedId);
  meal.items.push({
    id: addFoodSelectedId,
    g: g,
    r: ratio,
  });

  persist(true);
  closeAddFoodModal();
  renderMain();
  const fName = (META[addFoodSelectedId] && META[addFoodSelectedId].s) || food.fa;
  toast(`«${fName}» به وعده افزوده شد.`);
}


if (PT) {
  // حالت بیمار: آخرین تغییرات ذخیره‌شده روی همین دستگاه، اگر از فایل جدیدتر باشد
  P = PT.patient;
  try { const s = JSON.parse(localStorage.getItem(PT_KEY) || 'null'); if (s && s.updated > (P.updated || 0)) P = s; } catch (e) { }
  document.body.classList.add('pt');
  document.title = 'برنامه‌ی غذایی ' + (P.name || '');
} else if (IN) {
  // حالت فرم پذیرش: ادامه‌ی پاسخ‌های قبلی روی همین دستگاه، یا یک فرم تازه با اطلاعاتی که پزشک از قبل پر کرده
  try { P = JSON.parse(localStorage.getItem(IN_KEY) || 'null'); } catch (e) { P = null; }
  if (!P) {
    P = newPatient();
    if (IN.id) P.id = IN.id;
    ['name', 'phone', 'sex'].forEach(k => { if (IN[k]) P[k] = IN[k]; });
    if (IN.prog) P.prog = IN.prog;
  }
  document.body.classList.add('pt', 'intake');
  document.title = 'فرم پذیرش' + (P.name ? ' — ' + P.name : '');
} else loadDB();
renderAll();
