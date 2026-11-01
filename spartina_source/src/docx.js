/* ============================================================
   خروجی Word (.docx) — بدون کتابخانه‌ی بیرونی
   یک فایل zip ساده (بدون فشرده‌سازی) با XML استاندارد Word
   ============================================================ */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cen = [];
  let off = 0;
  const u16 = v => [v & 255, (v >>> 8) & 255], u32 = v => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255];
  files.forEach(([name, text]) => {
    const nb = enc.encode(name), db = enc.encode(text), crc = crc32(db);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(db.length), ...u32(db.length), ...u16(nb.length), ...u16(0)];
    const lh = new Uint8Array([...u32(0x04034b50), ...common]);
    parts.push(lh, nb, db);
    cen.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), nb);
    off += lh.length + nb.length + db.length;
  });
  const cenLen = cen.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cenLen), ...u32(off), ...u16(0)]);
  return new Blob([...parts, ...cen, end], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

/* ---------- سازنده‌های XML ---------- */
const xe = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const W_FONT = 'Tahoma';
function wRun(t, o = {}) {
  // قلم و جهت راست‌به‌چپ در docDefaults تعریف شده‌اند؛ اینجا فقط تفاوت‌ها می‌آید
  const sz = o.size && o.size !== 10 ? `<w:sz w:val="${o.size * 2}"/><w:szCs w:val="${o.size * 2}"/>` : '';
  return `<w:r><w:rPr>${o.b ? '<w:b/><w:bCs/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}${sz}<w:rtl/></w:rPr><w:t xml:space="preserve">${xe(t)}</w:t></w:r>`;
}
function wP(content, o = {}) {
  const runs = Array.isArray(content) ? content.map(c => typeof c === 'string' ? wRun(c, o) : wRun(c.t, { ...o, ...c })).join('') : wRun(content, o);
  return `<w:p><w:pPr><w:bidi/>${o.style ? `<w:pStyle w:val="${o.style}"/>` : ''}${o.center ? '<w:jc w:val="center"/>' : ''}<w:spacing w:before="${o.before || 0}" w:after="${o.after == null ? 80 : o.after}"/>${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ''}${o.keep ? '<w:keepNext/>' : ''}</w:pPr>${runs}</w:p>`;
}
const wH = (t, color = '1C2766', size = 15) => wP(t, { b: 1, size, color, before: 220, after: 100, keep: 1 });
const wBullets = (arr, color) => arr.map(x => wP([{ t: '• ', color: color || 'F0A133', b: 1 }, x], { after: 50 })).join('');
const wBreak = () => '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
function wTable(rows, o = {}) {
  const head = o.head, fill = o.headFill || '1C2766';
  const widths = o.widths;
  const cell = (c, i, isHead, rowFill) => `<w:tc><w:tcPr>${widths ? `<w:tcW w:w="${widths[i]}" w:type="pct"/>` : ''}${isHead ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : rowFill ? `<w:shd w:val="clear" w:color="auto" w:fill="${rowFill}"/>` : ''}</w:tcPr>${wP(c, { b: isHead, color: isHead ? 'FFFFFF' : undefined, size: 9.5, after: 20 })}</w:tc>`;
  const tr = (r, isHead, f) => `<w:tr>${isHead ? '<w:trPr><w:tblHeader/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${r.map((c, i) => cell(c, i, isHead, f)).join('')}</w:tr>`;
  const b = '<w:top w:val="single" w:sz="4" w:color="E5DFD2"/><w:bottom w:val="single" w:sz="4" w:color="E5DFD2"/><w:insideH w:val="single" w:sz="4" w:color="E5DFD2"/><w:left w:val="single" w:sz="4" w:color="E5DFD2"/><w:right w:val="single" w:sz="4" w:color="E5DFD2"/><w:insideV w:val="single" w:sz="4" w:color="E5DFD2"/>';
  return `<w:tbl><w:tblPr><w:bidiVisual/><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${b}</w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr>
    ${head ? tr(head, true) : ''}${rows.map((r, i) => tr(r, false, r._fill || (i % 2 ? 'FBF7EF' : null))).join('')}</w:tbl>${wP('', { after: 60 })}`;
}

function buildDocx(p, T, plan) {
  const plain = id => FOOD[id].fa.replace(/\s*\(.*\)/, '');
  const B = [];
  const bb = p.prog === 'bb';
  const se = bb ? {} : (p.side || {});
  const micOff = micOffOf(p), mic = micSupp(p, T, weekAvg(plan)).filter(m => !micOff[m.k]);
  const micTable = list => wTable(list.map(m => [`${m.n} (${MIC_LVL[m.lvl]})`, m.why + (m.ev ? ` — شواهد: ${m.ev}` : ''), `${m.dose} ${m.caution}`]), { head: ['مکمل', 'دلیل', 'مقدار و نحوه‌ی مصرف'], widths: [1100, 1500, 2400] });
  B.push(wP(bb ? 'برنامه‌ی تغذیه‌ی ورزشی ویژه‌ی شما' : 'برنامه‌ی سلامت و تغذیه‌ی ویژه‌ی شما', { b: 1, size: 22, color: '1C2766', center: 1, after: 60 }));
  B.push(wP(bb ? 'بدنسازی · روزهای تمرین و استراحت' : 'همراه درمان با اسپارتینا (تیرزپاتاید)', { size: 11, color: '5B2B83', center: 1, after: 200 }));
  B.push(wTable([
    ['نام', p.name || '', 'تاریخ تنظیم', jalali(Date.now())],
    [bb ? 'هدف' : 'دوز فعلی', bb ? T.ph.title : `${fa(p.dose, 1)} میلی‌گرم در هفته`, 'زیر نظر', `${DOCTOR.name} · نظام پزشکی ${DOCTOR.code}`],
  ], { widths: [900, 1600, 900, 1600] }));
  B.push(wP('این فایل قابل ویرایش است. اگر غذا یا مقداری را دستی تغییر دهید، کالری و پروتئین دوباره حساب نمی‌شود؛ برای جایگزینی مطمئن از «جدول جانشینی» یا فایل HTML برنامه استفاده کنید.', { size: 9, color: '7A7468', shade: 'FDF1DC', after: 160 }));

  B.push(wH('نیازهای روزانه‌ی شما'));
  B.push(wTable([
    ['انرژی', `${fa(T.kcal)} کیلوکالری`, 'پروتئین', `${fa(T.prot)} گرم`],
    ['کربوهیدرات', `${fa(T.carb)} گرم`, 'چربی', `${fa(T.fat)} گرم`],
    ['فیبر', `${fa(T.fiber)} گرم`, 'آب', `${fa(T.water / 1000, 1)} لیتر (حدود ${fa(Math.round(T.water / 250))} لیوان)`],
    ['تعداد وعده', `${fa(T.meals)} وعده`, bb ? 'تمرین' : 'مرحله‌ی درمان', bb ? `${fa(T.bb.days.length)} روز در هفته، ${BB_TIME[T.bb.time]}` : T.ph.title],
  ], { widths: [900, 1600, 900, 1600] }));
  if (T.warns.length) { B.push(wH('توجه', 'C7375A', 12)); B.push(wBullets(T.warns, 'C7375A')); }
  B.push(wH(bb ? 'برای هدف شما' : 'در این مرحله از درمان', '5B2B83', 12)); B.push(wBullets(bb ? [...T.notes.slice(0, 1), ...BB_GOAL_TIPS[T.goal]] : PHASE_TIPS[T.ph.key]));
  const gi = Object.keys(GI_TIPS).filter(k => se[k]);
  gi.forEach(k => { B.push(wH(SIDE.find(s => s[0] === k)[1], '5B2B83', 11)); B.push(wBullets(GI_TIPS[k], '0E9F9A')); });

  plan.days.forEach((day, di) => {
    B.push(wBreak());
    const dt = dayTotals(day);
    B.push(wH(`${DAYS[di]} — روز ${fa(di + 1)} از ۷${bb ? (day.train ? ' · روز تمرین' : ' · روز استراحت') : ''}`, '1C2766', 16));
    B.push(wP(`${fa(Math.round(dt.kcal))} کیلوکالری · ${fa(Math.round(dt.p))} گرم پروتئین · ${fa(Math.round(dt.c))} گرم کربوهیدرات · ${fa(Math.round(dt.f))} گرم چربی`, { size: 9.5, color: '7A7468', after: 120 }));
    const rows = [];
    day.meals.forEach(m => {
      const mt = mealTotals(m.items);
      rows.push(Object.assign([`${slotLabel(m)}: ${m.name}`, '', '', `${fa(Math.round(mt.kcal))} کیلوکالری`], { _fill: 'E8ECF8' }));
      m.items.forEach(it => rows.push(['', plain(it.id) + ((META[it.id].t || []).includes('approx') ? ' ≈' : ''), `${fa(it.g, 1)} گرم`, [household(it.id, it.g), rawTxt(it.id, it.g)].filter(Boolean).join(' · ')]));
    });
    B.push(wTable(rows, { head: ['وعده', 'غذا', 'مقدار', 'واحد خانگی'], widths: [1500, 1700, 700, 1100] }));
    B.push(wP([{ t: 'آب امروز: ', b: 1 }, '☐ '.repeat(Math.round(T.water / 250))], { size: 11, color: '0E9F9A' }));
  });

  B.push(wBreak());
  B.push(wH('جدول جانشینی غذاها'));
  B.push(wP('هر قلم از برنامه را می‌توانید با قلم دیگری از همان جدول و به همان تعداد واحد عوض کنید.', { size: 9.5, color: '7A7468' }));
  exchangeTable(allowedFoods(p, T).ok).forEach(e => {
    B.push(wH(`${e.title} (${e.sub})`, '5B2B83', 11));
    B.push(wTable(e.rows.map(r => [plain(r.id), `${fa(r.g)} گرم`, r.hu || '']), { head: ['غذا', 'یک واحد', 'واحد خانگی'], widths: [2500, 1000, 1500] }));
  });

  B.push(wBreak());
  B.push(wH('فهرست خرید هفتگی'));
  B.push(wP('گوشت، مرغ، ماهی، برنج، غلات و حبوبات به وزن خام (تقریبی)؛ بقیه به وزن آماده‌ی مصرف.', { size: 9.5, color: '7A7468' }));
  const shop = shoppingList(plan);
  const kg = g => g >= 1000 ? `${fa(g / 1000, 1)} کیلوگرم` : `${fa(round(g, g < 50 ? 1 : 10))} گرم`;
  const sr = [];
  Object.keys(shop).forEach(g => { sr.push(Object.assign([GROUP_FA[g], ''], { _fill: 'E8ECF8' })); shop[g].sort((a, b) => b.g - a.g).forEach(x => sr.push([foodLabel(x.id), kg(x.g)])); });
  B.push(wTable(sr, { widths: [3000, 2000] }));

  B.push(wBreak());
  if (bb) {
    B.push(wH('راهنمای تغذیه‌ی ورزشی'));
    B.push(wBullets(BB_TIPS));
    B.push(wBreak());
    B.push(wH('مکمل‌های شما'));
    B.push(wH('ویتامین‌ها، املاح و مکمل‌های درمانی', '5B2B83', 12));
    if (mic.length) B.push(micTable(mic));
    else B.push(wP('نیازی به مکمل ویتامین یا املاح دیده نشد.', { size: 9.5, color: '7A7468' }));
    const sups = bbSupps(p);
    if (sups.length) {
      B.push(wH('پروتکل مکمل‌های ورزشی', '5B2B83', 12));
      sups.forEach(s => {
        B.push(wH(s.n, '0E9F9A', 11)); B.push(wP(s.what, { size: 9.5, color: '7A7468' }));
        B.push(wP('مقدار:', { b: 1, size: 9.5 })); B.push(wBullets(s.dose(p)));
        B.push(wP('نحوه‌ی مصرف:', { b: 1, size: 9.5 })); B.push(wBullets(s.how, '0E9F9A'));
        B.push(wP('احتیاط:', { b: 1, size: 9.5 })); B.push(wBullets(s.caution, 'C7375A'));
        B.push(wP(`منبع: ${s.src}`, { size: 8, color: '7A7468' }));
      });
    }
    B.push(wH('توصیه‌های کلی درباره‌ی مکمل‌ها', '5B2B83', 12)); B.push(wBullets(BB_SUPP_GENERAL));
    if (T.bb.detox && T.bb.detox.on) {
      const d = +T.bb.detox.days || 14;
      B.push(wBreak());
      B.push(wH(`دوره‌ی پاکسازی (${fa(d)} روز)`));
      B.push(wP(DETOX.intro.replace('{d}', fa(d)), { size: 9.5, color: '7A7468' }));
      B.push(wTable(DETOX.daily.map(x => [x.t, x.x]), { head: ['زمان', 'برنامه'], widths: [1500, 3500] }));
      B.push(wH('احتیاط', 'C7375A', 11)); B.push(wBullets(DETOX.dailyCaution, 'C7375A'));
      B.push(wH('مراقبت از کبد', '0E9F9A', 12)); B.push(wBullets(DETOX.liver));
      B.push(wH('مراقبت از کلیه', '0E9F9A', 12)); B.push(wBullets(DETOX.kidney));
      B.push(wH('گیاهان و مکمل‌هایی که ورزشکاران برای کبد و کلیه به کار می‌برند', '5B2B83', 12));
      B.push(wTable(DETOX.herbs.map(h => [h.n, h.dose, h.note]), { head: ['نام', 'مقدار رایج', 'آنچه می‌دانیم و احتیاط'], widths: [1100, 1100, 2800] }));
      B.push(wP(DETOX.note, { size: 9.5, color: '7A7468' }));
    }
    B.push(wBreak());
    B.push(wH('تمرین ایمن و هوشمند'));
    BB_TRAIN.forEach(s => { B.push(wH(s.t, '0E9F9A', 12)); B.push(wBullets(s.items)); });
    B.push(wBreak());
  }
  B.push(wH('شش کلید طلایی زندگی سبک'));
  lifeFor(p).forEach(s => { B.push(wH(`${s.t} — ${s.s}`, '0E9F9A', 12)); B.push(wBullets(s.items)); });
  const mz = mizajOf(p);
  if (mz) {
    const tips = [...(MIZAJ_TIPS[mz.H] || []), ...(mz.W !== 'mid' ? MIZAJ_TIPS[mz.W] : [])];
    if (mz.H === 'mid' && mz.W === 'mid') tips.push(...MIZAJ_TIPS.mid);
    B.push(wH('توصیه‌های ویژه‌ی شما', '5B2B83', 12)); B.push(wBullets(tips));
  }
  if (bb) { B.push(wH('در این موارد تمرین را متوقف کنید و با پزشک تماس بگیرید', 'C7375A', 12)); B.push(wBullets(BB_RED, 'C7375A')); }
  else {
    if (mic.length) { B.push(wH('مکمل‌های پیشنهادی', '5B2B83', 12)); B.push(micTable(mic)); }
    B.push(wH('مصرف صحیح دارو', '1C2766', 12)); B.push(wBullets(DRUG_TIPS));
    B.push(wH('اصول تغذیه با این دارو', '1C2766', 12)); B.push(wBullets(NUTRI_TIPS));
    B.push(wH('در این موارد فوراً با پزشک تماس بگیرید یا به اورژانس مراجعه کنید', 'C7375A', 12)); B.push(wBullets(RED_FLAGS, 'C7375A'));
  }
  B.push(wP(`${DOCTOR.name} · شماره نظام پزشکی ${DOCTOR.code}`, { b: 1, size: 11, color: '1C2766', before: 300, center: 1 }));
  B.push(wP(`منبع ارزش غذایی: USDA FoodData Central، SR Legacy (2018)؛ نان‌های ایرانی: جداول ترکیب غذایی FAO برای خاورمیانه (1982)؛ اقلام علامت‌دار (≈) و سدیم نان‌ها: تقریبی از منابع ایرانی.${bb ? ' توصیه‌های ورزشی و مکمل‌ها: بیانیه‌های ISSN (Jäger 2017، Kerksick 2017، Kreider 2017، Trexler 2015، Guest 2021، Wilson 2013)، اجماع IOC (Maughan 2018)، Wolfe 2017، Helms 2014، ACSM 2009؛ ویتامین D: Holick 2011؛ آهن: Stoffel 2017.' : ''} این برنامه جایگزین معاینه و نظر پزشک نیست.`, { size: 8, color: '7A7468', center: 1 }));

  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${B.join('')}
<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="400" w:footer="400" w:gutter="0"/><w:bidi/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${W_FONT}" w:hAnsi="${W_FONT}" w:cs="${W_FONT}"/><w:sz w:val="20"/><w:szCs w:val="20"/><w:rtl/><w:lang w:bidi="fa-IR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:bidi/><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;
  return zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['word/document.xml', doc],
    ['word/styles.xml', styles],
  ]);
}
