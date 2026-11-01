/* ============================================================
   موتور محاسبه: نیازها، فاز درمان، تولید برنامه، جانشینی
   ============================================================ */
const FOOD = {};
FOODS.forEach(f => { FOOD[f.id] = f; });

const NUTR = [ // کلید، نام، واحد
  ['kcal', 'انرژی', 'کیلوکالری'], ['p', 'پروتئین', 'گرم'], ['c', 'کربوهیدرات', 'گرم'], ['f', 'چربی', 'گرم'],
  ['fib', 'فیبر', 'گرم'], ['sug', 'قند کل', 'گرم'], ['sfa', 'چربی اشباع', 'گرم'], ['chol', 'کلسترول', 'میلی‌گرم'],
  ['na', 'سدیم', 'میلی‌گرم'], ['k', 'پتاسیم', 'میلی‌گرم'], ['ca', 'کلسیم', 'میلی‌گرم'], ['fe', 'آهن', 'میلی‌گرم'],
  ['mg', 'منیزیم', 'میلی‌گرم'], ['zn', 'روی', 'میلی‌گرم'], ['vc', 'ویتامین C', 'میلی‌گرم'], ['vd', 'ویتامین D', 'میکروگرم'],
  ['b12', 'ویتامین B12', 'میکروگرم'], ['fol', 'فولات', 'میکروگرم DFE'], ['va', 'ویتامین A', 'میکروگرم RAE'],
  ['ve', 'ویتامین E', 'میلی‌گرم'], ['vk', 'ویتامین K', 'میکروگرم'], ['w', 'آب موجود در غذا', 'گرم'],
];

/* مقادیر مرجع دریافت (DRI) — آکادمی ملی علوم آمریکا (NASEM/IOM)؛ پتاسیم و سدیم: بازنگری ۲۰۱۹ */
function dri(sex, age) {
  const m = sex === 'm';
  return {
    ca: m ? (age > 70 ? 1200 : 1000) : (age > 50 ? 1200 : 1000),
    fe: m ? 8 : (age > 50 ? 8 : 18),
    mg: m ? (age <= 30 ? 400 : 420) : (age <= 30 ? 310 : 320),
    zn: m ? 11 : 8,
    vc: m ? 90 : 75,
    vd: age > 70 ? 20 : 15,
    b12: 2.4,
    fol: 400,
    va: m ? 900 : 700,
    ve: 15,
    vk: m ? 120 : 90,
    k: m ? 3400 : 2600,
    na: 2300, // سقف کاهش خطر بیماری مزمن (CDRR)
  };
}

const DRI_KEYS = ['ca', 'fe', 'mg', 'zn', 'k', 'vc', 'vd', 'b12', 'fol', 'va', 've', 'vk'];

const ACT = [
  { v: 1.2, t: 'بی‌تحرک', d: 'کار پشت میز، بدون ورزش' },
  { v: 1.375, t: 'کم‌تحرک', d: 'پیاده‌روی سبک ۱ تا ۳ روز در هفته' },
  { v: 1.55, t: 'متوسط', d: 'ورزش متوسط ۳ تا ۵ روز در هفته' },
  { v: 1.725, t: 'فعال', d: 'ورزش منظم ۶ تا ۷ روز در هفته' },
];

const DOSES = [2.5, 5, 7.5, 10, 12.5, 15];

const SIDE = [
  ['nausea', 'تهوع'], ['vomit', 'استفراغ'], ['constipation', 'یبوست'], ['diarrhea', 'اسهال'],
  ['reflux', 'سوزش سر دل / رفلاکس'], ['satiety', 'سیری زودرس / بی‌اشتهایی'], ['bloating', 'نفخ'], ['fatigue', 'خستگی و ضعف'],
];

const HX = [
  ['dm', 'دیابت نوع ۲'], ['insulin', 'مصرف انسولین یا سولفونیل‌اوره (گلی‌بنکلامید، گلیکلازید...)'], ['metformin', 'مصرف متفورمین'],
  ['htn', 'فشار خون بالا'], ['ckd', 'بیماری کلیه'], ['hf', 'نارسایی قلب'], ['cvd', 'بیماری قلبی‌عروقی'],
  ['nafld', 'کبد چرب'], ['gall', 'سنگ یا بیماری کیسه صفرا'], ['pancreatitis', 'سابقه‌ی پانکراتیت'],
  ['mtc', 'سابقه‌ی شخصی یا خانوادگی سرطان مدولاری تیروئید / MEN2'], ['hypothyroid', 'کم‌کاری تیروئید'],
  ['pregnant', 'بارداری، شیردهی یا قصد بارداری'], ['ocp', 'مصرف قرص ضدبارداری خوراکی'], ['gerd', 'رفلاکس مزمن'], ['ibs', 'روده‌ی تحریک‌پذیر'],
  // مشکلاتی که مکمل با شواهد علمی برایشان پیشنهاد می‌شود (micSupp)
  ['binge', 'پرخوری عصبی (حمله‌های پرخوری)'], ['overeat', 'پرخوری عادی / اشتهای زیاد'], ['cconst', 'یبوست مزمن'],
  ['joint', 'درد یا مشکل مفصل (آرتروز، آسیب ورزشی)'], ['sleep', 'بی‌خوابی یا خواب بی‌کیفیت'], ['stress', 'استرس و خستگی مزمن'],
  ['cramp', 'گرفتگی عضلانی مکرر'], ['migraine', 'میگرن'], ['pms', 'سندرم پیش از قاعدگی (PMS)'], ['pcos', 'سندرم تخمدان پلی‌کیستیک'],
];
const HX_FEMALE = ['ocp', 'pregnant', 'pms', 'pcos'];
const BINGE_NOTE = 'پرخوری عصبی: درمان اصلی، روان‌درمانی (درمان شناختی‌رفتاری) است؛ ارجاع به روان‌شناس یا روان‌پزشک توصیه می‌شود. رژیم خیلی سخت و حذف کامل وعده‌ها حمله‌های پرخوری را بیشتر می‌کند.';

const ALLERGY = [
  ['veg', 'گیاه‌خوار (بدون گوشت و ماهی)', f => (META[f].t || []).includes('meat')],
  ['nofish', 'ماهی نمی‌خورد', f => (META[f].t || []).includes('fish') || (META[f].t || []).includes('shell')],
  ['noredmeat', 'گوشت قرمز نمی‌خورد', f => (META[f].t || []).includes('redmeat')],
  ['lactose', 'عدم تحمل لاکتوز', f => (META[f].t || []).includes('lactose')],
  ['dairy', 'حساسیت به لبنیات', f => (META[f].t || []).includes('dairy')],
  ['gluten', 'سلیاک / حساسیت به گلوتن', f => (META[f].t || []).includes('gluten')],
  ['nut', 'حساسیت به مغزها', f => ['nut', 'peanut'].some(x => (META[f].t || []).includes(x))],
  ['egg', 'حساسیت به تخم‌مرغ', f => (META[f].t || []).includes('egg')],
  ['shell', 'حساسیت به میگو', f => (META[f].t || []).includes('shell')],
  ['sesame', 'حساسیت به کنجد', f => (META[f].t || []).includes('sesame')],
  ['nosupp', 'بدون پودر پروتئین', f => (META[f].t || []).includes('supp')],
];

/* ------------------------------------------------------------ */
const round = (x, s = 1) => Math.round(x / s) * s;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function egfrCKDEPI(cr, age, sex) { // CKD-EPI 2021 بدون ضریب نژاد
  if (!cr || !age) return null;
  const f = sex === 'f', k = f ? 0.7 : 0.9, a = f ? -0.241 : -0.302;
  return 142 * Math.pow(Math.min(cr / k, 1), a) * Math.pow(Math.max(cr / k, 1), -1.2) * Math.pow(0.9938, age) * (f ? 1.012 : 1);
}

/* فاز درمان بر اساس دوز و هفته و عوارض */
function treatmentPhase(p) {
  const dose = +p.dose || 2.5, week = +p.doseWeek || 1;
  const se = p.side || {};
  const anyGI = ['nausea', 'vomit', 'reflux', 'satiety', 'diarrhea', 'bloating'].some(k => se[k]);
  let key, title, desc;
  if (dose === 2.5) { key = 'start'; title = 'شروع درمان (دوز ۲.۵ میلی‌گرم)'; desc = 'بدن در حال سازگاری با دارو است؛ وعده‌ها کوچک‌تر و تعدادشان بیشتر، غذاها کم‌چرب و سبک.'; }
  else if (week <= 2) { key = 'escalation'; title = `افزایش دوز به ${fa(dose)} میلی‌گرم`; desc = 'دو هفته‌ی اول پس از افزایش دوز، احتمال عوارض گوارشی بیشتر است؛ برنامه سبک‌تر و وعده‌ها کوچک‌تر شده است.'; }
  else if (dose >= 10) { key = 'high'; title = `دوز بالا (${fa(dose)} میلی‌گرم)`; desc = 'اشتها به‌طور قابل توجهی کم می‌شود؛ اولویت با پروتئین و حفظ عضله است: در هر وعده اول پروتئین را بخورید.'; }
  else { key = 'steady'; title = `دوز پایدار (${fa(dose)} میلی‌گرم)`; desc = 'بدن با دوز فعلی سازگار شده است؛ برنامه‌ی متعادل با تمرکز بر کیفیت غذا و فعالیت بدنی.'; }
  return { key, title, desc, dose, week, anyGI };
}

