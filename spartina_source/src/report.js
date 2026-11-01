/* ============================================================
   ساخت صفحه‌های گزارش PDF (A4)
   ============================================================ */
const STAR = (c1 = '#F6C26B', c2 = '#14B8A6') => `<svg viewBox="0 0 100 100"><g fill="none" stroke="${c1}" stroke-width="2.2"><rect x="22" y="22" width="56" height="56" rx="3"/><rect x="22" y="22" width="56" height="56" rx="3" transform="rotate(45 50 50)"/>
  <circle cx="50" cy="50" r="40" stroke-width="1" opacity=".6"/><circle cx="50" cy="50" r="46" stroke-width=".6" opacity=".4"/></g>
  <circle cx="50" cy="50" r="13" fill="${c2}"/><path d="M50 39c5 5 5 17 0 22-5-5-5-17 0-22z" fill="#fff"/><path d="M39 50c5-5 17-5 22 0-5 5-17 5-22 0z" fill="#fff" opacity=".55"/></svg>`;

const GIRIH = `<svg class="pat" width="100%" height="100%"><defs><pattern id="gh" width="56" height="56" patternUnits="userSpaceOnUse">
  <g fill="none" stroke="#F6C26B" stroke-width="1.1"><rect x="14" y="14" width="28" height="28"/><rect x="14" y="14" width="28" height="28" transform="rotate(45 28 28)"/>
  <path d="M0 0L14 14M56 0L42 14M0 56L14 42M56 56L42 42"/><circle cx="28" cy="28" r="4"/></g></pattern></defs><rect width="100%" height="100%" fill="url(#gh)"/></svg>`;

const SIX_IC = {
  air: ['#DDF4F2', '#0E9F9A', '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h14a3 3 0 1 1-3 3M3 16h7"/>'],
  food: ['#FFF0D6', '#C47A0E', '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M17 3c-2 2-3 5-3 8h3v10"/>'],
  move: ['#FCE8ED', '#C7375A', '<circle cx="13" cy="4" r="2"/><path d="M7 21l3-6 3 3v4M10 15l1-6 4 3 3 1M11 9l-4 2-1 3"/>'],
  sleep: ['#E9ECFB', '#2D3C9A', '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>'],
  flow: ['#E3F2FB', '#1E7FB8', '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>'],
  mind: ['#F0E6F8', '#5B2B83', '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>'],
};
const icon = (k) => { const [bg, c, p] = SIX_IC[k]; return `<span class="si" style="background:${bg}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg></span>`; };

function glassSvg(fill) {
  return `<svg class="glass" viewBox="0 0 24 32"><path d="M3 2h18l-2.5 27a2 2 0 0 1-2 1.8H7.5a2 2 0 0 1-2-1.8z" fill="${fill ? '#BFE3F7' : '#fff'}" stroke="#1E7FB8" stroke-width="1.6"/>${fill ? '<path d="M4.6 12h14.8" stroke="#1E7FB8" stroke-width="1" opacity=".5"/>' : ''}</svg>`;
}

