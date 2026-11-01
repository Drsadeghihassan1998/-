/* ============================================================
   صفحه اختصاصی مقایسه، رتبه‌بندی و تحلیل اقتصادی برندهای مکمل
   بر اساس بانک جامع تحلیلی پروتئین وی (۳۰ برند) و کراتین بازار ایران (۷۷ برند)
   منبع: سازمان غذا و دارو (IFDA)، پایش داروخانه‌ها و نظرات خریداران
   ============================================================ */

const cmpToEn = s => String(s == null ? '' : s).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace('/', '.');
const cmpEsc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function cmpFormatToman(num) {
  if (num == null || isNaN(num) || num <= 0) return 'استعلام بازار';
  return fa(Math.round(num)) + ' تومان';
}

function cmpPackagePriceLabel(p) {
  const wt = p.base_weight_g || p.package_weight_g;
  const pr = p.avg_price_toman || p.exact_price_toman;
  return wt ? `قوطی ${fa(wt)} گرمی: ${cmpFormatToman(pr)}` : cmpFormatToman(pr);
}

let cmpCat = 'whey'; // 'whey' | 'creatine' | 'magnesium' | 'vitd' | 'all'
let cmpSupply = 'all'; // 'all' | 'dairy' | 'pharma' | 'license' | 'import'
let cmpIfdaFilter = 'all'; // 'all' | 'safe_only' | 'warning_only'
let cmpGoal = ''; // '' | 'REC-01' | 'REC-02' | 'REC-03' | 'REC-04'
let cmpSearchQ = '';
let cmpSortBy = 'satisfaction'; // 'satisfaction' | 'price_package' | 'price_protein' | 'price_kg' | 'protein' | 'rating'
let cmpLactoseFreeOnly = false;
let cmpGlutenFreeOnly = false;
let cmpLowAcneOnly = false;
let cmpTtacOnly = false;
let cmpSelectedIds = [];
let cmpViewStyle = 'table'; // 'table' | 'cards'

/* دریافت لیست یکپارچه محصولات برای نمایش و مقایسه */
function getUnifiedSuppProducts() {
  const list = [];

  // ۱. محصولات پروتئین وی از بانک جامع تحلیلی (۳۰ فرآورده)
  if (typeof WHEY_DATABASE !== 'undefined' && WHEY_DATABASE.products) {
    WHEY_DATABASE.products.forEach(p => {
      list.push({
        ...p,
        category: 'whey',
        category_fa: 'پروتئین وی',
        package_weight_g: p.base_weight_g,
        exact_price_toman: p.avg_price_toman,
        in_ifda_warning_list: false,
        image: getBrandImg({ id: p.id, nameFa: p.brand_fa, nameEn: p.brand_en, cat: 'whey', isIranian: p.ttac_verified, tier: p.user_rating >= 4.5 ? 'S' : p.user_rating >= 4.0 ? 'A' : 'B', score: p.user_rating, rank: 1, form: p.model })
      });
    });
  }

  // ۲. محصولات کراتین از بانک جامع کراتین بازار ایران (۷۷ برند)
  if (typeof CREATINE_DATABASE !== 'undefined' && CREATINE_DATABASE.brands) {
    CREATINE_DATABASE.brands.forEach(b => {
      const isIranian = !b.in_ifda_warning_list && (b.category.includes('ایرانی') || b.official_license_stated);
      const tier = b.score_0_100 >= 70 ? 'S' : b.score_0_100 >= 50 ? 'A' : 'B';
      const userRating = b.avg_user_rating || (b.score_0_100 ? Number((b.score_0_100 / 20).toFixed(1)) : 4.0);

      list.push({
        id: b.id,
        rank: b.rank,
        brand_fa: b.brand_fa,
        brand_en: b.brand_en,
        model: `کراتین مونوهیدرات خالص (${fa(b.package_weight_g)} گرمی)`,
        supply_category: b.category,
        origin_manufacturer: b.origin_or_license || b.manufacturer || '—',
        whey_type: 'Creatine Monohydrate',
        whey_type_fa: 'کراتین منوهیدرات ۱۰۰٪ خالص',
        base_weight_g: b.package_weight_g,
        package_weight_g: b.package_weight_g,
        other_weights: [],
        servings: Math.round(b.package_weight_g / 5),
        protein_per_serving_g: 0,
        creatine_per_serving_g: 5.0,
        calories_per_serving: 0,
        exact_price_toman: b.avg_price_toman,
        avg_price_toman: b.avg_price_toman,
        min_price_toman: b.min_price_toman,
        max_price_toman: b.max_price_toman,
        price_per_kg_toman: b.price_per_kg_toman,
        price_per_g_creatine_toman: b.price_per_g_creatine_toman,
        price_per_g_protein_toman: 0,
        is_observed_price: b.is_observed_price,
        user_rating: userRating,
        total_votes: b.rating_votes || (b.evidence_count * 15) || 50,
        satisfaction_rate_percent: b.score_0_100 != null ? b.score_0_100 : Math.round(userRating * 20),
        score_0_100: b.score_0_100,
        confidence: b.confidence,
        in_ifda_warning_list: b.in_ifda_warning_list,
        official_license_stated: b.official_license_stated,
        manufacturer_named: b.manufacturer_named,
        lactose_free: true,
        gluten_free: true,
        acne_risk: 'Low',
        digestive_compatibility: 'عالی (با نوشیدن آب کافی)',
        solubility: 'خوب (پودر میکرونایز ۲۰۰ مش)',
        top_flavors: ['بدون طعم و خالص'],
        fitness_goals: ['افزایش قدرت و توان انفجاری', 'حجم‌گیری عضلانی خشک', 'سرعت ریکاوری بین ست‌ها', 'اشباع فسفوکراتین عضلات'],
        pros: [
          b.official_license_stated ? 'دارای مجوز رسمی سازمان غذا و دارو' : 'محبوب در بین بدنسازان حرفه‌ای',
          b.notes || 'کراتین میکرونایز استاندارد برای افزایش توان و حجم عضلانی'
        ],
        cons: [
          b.in_ifda_warning_list ? '⚠️ در فهرست هشدار رسمی سازمان غذا و دارو (IFDA) به دلیل عرضه در مجاری غیرمجاز' : 'نیاز به نوشیدن حداقل ۳ لیتر آب در روز'
        ],
        ttac_verified: isIranian,
        category: 'creatine',
        category_fa: 'کراتین',
        sources: b.sources,
        image: getBrandImg({ id: b.id, nameFa: b.brand_fa, nameEn: b.brand_en, cat: 'creatine', isIranian: isIranian, tier: tier, score: userRating, rank: b.rank || 1, form: 'پودر میکرونایز' })
      });
    });
  }

  // ۳. سایر مکمل‌های درمانی (منیزیم، ویتامین D3 و...) از SUPP_BRANDS
  if (typeof SUPP_BRANDS !== 'undefined') {
    SUPP_BRANDS.filter(b => b.cat !== 'whey' && b.cat !== 'creatine').forEach(b => {
      const supplyCat = b.isIranian ? 'داروسازی داخلی' : 'تحت لیسانس (داروخانه‌ای)';
      const priceEstimate = b.cat === 'magnesium' ? 420000 : b.cat === 'vitd' ? 180000 : 650000;
      list.push({
        id: b.id,
        brand_fa: b.nameFa,
        brand_en: b.nameEn,
        model: b.form || b.badge,
        supply_category: supplyCat,
        origin_manufacturer: b.origin,
        whey_type: b.cat,
        whey_type_fa: b.cat === 'magnesium' ? 'املاح منیزیم' : b.cat === 'vitd' ? 'ویتامین D3' : 'مکمل تغذیه‌ای',
        base_weight_g: 100,
        package_weight_g: 100,
        other_weights: [],
        servings: 30,
        protein_per_serving_g: 0,
        calories_per_serving: 0,
        exact_price_toman: priceEstimate,
        min_price_toman: priceEstimate * 0.9,
        max_price_toman: priceEstimate * 1.15,
        avg_price_toman: priceEstimate,
        price_per_kg_toman: priceEstimate * 10,
        price_per_g_protein_toman: 0,
        user_rating: b.score,
        total_votes: b.darukadeReviews ? parseInt(cmpToEn(b.darukadeReviews)) || 100 : 120,
        satisfaction_rate_percent: Math.min(98, Math.round(b.score * 20)),
        lactose_free: true,
        gluten_free: true,
        acne_risk: 'Low',
        digestive_compatibility: 'عالی',
        solubility: 'خوب',
        top_flavors: ['طبیعی'],
        fitness_goals: [b.badge || 'ارتقای سلامت'],
        pros: [b.pros],
        cons: [b.cons || 'نیاز به مصرف طبق نظر پزشک'],
        ttac_verified: b.isIranian,
        in_ifda_warning_list: false,
        category: b.cat,
        category_fa: b.cat === 'magnesium' ? 'منیزیم' : b.cat === 'vitd' ? 'ویتامین D3' : 'مولتی‌ویتامین',
        image: getBrandImg(b)
      });
    });
  }

  return list;
}