/* ---------- برنامه‌ی بدنسازی (بدون دارو) ----------
   انرژی: کات ۲۰٪ کمتر از مصرف روزانه، حجم ۱۰٪ بیشتر، ریکامپ برابر مصرف (Helms 2014؛ Iraki 2019)
   پروتئین: گرم به ازای هر کیلو وزن، یا اگر درصد چربی وارد شده به ازای هر کیلو توده‌ی بدون چربی
   (ISSN، Jäger 2017: ۱.۴ تا ۲.۰ گرم/کیلو؛ Helms 2014: ۲.۳ تا ۳.۱ گرم/کیلو توده‌ی بدون چربی در کات)
   چربی: ۲۵٪ انرژی و دست‌کم ۰.۶ گرم/کیلو؛ کربوهیدرات: باقی انرژی */
const BB_GOAL = {
  cut: { t: 'کات (چربی‌سوزی با حفظ عضله)', k: 0.80, pBW: 2.2, pLBM: 2.6 },
  recomp: { t: 'ریکامپ (کاهش چربی و حفظ یا افزایش عضله)', k: 1.00, pBW: 2.0, pLBM: 2.4 },
  bulk: { t: 'حجم (عضله‌سازی)', k: 1.10, pBW: 1.8, pLBM: 2.2 },
};
const BB_TIME = { morning: 'صبح', noon: 'ظهر', afternoon: 'عصر', evening: 'شب' };
const bbOf = p => {
  const b = Object.assign({ goal: 'recomp', days: [0, 2, 4], time: 'afternoon', bf: '', ppk: '', sup: {}, micOff: {}, detox: { on: false, days: 14 } }, p.bb || {});
  if (b.creatine && b.sup.creatine == null) b.sup = { ...b.sup, creatine: true }; // پرونده‌های نسخه‌ی قبل
  return b;
};
/* مکمل‌های ورزشی انتخاب‌شده توسط پزشک */
const bbSupps = p => { const b = bbOf(p); return BB_SUPPS.filter(s => s.tog ? p[s.tog] : b.sup[s.k]); };

function computeTargetsBB(p) {
  const W = +p.weight, H = +p.height, A = +p.age, sex = p.sex;
  const b = bbOf(p), G = BB_GOAL[b.goal] || BB_GOAL.recomp;
  const bmi = W / Math.pow(H / 100, 2);
  const ibw = Math.max((sex === 'm' ? 50 : 45.5) + 0.9055 * (H - 152.4), 40);
  const bf = +b.bf > 3 && +b.bf < 60 ? +b.bf : null;
  const lbm = bf ? W * (1 - bf / 100) : null;
  const bmr = lbm ? 370 + 21.6 * lbm : 10 * W + 6.25 * H - 5 * A + (sex === 'm' ? 5 : -161); // Katch-McArdle یا Mifflin-St Jeor
  const tdee = bmr * ACT[+p.activity || 0].v;
  const hx = p.hx || {}, lab = p.labs || {};
  const notes = [], warns = [];

  const floor = sex === 'm' ? 1500 : 1200;
  const kcal = round(Math.max(tdee * G.k, floor), 10);

  const egfr = lab.egfr ? +lab.egfr : egfrCKDEPI(+lab.cr, A, sex);
  let pPerKg = +b.ppk > 0 ? +b.ppk : (lbm ? G.pLBM : G.pBW);
  let pBasis = +b.ppk > 0 ? 'تعیین پزشک، به ازای وزن' : lbm ? 'توده‌ی بدون چربی' : 'وزن بدن';
  let prot = pPerKg * (lbm && !(+b.ppk > 0) ? lbm : W);
  if (egfr && egfr < 60 || hx.ckd) { pPerKg = 0.8; pBasis = 'وزن بدن'; prot = 0.8 * W; warns.push('عملکرد کلیه کاهش یافته است؛ رژیم پرپروتئین بدنسازی مناسب نیست و پروتئین به ۰.۸ گرم به ازای هر کیلو محدود شد. برنامه با نظر نفرولوژیست تنظیم شود.'); }
  prot = round(Math.min(prot, 0.4 * kcal / 4), 1);

  let fat = Math.max(kcal * 0.25 / 9, 0.6 * W);
  let carb = (kcal - prot * 4 - fat * 9) / 4;
  if (carb < 100) { carb = 100; fat = Math.max((kcal - prot * 4 - carb * 4) / 9, 0.5 * W); }
  fat = round(fat, 1); carb = round(carb, 1);
  const fatPct = Math.round(fat * 9 / kcal * 100);

  const fiber = round(14 * kcal / 1000, 1);
  const water = clamp(round(35 * W + 500, 100), 2500, 4500);
  const meals = kcal > 3000 ? 6 : 5;

  if (A < 18) warns.push('برای افراد زیر ۱۸ سال، برنامه‌ی تغذیه‌ی ورزشی باید با نظر متخصص تغذیه‌ی کودکان و نوجوانان تنظیم شود.');
  if (hx.pregnant) warns.push('در بارداری و شیردهی، برنامه‌ی کات یا حجم مناسب نیست؛ تغذیه با نظر متخصص زنان و تغذیه تنظیم شود.');
  if (hx.insulin) warns.push('مصرف انسولین یا سولفونیل‌اوره: با تغییر کربوهیدرات و تمرین، خطر افت قند خون وجود دارد؛ تنظیم دوز توسط پزشک لازم است.');
  if (hx.cvd || hx.hf) warns.push('بیماری قلبی: شدت تمرین و برنامه با نظر متخصص قلب تعیین شود.');
  const rate = { cut: 'هدف: کاهش وزن حدود ۰.۵ تا ۱ درصد وزن بدن در هفته؛ اگر سریع‌تر بود، کالری را کمی بالا ببرید تا عضله حفظ شود.', bulk: 'هدف: افزایش وزن حدود ۰.۲۵ تا ۰.۵ درصد وزن بدن در هفته؛ افزایش سریع‌تر بیشتر چربی است.', recomp: 'وزن تقریباً ثابت می‌ماند؛ پیشرفت را با دور کمر، عکس و قدرت در تمرین بسنجید، نه فقط ترازو.' }[b.goal];
  notes.push(rate);
  if (bf) notes.push(`با درصد چربی ${fa(bf)}٪، توده‌ی بدون چربی ${fa(lbm, 1)} کیلوگرم است؛ متابولیسم پایه با فرمول Katch-McArdle و پروتئین به ازای توده‌ی بدون چربی حساب شد.`);
  if (hx.binge) notes.push(BINGE_NOTE);
  if (+p.activity < 2) notes.push('سطح فعالیت کمتر از «متوسط» انتخاب شده است؛ برای ورزشکاری که منظم تمرین می‌کند معمولاً «متوسط» یا «فعال» درست‌تر است.');
  labFlags(lab, sex, egfr).forEach(f => notes.push(f));
  const sugarCap = (hx.dm || +lab.hba1c >= 5.7 || +lab.fbs >= 100 || +lab.tg >= 150) ? 'low' : 'normal';
  const ph = { key: 'bb', title: G.t, desc: `${fa((b.days || []).length)} روز تمرین در هفته، ${BB_TIME[b.time] || ''}؛ در روزهای تمرین یک وعده‌ی قبل از تمرین دارید و وعده‌ی اصلی بعدی، وعده‌ی بعد از تمرین است.` };
  return {
    bmi, ibw, adj: W, bmr, tdee, kcal, prot, fat, carb, fatPct, fiber, water, meals, ph, notes, warns, egfr, pPerKg, pBasis,
    sugarCap, lowFat: false, dri: dri(sex, A), bb: b, lbm, bf, goal: b.goal,
    pctP: Math.round(prot * 4 / kcal * 100), pctC: Math.round(carb * 4 / kcal * 100), pctF: 100 - Math.round(prot * 4 / kcal * 100) - Math.round(carb * 4 / kcal * 100),
  };
}