function donut(T) {
  const parts = [[T.pctP, '#C7375A'], [T.pctC, '#F0A133'], [T.pctF, '#5B2B83']];
  const R = 38, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = parts.map(([pc, col]) => { const l = C * pc / 100; const s = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${col}" stroke-width="16" stroke-dasharray="${l} ${C - l}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`; off += l; return s; }).join('');
  return `<svg viewBox="0 0 100 100" style="width:36mm;height:36mm">${arcs}<text x="50" y="47" text-anchor="middle" font-size="13" font-weight="800" fill="#1C2766">${fa(T.kcal)}</text><text x="50" y="61" text-anchor="middle" font-size="7.5" fill="#696D8C">کیلوکالری</text></svg>`;
}

function buildReport(p, T, plan) {
  const pages = [];
  let pn = 0;
  const today = jalali();
  const page = (title, sub, body, cls = '') => {
    pn++;
    return `<section class="page ${cls}"><div class="pg-head">${STAR()}<b>${title}</b><small>${sub || ''}</small></div>
      <div class="pg-in"><div class="fit">${body}</div></div>
      <div class="pg-foot"><span>${DOCTOR.name} · شماره نظام پزشکی ${DOCTOR.code}</span><span>${esc(p.name)} · ${today}</span><span class="pn">${fa(pn)}</span></div></section>`;
  };
  const bb = p.prog === 'bb';
  const se = bb ? {} : (p.side || {});
  const sideNames = SIDE.filter(([k]) => se[k]).map(([, t]) => t);

  /* ---------- ۱. جلد ---------- */
  pn++;
  pages.push(`<section class="page cover">${GIRIH}<div class="glow"></div><div class="glow2"></div><div class="cv-in">
    <span class="cv-badge">${bb ? 'برنامه‌ی تغذیه‌ی ورزشی · بدنسازی' : 'همراه درمان با اسپارتینا (تیرزپاتاید)'}</span>
    <div class="cv-star">${STAR()}</div>
    <h1 class="cv-t">برنامه‌ی <span>${bb ? 'تغذیه‌ی ورزشی' : 'سلامت و تغذیه'}</span><br>ویژه‌ی شما</h1>
    <p class="cv-s">${bb ? 'برنامه‌ی غذایی هفت‌روزه · روزهای تمرین و استراحت · وعده‌های قبل و بعد از تمرین' : 'برنامه‌ی غذایی هفت‌روزه · نیازهای روزانه · شش کلید طلایی زندگی سبک'}</p>
    <div class="cv-card">
      <div><small>نام</small><b>${esc(p.name)}</b></div>
      <div><small>تاریخ تنظیم</small><b>${today}</b></div>
      <div><small>${bb ? 'هدف' : 'دوز فعلی'}</small><b>${bb ? T.ph.title : fa(p.dose, 1) + ' میلی‌گرم در هفته'}</b></div>
      <div><small>انرژی روزانه</small><b>${fa(T.kcal)} کیلوکالری</b></div>
      <div class="full doc"><div><small>زیر نظر</small><b>${DOCTOR.name}</b></div><div style="text-align:left"><small>شماره نظام پزشکی</small><b>${DOCTOR.code}</b></div></div>
    </div></div></section>`);

  /* ---------- ۲. ارزیابی و اهداف ---------- */
  const glasses = Math.round(T.water / 250);
  pages.push(page('ارزیابی و نیازهای روزانه', T.ph.title, `
    <div class="phase"><b>${T.ph.title}</b><br>${T.ph.desc}</div>
    <h3 class="sec-t">نیازهای روزانه‌ی شما</h3>
    <div class="tg-grid">
      <div class="tg a"><i>⚡</i><b>${fa(T.kcal)}</b><span>کیلوکالری انرژی</span></div>
      <div class="tg b"><i>◆</i><b>${fa(T.prot)} گرم</b><span>پروتئین · ${fa(T.pctP)}٪ انرژی</span></div>
      <div class="tg c"><i>◈</i><b>${fa(T.carb)} گرم</b><span>کربوهیدرات · ${fa(T.pctC)}٪ انرژی</span></div>
      <div class="tg d"><i>●</i><b>${fa(T.fat)} گرم</b><span>چربی · ${fa(T.pctF)}٪ انرژی</span></div>
      <div class="tg e"><i>❋</i><b>${fa(T.fiber)} گرم</b><span>فیبر</span></div>
      <div class="tg f"><i>💧</i><b>${fa(T.water / 1000, 1)} لیتر</b><span>آب · حدود ${fa(glasses)} لیوان</span></div>
    </div>
    <div class="two">
      <div class="rbox"><h3 class="sec-t">سهم درشت‌مغذی‌ها</h3><div class="donut-w">${donut(T)}<div class="legend">
        <div><i style="background:#C7375A"></i>پروتئین ${fa(T.pctP)}٪</div><div><i style="background:#F0A133"></i>کربوهیدرات ${fa(T.pctC)}٪</div><div><i style="background:#5B2B83"></i>چربی ${fa(T.pctF)}٪</div></div></div></div>
      <div class="rbox"><h3 class="sec-t">آب روزانه</h3><p style="margin:0;font-size:9pt;color:var(--muted)">جرعه‌جرعه و بین وعده‌ها؛ نه همراه غذا.</p><div class="glasses">${Array.from({ length: glasses }, () => glassSvg(true)).join('')}</div></div>
    </div>
    <div class="rbox"><h3 class="sec-t">ارزیابی بدن</h3><div class="metrics">
      <div><span>قد</span><b>${fa(p.height)} سانتی‌متر</b></div><div><span>وزن</span><b>${fa(p.weight, 1)} کیلوگرم</b></div>
      <div><span>نمایه‌ی توده‌ی بدن (BMI)</span><b>${fa(T.bmi, 1)} · ${bmiClass(T.bmi)}</b></div><div><span>دور کمر</span><b>${p.waist ? fa(p.waist) + ' سانتی‌متر' : '—'}</b></div>
      <div><span>وزن ایده‌آل</span><b>${fa(T.ibw, 1)} کیلوگرم</b></div><div><span>وزن هدف</span><b>${p.goal ? fa(p.goal, 1) + ' کیلوگرم' : '—'}</b></div>
      <div><span>متابولیسم پایه</span><b>${fa(Math.round(T.bmr))} کیلوکالری</b></div><div><span>مصرف انرژی روزانه</span><b>${fa(Math.round(T.tdee))} کیلوکالری</b></div>
      <div><span>سطح فعالیت</span><b>${ACT[+p.activity || 0].t}</b></div><div><span>تعداد وعده</span><b>${fa(T.meals)} وعده${bb ? '' : '‌ی کوچک'}</b></div>
      ${bb ? `<div><span>پروتئین</span><b>${fa(T.prot / +p.weight, 1)} گرم به ازای هر کیلو وزن</b></div><div><span>${T.lbm ? 'توده‌ی بدون چربی' : 'روزهای تمرین'}</span><b>${T.lbm ? fa(T.lbm, 1) + ' کیلوگرم' : fa(T.bb.days.length) + ' روز در هفته'}</b></div>` : ''}
    </div></div>
    ${sideNames.length ? `<div class="rbox"><b style="color:var(--pome)">عوارض فعلی:</b> ${sideNames.join('، ')} — برنامه بر همین اساس تنظیم شده است.</div>` : ''}
  `));

  /* ---------- ۳. نکات ویژه و ریزمغذی‌ها ---------- */
  const avg = weekAvg(plan);
  const giTips = Object.keys(GI_TIPS).filter(k => se[k]);
  pages.push(page('نکات ویژه‌ی شما', bb ? 'بر اساس هدف، تمرین و آزمایش‌ها' : 'بر اساس دوز، عوارض و آزمایش‌ها', `
    ${T.warns.length ? `<div class="warnbox"><b>توجه</b><ul class="lst red">${T.warns.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
    <h3 class="sec-t">${bb ? 'برای هدف شما' : 'در این مرحله از درمان'}</h3><ul class="lst gold">${(bb ? BB_GOAL_TIPS[T.goal] : PHASE_TIPS[T.ph.key]).map(x => `<li>${x}</li>`).join('')}</ul>
    ${T.notes.length ? `<h3 class="sec-t" style="margin-top:4mm">نکات پزشکی</h3><ul class="lst">${T.notes.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
    ${giTips.length ? `<h3 class="sec-t" style="margin-top:4mm">مدیریت عوارض گوارشی</h3><div class="two">${giTips.map(k => `<div class="rbox" style="margin:0"><b style="color:var(--plum)">${SIDE.find(s => s[0] === k)[1]}</b><ul class="lst">${GI_TIPS[k].map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>` : ''}
    <h3 class="sec-t" style="margin-top:5mm">ویتامین‌ها و مواد معدنی برنامه</h3><p class="sec-s">میانگین روزانه‌ی برنامه در مقایسه با مقدار مرجع دریافت (DRI) برای سن و جنس شما</p>
    <table class="rt"><tr><th>ماده‌ی مغذی</th><th>در برنامه</th><th>مقدار مرجع</th><th>پوشش</th></tr>
    ${DRI_KEYS.map(k => { const [, n, u] = NUTR.find(x => x[0] === k); const pc = avg[k] / T.dri[k] * 100; return `<tr><td>${n}</td><td>${fa(avg[k], avg[k] < 10 ? 1 : 0)} ${u}</td><td>${fa(T.dri[k])} ${u}</td><td><span class="rbar"><i class="${pc < 70 ? 'lo' : ''}" style="width:${Math.min(pc, 100)}%"></i></span> ${fa(Math.round(pc))}٪</td></tr>`; }).join('')}
    </table>
  `));

  /* ---------- ۴ تا ۱۰. روزها ---------- */
  const life = lifeFor(p);
  const tipsPool = bb ? [...BB_TIPS, ...life.flatMap(s => s.items.slice(0, 1))] : [...NUTRI_TIPS, ...life.flatMap(s => s.items.slice(0, 2))];
  plan.days.forEach((day, di) => {
    const dt = dayTotals(day);
    pages.push(page('برنامه‌ی غذایی روزانه', `${DAYS[di]} · روز ${fa(di + 1)} از ۷${bb ? (day.train ? ' · روز تمرین' : ' · روز استراحت') : ''}`, `
      <div class="day-h"><div class="day-n"><div><small>روز</small><b>${fa(di + 1)}</b></div></div>
        <div class="day-t"><h2>${DAYS[di]}${bb && day.train ? ' 💪' : ''}</h2><p>${bb ? (day.train ? `روز تمرین (${BB_TIME[T.bb.time]}) · ` : 'روز استراحت · ') : ''}${fa(day.meals.length)} وعده · مقادیر به گرم (وزن پخته / آماده‌ی مصرف)</p></div>
        <div class="day-tot"><div><b>${fa(Math.round(dt.kcal))}</b>کیلوکالری</div><div><b>${fa(Math.round(dt.p))}</b>پروتئین</div><div><b>${fa(Math.round(dt.c))}</b>کربوهیدرات</div><div><b>${fa(Math.round(dt.f))}</b>چربی</div><div><b>${fa(Math.round(dt.fib))}</b>فیبر</div></div></div>
      <div class="tl">${day.meals.map(m => { const mt = mealTotals(m.items); return `<div class="ml"><span class="dot" style="background:${MEAL_COLOR[m.slot]}">${SLOT_ICON[m.slot]}</span>
        <div class="ml-h"><small style="color:${MEAL_COLOR[m.slot]}">${slotLabel(m)}</small><b>${m.name}</b><span>${fa(Math.round(mt.kcal))} کیلوکالری · ${fa(Math.round(mt.p))} گرم پروتئین</span></div>
        <div class="ml-i">${m.items.map(it => { const h = [household(it.id, it.g), rawTxt(it.id, it.g)].filter(Boolean).join(' · '); return `<div><span>${FOOD[it.id].fa.replace(/\s*\(.*\)/, '')}${(META[it.id].t || []).includes('approx') ? ' ≈' : ''}</span><span><strong>${fa(it.g, 1)} گرم</strong>${h ? ` <em>(${h})</em>` : ''}</span></div>`; }).join('')}</div></div>`; }).join('')}</div>
      <div class="day-f"><div class="water"><b>آب امروز — هر لیوان که نوشیدید علامت بزنید</b><div class="glasses">${Array.from({ length: glasses }, () => glassSvg(false)).join('')}</div>
        <div class="checks">${(bb ? [day.train ? 'تمرین امروز' : 'استراحت فعال', 'پروتئین هر وعده', 'خواب ۷ تا ۹ ساعت', 'وزن‌کردن غذا'] : ['پیاده‌روی', 'ورزش مقاومتی', 'خواب کافی', 'اول پروتئین']).map(x => `<span>${x}</span>`).join('')}</div></div>
        <div class="tip"><b>✦ نکته‌ی امروز</b>${tipsPool[(di * 3) % tipsPool.length]}</div></div>
    `));
  });

  /* ---------- جدول جانشینی ---------- */
  const { ok } = allowedFoods(p, T);
  const ex = exchangeTable(ok);
  const exCol = ['#C47A0E', '#C7375A', '#2D3C9A', '#0E9F9A', '#5B2B83'];
  const exBlocks = ex.map((e, i) => `<div class="exg"><h4 style="background:${exCol[i]}">${e.title}<small>${e.sub}</small></h4><table>${e.rows.map(r => `<tr><td>${FOOD[r.id].fa.replace(/\s*\(.*\)/, '')}</td><td>${fa(r.g)} گرم</td><td>${r.hu || ''}</td></tr>`).join('')}</table></div>`);
  const totalRows = ex.reduce((a, e) => a + e.rows.length + 2, 0);
  const exIntro = `<p class="sec-s" style="margin-top:0">هر قلم از برنامه را می‌توانید با قلم دیگری از <b>همان جدول</b> و به همان تعداد واحد عوض کنید. مثلاً اگر در برنامه «۲ واحد» برنج دارید، می‌توانید به‌جای آن ۲ واحد نان بخورید.</p>`;
  if (totalRows > 78) {
    pages.push(page('جدول جانشینی غذاها', 'انتخاب آزادانه با حفظ تعادل', exIntro + `<div class="cols2">${exBlocks.slice(0, 2).join('')}</div>`));
    pages.push(page('جدول جانشینی غذاها', 'ادامه', `<div class="cols2">${exBlocks.slice(2).join('')}</div>`));
  } else pages.push(page('جدول جانشینی غذاها', 'انتخاب آزادانه با حفظ تعادل', exIntro + `<div class="cols2">${exBlocks.join('')}</div>`));

  /* ---------- فهرست خرید ---------- */
  const shop = shoppingList(plan);
  const order = ['poultry', 'red', 'fish', 'egg', 'dairy', 'cheese', 'legume', 'grain', 'tuber', 'bread', 'veg', 'herb', 'fruit', 'dried', 'nut', 'fat', 'oil', 'bev', 'sweet', 'spice', 'supp'];
  const kg = g => g >= 1000 ? `${fa(g / 1000, 1)} کیلوگرم` : `${fa(round(g, g < 50 ? 1 : 10))} گرم`;
  pages.push(page('فهرست خرید هفتگی', 'برای یک هفته', `<p class="sec-s" style="margin-top:0">گوشت، مرغ، ماهی، برنج، غلات و حبوبات به وزن <b>خام</b> آمده‌اند (تقریبی، از نسبت خام و پخته در USDA)؛ بقیه به وزن آماده‌ی مصرف.</p>
    <div class="cols2 cols3">${order.filter(g => shop[g]).map(g => `<div class="shop"><h4>${GROUP_FA[g]}</h4>${shop[g].sort((a, b) => b.g - a.g).map(x => `<div><span>${foodLabel(x.id)}</span><b>${kg(x.g)}</b></div>`).join('')}</div>`).join('')}</div>`));

  /* ---------- سبک زندگی ---------- */
  const mz = mizajOf(p);
  let mzHtml = '';
  if (mz) {
    const tips = [...(MIZAJ_TIPS[mz.H] || []), ...(mz.W !== 'mid' ? MIZAJ_TIPS[mz.W] : [])];
    if (mz.H === 'mid' && mz.W === 'mid') tips.push(...MIZAJ_TIPS.mid);
    mzHtml = `<div class="mzbox"><b>✦ توصیه‌های ویژه‌ی شما</b><ul class="lst" style="margin-top:2mm">${tips.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
  }
  pages.push(page('شش کلید طلایی زندگی سبک', 'عادت‌های کوچک، تغییرهای بزرگ', `
    <p class="sec-s" style="margin-top:0">شش عادت ساده که اگر هر روز تکرارشان کنید، ${bb ? 'نتیجه‌ی تمرین و تغذیه را' : 'اثر درمان را'} چند برابر می‌کنند و سبکی، انرژی و شادابی را به روزهایتان برمی‌گردانند.</p>
    <div class="six">${life.map(s => `<div><h4>${icon(s.ic)}<span>${s.t}<br><small>${s.s}</small></span></h4><ul class="lst">${s.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
    ${mzHtml}`));

  /* ---------- دارو، هشدارها، پیگیری ---------- */
  const visits = (p.visits || []).slice(-6);
  const logTable = `<h3 class="sec-t">جدول پیگیری وزن</h3>
    <table class="rt log"><tr><th>تاریخ</th><th>وزن (کیلوگرم)</th><th>دور کمر</th><th>${bb ? 'هدف' : 'دوز'}</th><th>یادداشت</th></tr>
    ${visits.map(v => `<tr><td>${jalali(v.date)}</td><td>${fa(v.weight, 1)}</td><td>${fa(v.waist)}</td><td>${v.goal ? BB_GOAL[v.goal].t.split(' ')[0] : fa(v.dose, 1)}</td><td></td></tr>`).join('')}
    ${Array.from({ length: Math.max(0, 8 - visits.length) }, () => '<tr><td></td><td></td><td></td><td></td><td></td></tr>').join('')}</table>
    <div class="sign"><div>تاریخ مراجعه‌ی بعدی:</div><div><b>${DOCTOR.name}</b><br>شماره نظام پزشکی ${DOCTOR.code}<br>مهر و امضا:</div></div>`;
  const srcNote = `<p style="font-size:7.5pt;color:var(--muted);margin-top:3mm">منبع ارزش غذایی: USDA FoodData Central، SR Legacy (2018)؛ نان‌های ایرانی: جداول ترکیب غذایی FAO برای خاورمیانه (1982)؛ اقلام علامت‌دار (≈) و سدیم نان‌ها: تقریبی از منابع ایرانی. مقادیر مرجع: DRI آکادمی ملی علوم آمریکا.${bb ? ' توصیه‌های ورزشی و مکمل‌ها: بیانیه‌های ISSN (Jäger 2017، Kerksick 2017، Kreider 2017، Trexler 2015، Guest 2021، Wilson 2013)، اجماع IOC درباره‌ی مکمل‌ها (Maughan 2018)، Wolfe 2017، Helms 2014، ACSM 2009؛ ویتامین D: Holick 2011؛ آهن: Stoffel 2017.' : ''} این برنامه جایگزین معاینه و نظر پزشک نیست.</p>`;
  /* ---------- مکمل‌های پیشنهادی: ویتامین و املاح و مکمل‌های مربوط به سوابق پزشکی ---------- */
  const micOff = micOffOf(p);
  const mic = micSupp(p, T, avg).filter(m => !micOff[m.k]);
  const micHtml = `<h3 class="sec-t">ویتامین‌ها، املاح و مکمل‌های درمانی</h3><p class="sec-s">بر اساس آزمایش‌ها، سوابق پزشکی و ریزمغذی‌های برنامه‌ی غذایی شما. «حتماً مصرف شود»: کمبود در آزمایش، تأمین کمتر از نصف نیاز با غذا یا تشخیص پزشک؛ «در صورت تمایل»: تأمین ${fa(MIC_REQ * 100)} تا ${fa(MIC_OPT * 100)} درصد نیاز یا مکمل کمکی.</p>
    ${mic.length ? `<table class="rt"><tr><th>مکمل</th><th>دلیل</th><th>مقدار و نحوه‌ی مصرف</th></tr>${mic.map(m => `<tr><td><b>${m.n}</b><br><span class="lvl lvl-${m.lvl}">${MIC_LVL[m.lvl]}</span></td><td>${m.why}${m.ev ? `<br><span style="color:var(--muted)">شواهد: ${m.ev}</span>` : ''}</td><td>${m.dose}<br><span style="color:var(--muted)">${m.caution}</span></td></tr>`).join('')}</table>` : '<p class="sec-s">نیازی به مکمل ویتامین یا املاح دیده نشد؛ ریزمغذی‌ها از برنامه‌ی غذایی تأمین می‌شوند.</p>'}`;
  if (bb) {
    /* ---------- پروتکل مکمل‌های ورزشی و توصیه‌های کلی ---------- */
    const sups = bbSupps(p);
    // جدول طولانی صفحه‌ی جدا می‌گیرد
    const sepMic = mic.length > 4;
    if (sepMic) pages.push(page('مکمل‌های پیشنهادی', 'ویتامین‌ها، املاح و مکمل‌های درمانی', micHtml));
    const card = s => `<div class="spc"><div class="spc-h"><b>${s.n}</b></div><p>${s.what}</p>
      <div class="spc-r"><i>مقدار</i><ul>${s.dose(p).map(x => `<li>${x}</li>`).join('')}</ul></div>
      <div class="spc-r"><i>نحوه‌ی مصرف</i><ul>${s.how.map(x => `<li>${x}</li>`).join('')}</ul></div>
      <div class="spc-r w"><i>احتیاط</i><ul>${s.caution.map(x => `<li>${x}</li>`).join('')}</ul></div><small>منبع: ${s.src}</small></div>`;
    const general = `<div class="rbox" style="margin-top:3mm"><h3 class="sec-t" style="margin-top:0">توصیه‌های کلی درباره‌ی مکمل‌ها</h3><ul class="lst gold">${BB_SUPP_GENERAL.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
    // صفحه‌ی اول جدول ویتامین‌ها را هم دارد، پس کارت کمتری می‌گیرد
    const head = sepMic ? '' : micHtml;
    const first = sepMic ? 3 : mic.length > 2 ? 1 : mic.length ? 2 : 3;
    const chunks = sups.length ? [sups.slice(0, first)] : [];
    for (let i = first; i < sups.length; i += 3) chunks.push(sups.slice(i, i + 3));
    if (!chunks.length) pages.push(page('مکمل‌های شما', 'ویتامین‌ها، املاح و مکمل‌های ورزشی', head + '<p class="sec-s" style="margin-top:3mm">مکمل ورزشی تجویز نشده است؛ نیاز شما با غذای واقعی تأمین می‌شود.</p>' + general));
    else {
      pages.push(page(sepMic ? 'پروتکل مکمل‌های ورزشی' : 'مکمل‌های شما', 'ویتامین‌ها، املاح و مکمل‌های ورزشی', head + `<h3 class="sec-t" style="margin-top:${sepMic ? 0 : 4}mm">پروتکل مکمل‌های ورزشی</h3>${chunks[0].map(card).join('')}${chunks.length === 1 ? general : ''}`));
      chunks.slice(1).forEach((c, i) => pages.push(page('پروتکل مکمل‌های ورزشی', 'ادامه', c.map(card).join('') + (i === chunks.length - 2 ? general : ''))));
    }
    /* ---------- راهنمای برندها و رتبه‌بندی کیفی مکمل‌ها ---------- */
    pages.push(page('راهنمای برندها و رتبه‌بندی کیفی مکمل‌ها', 'ارزیابی کیفیت، خلوص و راهنمای خرید معتبر', suppBrandsReportHtml(bb, p)));
    pages.push(page('بانک تحلیلی و مقایسه برندهای پروتئین وی بازار ایران', 'تحلیل اقتصادی، قیمت دقیق قوطی، خلوص و شاخص قیمت بر پروتئین', wheyComparisonReportHtml()));
    pages.push(page('راهنمای هدفمند انتخاب پروتئین وی و هشدارهای بالینی', 'بهترین گزینه‌ها برای کات، معده حساس، افزایش حجم و صرفه اقتصادی', wheyRecommenderReportHtml()));
    pages.push(page('بانک تحلیلی و مقایسه برندهای کراتین بازار ایران', 'پایش ۳۱ برند، رتبه‌بندی کیفی، قیمت دقیق قوطی و هشدارهای سازمان غذا و دارو', creatineComparisonReportHtml()));

    /* ---------- دوره‌ی پاکسازی ---------- */
    if (T.bb.detox && T.bb.detox.on) { const d = +T.bb.detox.days || 14, [a, b] = detoxHtml(d); pages.push(page('دوره‌ی پاکسازی', `${fa(d)} روز`, a)); pages.push(page('دوره‌ی پاکسازی', 'کبد و کلیه — گیاهان و مکمل‌ها', b)); }
    /* ---------- تمرین ایمن ---------- */
    pages.push(page('تمرین ایمن و هوشمند', 'برای پیشرفت بدون آسیب', `
      <div class="six">${BB_TRAIN.map(s => `<div><h4><span>${s.t}</span></h4><ul class="lst">${s.items.map(x => `<li>${x}</li>`).join('')}</ul></div>`).join('')}</div>
      <div class="warnbox" style="margin-top:3mm"><b>در این موارد تمرین را متوقف کنید و با پزشک تماس بگیرید:</b><ul class="lst red">${BB_RED.map(x => `<li>${x}</li>`).join('')}</ul></div>`));
    pages.push(page('راهنمای تغذیه‌ی ورزشی و پیگیری', T.ph.title, `
      <h3 class="sec-t">زمان‌بندی و اصول تغذیه</h3><ul class="lst">${BB_TIPS.map(x => `<li>${x}</li>`).join('')}</ul>
      ${logTable}${srcNote}`));
    return pages.join('');
  }
  if (mic.length) {
    pages.push(page('مکمل‌های پیشنهادی', 'ویتامین‌ها، املاح و مکمل‌های درمانی', micHtml));
    pages.push(page('راهنمای برندها و رتبه‌بندی کیفی مکمل‌ها', 'ارزیابی کیفیت، خلوص و راهنمای خرید معتبر', suppBrandsReportHtml(bb, p)));
    pages.push(page('بانک تحلیلی و مقایسه برندهای پروتئین وی بازار ایران', 'تحلیل اقتصادی، خلوص، شاخص قیمت بر پروتئین و سازگاری گوارشی', wheyComparisonReportHtml()));
    pages.push(page('راهنمای هدفمند انتخاب پروتئین وی و هشدارهای بالینی', 'بهترین گزینه‌ها برای کات، معده حساس، افزایش حجم و صرفه اقتصادی', wheyRecommenderReportHtml()));
  }
  pages.push(page('راهنمای درمان و پیگیری', 'اسپارتینا (تیرزپاتاید)', `
    <div class="two"><div><h3 class="sec-t">مصرف صحیح دارو</h3><ul class="lst">${DRUG_TIPS.map(x => `<li>${x}</li>`).join('')}</ul></div>
    <div><h3 class="sec-t">اصول تغذیه با این دارو</h3><ul class="lst gold">${NUTRI_TIPS.map(x => `<li>${x}</li>`).join('')}</ul></div></div>
    <div class="warnbox" style="margin-top:3mm"><b>در این موارد فوراً با پزشک تماس بگیرید یا به اورژانس مراجعه کنید:</b><ul class="lst red">${RED_FLAGS.map(x => `<li>${x}</li>`).join('')}</ul></div>
    <h3 class="sec-t">جدول پیگیری وزن</h3>
    ${logTable.replace('<h3 class="sec-t">جدول پیگیری وزن</h3>', '')}${srcNote}
  `));

  return pages.join('');
}

/* صفحه‌ی راهنمای برندها و رتبه‌بندی کیفی مکمل‌ها در گزارش PDF */
function suppBrandsReportHtml(bb, p) {
  const selectedKeys = bb ? bbSupps(p).map(s => s.k) : [];
  let brands = [];
  if (bb && selectedKeys.length) {
    const catMap = { whey: 'whey', casein: 'whey', creatine: 'creatine', caffeine: 'pre', citrulline: 'pre', betaAlanine: 'pre', bcaa: 'bcaa_eaa', eaa: 'bcaa_eaa', collagen: 'collagen', zma: 'magnesium', magnesium: 'magnesium', ashwagandha: 'zma_ashwa' };
    const neededCats = new Set(selectedKeys.map(k => catMap[k] || k));
    neededCats.add('omega3'); neededCats.add('vitd'); neededCats.add('magnesium');
    brands = SUPP_BRANDS.filter(b => neededCats.has(b.cat));
  }
  if (!brands.length) {
    brands = SUPP_BRANDS.slice(0, 8);
  } else if (brands.length > 8) {
    brands = brands.slice(0, 8);
  }

  const items = brands.map(b => `
    <div class="rpt-bc">
      <div class="rpt-bc-vis">
        <div class="rpt-bc-img-container">
          <img class="rpt-bc-img" src="${getBrandImg(b)}" alt="${b.nameFa}" loading="lazy" />
        </div>
        <span class="rpt-bc-tier">${b.tier} · رتبه ${fa(b.rank)}</span>
        ${b.isIranian ? '<span style="font-size:5.5pt; color:#15803D; font-weight:800; margin-top:.5mm">🇮🇷 ایران</span>' : ''}
      </div>
      <div class="rpt-bc-dtl">
        <div class="rpt-bc-h">
          <div>
            <b>${b.nameFa}</b>
            <small>${b.nameEn} · ${b.origin}</small>
          </div>
          <div class="rpt-bc-sc">
            <b>${fa(b.score, 1)}</b>
            <span>★★★★★</span>
          </div>
        </div>
        <div class="rpt-bc-bdg">${b.badge}</div>
        <div class="rpt-bc-desc">
          <span><b>فرم:</b> ${b.form}</span>
          ${b.proteinPerServing ? `<span> · <b>دوز فعال:</b> ${b.proteinPerServing}</span>` : ''}
        </div>
        <div class="rpt-bc-pro"><b>مزیت اصلی:</b> ${b.pros}</div>
        <div class="rpt-bc-crt">
          ${b.darukadeScore ? `<span style="background:#FEF3C7; color:#92400E">⭐ داروکده: ${fa(b.darukadeScore, 1)}</span>` : ''}
          ${(b.certs || []).slice(0, 2).map(c => `<span>✓ ${c}</span>`).join(' ')}
        </div>
      </div>
    </div>
  `).join('');

  return `
    <p class="sec-s" style="margin-top:0">
      ارزیابی برندهای برتر بازار بر اساس تست‌های آزمایشگاهی مستقل (Labdoor، Informed Choice، IFOS) و پروانه‌های رسمی سازمان غذا و دارو (TTAC).
    </p>
    <div class="rpt-brands-grid">
      ${items}
    </div>
    <div class="rbox" style="margin-top:3.5mm; background:#FFFBF2; border-color:#F5E0B3">
      <h4 style="margin:0 0 1.5mm; color:#8A5A0C; font-size:9pt">⚠️ راهنمای اصالت‌سنجی و خرید مکمل در ایران</h4>
      <p style="margin:0; font-size:7.5pt; line-height:1.6; color:#5C4310">
        مکمل‌های ورزشی از پرتقلب‌ترین اقلام مصرفی در بازار غیررسمی هستند. همیشه مکمل را از <b>داروخانه</b> با برچسب زرد و سفید اصالت <b>TTAC</b> تهیه کنید. کد ۱۶ رقمی زیر لایه اسکرچ را به شماره ۲۰۰۰۸۸۲۲ پیامک کنید یا در اپلیکیشن TTAC استعلام بگیرید تا از اصالت و تاریخ انقضای فرآورده اطمینان یابید.
      </p>
    </div>
  `;
}

/* جدول مقایسه‌ای تحلیلی پروتئین وی بازار ایران در گزارش PDF */
function wheyComparisonReportHtml() {
  if (typeof WHEY_DATABASE === 'undefined' || !WHEY_DATABASE.products) return '<p>اطلاعات پایگاه پروتئین وی بارگذاری نشد.</p>';
  const prods = WHEY_DATABASE.products;

  const rows = prods.map((p, idx) => {
    const supplyTag = p.supply_category === 'لبنی داخلی' ? 'rpt-tag-green'
      : p.supply_category === 'داروسازی داخلی' ? 'rpt-tag-blue'
      : p.supply_category.includes('تحت لیسانس') ? 'rpt-tag-purple'
      : 'rpt-tag-amber';
    return `
      <tr>
        <td style="font-weight:700; text-align:center">${fa(idx + 1)}</td>
        <td>
          <b>${p.brand_fa}</b> <small style="color:var(--muted)">(${p.model})</small>
        </td>
        <td><span class="rpt-tag-sm ${supplyTag}">${p.supply_category}</span></td>
        <td><span style="font-size:5.8pt">${p.whey_type}</span></td>
        <td style="font-weight:700; text-align:center">${fa(p.protein_per_serving_g, 1)}g</td>
        <td style="text-align:center">${fa(p.calories_per_serving)}</td>
        <td style="text-align:left; font-size:6pt">
          <b>${fa(Math.round(p.avg_price_toman / 1000))} ه.ت</b>
          <div style="font-size:5.2pt; color:var(--muted)">قوطی ${fa(p.base_weight_g)}g</div>
        </td>
        <td style="text-align:center" class="rpt-val-hl">${fa(p.price_per_g_protein_toman)} ت</td>
        <td style="text-align:center"><b style="color:#B45309">${fa(p.user_rating, 1)}</b> <small>(${fa(Math.round(p.satisfaction_rate_percent))}٪)</small></td>
        <td style="text-align:center">
          ${p.lactose_free ? '<span class="rpt-tag-sm rpt-tag-green">بدون لاکتوز</span>' : '<span style="color:#94A3B8; font-size:5.5pt">لاکتوزدار</span>'}
          ${p.ttac_verified ? '<span class="rpt-tag-sm rpt-tag-blue">TTAC ✓</span>' : '<span class="rpt-tag-sm rpt-tag-amber">آزاد</span>'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:2mm; margin-bottom:1.5mm">
      <p class="sec-s" style="margin:0; font-size:8pt">
        تحلیل مقایسه‌ای ۳۰ محصول پروتئین وی در ۴ رده تامین (لبنی، داروسازی، تحت لیسانس و وارداتی) همراه با <b>قیمت دقیق قوطی</b> و شاخص طلایی <b>ارزش خرید (قیمت به ازای هر ۱ گرم پروتئین خالص)</b>.
      </p>
      <div style="font-size:6.8pt; color:var(--muted)">واحد قیمت: تومان · سال ۱۴۰۴-۱۴۰۵</div>
    </div>
    <table class="rpt-whey-tbl">
      <thead>
        <tr>
          <th style="width:5mm">#</th>
          <th>برند و مدل مکمل</th>
          <th>رده تأمین</th>
          <th>فرآوری</th>
          <th>پروتئین</th>
          <th>کالری</th>
          <th>قیمت قوطی (وزن)</th>
          <th>قیمت/گرم پرو</th>
          <th>رضایت خریدار</th>
          <th>گوارش / TTAC</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div style="margin-top:2mm; font-size:6.8pt; color:var(--muted); line-height:1.4">
      * <b>قیمت قوطی و شاخص قیمت به ازای هر گرم پروتئین (قیمت/گرم پرو):</b> مهم‌ترین ملاک اقتصادی خریداران است که با تقسیم قیمت کل بسته بر مجموع گرم پروتئین خالص محاسبه شده است. هرچه این عدد کمتر باشد، ارزش اقتصادی فرآورده بالاتر است.
    </div>
  `;
}

/* جدول تحلیلی برندهای کراتین و هشدارهای سازمان غذا و دارو (IFDA) در گزارش PDF */
function creatineComparisonReportHtml() {
  if (typeof CREATINE_DATABASE === 'undefined' || !CREATINE_DATABASE.brands) return '<p>اطلاعات پایگاه کراتین بارگذاری نشد.</p>';
  const scoredBrands = CREATINE_DATABASE.brands.filter(b => b.score_0_100 !== null).slice(0, 24);

  const rows = scoredBrands.map((b, idx) => {
    const isIfda = b.in_ifda_warning_list;
    const supplyTag = isIfda ? 'rpt-tag-amber'
      : b.category.includes('تحت لیسانس') ? 'rpt-tag-purple'
      : b.category.includes('ایرانی') ? 'rpt-tag-green'
      : 'rpt-tag-blue';

    return `
      <tr style="${isIfda ? 'background:#FFF5F5' : ''}">
        <td style="font-weight:700; text-align:center">${fa(idx + 1)}</td>
        <td>
          <b>${b.brand_fa}</b> <small style="color:var(--muted)">(${b.brand_en})</small>
        </td>
        <td><span class="rpt-tag-sm ${supplyTag}">${b.category.split(' ')[0]}</span></td>
        <td style="text-align:center">${fa(b.package_weight_g)}g</td>
        <td style="text-align:left; font-size:6pt">
          <b>${fa(Math.round(b.avg_price_toman / 1000))} ه.ت</b>
        </td>
        <td style="text-align:center" class="rpt-val-hl">${fa(b.price_per_g_creatine_toman)} ت</td>
        <td style="text-align:center">
          <b style="color:${b.score_0_100 >= 70 ? '#15803D' : b.score_0_100 >= 50 ? '#B45309' : '#DC2626'}">${fa(b.score_0_100, 1)}</b>
        </td>
        <td style="text-align:center">
          ${isIfda ? '<span class="rpt-tag-sm" style="background:#FEE2E2; color:#991B1B">⚠️ هشدار IFDA</span>'
            : b.official_license_stated ? '<span class="rpt-tag-sm rpt-tag-green">TTAC ✓</span>'
            : '<span class="rpt-tag-sm rpt-tag-blue">داروخانه‌ای</span>'}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:2mm; margin-bottom:1.5mm">
      <p class="sec-s" style="margin:0; font-size:7.8pt">
        پایش ۳۱ برند کراتین بازار ایران با ارزیابی قیمت دقیق قوطی، امتیاز کیفی (از ۱۰۰) و پایش هشدارهای <b>سازمان غذا و دارو (IFDA)</b>.
      </p>
      <div style="font-size:6.8pt; color:var(--muted)">پایش داروخانه‌ای و آزمایشگاهی</div>
    </div>
    <div style="background:#FEF2F2; border:1px solid #FECDD3; padding:1.5mm 2.5mm; border-radius:1.5mm; margin-bottom:2mm; font-size:6.8pt; line-height:1.45; color:#991B1B">
      <b>🚨 هشدار سازمان غذا و دارو (IFDA):</b> ۴۱ برند مکمل ورزشی خارجی (نظیر Optimum Nutrition، MuscleTech، Kevin Levrone، Applied Nutrition، USN و...) در بازار آزاد و فضای مجازی به صورت قاچاق یا تقلبی عرضه می‌شوند. خرید کراتین حتماً باید از داروخانه‌های مجاز و ممهور به استعلام پیامکی سامانه TTAC صورت گیرد.
    </div>
    <table class="rpt-whey-tbl">
      <thead>
        <tr>
          <th style="width:5mm">#</th>
          <th>برند کراتین</th>
          <th>رده تأمین</th>
          <th>وزن قوطی</th>
          <th>قیمت دقیق قوطی</th>
          <th>قیمت/گرم کراتین</th>
          <th>امتیاز کیفی</th>
          <th>وضعیت IFDA / TTAC</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div style="margin-top:1.5mm; font-size:6.5pt; color:var(--muted); line-height:1.4">
      * <b>نحوه مصرف ایمن کراتین:</b> دوز استاندارد روزانه ۵ گرم (بدون نیاز به بارگیری پرعوارض) همراه با نوشیدن حداقل ۳ تا ۴ لیتر آب روزانه برای پیشگیری از استرس اسمزی کلیوی و دهیدراتاسیون.
    </div>
  `;
}

/* صفحه موتور پیشنهاد و هشدارهای بالینی مکمل‌های پروتئین وی در گزارش PDF */
function wheyRecommenderReportHtml() {
  if (typeof WHEY_DATABASE === 'undefined' || !WHEY_DATABASE.recommender_engine) return '';
  const rules = WHEY_DATABASE.recommender_engine;
  const prodMap = {};
  (WHEY_DATABASE.products || []).forEach(p => { prodMap[p.id] = p; });

  const cards = rules.map(r => {
    const topNames = r.top_quality_ids.map(id => prodMap[id] ? `${prodMap[id].brand_fa} (${prodMap[id].model.split(' ')[0]})` : id).join(' · ');
    const valNames = r.best_value_ids.map(id => prodMap[id] ? `${prodMap[id].brand_fa} (${prodMap[id].model.split(' ')[0]})` : id).join(' · ');
    return `
      <div class="rpt-rec-card">
        <div class="rpt-rec-h">
          <b>${r.goal_title}</b>
        </div>
        <div class="rpt-rec-pick">
          <span style="color:#0E7F7A">⭐ گزینه‌های باکیفیت برتر (Top Quality):</span><br>
          ${topNames}
        </div>
        <div class="rpt-rec-pick">
          <span style="color:#C47A0E">💰 گزینه‌های اقتصادی باارزش (Best Value):</span><br>
          ${valNames}
        </div>
        <div style="font-size:6.8pt; color:var(--ink); margin-top:1mm">
          <b>استدلال علمی:</b> ${r.scientific_reason}
        </div>
        <div class="rpt-rec-alert">
          <b>⚠️ توصیه و هشدار پزشک:</b> ${r.user_alert}
        </div>
      </div>
    `;
  }).join('');

  return `
    <p class="sec-s" style="margin-top:0">
      تطبیق پروتکل مصرف مکمل پروتئین وی با شرایط فردی (دوره کات، گوارش حساس، افزایش حجم یا صرفه اقتصادی).
    </p>
    <div class="rpt-rec-grid">
      ${cards}
    </div>
    <div class="rbox" style="margin-top:3.5mm; background:#FFFBF2; border-color:#F5E0B3">
      <h4 style="margin:0 0 1.5mm; color:#8A5A0C; font-size:8.8pt">🔬 پروتکل‌های پیشگیری از تقلب و تست اصالت در ایران</h4>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:3mm; font-size:7pt; line-height:1.55; color:#5C4310">
        <div>
          <b>۱. استعلام پیامکی و وب‌سایت TTAC:</b>
          برچسب اصالت سازمان غذا و دارو را خراشیده و کد ۱۶ رقمی را به ۲۰۰۰۸۸۲۲ بفرستید. در محصولات بازار آزاد (اپتیموم، اپلاید)، بارکد بچ و کد رجیستری کف قوطی را با سایت اصلی کارخانه چک کنید.
        </div>
        <div>
          <b>۲. آزمایش فوری در آب داغ (Hot Water Test):</b>
          یک اسکوپ پودر وی را در آب داغ (بالای ۸۰ درجه) هم بزنید. پروتئین وی اصل به سرعت دلمه (کوآگوله) شده و توده‌های لاستیکی شبیه پنیر می‌دهد. اگر مایع کاملاً شفاف شد یا حل شد، نشاسته/شکر است.
        </div>
      </div>
    </div>
  `;
}

/* صفحه‌ی دوره‌ی پاکسازی (بدنسازی) */
function detoxHtml(days) {
  const li = a => `<ul class="lst">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
  return [`<p class="sec-s" style="margin-top:0">${DETOX.intro.replace('{d}', fa(days))}</p>
    <div class="rbox"><h3 class="sec-t" style="margin-top:0">برنامه‌ی روزانه</h3>
      ${DETOX.daily.map(d => `<div class="spc-r" style="grid-template-columns:42mm 1fr"><i>${d.t}</i><ul><li>${d.x}</li></ul></div>`).join('')}
      <div class="spc-r w" style="margin-top:2mm"><i>احتیاط</i>${li(DETOX.dailyCaution)}</div></div>
    <div class="two"><div class="rbox" style="margin:0"><h3 class="sec-t" style="margin-top:0">مراقبت از کبد</h3>${li(DETOX.liver)}</div>
      <div class="rbox" style="margin:0"><h3 class="sec-t" style="margin-top:0">مراقبت از کلیه</h3>${li(DETOX.kidney)}</div></div>`,
  `<h3 class="sec-t" style="margin-top:0">گیاهان و مکمل‌هایی که ورزشکاران برای کبد و کلیه به کار می‌برند</h3>
    <table class="rt"><tr><th>نام</th><th>مقدار رایج</th><th>آنچه می‌دانیم و احتیاط</th></tr>${DETOX.herbs.map(h => `<tr><td><b>${h.n}</b></td><td>${h.dose}</td><td>${h.note}</td></tr>`).join('')}</table>
    <div class="rbox" style="margin-top:3mm">${DETOX.note}</div>`];
}

/* اگر محتوای صفحه‌ای بیشتر از جای آن بود، کمی کوچکش کن */
function autoFit() {
  document.querySelectorAll('#report .page .pg-in').forEach(inn => {
    const fit = inn.querySelector('.fit'); if (!fit) return;
    const cs = getComputedStyle(inn);
    const avail = inn.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    let z = 1;
    fit.style.zoom = 1;
    while (fit.getBoundingClientRect().height > avail && z > 0.74) { z -= 0.02; fit.style.zoom = z; }
    if (fit.getBoundingClientRect().height > avail) inn.closest('.page').classList.add('grow');
  });
}