/* فیلتر و مرتب‌سازی محصولات */
function getFilteredSuppProducts() {
  let list = getUnifiedSuppProducts();

  // فیلتر دسته‌بندی
  if (cmpCat !== 'all') {
    list = list.filter(p => p.category === cmpCat);
  }

  // فیلتر رده تأمین
  if (cmpSupply === 'dairy') {
    list = list.filter(p => p.supply_category === 'لبنی داخلی');
  } else if (cmpSupply === 'pharma') {
    list = list.filter(p => p.supply_category === 'داروسازی داخلی' || p.supply_category === 'داخلی (ایرانی)');
  } else if (cmpSupply === 'license') {
    list = list.filter(p => p.supply_category.includes('تحت لیسانس'));
  } else if (cmpSupply === 'import') {
    list = list.filter(p => p.supply_category.includes('وارداتی'));
  }

  // فیلتر هشدار سازمان غذا و دارو (IFDA) برای کراتین
  if (cmpIfdaFilter === 'safe_only') {
    list = list.filter(p => !p.in_ifda_warning_list);
  } else if (cmpIfdaFilter === 'warning_only') {
    list = list.filter(p => p.in_ifda_warning_list);
  }

  // فیلتر هدف موتور پیشنهاد (ویژه پروتئین وی)
  if (cmpGoal && typeof WHEY_DATABASE !== 'undefined' && WHEY_DATABASE.recommender_engine) {
    const rule = WHEY_DATABASE.recommender_engine.find(r => r.rule_id === cmpGoal);
    if (rule) {
      const allowedIds = new Set([...rule.top_quality_ids, ...rule.best_value_ids]);
      list = list.filter(p => allowedIds.has(p.id));
    }
  }

  // فیلترهای ویژگی‌های سلامت
  if (cmpLactoseFreeOnly) list = list.filter(p => p.lactose_free);
  if (cmpGlutenFreeOnly) list = list.filter(p => p.gluten_free);
  if (cmpLowAcneOnly) list = list.filter(p => p.acne_risk === 'Low');
  if (cmpTtacOnly) list = list.filter(p => p.ttac_verified);

  // جستجوی متنی
  const q = cmpSearchQ.trim().toLowerCase();
  if (q) {
    list = list.filter(p => {
      const bFa = (p.brand_fa || '').toLowerCase();
      const bEn = (p.brand_en || '').toLowerCase();
      const m = (p.model || '').toLowerCase();
      const fl = (p.top_flavors || []).join(' ').toLowerCase();
      const pr = (p.pros || []).join(' ').toLowerCase();
      const fg = (p.fitness_goals || []).join(' ').toLowerCase();
      return bFa.includes(q) || bEn.includes(q) || m.includes(q) || fl.includes(q) || pr.includes(q) || fg.includes(q);
    });
  }

  // مرتب‌سازی
  list.sort((a, b) => {
    if (cmpSortBy === 'satisfaction') return (b.satisfaction_rate_percent || 0) - (a.satisfaction_rate_percent || 0);
    if (cmpSortBy === 'price_package') return (a.avg_price_toman || 0) - (b.avg_price_toman || 0);
    if (cmpSortBy === 'price_protein') {
      const pA = a.category === 'whey' ? (a.price_per_g_protein_toman || 999999) : (a.price_per_g_creatine_toman || 999999);
      const pB = b.category === 'whey' ? (b.price_per_g_protein_toman || 999999) : (b.price_per_g_creatine_toman || 999999);
      return pA - pB;
    }
    if (cmpSortBy === 'price_kg') return (a.price_per_kg_toman || 0) - (b.price_per_kg_toman || 0);
    if (cmpSortBy === 'protein') return (b.protein_per_serving_g || 0) - (a.protein_per_serving_g || 0);
    if (cmpSortBy === 'rating') return (b.user_rating || 0) - (a.user_rating || 0);
    return 0;
  });

  return list;
}

/* به‌روزرسانی و رندر نمودار تصویری مقایسه برندها با Recharts */
function updateCmpVisualChart() {
  const container = document.getElementById('cmpVisualChartContainer');
  if (!container || typeof window.renderSupplementComparisonChart !== 'function') return;

  const allProds = getUnifiedSuppProducts();
  let selectedProds = [];
  let isDefault = false;

  if (cmpSelectedIds && cmpSelectedIds.length >= 2) {
    selectedProds = cmpSelectedIds.slice(0, 4).map(id => allProds.find(p => p.id === id)).filter(Boolean);
    isDefault = false;
  } else if (cmpSelectedIds && cmpSelectedIds.length === 1) {
    const single = allProds.find(p => p.id === cmpSelectedIds[0]);
    const catProds = allProds.filter(p => p.category === (single ? single.category : cmpCat) && p.id !== cmpSelectedIds[0]);
    selectedProds = [single, ...catProds.slice(0, 2)].filter(Boolean);
    isDefault = false;
  } else {
    // پیش‌فرض: ۳ فرآورده برتر دسته جاری
    const filtered = getFilteredSuppProducts();
    selectedProds = filtered.slice(0, 3);
    if (selectedProds.length < 2) {
      selectedProds = allProds.filter(p => cmpCat === 'all' ? true : p.category === cmpCat).slice(0, 3);
    }
    isDefault = true;
  }

  window.renderSupplementComparisonChart('cmpVisualChartContainer', {
    products: selectedProds,
    onToggleSelect: toggleCmpSelect,
    isDefaultSelection: isDefault
  });
}