/* محاسبه‌ی نیازها */
function computeTargets(p) {
  if (p.prog === 'bb') return computeTargetsBB(p);
  const W = +p.weight, H = +p.height, A = +p.age, sex = p.sex;
  const bmi = W / Math.pow(H / 100, 2);
  const ibw = Math.max((sex === 'm' ? 50 : 45.5) + 0.9055 * (H - 152.4), 40); // Devine (۲.۳ کیلو به ازای هر اینچ)
  const adj = W > ibw * 1.2 ? ibw + 0.4 * (W - ibw) : W;
  const bmr = 10 * W + 6.25 * H - 5 * A + (sex === 'm' ? 5 : -161); // Mifflin-St Jeor
  const actF = ACT[+p.activity || 0].v;
  const tdee = bmr * actF;
  const ph = treatmentPhase(p);
  const se = p.side || {}, hx = p.hx || {}, lab = p.labs || {};
  const notes = [], warns = [];

  // کسری کالری
  let deficit = { start: 500, escalation: 500, steady: 600, high: 750 }[ph.key];
  if (A >= 65) deficit = Math.min(deficit, 500);
  const floor = sex === 'm' ? 1500 : 1200;
  let kcal = Math.max(tdee - deficit, floor);
  if (kcal > tdee) kcal = tdee; // در افراد بسیار کوچک‌جثه
  kcal = round(kcal, 10);

  // پروتئین
  const egfr = lab.egfr ? +lab.egfr : egfrCKDEPI(+lab.cr, A, sex);
  let pPerKg = 1.3, pBasis = 'وزن تعدیل‌شده';
  if (A >= 65) pPerKg = 1.4;
  if (ph.key === 'high') pPerKg = 1.4;
  if (egfr && egfr < 30) { pPerKg = 0.6; warns.push('eGFR کمتر از ۳۰ است؛ پروتئین به ۰.۶ گرم به ازای هر کیلو محدود شد. برنامه حتماً با نظر نفرولوژیست تنظیم شود.'); }
  else if ((egfr && egfr < 60) || hx.ckd) { pPerKg = 0.8; notes.push('به دلیل کاهش عملکرد کلیه، پروتئین در حد ۰.۸ گرم به ازای هر کیلو تنظیم شد.'); }
  let prot = Math.max(pPerKg * adj, pPerKg >= 1.2 ? 60 : 0);
  prot = clamp(prot, 0.2 * kcal / 4, 0.35 * kcal / 4);
  if (pPerKg < 1) prot = pPerKg * adj;
  prot = round(prot, 1);

  // چربی و کربوهیدرات
  let fatPct = 30;
  const lowFat = ph.key === 'start' || ph.key === 'escalation' || se.nausea || se.vomit || se.reflux || hx.gall || hx.pancreatitis;
  if (lowFat) fatPct = 25;
  let fat = round(kcal * fatPct / 100 / 9, 1);
  let carb = round((kcal - prot * 4 - fat * 9) / 4, 1);
  if (carb < 130) { fat = round((kcal - prot * 4 - 130 * 4) / 9, 1); carb = 130; fatPct = Math.round(fat * 9 / kcal * 100); }

  // فیبر
  let fiber = round(14 * kcal / 1000, 1);
  if (se.diarrhea) { fiber = Math.min(fiber, 20); notes.push('به دلیل اسهال، فیبر موقتاً کمتر و سبزیجات بیشتر پخته در نظر گرفته شد.'); }
  if (se.constipation) { fiber = Math.max(fiber, 25); notes.push('به دلیل یبوست، فیبر و آب بیشتر و میوه‌های ملین (آلو، انجیر، کیوی، گلابی) در برنامه گنجانده شد.'); }

  // آب
  let water = 35 * adj;
  if (+p.activity >= 2) water += 500;
  if (se.vomit || se.diarrhea) water += 500;
  if (se.constipation) water += 300;
  water = clamp(round(water, 100), 2000, 3500);
  if (hx.hf || (egfr && egfr < 30)) warns.push('در نارسایی قلب یا بیماری پیشرفته‌ی کلیه، میزان مایعات باید توسط پزشک معالج تعیین شود؛ عدد آب صرفاً مرجع است.');

  // تعداد وعده
  let meals = 5;
  if (ph.key === 'start' || ph.key === 'escalation' || se.nausea || se.vomit || se.satiety) meals = 6;

  // هشدارها
  if (A < 18) warns.push('تیرزپاتاید برای افراد زیر ۱۸ سال تأیید نشده است.');
  if (hx.pregnant) warns.push('بارداری، شیردهی یا قصد بارداری: مصرف تیرزپاتاید توصیه نمی‌شود. برنامه کاهش وزن در این شرایط مناسب نیست.');
  if (hx.mtc) warns.push('سابقه‌ی شخصی یا خانوادگی کارسینوم مدولاری تیروئید یا MEN2 منع مصرف تیرزپاتاید است.');
  if (hx.pancreatitis) warns.push('سابقه‌ی پانکراتیت: مصرف با احتیاط و پایش علائم (درد شدید شکم که به پشت می‌زند).');
  if (hx.insulin) warns.push('مصرف انسولین یا سولفونیل‌اوره: خطر افت قند خون؛ تنظیم دوز این داروها توسط پزشک لازم است.');
  if (hx.gall) notes.push('بیماری کیسه صفرا: کاهش وزن سریع خطر سنگ صفرا را بالا می‌برد؛ چربی برنامه کمتر و وعده‌ها منظم است.');
  if (hx.binge) notes.push(BINGE_NOTE);
  if (hx.ocp && sex === 'f') notes.push('تیرزپاتاید ممکن است اثر قرص ضدبارداری خوراکی را کم کند؛ تا ۴ هفته پس از شروع و پس از هر افزایش دوز، روش کمکی پیشگیری توصیه می‌شود.');
  if (A >= 65) notes.push('سن بالای ۶۵ سال: پروتئین بیشتر و ورزش مقاومتی برای جلوگیری از کاهش عضله اهمیت ویژه دارد.');
  if (bmi < 27) notes.push('نمایه‌ی توده‌ی بدن کمتر از ۲۷ است؛ اندیکاسیون درمان دارویی چاقی بررسی شود.');

  // آزمایش‌ها
  const flags = labFlags(lab, sex, egfr);
  flags.forEach(f => notes.push(f));

  const sugarCap = (hx.dm || +lab.hba1c >= 5.7 || +lab.fbs >= 100 || +lab.tg >= 150) ? 'low' : 'normal';

  return {
    bmi, ibw, adj, bmr, tdee, kcal, prot, fat, carb, fatPct, fiber, water, meals, ph, notes, warns, egfr, pPerKg, pBasis,
    sugarCap, lowFat, dri: dri(sex, A),
    pctP: Math.round(prot * 4 / kcal * 100), pctC: Math.round(carb * 4 / kcal * 100), pctF: Math.round(fat * 9 / kcal * 100),
  };
}

function labFlags(l, sex, egfr) {
  const o = [];
  const v = k => (l[k] === '' || l[k] == null) ? null : +l[k];
  const a1c = v('hba1c'), fbs = v('fbs');
  if ((a1c != null && a1c >= 6.5) || (fbs != null && fbs >= 126)) o.push('قند خون در محدوده‌ی دیابت است؛ قندهای ساده و میوه‌ی خشک از برنامه حذف و غلات کامل ترجیح داده شد.');
  else if ((a1c != null && a1c >= 5.7) || (fbs != null && fbs >= 100)) o.push('قند خون در محدوده‌ی پیش‌دیابت است؛ قندهای ساده محدود شد.');
  if (v('tg') != null && v('tg') >= 150) o.push('تری‌گلیسرید بالاست؛ قند، شیرینی، عسل و میوه‌ی خشک محدود شد.');
  if (v('ldl') != null && v('ldl') >= 130) o.push('LDL بالاست؛ چربی اشباع کمتر و ماهی، حبوبات و مغزها ترجیح داده شد.');
  if (v('hdl') != null && v('hdl') < (sex === 'm' ? 40 : 50)) o.push('HDL پایین است؛ فعالیت بدنی منظم و چربی‌های سالم (روغن زیتون، گردو، ماهی) کمک‌کننده است.');
  if (v('alt') != null && v('alt') > (sex === 'm' ? 40 : 35)) o.push('ALT بالاست (احتمال کبد چرب)؛ کاهش وزن تدریجی، حذف قندهای افزوده و نوشابه.');
  if (egfr != null) o.push(`eGFR تخمینی: ${fa(Math.round(egfr))} میلی‌لیتر/دقیقه/۱.۷۳ متر مربع.`);
  if (v('vitd') != null && v('vitd') < 20) o.push('ویتامین D کمبود دارد (کمتر از ۲۰)؛ مکمل طبق نظر پزشک.');
  else if (v('vitd') != null && v('vitd') < 30) o.push('ویتامین D در حد ناکافی است (۲۰ تا ۳۰)؛ آفتاب و مکمل طبق نظر پزشک.');
  if (v('ferritin') != null && v('ferritin') < 30) o.push('فریتین پایین است؛ منابع آهن (گوشت قرمز کم‌چرب، عدس، اسفناج) همراه با منبع ویتامین C مصرف شود؛ چای یک ساعت با فاصله از غذا.');
  if (v('hb') != null && v('hb') < (sex === 'm' ? 13 : 12)) o.push('هموگلوبین پایین است؛ بررسی علت کم‌خونی.');
  if (v('tsh') != null && v('tsh') > 4.5) o.push('TSH بالاست؛ وضعیت تیروئید بررسی شود.');
  if (v('b12') != null && v('b12') < 200) o.push('ویتامین B12 پایین است (به‌ویژه در مصرف متفورمین)؛ مکمل طبق نظر پزشک.');
  return o;
}

/* ------------------------------------------------------------ */
/* مجموعه‌ی غذاهای مجاز برای بیمار */
function allowedFoods(p, T) {
  const ex = new Set(p.dislikes || []);
  const al = p.allergy || {};
  const se = p.side || {};
  const hx = p.hx || {};
  const banTags = new Set();
  if (se.bloating || hx.ibs) banTags.add('gas');
  if (se.diarrhea) { banTags.add('raw'); banTags.add('laxative'); banTags.add('lactose'); banTags.add('hisugar'); }
  if (se.reflux || hx.gerd) { banTags.add('acid'); banTags.add('reflux'); }
  if (se.nausea || se.vomit) { banTags.add('reflux'); }
  if (T.sugarCap === 'low') banTags.add('hisugar');
  if (T.lowFat) banTags.add('fattyP'); // فقط برای منابع پروتئین
  const ok = {};
  Object.keys(META).forEach(id => {
    if (!FOOD[id]) return;
    if (ex.has(id)) return;
    if (ALLERGY.some(([k, , fn]) => al[k] && fn(id))) return;
    const t = META[id].t || [];
    if (t.includes('supp') && !p.allowSupp) return;
    if (t.some(x => banTags.has(x))) return;
    if (banTags.has('fattyP') && t.includes('fatty') && ['red', 'fish', 'cheese'].includes(META[id].g)) return;
    ok[id] = true;
  });
  // در حالت اسهال لبنیات تخمیری (ماست) مجاز می‌ماند
  return { ok, banTags };
}

/* مولد عدد تصادفی قابل تکرار */
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function poolList(pl) { return Array.isArray(pl) ? pl : (POOL[pl] || []); }

function slotsFor(n) {
  if (n >= 6) return [['breakfast', .20], ['snack1', .10], ['lunch', .28], ['snack2', .10], ['dinner', .22], ['snack3', .10]];
  if (n === 4) return [['breakfast', .27], ['lunch', .35], ['snack2', .12], ['dinner', .26]];
  return [['breakfast', .25], ['snack1', .10], ['lunch', .32], ['snack2', .10], ['dinner', .23]];
}
/* وعده‌های بدنسازی: در روز تمرین یک وعده‌ی «قبل از تمرین» جای میان‌وعده را می‌گیرد و
   وعده‌ی اصلی بعد از تمرین علامت post می‌خورد (کربوهیدرات و پروتئین بیشتر) */
function slotsBB(T, train) {
  const t = T.bb.time;
  let s;
  if (!train) s = [['breakfast', .25], ['snack1', .10], ['lunch', .30], ['snack2', .12], ['dinner', .23]];
  else if (t === 'morning') s = [['pre', .10], ['breakfast', .25, 1], ['snack1', .10], ['lunch', .30], ['dinner', .25]];
  else if (t === 'noon') s = [['breakfast', .23], ['pre', .12], ['lunch', .32, 1], ['snack2', .10], ['dinner', .23]];
  else s = [['breakfast', .22], ['snack1', .10], ['lunch', .27], ['pre', .12], ['dinner', .29, 1]];
  if (T.meals >= 6) s = [...s.map(([k, v, po]) => [k, v * 0.92, po]), ['snack3', .08]];
  return s;
}
const isTrainDay = (p, d) => p.prog === 'bb' && (bbOf(p).days || []).includes(d);

/* وزن تقریبی خام یک غذای پخته (فقط برای اقلامی که جفت خام دارند) */
function rawEq(id, g) {
  const r = RAW[id];
  if (!r || !FOOD[r[0]]) return null;
  const a = nv(id, r[1]), b = nv(r[0], r[1]);
  return a > 0 && b > 0 ? g * a / b : null;
}

/* یک الگو را برای بیمار قابل اجرا می‌کند (انتخاب غذا از هر مخزن) */
function instantiate(tpl, ok, R, prefer, used) {
  const items = [];
  for (const c of tpl.c) {
    let cand = poolList(c.p).filter(id => ok[id]);
    if (!cand.length && c.alt) cand = poolList(c.alt).filter(id => ok[id]);
    let fb = false;
    if (!cand.length && !c.opt && FALLBACK[c.r]) { cand = FALLBACK[c.r].filter(id => ok[id]); fb = true; }
    if (!cand.length) { if (c.opt) continue; return null; }
    // ترجیح: غذاهایی که اخیراً استفاده نشده‌اند و برچسب ترجیحی دارند
    const w = cand.map(id => {
      let x = 1;
      if (used && used[id]) x /= (1 + used[id] * 1.5);
      if (prefer && (META[id].t || []).some(t => prefer.has(t))) x *= 3;
      return x;
    });
    let s = w.reduce((a, b) => a + b, 0) * R(), id = cand[cand.length - 1];
    for (let i = 0; i < cand.length; i++) { s -= w[i]; if (s <= 0) { id = cand[i]; break; } }
    items.push({ id, r: c.r, nom: c.g[0], min: c.g[1], max: c.g[2], g: c.g[0], fb });
  }
  if (!items.some(i => i.r === 'P') && !items.some(i => i.r === 'C')) return null;
  return items;
}

/* جایگزین عمومی وقتی محدودیت‌ها همه‌ی گزینه‌های یک جزء را حذف کرده‌اند */
const FALLBACK = {
  P: ['F09', 'F12', 'F11', 'F15', 'F14', 'F18', 'F21', 'F20', 'N64', 'F17', 'F01', 'N61'],
  C: ['F22', 'F26', 'F27', 'N75', 'F28', 'F23', 'F33', 'F31'],
};
const scaleOf = T => ({ minP: T.pPerKg < 1 ? 0.4 : 1, max: Math.max(1, T.kcal / 2000) });

const nv = (id, k) => (FOOD[id] && FOOD[id].n[k] != null) ? FOOD[id].n[k] : 0;

/* تنظیم وزن‌ها برای رسیدن به هدف انرژی، پروتئین و چربی */
function sizeMeal(items, tk, tp, tf, sc) {
  sc = sc || { minP: 1, max: 1 };
  items.forEach(i => { if (i.r === 'P') i.min *= sc.minP; if (i.r !== 'V' && i.r !== 'X') i.max *= sc.max; });
  const sum = (arr, k) => arr.reduce((a, i) => a + i.g * nv(i.id, k) / 100, 0);
  for (let it = 0; it < 8; it++) {
    for (const role of ['P', 'F', 'C']) {
      const R = items.filter(i => i.r === role), O = items.filter(i => i.r !== role);
      if (!R.length) continue;
      const key = role === 'P' ? 'p' : role === 'F' ? 'f' : 'kcal';
      const tgt = role === 'P' ? tp : role === 'F' ? tf : tk;
      const need = tgt - sum(O, key);
      const base = R.reduce((a, i) => a + Math.max(i.nom, 1) * nv(i.id, key) / 100, 0);
      if (base <= 0) continue;
      const s = Math.max(need / base, 0);
      R.forEach(i => { i.g = clamp(Math.max(i.nom, 1) * s, i.min, i.max); });
    }
  }
  items.forEach(i => {
    const m = META[i.id] || {};
    let step = m.r || 5;
    i.g = round(i.g, step);
    if (m.min && i.g > 0 && i.g < m.min) i.g = m.min;
    if (i.g < i.min) i.g = Math.ceil(i.min / step) * step;
  });
  const out = [];
  items.filter(i => i.g > 0).forEach(i => { const d = out.find(o => o.id === i.id); if (d) d.g += i.g; else out.push(i); });
  return out;
}

function mealTotals(items) {
  const t = {};
  NUTR.forEach(([k]) => { t[k] = 0; });
  items.forEach(i => NUTR.forEach(([k]) => { t[k] += i.g * nv(i.id, k) / 100; }));
  return t;
}
function addTotals(a, b) { const t = { ...a }; NUTR.forEach(([k]) => { t[k] = (t[k] || 0) + (b[k] || 0); }); return t; }

function mealName(tpl, items) {
  const P = items.find(i => i.r === 'P');
  if (items.some(i => i.fb)) { // الگو با جایگزین عمومی پر شده؛ نام را از اقلام واقعی بساز
    const nm = r => [...new Set(items.filter(i => i.r === r).map(i => META[i.id].s))];
    const ps = nm('P'), cs = nm('C');
    return ps.join(' و ') + (cs.length ? ' با ' + cs.join(' و ') : '') + (items.some(i => i.r === 'V') ? ' و سبزیجات' : '');
  }
  return tpl.n.replace('{P}', P ? META[P.id].s : '');
}

function preferSet(p, T) {
  const se = p.side || {}, prefer = new Set();
  if (se.constipation) prefer.add('laxative');
  if (se.nausea || se.vomit || T.ph.key === 'start' || T.ph.key === 'escalation') prefer.add('gentle');
  return prefer;
}

function tplAllowed(t, slot, p) {
  const se = p.side || {};
  if (t.prog && t.prog !== (p.prog || 'sp')) return false;
  if (t.need === 'supp' && !p.allowSupp) return false;
  if (t.need === 'constipation' && !se.constipation) return false;
  if (t.need === 'nausea' && !(se.nausea || se.vomit)) return false;
  if (slot === 'snack3' && !['S2', 'S4', 'S7', 'S9', 'SB1', 'SB3'].includes(t.id)) return false;
  return true;
}