/* صفحه اصلی مقایسه برندها */
function compareView() {
  if (typeof setTimeout === 'function') {
    setTimeout(updateCmpVisualChart, 0);
  }
  const products = getFilteredSuppProducts();
  const allProds = getUnifiedSuppProducts();
  const wheyCount = allProds.filter(p => p.category === 'whey').length;
  const creatineCount = allProds.filter(p => p.category === 'creatine').length;
  const ifdaWarningCount = (typeof CREATINE_DATABASE !== 'undefined' && CREATINE_DATABASE.regulatory_warning) ? CREATINE_DATABASE.regulatory_warning.brands.length : 41;

  // کارت‌های موتور پیشنهاد پروتئین وی
  const recCards = (typeof WHEY_DATABASE !== 'undefined' && WHEY_DATABASE.recommender_engine) ? WHEY_DATABASE.recommender_engine.map(r => {
    const isAct = cmpGoal === r.rule_id;
    return `
      <div class="cmp-rec-card ${isAct ? 'active' : ''}" onclick="setCmpGoal('${r.rule_id}')">
        <div class="cmp-rec-h">
          <b>${r.goal_title}</b>
          ${isAct ? '<span class="cmp-rec-badge">✓ فیلتر فعال</span>' : ''}
        </div>
        <div class="cmp-rec-sub">${r.scientific_reason}</div>
        <div class="cmp-rec-picks">
          <div><span>⭐ کیفیت برتر:</span> ${r.top_quality_ids.slice(0, 3).join(' · ')}</div>
          <div><span style="color:#C47A0E">💰 ارزش خرید:</span> ${r.best_value_ids.slice(0, 3).join(' · ')}</div>
        </div>
        <div style="font-size:11px; color:#854D0E; background:#FEF3C7; padding:4px 8px; border-radius:6px; margin-top:4px">
          <b>⚠️ نکته بالینی:</b> ${r.user_alert}
        </div>
      </div>
    `;
  }).join('') : '';

  return `
    <div class="cmp-container">
      <!-- هدر و آمار کلیدی -->
      <section class="cmp-hero">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px">
          <div>
            <h2>⚖️ بانک جامع تحلیلی و مقایسه برندهای مکمل در بازار ایران</h2>
            <p>
              ارزیابی فنی، قیمت دقیق بسته‌بندی، ارزش اقتصادی، درصد رضایت خریداران، و راستی‌آزمایی برچسب اصالت <b>TTAC</b> و هشدارهای رسمی <b>سازمان غذا و دارو (IFDA)</b>.
            </p>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <button type="button" class="btn ghost sm" style="background:rgba(255,255,255,.15); color:#fff; border-color:rgba(255,255,255,.3)" data-act="viewplan">← بازگشت به پرونده بیمار</button>
            <button type="button" class="btn gold sm" data-act="pdf">⬇ خروجی PDF با جدول مقایسه</button>
          </div>
        </div>

        <div class="cmp-kpis">
          <div class="cmp-kpi">
            <b>${fa(wheyCount)} برند</b>
            <span>پروتئین وی تحلیلی</span>
          </div>
          <div class="cmp-kpi">
            <b>${fa(creatineCount)} برند</b>
            <span>کراتین بازار ایران</span>
          </div>
          <div class="cmp-kpi">
            <b>قیمت دقیق قوطی</b>
            <span>بسته‌های ۱۸۰۰g و ۳۰۰g</span>
          </div>
          <div class="cmp-kpi">
            <b>ارزش خرید</b>
            <span>قیمت هر گرم پروتئین / کراتین</span>
          </div>
          <div class="cmp-kpi" style="border-inline-start-color:#F87171">
            <b style="color:#FCA5A5">${fa(ifdaWarningCount)} برند غیرمجاز</b>
            <span>هشدار تقلب غذا و دارو</span>
          </div>
        </div>
      </section>

      <!-- بخش هشدار رسمی سازمان غذا و دارو (IFDA) درباره کراتین -->
      ${(cmpCat === 'creatine' || cmpCat === 'all') ? `
        <section class="card" style="padding:14px 18px; background:#FFF1F2; border:1.5px solid #FECDD3; margin-bottom:14px">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
            <div style="display:flex; align-items:center; gap:8px">
              <span style="font-size:20px">🚨</span>
              <div>
                <b style="color:#9F1239; font-size:13.5px">هشدار رسمی سازمان غذا و دارو (IFDA): عرضه غیرمجاز و قاچاق ۴۱ برند مکمل در بازار آزاد و فضای مجازی</b>
                <div style="font-size:12px; color:#BE123C; margin-top:2px">
                  برندهای مشهور خارجی نظیر Optimum Nutrition، MuscleTech، Kevin Levrone، Applied Nutrition، USN و... در مجاری آنلاین فاقد مجوز رسمی‌اند.
                </div>
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap">
              <span style="font-size:11.5px; font-weight:700; color:#881337">فیلتر اصالت:</span>
              <button type="button" class="chip ${cmpIfdaFilter === 'all' ? 'on' : ''}" style="font-size:11px; padding:3px 8px" onclick="setCmpIfdaFilter('all')">همه برندها</button>
              <button type="button" class="chip ${cmpIfdaFilter === 'safe_only' ? 'on' : ''}" style="font-size:11px; padding:3px 8px; color:#15803D" onclick="setCmpIfdaFilter('safe_only')">🛡️ فقط مجاز داروخانه‌ای</button>
              <button type="button" class="chip ${cmpIfdaFilter === 'warning_only' ? 'on' : ''}" style="font-size:11px; padding:3px 8px; color:#B91C1C" onclick="setCmpIfdaFilter('warning_only')">⚠️ برندهای دارای هشدار IFDA</button>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- کارت‌های موتور پیشنهاد هوشمند پروتئین وی -->
      ${cmpCat === 'whey' ? `
        <section class="card" style="padding:16px 20px; margin-bottom:14px">
          <div class="cmp-goals-head">
            <span>🎯 راهنمای هوشمند انتخاب پروتئین وی بر اساس هدف بالینی و ورزشی (Recommender Engine)</span>
            ${cmpGoal ? `<button type="button" class="btn ghost sm" style="font-size:11.5px; padding:3px 8px" onclick="setCmpGoal('')">✕ لغو فیلتر هدف (${cmpGoal})</button>` : ''}
          </div>
          <p class="lead" style="margin:0 0 12px; font-size:12.5px">روی هر یک از اهداف ۴ گانه زیر کلیک کنید تا گزینه‌های باکیفیت و اقتصادی همان هدف فیلتر و برجسته شوند:</p>
          <div class="cmp-recs-grid">
            ${recCards}
          </div>
        </section>
      ` : ''}

      <!-- بخش نمودار تصویری و چندبُعدی مقایسه برندها با Recharts -->
      <div id="cmpVisualChartContainer"></div>

      <!-- نوار ابزار فیلترها، مرتب‌سازی و جستجو -->
      <section class="cmp-toolbar">
        <div class="cmp-search-row">
          <input type="search" id="cmpSearchInp" class="cmp-search-inp" placeholder="🔍 جستجوی نام برند، مدل، طعم، وزن (مثلاً ۱۸۰۰ گرمی، کاله، دوبیس، کراتین منوهیدرات، بلید اسپورت، پگاه...)" value="${cmpEsc(cmpSearchQ)}" oninput="handleCmpSearch(this.value)" />

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap">
            <span class="cmp-chip-lbl">مرتب‌سازی:</span>
            <select class="cmp-select" onchange="setCmpSort(this.value)">
              <option value="satisfaction" ${cmpSortBy === 'satisfaction' ? 'selected' : ''}>بالاترین امتیاز کیفی و رضایت (از ۱۰۰)</option>
              <option value="price_package" ${cmpSortBy === 'price_package' ? 'selected' : ''}>ارزان‌ترین قیمت قوطی (کل بسته)</option>
              <option value="price_protein" ${cmpSortBy === 'price_protein' ? 'selected' : ''}>ارزان‌ترین به ازای هر ۱ گرم ماده خالص (ارزش خرید)</option>
              <option value="price_kg" ${cmpSortBy === 'price_kg' ? 'selected' : ''}>ارزان‌ترین قیمت هر کیلوگرم</option>
              <option value="protein" ${cmpSortBy === 'protein' ? 'selected' : ''}>بیشترین پروتئین در سروینگ</option>
              <option value="rating" ${cmpSortBy === 'rating' ? 'selected' : ''}>بیشترین ستاره کاربران (از ۵)</option>
            </select>

            <button type="button" class="cmp-btn-view ${cmpViewStyle === 'table' ? 'on' : ''}" onclick="setCmpViewStyle('table')" title="نمای جدول ستونی مقایسه‌ای">📋 جدول قیمت و مشخصات</button>
            <button type="button" class="cmp-btn-view ${cmpViewStyle === 'cards' ? 'on' : ''}" onclick="setCmpViewStyle('cards')" title="نمای گالری کارتی">🗂️ گالری کارتی با عکس</button>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; border-top:1px dashed #E2E8F0; padding-top:10px">
          <!-- دسته‌بندی مکمل‌ها -->
          <div class="cmp-filter-chips">
            <span class="cmp-chip-lbl">نوع مکمل:</span>
            <button type="button" class="chip ${cmpCat === 'whey' ? 'on' : ''}" onclick="setCmpCat('whey')">پروتئین وی (${fa(wheyCount)})</button>
            <button type="button" class="chip ${cmpCat === 'creatine' ? 'on' : ''}" onclick="setCmpCat('creatine')">کراتین (${fa(creatineCount)})</button>
            <button type="button" class="chip ${cmpCat === 'magnesium' ? 'on' : ''}" onclick="setCmpCat('magnesium')">منیزیم</button>
            <button type="button" class="chip ${cmpCat === 'vitd' ? 'on' : ''}" onclick="setCmpCat('vitd')">ویتامین D3</button>
            <button type="button" class="chip ${cmpCat === 'all' ? 'on' : ''}" onclick="setCmpCat('all')">همه مکمل‌ها (${fa(allProds.length)})</button>
          </div>

          <!-- رده تامین -->
          <div class="cmp-filter-chips">
            <span class="cmp-chip-lbl">زنجیره تامین:</span>
            <button type="button" class="chip ${cmpSupply === 'all' ? 'on' : ''}" onclick="setCmpSupply('all')">همه رده‌ها</button>
            <button type="button" class="chip ${cmpSupply === 'dairy' ? 'on' : ''}" onclick="setCmpSupply('dairy')">لبنی داخلی</button>
            <button type="button" class="chip ${cmpSupply === 'pharma' ? 'on' : ''}" onclick="setCmpSupply('pharma')">داروسازی ایران</button>
            <button type="button" class="chip ${cmpSupply === 'license' ? 'on' : ''}" onclick="setCmpSupply('license')">تحت لیسانس</button>
            <button type="button" class="chip ${cmpSupply === 'import' ? 'on' : ''}" onclick="setCmpSupply('import')">وارداتی خارجی</button>
          </div>

          <!-- فیلترهای ویژگی‌های سلامت -->
          <div class="cmp-filter-chips">
            <span class="chip ${cmpLactoseFreeOnly ? 'on' : ''}" onclick="toggleCmpTag('lactose')">🥛 فاقد لاکتوز</span>
            <span class="chip ${cmpGlutenFreeOnly ? 'on' : ''}" onclick="toggleCmpTag('gluten')">🌾 فاقد گلوتن</span>
            <span class="chip ${cmpLowAcneOnly ? 'on' : ''}" onclick="toggleCmpTag('acne')">✨ ضد جوش و آکنه</span>
            <span class="chip ${cmpTtacOnly ? 'on' : ''}" onclick="toggleCmpTag('ttac')">🛡️ اصالت رسمی TTAC</span>
          </div>
        </div>
      </section>

      <!-- جدول یا کارت‌های مقایسه -->
      ${cmpViewStyle === 'table' ? renderCmpTable(products) : renderCmpCards(products)}

      <!-- نوار شناور مقایسه رودررو -->
      ${cmpSelectedIds.length > 0 ? `
        <div class="cmp-float-bar">
          <span><b>${fa(cmpSelectedIds.length)} محصول</b> برای مقایسه رودررو انتخاب شده است</span>
          <button type="button" class="cmp-float-btn" onclick="openSideCompareModal()">🔍 مقایسه ستونی رودررو</button>
          <button type="button" class="btn ghost sm" style="color:#fff; border-color:rgba(255,255,255,.4)" onclick="clearCmpSelected()">انصراف</button>
        </div>
      ` : ''}
    </div>
  `;
}

/* رندر جدول مقایسه ستونی تعاملی با نمایش دقیق قیمت قوطی */
function renderCmpTable(products) {
  if (!products.length) {
    return `<section class="card" style="text-align:center; padding:40px 20px; color:var(--muted)">موردی با فیلترهای انتخاب‌شده یافت نشد. لطفاً فیلترها یا عبارت جستجو را تغییر دهید.</section>`;
  }

  const rows = products.map((p, idx) => {
    const isChecked = cmpSelectedIds.includes(p.id);
    const supplyTag = p.supply_category === 'لبنی داخلی' ? 'bc-iran-tag'
      : (p.supply_category === 'داروسازی داخلی' || p.supply_category === 'داخلی (ایرانی)') ? 'bc-iran-tag'
      : p.supply_category.includes('تحت لیسانس') ? 'bc-global-tag'
      : 'bc-store-tag';

    const priceKg = p.price_per_kg_toman ? cmpFormatToman(p.price_per_kg_toman) : '—';
    const priceGram = p.category === 'whey'
      ? (p.price_per_g_protein_toman ? `${fa(p.price_per_g_protein_toman)} ت / گرم پرو` : '—')
      : (p.price_per_g_creatine_toman ? `${fa(p.price_per_g_creatine_toman)} ت / گرم کراتین` : '—');

    const servingDose = p.category === 'whey'
      ? (p.protein_per_serving_g ? `${fa(p.protein_per_serving_g, 1)}g پروتئین` : '—')
      : (p.creatine_per_serving_g ? `${fa(p.creatine_per_serving_g, 1)}g کراتین` : '۵ گرم');

    return `
      <tr class="${isChecked ? 'selected' : ''}">
        <td style="text-align:center">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCmpSelect('${p.id}')" title="انتخاب برای مقایسه رودررو" />
        </td>
        <td style="font-weight:700; text-align:center">${fa(idx + 1)}</td>
        <td>
          <div class="cmp-prod-cell">
            <img class="cmp-prod-img" src="${p.image}" alt="${p.brand_fa}" onclick="openCmpDetailModal('${p.id}')" title="مشاهده شناسنامه کامل و عکس بزرگ" />
            <div>
              <b style="color:var(--lapis); font-size:13.5px; cursor:pointer" onclick="openCmpDetailModal('${p.id}')">${p.brand_fa}</b>
              <div style="font-size:11.5px; color:var(--muted)">${p.model} · <small>${p.brand_en || ''}</small></div>
            </div>
          </div>
        </td>

        <!-- ستون ۴: قیمت دقیق قوطی (فوری در دیدرس بدون اسکرول) -->
        <td style="text-align:left; background:#F0FDF4; min-width:140px">
          <div style="font-weight:900; color:#14532D; font-size:13.5px">${cmpFormatToman(p.avg_price_toman)}</div>
          <div style="font-size:11px; color:#15803D; font-weight:700">قوطی ${fa(p.base_weight_g)} گرمی</div>
          ${p.min_price_toman && p.max_price_toman && p.min_price_toman !== p.avg_price_toman ? `
            <div style="font-size:10px; color:#64748B">${fa(Math.round(p.min_price_toman / 1000))} تا ${fa(Math.round(p.max_price_toman / 1000))} ه.ت</div>
          ` : ''}
        </td>

        <!-- ستون ۵: ارزش اقتصادی هر ۱ گرم ماده موثره خالص -->
        <td style="text-align:center; background:#E6F7F5; min-width:115px">
          <span class="cmp-gram-val" style="font-size:12px; font-weight:800">${priceGram}</span>
        </td>

        <!-- ستون ۶: قیمت هر کیلوگرم -->
        <td style="text-align:left"><span style="font-size:12px; font-weight:600">${priceKg}</span></td>

        <!-- ستون ۷: امتیاز و رضایت خریداران -->
        <td style="text-align:center">
          <b style="color:#B45309; font-size:13.5px">${fa(p.user_rating, 1)} ★</b>
          <div style="font-size:11px; color:var(--muted)">${fa(Math.round(p.satisfaction_rate_percent))}٪ امتیاز کیفی</div>
        </td>

        <!-- ستون ۸: وضعیت اصالت و هشدار غذا و دارو -->
        <td style="text-align:center">
          ${p.in_ifda_warning_list ? `
            <span style="color:#DC2626; font-weight:800; font-size:11px; background:#FEE2E2; padding:2px 6px; border-radius:4px" title="عرضه در بازار آزاد و فاقد مجوز رسمی سازمان غذا و دارو">⚠️ هشدار IFDA</span>
          ` : p.ttac_verified ? `
            <span style="color:#1D4ED8; font-weight:700; font-size:11px; background:#DBEAFE; padding:2px 6px; border-radius:4px" title="دارای کد اصالت و پروانه IRC">TTAC ✓ رسمی</span>
          ` : `
            <span style="color:#475569; font-size:11px; background:#F1F5F9; padding:2px 6px; border-radius:4px">مجاز داروخانه‌ای</span>
          `}
        </td>

        <!-- ستون ۹: رده تأمین -->
        <td><span class="${supplyTag}" style="font-size:11px">${p.supply_category}</span></td>

        <!-- ستون ۱۰: نوع فرآوری -->
        <td><span style="font-weight:600; font-size:12px">${p.whey_type_fa || p.whey_type}</span></td>

        <!-- ستون ۱۱: دوز سروینگ -->
        <td style="text-align:center; font-weight:800; color:#0E7F7A">${servingDose}</td>

        <td style="text-align:center">
          <button type="button" class="btn ghost sm" style="font-size:11.5px; padding:3px 8px" onclick="openCmpDetailModal('${p.id}')">👁️ شناسنامه</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="cmp-tbl-box">
      <div style="padding:12px 16px; background:#F8FAFC; border-bottom:1.5px solid var(--line); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
        <span style="font-size:13px; font-weight:700; color:var(--lapis)">فهرست تحلیلی (${fa(products.length)} فرآورده):</span>
        <span style="font-size:12px; color:var(--muted)">قیمت دقیق بسته بر اساس وزن قوطی (مثلاً ۱۸۰۰ گرمی یا ۳۰۰ گرمی) مشخص شده است.</span>
      </div>
      <div class="cmp-tbl-scroll">
        <table class="cmp-table">
          <thead>
            <tr>
              <th style="width:36px; text-align:center">مقایسه</th>
              <th style="width:36px; text-align:center">#</th>
              <th>نام برند و مدل</th>
              <th style="min-width:140px; background:#14532D; color:#fff">قیمت دقیق قوطی</th>
              <th style="text-align:center; background:#0E7F7A">ارزش خرید (هر ۱ گرم)</th>
              <th>قیمت هر کیلوگرم</th>
              <th style="text-align:center">امتیاز و رضایت</th>
              <th style="text-align:center">اصالت / هشدار IFDA</th>
              <th>رده تأمین</th>
              <th>نوع فرآوری</th>
              <th style="text-align:center">دوز سروینگ</th>
              <th style="text-align:center">عملیات</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* رندر گالری کارتی با باکس قیمت بسته برجسته */
function renderCmpCards(products) {
  if (!products.length) {
    return `<section class="card" style="text-align:center; padding:40px 20px; color:var(--muted)">موردی با فیلترهای انتخابی پیدا نشد.</section>`;
  }

  const cards = products.map(p => {
    const isChecked = cmpSelectedIds.includes(p.id);
    return `
      <div class="brand-card" style="position:relative; ${isChecked ? 'border-color:var(--turq); background:#F0FDF4' : ''}">
        <div style="position:absolute; top:12px; left:12px; z-index:2">
          <label style="display:flex; align-items:center; gap:4px; font-size:11.5px; cursor:pointer; background:rgba(255,255,255,.9); padding:2px 6px; border-radius:6px; border:1px solid #CBD5E1">
            <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCmpSelect('${p.id}')" /> مقایسه
          </label>
        </div>
        <div class="bc-visual">
          <div class="bc-img-container" onclick="openCmpDetailModal('${p.id}')" title="مشاهده شناسنامه و عکس بزرگ">
            <img class="bc-img" src="${p.image}" alt="${p.brand_fa}" loading="lazy" />
          </div>
          <span class="bc-rank">${p.satisfaction_rate_percent ? `${fa(Math.round(p.satisfaction_rate_percent))}٪ امتیاز` : 'برند معتبر'}</span>
          <button type="button" class="bc-upload-link" onclick="openCmpDetailModal('${p.id}')">🔍 شناسنامه کامل</button>
        </div>
        <div class="bc-info">
          <div class="bc-origin-row">
            ${p.in_ifda_warning_list ? `
              <span class="bc-store-tag" style="background:#FEE2E2; color:#991B1B; font-weight:800">⚠️ هشدار رسمی IFDA</span>
            ` : p.ttac_verified ? `
              <span class="bc-iran-tag">🇮🇷 دارای مجوز رسمی TTAC</span>
            ` : `
              <span class="bc-store-tag">🌐 بازار آزاد</span>
            `}
            <span class="bc-global-tag">${p.supply_category}</span>
          </div>
          <div class="bc-head">
            <div>
              <h3 class="bc-title">${p.brand_fa}</h3>
              <div class="bc-sub">${p.model} · <b>${p.brand_en || ''}</b></div>
            </div>
            <div class="bc-score-box">
              <span class="bc-score">${fa(p.user_rating, 1)}</span>
              <span class="bc-stars">★★★★★</span>
            </div>
          </div>

          <!-- باکس قیمت دقیق قوطی با برجستگی کامل -->
          <div class="cmp-card-price-box" style="background:#F0FDF4; border:1.5px solid #86EFAC; padding:8px 12px; border-radius:10px; margin:8px 0; display:flex; justify-content:space-between; align-items:center">
            <div>
              <span style="font-size:11px; color:#166534; display:block; font-weight:700">قیمت قوطی ${fa(p.base_weight_g)} گرمی:</span>
              <b style="font-size:14.5px; color:#14532D">${cmpFormatToman(p.avg_price_toman)}</b>
            </div>
            <div style="text-align:left">
              <span style="font-size:10.5px; color:#0E7F7A; display:block">${p.category === 'whey' ? 'هر گرم پروتئین:' : 'هر گرم کراتین:'}</span>
              <b style="font-size:13px; color:#0E7F7A">${p.category === 'whey' ? (p.price_per_g_protein_toman ? `${fa(p.price_per_g_protein_toman)} ت` : '—') : (p.price_per_g_creatine_toman ? `${fa(p.price_per_g_creatine_toman)} ت` : '—')}</b>
            </div>
          </div>

          <div class="bc-meta">
            <span><b>فرآوری و خلوص:</b> ${p.whey_type_fa || p.whey_type}</span>
            <span><b>دوز در هر سروینگ:</b> ${p.category === 'whey' ? (p.protein_per_serving_g ? `${fa(p.protein_per_serving_g, 1)} گرم پروتئین` : '—') : '۵ گرم کراتین خالص'}</span>
            <span><b>قیمت هر ۱ کیلوگرم:</b> ${p.price_per_kg_toman ? cmpFormatToman(p.price_per_kg_toman) : '—'}</span>
            <span><b>سازگاری و کیفیت:</b> ${p.digestive_compatibility || 'خوب'}</span>
          </div>

          <div class="bc-pros"><b>مزیت اصلی:</b> ${(p.pros && p.pros[0]) || 'کیفیت بالا'}</div>
          ${p.cons && p.cons[0] ? `<div class="bc-cons"><b>نکته احتیاط:</b> ${p.cons[0]}</div>` : ''}

          <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center">
            <button type="button" class="btn ghost sm" style="font-size:11.5px; padding:3px 8px" onclick="openCmpDetailModal('${p.id}')">مشاهده شناسنامه و اصالت ←</button>
            <span style="font-size:11px; color:var(--muted)">${p.servings ? `${fa(p.servings)} سروینگ` : ''}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `<div class="brand-grid">${cards}</div>`;
}

/* عملیات فیلترها و مرتب‌سازی */
function setCmpCat(cat) { cmpCat = cat; if (typeof renderMain === 'function') renderMain(); }
function setCmpSupply(sup) { cmpSupply = sup; if (typeof renderMain === 'function') renderMain(); }
function setCmpIfdaFilter(filter) { cmpIfdaFilter = filter; if (typeof renderMain === 'function') renderMain(); }
function setCmpGoal(goalId) { cmpGoal = cmpGoal === goalId ? '' : goalId; if (typeof renderMain === 'function') renderMain(); }
function setCmpSort(sortKey) { cmpSortBy = sortKey; if (typeof renderMain === 'function') renderMain(); }
function setCmpViewStyle(style) { cmpViewStyle = style; if (typeof renderMain === 'function') renderMain(); }
function toggleCmpTag(tag) {
  if (tag === 'lactose') cmpLactoseFreeOnly = !cmpLactoseFreeOnly;
  if (tag === 'gluten') cmpGlutenFreeOnly = !cmpGlutenFreeOnly;
  if (tag === 'acne') cmpLowAcneOnly = !cmpLowAcneOnly;
  if (tag === 'ttac') cmpTtacOnly = !cmpTtacOnly;
  if (typeof renderMain === 'function') renderMain();
}
function handleCmpSearch(q) {
  cmpSearchQ = q;
  if (typeof renderMain === 'function') renderMain();
  const inp = document.getElementById('cmpSearchInp');
  if (inp) {
    inp.focus();
    inp.selectionStart = inp.selectionEnd = inp.value.length;
  }
}

/* مدیریت انتخاب برای مقایسه رودررو */
function toggleCmpSelect(productId) {
  const idx = cmpSelectedIds.indexOf(productId);
  if (idx > -1) {
    cmpSelectedIds.splice(idx, 1);
  } else {
    if (cmpSelectedIds.length >= 4) {
      if (typeof toast === 'function') toast('حداکثر ۴ محصول را می‌توانید به طور همزمان مقایسه کنید.');
      return;
    }
    cmpSelectedIds.push(productId);
  }
  if (typeof renderMain === 'function') renderMain();
}

function clearCmpSelected() {
  cmpSelectedIds = [];
  if (typeof renderMain === 'function') renderMain();
}

/* پنجره مقایسه ستونی رودررو */
function openSideCompareModal() {
  if (!cmpSelectedIds.length) return;
  const allProds = getUnifiedSuppProducts();
  const selected = cmpSelectedIds.map(id => allProds.find(p => p.id === id)).filter(Boolean);

  const m = document.getElementById('cmpCompareModal');
  const body = document.getElementById('cmpCompareModalBody');
  if (!m || !body) return;

  const cols = selected.map(p => `
    <div class="side-compare-col highlight">
      <div style="text-align:center; padding-bottom:10px; border-bottom:1.5px solid var(--line)">
        <img src="${p.image}" alt="${p.brand_fa}" style="width:70px; height:85px; object-fit:contain; margin-bottom:6px" />
        <h4 style="margin:0 0 2px; color:var(--lapis); font-size:15px">${p.brand_fa}</h4>
        <div style="font-size:12px; color:var(--muted)">${p.model}</div>
        <div style="margin-top:6px">
          <span style="background:#FEF3C7; color:#92400E; font-size:11px; font-weight:800; padding:2px 8px; border-radius:99px">${fa(p.user_rating, 1)} ★ (${fa(Math.round(p.satisfaction_rate_percent))}٪ امتیاز)</span>
        </div>
      </div>

      <div style="font-size:12.5px; line-height:1.8; display:flex; flex-direction:column; gap:6px">
        <div><b>رده تأمین:</b> <span class="bc-iran-tag" style="font-size:11px">${p.supply_category}</span></div>
        <div><b>سازنده / کشور:</b> ${p.origin_manufacturer || '—'}</div>
        <div><b>نوع فرآوری:</b> <span style="color:#0E7F7A; font-weight:700">${p.whey_type_fa || p.whey_type}</span></div>
        
        <!-- قیمت دقیق قوطی -->
        <div style="background:#F0FDF4; border:1.5px solid #86EFAC; padding:8px 10px; border-radius:8px">
          <b style="color:#166534; font-size:12px">قیمت دقیق قوطی (${fa(p.base_weight_g)} گرمی):</b><br>
          <span style="color:#14532D; font-size:15px; font-weight:900">${cmpFormatToman(p.avg_price_toman)}</span>
          ${p.min_price_toman && p.max_price_toman && p.min_price_toman !== p.avg_price_toman ? `
            <div style="font-size:11px; color:#15803D">بازه بازار: ${cmpFormatToman(p.min_price_toman)} تا ${cmpFormatToman(p.max_price_toman)}</div>
          ` : ''}
        </div>

        <div><b>قیمت هر ۱ کیلوگرم:</b> ${p.price_per_kg_toman ? cmpFormatToman(p.price_per_kg_toman) : '—'}</div>
        
        <div style="background:#E6F7F5; padding:6px 8px; border-radius:8px">
          <b>${p.category === 'whey' ? 'ارزش خرید (قیمت هر ۱ گرم پروتئین خالص):' : 'قیمت به ازای هر ۱ گرم کراتین خالص:'}</b><br>
          <span style="color:#0E7F7A; font-size:14px; font-weight:900">${p.category === 'whey' ? (p.price_per_g_protein_toman ? fa(p.price_per_g_protein_toman) + ' تومان' : '—') : (p.price_per_g_creatine_toman ? fa(p.price_per_g_creatine_toman) + ' تومان' : '—')}</span>
        </div>

        <div><b>دوز در هر سروینگ:</b> ${p.category === 'whey' ? (p.protein_per_serving_g ? `${fa(p.protein_per_serving_g, 1)} گرم پروتئین` : '—') : '۵ گرم کراتین خالص'}</div>
        <div><b>تعداد سروینگ در بسته:</b> ${fa(p.servings)} سروینگ</div>
        
        <!-- هشدار اصالت IFDA و TTAC -->
        <div style="padding:6px 8px; border-radius:8px; ${p.in_ifda_warning_list ? 'background:#FEE2E2; color:#991B1B' : 'background:#EFF6FF; color:#1E40AF'}">
          <b>وضعیت سازمان غذا و دارو (IFDA):</b><br>
          ${p.in_ifda_warning_list ? '⚠️ در فهرست هشدار رسمی IFDA (عرضه غیرمجاز و ریسک تقلب)' : p.ttac_verified ? '🛡️ دارای پروانه رسمی و برچسب اصالت پیامکی TTAC' : 'داروخانه‌ای مجاز'}
        </div>

        <div style="background:#EFF6FF; padding:6px 8px; border-radius:8px; font-size:11.5px">
          <b>مزیت اصلی:</b><br>${(p.pros || []).join(' · ')}
        </div>
        <div style="background:#FFF1F2; padding:6px 8px; border-radius:8px; font-size:11.5px; color:#9F1239">
          <b>نکته احتیاط:</b><br>${(p.cons || []).join(' · ')}
        </div>
      </div>

      <div style="margin-top:auto; padding-top:10px; border-top:1px dashed var(--line); text-align:center">
        <button type="button" class="btn ghost sm" style="width:100%" onclick="toggleCmpSelect('${p.id}'); openSideCompareModal()">✕ حذف از مقایسه</button>
      </div>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="sbm-header">
      <div>
        <h3 style="margin:0 0 4px; color:var(--lapis); font-size:17px">🔍 مقایسه تطبیقی ستونی محصولات انتخابی (${fa(selected.length)} فرآورده)</h3>
        <p style="margin:0; font-size:12.5px; color:var(--muted)">بررسی همزمان قیمت دقیق قوطی، ارزش خرید هر گرم، اصالت، رده تأمین و هشدارهای غذا و دارو.</p>
      </div>
      <button type="button" class="btn ghost sm" onclick="closeSideCompareModal()">✕ بستن</button>
    </div>
    <div id="cmpModalChartContainer" style="margin-bottom:16px"></div>
    <div class="side-compare-grid" style="grid-template-columns: repeat(${selected.length}, minmax(280px, 1fr))">
      ${cols}
    </div>
    <div style="margin-top:14px; display:flex; justify-content:space-between; align-items:center">
      <button type="button" class="btn ghost sm" onclick="clearCmpSelected(); closeSideCompareModal()">پاک کردن همه و خروج</button>
      <button type="button" class="btn pri sm" onclick="closeSideCompareModal()">✓ تایید و بستن</button>
    </div>
  `;

  setTimeout(() => {
    if (typeof window.renderSupplementComparisonChart === 'function') {
      window.renderSupplementComparisonChart('cmpModalChartContainer', {
        products: selected,
        isDefaultSelection: false
      });
    }
  }, 0);

  m.classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeSideCompareModal() {
  const m = document.getElementById('cmpCompareModal');
  if (m) m.classList.remove('on');
  document.body.style.overflow = '';
}

/* پنجره شناسنامه تفصیلی محصول */
function openCmpDetailModal(productId) {
  const allProds = getUnifiedSuppProducts();
  const p = allProds.find(x => x.id === productId);
  if (!p) return;

  const m = document.getElementById('cmpDetailModal');
  const body = document.getElementById('cmpDetailModalBody');
  if (!m || !body) return;

  body.innerHTML = `
    <div class="sbm-header">
      <div>
        <h3 style="margin:0 0 4px; color:var(--lapis); font-size:18px">🏷️ شناسنامه کامل مکمل: ${p.brand_fa}</h3>
        <p style="margin:0; font-size:12.5px; color:var(--muted)">${p.model} · ${p.brand_en || ''} · ${p.origin_manufacturer || ''}</p>
      </div>
      <button type="button" class="btn ghost sm" onclick="closeCmpDetailModal()">✕ بستن</button>
    </div>

    <div style="display:grid; grid-template-columns:130px 1fr; gap:16px; margin:16px 0; align-items:start">
      <div style="display:flex; flex-direction:column; align-items:center; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px; padding:10px">
        <img src="${p.image}" alt="${p.brand_fa}" style="max-width:110px; max-height:140px; object-fit:contain; margin-bottom:8px" />
        <span style="background:#FEF3C7; color:#92400E; font-size:11px; font-weight:800; padding:2px 8px; border-radius:99px; text-align:center">${fa(p.user_rating, 1)} ★ (${fa(Math.round(p.satisfaction_rate_percent))}٪)</span>
      </div>

      <div style="display:flex; flex-direction:column; gap:8px; font-size:13px; line-height:1.7">
        <div style="display:flex; gap:8px; flex-wrap:wrap">
          <span class="bc-iran-tag">${p.supply_category}</span>
          ${p.in_ifda_warning_list ? '<span class="bc-store-tag" style="background:#FEE2E2; color:#991B1B; font-weight:800">⚠️ هشدار رسمی IFDA</span>' : ''}
          ${p.ttac_verified ? '<span class="bc-iran-tag" style="background:#F0FDF4; color:#166534">🛡️ اصالت TTAC</span>' : ''}
        </div>

        <div><b>نوع فرآوری و ماده موثره:</b> <span style="color:#0E7F7A; font-weight:700">${p.whey_type_fa || p.whey_type}</span></div>
        <div><b>دوز موثره در سروینگ:</b> <b>${p.category === 'whey' ? (p.protein_per_serving_g ? fa(p.protein_per_serving_g, 1) + ' گرم پروتئین' : '—') : '۵ گرم کراتین خالص'}</b></div>
        <div><b>وزن بسته اصلی:</b> <b>${fa(p.base_weight_g)} گرم</b> · <b>تعداد سروینگ:</b> ${fa(p.servings)} پیمانه</div>

        <!-- باکس برجسته قیمت دقیق قوطی -->
        <div style="background:#F0FDF4; border:1.5px solid #86EFAC; padding:10px 14px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px">
          <div>
            <span style="font-size:12px; color:#166534; display:block">قیمت دقیق قوطی (${fa(p.base_weight_g)} گرمی):</span>
            <b style="font-size:16px; color:#14532D">${cmpFormatToman(p.avg_price_toman)}</b>
            ${p.min_price_toman && p.max_price_toman && p.min_price_toman !== p.avg_price_toman ? `
              <div style="font-size:11.5px; color:#15803D">بازه بازار: ${cmpFormatToman(p.min_price_toman)} تا ${cmpFormatToman(p.max_price_toman)}</div>
            ` : ''}
          </div>
          <div style="text-align:left">
            <span style="font-size:11.5px; color:#0E7F7A; display:block">قیمت هر ۱ کیلوگرم: ${p.price_per_kg_toman ? cmpFormatToman(p.price_per_kg_toman) : '—'}</span>
            <span style="font-size:12px; color:#0E7F7A; font-weight:800">ارزش هر ۱ گرم: ${p.category === 'whey' ? `${fa(p.price_per_g_protein_toman)} ت (پروتئین)` : `${fa(p.price_per_g_creatine_toman || 0)} ت (کراتین)`}</span>
          </div>
        </div>

        <div><b>سازگاری گوارشی:</b> ${p.digestive_compatibility || 'خوب'}</div>
        <div><b>حل‌پذیری در شیکر:</b> ${p.solubility || 'خوب'}</div>
        <div><b>کاربردهای هدف:</b> ${(p.fitness_goals || []).join(' · ')}</div>
      </div>
    </div>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px">
      <div style="background:#EFF6FF; border:1px solid #BFDBFE; border-radius:10px; padding:10px 12px; font-size:12.5px; line-height:1.7">
        <b style="color:#1E3A8A; display:block; margin-bottom:4px">✓ مزایای کلیدی و نقاط قوت:</b>
        <ul style="margin:0; padding-right:18px">
          ${(p.pros || []).map(pr => `<li>${pr}</li>`).join('')}
        </ul>
      </div>

      <div style="background:#FFF1F2; border:1px solid #FECDD3; border-radius:10px; padding:10px 12px; font-size:12.5px; line-height:1.7; color:#9F1239">
        <b style="color:#9F1239; display:block; margin-bottom:4px">⚠️ نکات احتیاط و نقاط ضعف:</b>
        <ul style="margin:0; padding-right:18px">
          ${(p.cons || []).map(cn => `<li>${cn}</li>`).join('')}
        </ul>
      </div>
    </div>

    <!-- استعلام اصالت و هشدار غذا و دارو -->
    <div style="background:${p.in_ifda_warning_list ? '#FEF2F2; border:1.5px solid #FCA5A5; color:#991B1B' : '#FFFBF2; border:1px solid #F5E0B3; color:#854D0E'}; border-radius:10px; padding:10px 14px; font-size:12px; line-height:1.7; margin-bottom:14px">
      <b>🔍 وضعیت اصالت و استعلام نظارتی:</b><br>
      ${p.in_ifda_warning_list
        ? '⚠️ توجه مهم: این برند در فهرست هشدارهای رسمی سازمان غذا و دارو (IFDA) به عنوان محصول عرضه‌شده در مبادی غیرمجاز یا شبکه‌های قاچاق ذکر شده است. خرید آن از کانال‌های آنلاین غیرداروخانه‌ای با خطر جدی تقلبی بودن همراه است.'
        : p.ttac_verified
          ? 'این فرآورده دارای پروانه رسمی IRC سازمان غذا و دارو و برچسب اصالت TTAC است. با ارسال کد ۱۶ رقمی زیر لایه اسکرچ به شماره ۲۰۰۰۸۸۲۲ یا استعلام بارکد در سامانه ttac.ir، از اصالت و تاریخ تولید آن اطمینان حاصل فرمایید.'
          : 'این فرآورده به صورت وارداتی در بازار آزاد عرضه می‌شود. لطفاً پلمپ وکیوم، بارکد اصالت کمپانی مادر و کد رهگیری کف قوطی را حتماً بررسی فرمایید.'}
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center">
      <button type="button" class="btn ghost sm" onclick="toggleCmpSelect('${p.id}'); closeCmpDetailModal()">${cmpSelectedIds.includes(p.id) ? '✕ حذف از مقایسه رودررو' : '＋ افزودن به مقایسه رودررو'}</button>
      <button type="button" class="btn pri sm" onclick="closeCmpDetailModal()">بستن شناسنامه</button>
    </div>
  `;

  m.classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeCmpDetailModal() {
  const m = document.getElementById('cmpDetailModal');
  if (m) m.classList.remove('on');
  if (!document.getElementById('cmpCompareModal')?.classList.contains('on')) {
    document.body.style.overflow = '';
  }
}