/* بازسازی یک وعده با الگوی دیگر */
function regenMeal(p, T, meal) {
  const { ok } = allowedFoods(p, T);
  const R = rng(Date.now());
  const prefer = preferSet(p, T);
  const list = TEMPLATES[SLOT_TYPE[meal.slot]].filter(t => tplAllowed(t, meal.slot, p));
  list.sort(() => R() - 0.5);
  if (meal.post) list.sort((a, b) => ((b.tags || []).includes('post') - (a.tags || []).includes('post')));
  list.sort((a, b) => (a.id === meal.tpl) - (b.id === meal.tpl));
  for (const t of list) {
    let items = instantiate(t, ok, R, prefer, null);
    if (!items) continue;
    items = sizeMeal(items, T.kcal * meal.share, T.prot * meal.share, T.fat * meal.share, scaleOf(T));
    return { slot: meal.slot, tpl: t.id, name: mealName(t, items), share: meal.share, post: meal.post, items };
  }
  return meal;
}

/* تولید برنامه‌ی ۷ روزه */
function generatePlan(p, T, seed) {
  const { ok } = allowedFoods(p, T);
  const se = p.side || {};
  seed = seed || hashStr((p.name || '') + (p.dose || '') + Date.now());
  const R = rng(seed);
  const prefer = preferSet(p, T);
  const usedFood = {}, usedTpl = {};
  const days = [];
  for (let d = 0; d < 7; d++) {
    const meals = [], today = new Set();
    const train = isTrainDay(p, d);
    const slots = p.prog === 'bb' ? slotsBB(T, train) : slotsFor(T.meals);
    for (const [slot, share, post] of slots) {
      const type = SLOT_TYPE[slot];
      let list = TEMPLATES[type].filter(t => tplAllowed(t, slot, p));
      // وزن‌دهی برای تنوع
      const scored = list.map(t => {
        let w = 1 / (1 + (usedTpl[slot + t.id] || 0) * 2.5);
        if ((t.tags || []).includes('soup') && prefer.has('gentle')) w *= 2.5;
        if (t.prog === 'bb') w *= 1.6;
        if (post && (t.tags || []).includes('post')) w *= 3;
        if (t.need && (se.constipation || se.nausea)) w *= 2;
        if (today.has(t.id)) w *= 0.05;
        return [t, w];
      });
      let chosen = null, items = null;
      for (let tries = 0; tries < 20 && !items; tries++) {
        const tot = scored.reduce((a, [, w]) => a + w, 0);
        let s = R() * tot;
        for (const [t, w] of scored) { s -= w; if (s <= 0) { chosen = t; break; } }
        if (!chosen) chosen = scored[scored.length - 1][0];
        items = instantiate(chosen, ok, R, prefer, usedFood);
        if (!items) { const ix = scored.findIndex(x => x[0] === chosen); if (ix >= 0) scored.splice(ix, 1); chosen = null; if (!scored.length) break; }
      }
      if (!items) continue;
      const tk = T.kcal * share, tp = T.prot * share, tf = T.fat * share;
      items = sizeMeal(items, tk, tp, tf, scaleOf(T));
      items.forEach(i => { usedFood[i.id] = (usedFood[i.id] || 0) + 1; });
      usedTpl[slot + chosen.id] = (usedTpl[slot + chosen.id] || 0) + 1;
      today.add(chosen.id);
      meals.push({ slot, tpl: chosen.id, name: mealName(chosen, items), share, post: post ? 1 : undefined, items });
    }
    balanceDay(meals, T);
    days.push({ meals, train: train || undefined });
  }
  return { seed, days, created: Date.now() };
}

/* تنظیم روزانه: اگر پروتئین روز از ۹۵٪ هدف کمتر شد، اقلام پروتئینی (در حد مجاز هر قلم) بیشتر و
   اقلام کربوهیدراتی به همان اندازه‌ی انرژی کمتر می‌شوند تا انرژی روز ثابت بماند */
function balanceDay(meals, T) {
  const all = meals.flatMap(m => m.items);
  const tot = k => all.reduce((a, i) => a + i.g * nv(i.id, k) / 100, 0);
  const P = all.filter(i => i.r === 'P' && nv(i.id, 'p') >= 8), C = all.filter(i => i.r === 'C');
  const p0 = tot('p');
  if (!P.length || p0 >= 0.95 * T.prot) return;
  const k0 = tot('kcal');
  const pP = P.reduce((a, i) => a + i.g * nv(i.id, 'p') / 100, 0);
  const f = Math.min((T.prot - (p0 - pP)) / pP, 1.6);
  P.forEach(i => { const m = META[i.id] || {}; i.g = round(clamp(i.g * f, i.min, i.max), m.r || 5); });
  const extra = tot('kcal') - k0, kC = C.reduce((a, i) => a + i.g * nv(i.id, 'kcal') / 100, 0);
  if (extra > 0 && kC > 0) {
    const s = Math.max((kC - extra) / kC, 0.5);
    C.forEach(i => { const m = META[i.id] || {}; i.g = round(clamp(i.g * s, i.min, i.max), m.r || 5); if (m.min && i.g < m.min) i.g = m.min; });
  }
}

function dayTotals(day) { return day.meals.reduce((t, m) => addTotals(t, mealTotals(m.items)), mealTotals([])); }
function weekAvg(plan) {
  const t = plan.days.reduce((a, d) => addTotals(a, dayTotals(d)), mealTotals([]));
  NUTR.forEach(([k]) => { t[k] /= plan.days.length; });
  return t;
}

/* گزینه‌های جانشین برای یک قلم */
function swapOptions(p, T, id) {
  const { ok } = allowedFoods(p, T);
  const fam = SWAP_FAMILY[META[id].g] || [META[id].g];
  return Object.keys(META).filter(x => x !== id && ok[x] && fam.includes(META[x].g));
}

/* جانشینی هم‌ارز: پروتئین برای نقش P، چربی برای F، انرژی برای بقیه */
function swapItem(item, newId) {
  const key = item.r === 'P' ? 'p' : item.r === 'F' ? 'f' : 'kcal';
  const old = item.g * nv(item.id, key) / 100;
  const d = nv(newId, key);
  let g = d > 0 ? old / d * 100 : item.g;
  if (item.r === 'V' || item.r === 'X') g = item.g;
  const m = META[newId];
  g = Math.max(round(g, m.r || 5), m.min || (m.r || 5));
  return { ...item, id: newId, g };
}

/* واحد خانگی */
function household(id, g) {
  const m = META[id];
  if (!m || !m.hu) return '';
  let best = null;
  for (const [ug, lab] of m.hu) {
    const n = g / ug;
    if (n >= 0.4 && n <= 12) { best = [n, lab]; break; }
  }
  if (!best) return '';
  let [n, lab] = best;
  const r = n < 3 ? Math.round(n * 2) / 2 : Math.round(n);
  if (r === 0) return '';
  const txt = r === 0.5 ? 'نصف' : fa(r);
  return `${txt} ${lab}`;
}

/* جدول جانشینی (هر واحد) */
const EXCH = [
  { key: 'c', amt: 15, title: 'نان، غلات و نشاسته', sub: 'هر واحد ≈ ۱۵ گرم کربوهیدرات', groups: ['bread', 'grain', 'tuber'] },
  { key: 'c', amt: 15, title: 'میوه', sub: 'هر واحد ≈ ۱۵ گرم کربوهیدرات', groups: ['fruit', 'dried'] },
  { key: 'p', amt: 7, title: 'گوشت، ماهی، تخم‌مرغ', sub: 'هر واحد ≈ ۷ گرم پروتئین', groups: ['poultry', 'red', 'fish', 'egg'] },
  { key: 'p', amt: 7, title: 'لبنیات و حبوبات', sub: 'هر واحد ≈ ۷ گرم پروتئین', groups: ['dairy', 'cheese', 'legume'] },
  { key: 'f', amt: 5, title: 'چربی‌ها و مغزها', sub: 'هر واحد ≈ ۵ گرم چربی', groups: ['oil', 'nut', 'fat'] },
];
function exchangeTable(ok) {
  return EXCH.map(e => ({
    ...e,
    rows: Object.keys(META).filter(id => ok[id] && e.groups.includes(META[id].g) && nv(id, e.key) > 0.5 && META[id].g !== 'supp')
      .map(id => { const g = e.amt / nv(id, e.key) * 100; const gg = g < 20 ? Math.round(g) : round(g, 5); return { id, g: gg, kcal: Math.round(gg * nv(id, 'kcal') / 100), hu: household(id, gg) }; })
      .filter((r, i, a) => a.findIndex(x => META[x.id].s === META[r.id].s) === i),
  }));
}

/* فهرست خرید هفتگی — گوشت، ماهی، برنج، غلات و حبوبات به وزن خام */
function shoppingList(plan) {
  const agg = {}, grpOf = {};
  plan.days.forEach(d => d.meals.forEach(m => m.items.forEach(i => {
    const r = rawEq(i.id, i.g), id = r != null ? RAW[i.id][0] : i.id;
    agg[id] = (agg[id] || 0) + (r != null ? r : i.g); grpOf[id] = META[i.id].g;
  })));
  const by = {};
  Object.entries(agg).forEach(([id, g]) => {
    const grp = grpOf[id]; (by[grp] = by[grp] || []).push({ id, g, raw: !META[id] });
  });
  return by;
}
/* ---------- مکمل‌های ریزمغذی پیشنهادی (بر اساس آزمایش، رژیم و پوشش برنامه) ----------
   فقط پیشنهاد برای پزشک؛ مقدارها: DRI و سقف مجاز (UL) آکادمی ملی علوم آمریکا، راهنمای ویتامین D انجمن غدد (Holick 2011)،
   آهن یک روز در میان (Stoffel 2017 و 2020).
   سطح توصیه (lvl): کمبود در آزمایش یا پوشش برنامه کمتر از ۵۰٪ → 'req' (حتماً مصرف شود)؛
   پوشش ۵۰ تا ۷۰٪ → 'opt' (در صورت تمایل). خروجی: [{k, n, lvl, why, dose, caution}] */
const MIC_REQ = 0.5, MIC_OPT = 0.7;
const MIC_LVL = { req: 'حتماً مصرف شود', opt: 'در صورت تمایل', info: 'نکته‌ی ایمنی' };
function micSupp(p, T, avg) {
  const l = p.labs || {}, al = p.allergy || {}, D = T.dri, out = [];
  const v = k => (l[k] === '' || l[k] == null) ? null : +l[k];
  const cov = k => avg[k] / D[k];
  const lv = k => cov(k) < MIC_REQ ? 'req' : 'opt';
  const covTxt = k => `برنامه‌ی غذایی فقط ${fa(Math.round(cov(k) * 100))}٪ نیاز را می‌رساند`;
  const vd = v('vitd');
  if (vd != null && vd < 20) out.push({ k: 'vitd', lvl: 'req', n: 'ویتامین D', why: `کمبود (سطح خون ${fa(vd)} نانوگرم در میلی‌لیتر)`, dose: 'طبق نظر پزشک؛ رژیم رایج درمان: ۵۰٬۰۰۰ واحد هفته‌ای یک بار به مدت ۸ هفته، سپس ۱۵۰۰ تا ۲۰۰۰ واحد در روز. پس از ۳ ماه آزمایش تکرار شود.', caution: 'همراه وعده‌ی چرب‌دار. بیش از ۴۰۰۰ واحد در روز برای نگه‌داری، بدون نظر پزشک مصرف نشود.' });
  else if (vd != null && vd < 30) out.push({ k: 'vitd', lvl: 'req', n: 'ویتامین D', why: `ناکافی (سطح خون ${fa(vd)} نانوگرم در میلی‌لیتر)`, dose: '۱۵۰۰ تا ۲۰۰۰ واحد در روز (یا معادل هفتگی آن) طبق نظر پزشک.', caution: 'همراه وعده‌ی چرب‌دار. بیش از ۴۰۰۰ واحد در روز بدون نظر پزشک مصرف نشود.' });
  else if (vd == null && cov('vd') < MIC_OPT) out.push({ k: 'vitd', lvl: lv('vd'), n: 'ویتامین D', why: covTxt('vd') + ' (آزمایش ویتامین D ثبت نشده است)', dose: '۱۵۰۰ تا ۲۰۰۰ واحد در روز برای نگه‌داری؛ بهتر است آزمایش ۲۵-هیدروکسی ویتامین D هم انجام شود.', caution: 'همراه وعده‌ی چرب‌دار. بیش از ۴۰۰۰ واحد در روز بدون نظر پزشک مصرف نشود.' });
  const fer = v('ferritin'), hb = v('hb');
  if ((fer != null && fer < 30) || (hb != null && hb < (p.sex === 'm' ? 13 : 12))) out.push({ k: 'iron', lvl: 'req', n: 'آهن', why: [fer != null && fer < 30 ? `فریتین پایین (${fa(fer)})` : '', hb != null && hb < (p.sex === 'm' ? 13 : 12) ? `هموگلوبین پایین (${fa(hb, 1)})` : ''].filter(Boolean).join('، '), dose: 'طبق نظر پزشک؛ معمولاً ۶۰ تا ۱۲۰ میلی‌گرم آهن المنتال، یک روز در میان (جذب بهتر و عارضه‌ی گوارشی کمتر از مصرف روزانه).', caution: 'ناشتا یا با منبع ویتامین C؛ دو ساعت فاصله از چای، قهوه، لبنیات و مکمل کلسیم. علت کم‌خونی بررسی شود.' });
  else if (cov('fe') < MIC_OPT) out.push({ k: 'iron', lvl: lv('fe'), n: 'آهن', why: covTxt('fe'), dose: fer != null ? 'یک مکمل آهن با دوز پایین (حدود ۱۵ تا ۱۸ میلی‌گرم آهن المنتال) در روز.' : 'یک مکمل آهن با دوز پایین (حدود ۱۵ تا ۱۸ میلی‌گرم آهن المنتال) در روز؛ پیش از شروع، فریتین و CBC بررسی شود.', caution: 'دو ساعت فاصله از چای، قهوه، لبنیات و مکمل کلسیم. آهن اضافه بدون کمبود می‌تواند آسیب‌رسان باشد؛ بیش از ۴۵ میلی‌گرم در روز بدون نظر پزشک مصرف نشود.' });
  const b12 = v('b12');
  if (b12 != null && b12 < 200) out.push({ k: 'b12', lvl: 'req', n: 'ویتامین B12', why: `سطح خون پایین (${fa(b12)})`, dose: 'طبق نظر پزشک؛ مکمل خوراکی با دوز بالا (معمولاً ۱۰۰۰ میکروگرم در روز) یا تزریقی.', caution: 'در مصرف متفورمین یا داروهای ضداسید طولانی‌مدت شایع‌تر است.' });
  else if (al.veg) out.push({ k: 'b12', lvl: 'req', n: 'ویتامین B12', why: 'رژیم بدون گوشت و ماهی', dose: 'روزانه یک مکمل B12 (مثلاً ۲۵ تا ۱۰۰ میکروگرم) یا طبق نظر پزشک.', caution: 'سطح B12 هر سال بررسی شود.' });
  else if (cov('b12') < MIC_OPT) out.push({ k: 'b12', lvl: lv('b12'), n: 'ویتامین B12', why: covTxt('b12'), dose: 'روزانه ۲۵ تا ۱۰۰ میکروگرم.', caution: 'در مصرف متفورمین سطح خون بررسی شود.' });
  if (cov('ca') < MIC_OPT) { const gap = Math.max(Math.round((D.ca - avg.ca) / 50) * 50, 100); out.push({ k: 'ca', lvl: lv('ca'), n: 'کلسیم', why: covTxt('ca'), dose: `فقط به اندازه‌ی کمبود: حدود ${fa(gap)} میلی‌گرم در روز، هر نوبت حداکثر ۵۰۰ میلی‌گرم.`, caution: `کربنات کلسیم همراه غذا؛ دو ساعت فاصله از آهن. مجموع غذا و مکمل از ${fa(+p.age > 50 ? 2000 : 2500)} میلی‌گرم بیشتر نشود.` }); }
  if (cov('mg') < MIC_OPT) out.push({ k: 'mg', lvl: lv('mg'), n: 'منیزیم', why: covTxt('mg'), dose: '۱۰۰ تا ۲۰۰ میلی‌گرم در روز؛ از مکمل بیش از ۳۵۰ میلی‌گرم در روز مصرف نشود.', caution: 'مقدار زیاد اسهال می‌دهد. در بیماری کلیه مصرف نشود.' });
  if (cov('zn') < MIC_OPT) out.push({ k: 'zn', lvl: lv('zn'), n: 'روی', why: covTxt('zn'), dose: '۸ تا ۱۱ میلی‌گرم در روز همراه غذا؛ بیش از ۴۰ میلی‌گرم در روز مصرف نشود.', caution: 'مصرف طولانی مقدار زیاد روی باعث کمبود مس می‌شود.' });
  if (al.veg || al.nofish) out.push({ k: 'omega3', lvl: 'opt', n: 'امگا ۳ (EPA و DHA)', why: 'ماهی در برنامه‌ی غذایی نیست', dose: 'روزانه ۲۵۰ تا ۵۰۰ میلی‌گرم EPA و DHA؛ برای گیاه‌خواران روغن جلبک.', caution: 'با داروهای ضدانعقاد با نظر پزشک.' });
  const low = ['fol', 'va', 'vc', 've', 'vk'].filter(k => cov(k) < MIC_OPT);
  if (low.length >= 2) out.push({ k: 'multi', lvl: low.some(k => cov(k) < MIC_REQ) ? 'req' : 'opt', n: 'مولتی‌ویتامین با دوز معمولی', why: `پوشش کم ${low.map(k => `${NUTR.find(x => x[0] === k)[1]} (${fa(Math.round(cov(k) * 100))}٪)`).join('، ')} در برنامه`, dose: 'یک عدد در روز با مقدارهای نزدیک به ۱۰۰٪ نیاز روزانه (نه دوزهای بالا).', caution: 'تنوع میوه و سبزی را هم بیشتر کنید.' });
  if (cov('k') < MIC_OPT) out.push({ k: 'k', lvl: 'opt', n: 'پتاسیم (از غذا)', why: covTxt('k'), dose: 'مکمل لازم نیست؛ میوه، سبزی، حبوبات، سیب‌زمینی و ماست بیشتر.', caution: 'مکمل پتاسیم فقط با نسخه‌ی پزشک.' });
  hxSupp(p, out);
  const ord = { req: 0, opt: 1, info: 2 };
  return out.sort((a, b) => ord[a.lvl] - ord[b.lvl]);
}

/* مکمل‌های مربوط به سوابق پزشکی و آزمایش چربی خون. اگر مکملی قبلاً در فهرست بود، دلیل تازه به آن اضافه می‌شود.
   ev: توضیح کوتاه شواهد. منابع در content.js کنار HX_SUPP_SRC. */
const micOffOf = p => p.micOff || (p.bb && p.bb.micOff) || {};
function hxSupp(p, out) {
  const hx = p.hx || {}, l = p.labs || {}, f = p.sex === 'f';
  const v = k => (l[k] === '' || l[k] == null) ? null : +l[k];
  const add = it => {
    const ex = out.find(o => o.k === it.k);
    if (!ex) { out.push(it); return; }
    ex.why += '؛ ' + it.why;
    if (it.lvl === 'req') ex.lvl = 'req';
    if (it.dose && !ex.dose.includes(it.dose)) ex.dose += ` — برای ${it.why}: ${it.dose}`;
    if (it.ev && !ex.ev) ex.ev = it.ev;
  };
  if (hx.binge) {
    add({ k: 'chromium', lvl: 'req', n: 'کروم (کروم پیکولینات)', why: 'پرخوری عصبی', dose: '۶۰۰ تا ۱۰۰۰ میکروگرم در روز، همراه غذا.', caution: 'در مصرف داروهای دیابت (انسولین، سولفونیل‌اوره، متفورمین) خطر افت قند؛ با نظر پزشک. در بیماری کلیه یا کبد مصرف نشود.', ev: 'در کارآزمایی بالینی (Brownley 2013) تعداد حمله‌های پرخوری و وزن را کم کرد.' });
    add({ k: 'bcomplex', lvl: 'req', n: 'ویتامین‌های گروه B (ب‌کمپلکس)', why: 'پرخوری عصبی', dose: 'روزانه ۱ عدد ب‌کمپلکس با دوز معمولی، همراه صبحانه.', caution: 'ویتامین B6 از همه‌ی منابع بیش از ۱۰۰ میلی‌گرم در روز مصرف نشود (خطر آسیب عصب). زرد شدن ادرار بی‌خطر است.', ev: 'برای جبران کمبود احتمالی ویتامین‌های B و کاهش خستگی در دوره‌ی رژیم.' });
  }
  if (hx.overeat) {
    add({ k: 'glucomannan', lvl: 'opt', n: 'گلوکومانان (فیبر محلول)', why: 'پرخوری و اشتهای زیاد', dose: '۱ گرم، ۳ بار در روز، ۱۵ تا ۳۰ دقیقه پیش از وعده‌ها، با ۱ تا ۲ لیوان آب.', caution: 'حتماً با آب کافی؛ پیش از خواب مصرف نشود (خطر گیر کردن در مری). دو ساعت فاصله از داروها. نفخ در روزهای اول شایع است.', ev: 'سازمان ایمنی غذای اروپا (EFSA) اثر آن را در کاهش وزن همراه رژیم کم‌کالری با مقدار ۳ گرم در روز پذیرفته است.' });
    add({ k: 'psyllium', lvl: 'opt', n: 'پسیلیوم (پوسته‌ی اسفرزه)', why: 'پرخوری و اشتهای زیاد', dose: '۵ گرم (حدود ۱ قاشق غذاخوری) در ۱ لیوان آب، ۳۰ دقیقه پیش از وعده‌های اصلی.', caution: 'با آب کافی؛ دو ساعت فاصله از داروها. در تنگی مری یا روده مصرف نشود.', ev: 'احساس سیری را بیشتر می‌کند.' });
    add({ k: 'slim', lvl: 'info', n: 'نکته درباره‌ی مکمل‌های لاغری و ضداشتهای بازار', why: 'پرخوری و اشتهای زیاد', dose: 'پیش از مصرف هر محصول تجاری، فهرست ترکیبات آن را به پزشک نشان دهید.', caution: 'برخی محصولات «گیاهی» لاغری به داروهای ممنوع (مثل سیبوترامین) یا ملین و ادرارآور آلوده بوده‌اند؛ فقط محصول دارای مجوز سازمان غذا و دارو.' });
  }
  if (hx.cconst) add({ k: 'psyllium', lvl: 'opt', n: 'پسیلیوم (پوسته‌ی اسفرزه)', why: 'یبوست مزمن', dose: 'روزانه ۱۰ گرم، با شروع از ۵ گرم، هر نوبت با ۱ لیوان آب.', caution: 'با آب کافی؛ دو ساعت فاصله از داروها.', ev: 'راهنمای انجمن گوارش آمریکا (ACG) آن را برای یبوست مزمن توصیه می‌کند.' });
  if (hx.joint) {
    add({ k: 'glucosamine', lvl: 'opt', n: 'گلوکزامین سولفات (با یا بدون کندرویتین)', why: 'مشکل مفصل', dose: 'گلوکزامین سولفات ۱۵۰۰ میلی‌گرم در روز (با یا بدون کندرویتین ۸۰۰ تا ۱۲۰۰ میلی‌گرم)؛ برای دیدن اثر، دست‌کم ۲ تا ۳ ماه مصرف شود.', caution: 'در حساسیت به میگو و صدف و مصرف وارفارین با نظر پزشک.', ev: 'در کارآزمایی‌ها درد و خشکی مفصل در آرتروز را کم کرده است.' });
    add({ k: 'collagen2', lvl: 'opt', n: 'کلاژن (هیدرولیز یا نوع ۲ تغییرنیافته)', why: 'مشکل مفصل', dose: 'کلاژن هیدرولیز ۱۰ گرم در روز، یا کلاژن نوع ۲ تغییرنیافته (UC-II) ۴۰ میلی‌گرم در روز.', caution: 'در محاسبه‌ی پروتئین عضله‌ساز روزانه حساب نشود.', ev: 'کارآزمایی‌ها کاهش درد مفصل در ورزشکاران و آرتروز را گزارش کرده‌اند.' });
    add({ k: 'curcumin', lvl: 'opt', n: 'کورکومین (عصاره‌ی زردچوبه)', why: 'مشکل مفصل', dose: 'حدود ۱۰۰۰ میلی‌گرم عصاره‌ی کورکومین در روز، در ۲ نوبت همراه غذا.', caution: 'در مصرف داروهای ضدانعقاد، سنگ کیسه‌ی صفرا و بیماری کبد مصرف نشود. گزارش‌های نادر آسیب کبد با عصاره‌های پرجذب.', ev: 'فراتحلیل‌ها کاهش درد آرتروز زانو را نشان داده‌اند.' });
    add({ k: 'omega3', lvl: 'opt', n: 'امگا ۳ (EPA و DHA)', why: 'مشکل مفصل', dose: '۱ تا ۲ گرم EPA و DHA در روز همراه غذا.', caution: 'با داروهای ضدانعقاد با نظر پزشک.' });
  }
  if (hx.sleep) {
    add({ k: 'melatonin', lvl: 'opt', n: 'ملاتونین', why: 'بی‌خوابی', dose: '۰.۵ تا ۳ میلی‌گرم، ۳۰ تا ۶۰ دقیقه پیش از خواب، کوتاه‌مدت.', caution: 'خواب‌آلودگی روز بعد؛ پس از مصرف رانندگی نکنید. در بارداری، شیردهی، صرع و مصرف ضدانعقاد با نظر پزشک.', ev: 'زمان به خواب رفتن را کوتاه‌تر می‌کند؛ همراه بهداشت خواب بهترین نتیجه را دارد.' });
    add({ k: 'mg', lvl: 'opt', n: 'منیزیم', why: 'بی‌خوابی', dose: '۲۰۰ تا ۳۵۰ میلی‌گرم (ترجیحاً منیزیم گلیسینات یا سیترات) شب‌ها.', caution: 'مقدار زیاد اسهال می‌دهد. در بیماری کلیه مصرف نشود.', ev: 'به‌ویژه در افراد مسن یا دارای کمبود منیزیم کیفیت خواب را بهتر می‌کند.' });
  }
  if (hx.stress) {
    add({ k: 'bcomplex', lvl: 'opt', n: 'ویتامین‌های گروه B (ب‌کمپلکس)', why: 'استرس و خستگی', dose: 'روزانه ۱ عدد ب‌کمپلکس با دوز معمولی، همراه صبحانه.', caution: 'ویتامین B6 از همه‌ی منابع بیش از ۱۰۰ میلی‌گرم در روز مصرف نشود.', ev: 'در کارآزمایی‌ها استرس و خستگی را کم کرده است.' });
    add({ k: 'mg', lvl: 'opt', n: 'منیزیم', why: 'استرس و خستگی', dose: '۲۰۰ تا ۳۵۰ میلی‌گرم در روز.', caution: 'مقدار زیاد اسهال می‌دهد. در بیماری کلیه مصرف نشود.' });
  }
  if (hx.cramp) add({ k: 'mg', lvl: 'opt', n: 'منیزیم', why: 'گرفتگی عضلانی', dose: '۲۰۰ تا ۳۰۰ میلی‌گرم در روز، دست‌کم ۴ هفته.', caution: 'مقدار زیاد اسهال می‌دهد. در بیماری کلیه مصرف نشود.', ev: 'منیزیم در انقباض و شل شدن عضله نقش دارد؛ همراه آب و نمک کافی هنگام تمرین.' });
  if (hx.migraine) {
    add({ k: 'mg', lvl: 'opt', n: 'منیزیم', why: 'میگرن', dose: '۴۰۰ تا ۶۰۰ میلی‌گرم در روز، طبق نظر پزشک.', caution: 'مقدار زیاد اسهال می‌دهد. در بیماری کلیه مصرف نشود.', ev: 'راهنمای انجمن‌های سردرد و نورولوژی آمریکا (AAN/AHS) آن را برای پیشگیری از میگرن توصیه می‌کند.' });
    add({ k: 'riboflavin', lvl: 'opt', n: 'ویتامین B2 (ریبوفلاوین)', why: 'میگرن', dose: '۴۰۰ میلی‌گرم در روز؛ اثر پس از ۲ تا ۳ ماه.', caution: 'زرد پررنگ شدن ادرار بی‌خطر است.', ev: 'راهنمای AAN/AHS آن را برای پیشگیری از میگرن توصیه می‌کند.' });
  }
  if (hx.pms && f) {
    add({ k: 'ca', lvl: 'opt', n: 'کلسیم', why: 'سندرم پیش از قاعدگی', dose: 'مجموع کلسیم غذا و مکمل حدود ۱۲۰۰ میلی‌گرم در روز؛ هر نوبت مکمل حداکثر ۵۰۰ میلی‌گرم.', caution: 'دو ساعت فاصله از آهن.', ev: 'در کارآزمایی بزرگ (Thys-Jacobs 1998) علائم را به‌طور معنادار کم کرد.' });
    add({ k: 'b6', lvl: 'opt', n: 'ویتامین B6', why: 'سندرم پیش از قاعدگی', dose: '۵۰ تا ۱۰۰ میلی‌گرم در روز.', caution: 'بیش از ۱۰۰ میلی‌گرم در روز مصرف نشود (خطر آسیب عصب، به‌ویژه در مصرف طولانی). با ب‌کمپلکس جمع زده شود.', ev: 'مرور سیستماتیک (Wyatt 1999) کاهش علائم را نشان داد.' });
    add({ k: 'mg', lvl: 'opt', n: 'منیزیم', why: 'سندرم پیش از قاعدگی', dose: '۲۰۰ تا ۳۵۰ میلی‌گرم در روز.', caution: 'مقدار زیاد اسهال می‌دهد.' });
  }
  if (hx.pcos && f) add({ k: 'inositol', lvl: 'opt', n: 'میواینوزیتول', why: 'سندرم تخمدان پلی‌کیستیک', dose: '۲ گرم دو بار در روز (معمولاً همراه ۲۰۰ میکروگرم اسید فولیک).', caution: 'گاهی ناراحتی گوارشی خفیف.', ev: 'در کارآزمایی‌ها نظم قاعدگی و حساسیت به انسولین را بهتر کرده است.' });
  if (hx.nafld) add({ k: 'vite', lvl: 'opt', n: 'ویتامین E', why: 'کبد چرب', dose: 'فقط طبق نظر پزشک: ۸۰۰ واحد در روز، آن هم فقط در استئاتوهپاتیت (NASH) ثابت‌شده و بدون دیابت.', caution: 'در کبد چرب ساده یا همراه دیابت توصیه نمی‌شود. مصرف طولانی با خطر خونریزی و احتمال سرطان پروستات همراه بوده است.', ev: 'راهنمای انجمن کبد آمریکا (AASLD 2018) آن را در همین گروه توصیه می‌کند.' });
  const ldl = v('ldl'), tg = v('tg');
  if (ldl != null && ldl >= 130) {
    add({ k: 'psyllium', lvl: 'opt', n: 'پسیلیوم (پوسته‌ی اسفرزه)', why: `LDL بالا (${fa(ldl)})`, dose: 'روزانه ۱۰ گرم در ۲ تا ۳ نوبت همراه وعده‌ها.', caution: 'با آب کافی؛ دو ساعت فاصله از داروها.', ev: 'LDL را حدود ۵ تا ۱۰ درصد کم می‌کند.' });
    add({ k: 'sterols', lvl: 'opt', n: 'استرول یا استانول گیاهی', why: `LDL بالا (${fa(ldl)})`, dose: '۲ گرم در روز همراه وعده‌ها.', caution: 'جایگزین داروی کاهنده‌ی چربی تجویزشده نیست.', ev: 'LDL را حدود ۸ تا ۱۰ درصد کم می‌کند.' });
  }
  if (tg != null && tg >= 200) add({ k: 'omega3', lvl: 'opt', n: 'امگا ۳ (EPA و DHA)', why: `تری‌گلیسرید بالا (${fa(tg)})`, dose: 'طبق نظر پزشک، ۲ تا ۴ گرم EPA و DHA در روز.', caution: 'با داروهای ضدانعقاد با نظر پزشک.', ev: 'انجمن قلب آمریکا (AHA 2019) این مقدار را برای کاهش تری‌گلیسرید مؤثر می‌داند.' });
}

const slotLabel = m => SLOT_FA[m.slot] + (m.post ? ' (بعد از تمرین)' : '');
const rawTxt = (id, g) => { const r = rawEq(id, g); return r ? `≈ ${fa(round(r, 5))} گرم خام` : ''; };
/* نام کوتاه غذا برای جدول‌ها؛ اقلام خام با برچسب «خام» */
function foodLabel(id) {
  const base = FOOD[id].fa.replace(/\s*\(.*\)/, '');
  return META[id] ? base : base + ' (خام)';
}

/* ---------- پرسشنامه مزاج ---------- */
// پاسخ‌ها: { شماره‌ی سؤال (از ۰): عدد ۰ تا ۱۰ } — ۰ = سمت راست کاملاً صدق می‌کند، ۵ = اعتدال، ۱۰ = سمت چپ کاملاً صدق می‌کند
// امتیاز: سمت چپ ضریب × x ÷ ۵ و سمت راست ضریب × (۱۰ − x) ÷ ۵؛ پس ۰، ۵ و ۱۰ دقیقاً همان سه گزینه‌ی فایل دکتر صادقی است.
// پاسخ‌های قدیمی سه‌گزینه‌ای ('r' / 'm' / 'l') به ۰ / ۵ / ۱۰ تبدیل می‌شوند. «نمی‌دانم» ('x') در امتیاز حساب نمی‌شود.
// نتیجه فقط وقتی که هر محور دست‌کم MIZAJ_MIN از سؤال‌هایش پاسخ عددی داشته باشد.
const mizajVal = a => a === 'r' ? 0 : a === 'm' ? 5 : a === 'l' ? 10 : (a === '' || a == null || isNaN(a)) ? null : Math.max(0, Math.min(10, +a));
const mizajNeed = ax => Math.ceil(MIZAJ_MIN * MIZAJ_Q.filter(q => q.ax === ax).length);
function mizajScore(ans) {
  const s = { h: { l: 0, r: 0, n: 0 }, w: { l: 0, r: 0, n: 0 } };
  MIZAJ_Q.forEach(q => {
    const a = mizajVal(ans[q.id]), x = s[q.ax]; // پاسخ‌ها با شناسه‌ی ثابت سؤال ذخیره می‌شوند
    if (a == null) return;
    x.l += q.w * a / 5; x.r += q.w * (10 - a) / 5;
    x.n++;
  });
  if (s.h.n < mizajNeed('h') || s.w.n < mizajNeed('w')) return null;
  const cls = (x, a, b) => { const t = x.l + x.r, tol = Math.round(MIZAJ_TOL * t); return x.l - x.r > tol ? a : x.r - x.l > tol ? b : 'mid'; };
  const H = cls(s.h, 'hot', 'cold'), Wt = cls(s.w, 'wet', 'dry');
  const pct = x => x.l + x.r ? x.l / (x.l + x.r) * 100 : 50;
  return { hot: pct(s.h), wet: pct(s.w), raw: s, n: s.h.n + s.w.n, nh: s.h.n, nw: s.w.n, H, W: Wt, key: H + '-' + Wt };
}
// مزاج نهایی: تعیین دستی پزشک بر نتیجه‌ی پرسشنامه مقدم است
function mizajOf(p) {
  const m = p.mizajManual;
  if (m && MIZAJ_NAME[m]) { const [H, W] = m.split('-'); return { H, W, key: m, manual: true }; }
  return mizajScore(p.mizajQ || {});
}
// غذاهای پیشنهادی برای پرهیز (فقط پیشنهاد؛ تصمیم حذف با مراجعه‌کننده)
function mizajAvoid(mz) {
  if (!mz) return [];
  const ids = [...(MIZAJ_AVOID[mz.H] || []), ...(MIZAJ_AVOID[mz.W] || [])];
  return [...new Set(ids)].filter(id => FOOD[id] && META[id]);
}

/* ---------- قالب‌بندی ---------- */
function fa(x, d = 0) {
  if (x == null || x === '' || isNaN(x)) return '—';
  const n = +x;
  return n.toLocaleString('fa-IR', { maximumFractionDigits: d, minimumFractionDigits: 0 });
}
function jalali(ts) {
  try { return new Date(ts || Date.now()).toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' }); }
  catch (e) { return new Date(ts || Date.now()).toLocaleDateString(); }
}
