import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

// Load the source files into a sandbox context to test pure engine calculations
const root = path.resolve('spartina_source');
const rawFoods = fs.readFileSync(path.join(root, 'data/foods.json'), 'utf8').replace(/^\uFEFF/, '').trim();
const foods = JSON.parse(rawFoods);
const metaCode = fs.readFileSync(path.join(root, 'src/meta.js'), 'utf8');
const suppDataCode = fs.readFileSync(path.join(root, 'src/supplements_data.js'), 'utf8');
const contentCode = fs.readFileSync(path.join(root, 'src/content.js'), 'utf8');
const engineCode = fs.readFileSync(path.join(root, 'src/engine.js'), 'utf8');
const tibbCode = fs.readFileSync(path.join(root, 'src/tibb.js'), 'utf8');
const compareCode = fs.readFileSync(path.join(root, 'src/compare.js'), 'utf8');

const context = {
  FOODS: foods,
  console,
  Math,
  Date,
  Set,
  Map,
  Array,
  Object,
  String,
  Number,
  Boolean,
  RegExp,
  JSON,
  document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  },
  window: {},
};
vm.createContext(context);
vm.runInContext(metaCode, context);
vm.runInContext(suppDataCode, context);
vm.runInContext(contentCode, context);
vm.runInContext(engineCode, context);
vm.runInContext(tibbCode, context);
vm.runInContext(compareCode, context);

test('CKD-EPI 2021 eGFR calculations', () => {
  const { egfrCKDEPI } = context as any;
  
  // Normal male, Cr = 1.0, age = 40
  const egfrMale = egfrCKDEPI(1.0, 40, 'm');
  assert.ok(egfrMale > 80 && egfrMale < 120, `eGFR should be normal: ${egfrMale}`);

  // Normal female, Cr = 0.8, age = 30
  const egfrFemale = egfrCKDEPI(0.8, 30, 'f');
  assert.ok(egfrFemale > 80 && egfrFemale < 130, `eGFR should be normal: ${egfrFemale}`);

  // High creatinine indicating impairment (Cr = 2.5, age = 60)
  const egfrImpaired = egfrCKDEPI(2.5, 60, 'm');
  assert.ok(egfrImpaired < 40, `eGFR should indicate renal impairment: ${egfrImpaired}`);

  // Null input handling
  assert.equal(egfrCKDEPI(null, 40, 'm'), null);
  assert.equal(egfrCKDEPI(1.0, null, 'm'), null);
});

test('treatmentPhase correctly calculates phase from dose and week', () => {
  const { treatmentPhase } = context as any;
  
  // Start phase (2.5 mg)
  const pStart = treatmentPhase({ dose: 2.5, doseWeek: 1 });
  assert.equal(pStart.key, 'start');
  assert.equal(pStart.dose, 2.5);

  // Escalation phase (dose > 2.5, week <= 2)
  const pEsc = treatmentPhase({ dose: 5, doseWeek: 2 });
  assert.equal(pEsc.key, 'escalation');

  // Steady phase (dose 5 or 7.5, week > 2)
  const pSteady = treatmentPhase({ dose: 5, doseWeek: 4 });
  assert.equal(pSteady.key, 'steady');

  // High dose (10, 12.5, 15)
  const pHigh = treatmentPhase({ dose: 10, doseWeek: 6 });
  assert.equal(pHigh.key, 'high');
});

test('computeTargets calculates Spartina diet macronutrients and limits', () => {
  const { computeTargets } = context as any;

  const patient = {
    prog: 'sp',
    name: 'تست بیمار',
    age: 35,
    sex: 'f',
    height: 165,
    weight: 85,
    activity: 1, // light
    dose: 5,
    doseWeek: 4,
    side: {},
    hx: {},
    labs: {},
  };

  const targets = computeTargets(patient);
  assert.ok(targets.kcal >= 1200, 'Minimum floor for females is 1200 kcal');
  assert.ok(targets.prot >= 50, 'Protein target should meet requirement');
  assert.ok(targets.fat > 20, 'Healthy fat target');
  assert.ok(targets.carb > 100, 'Carbohydrates meet metabolic minimums');
  assert.ok(targets.water >= 2000, 'Adequate hydration');
});

test('computeTargetsBB calculates Bodybuilding Cut, Recomp, and Bulk targets', () => {
  const { computeTargetsBB } = context as any;

  const baseBB = {
    prog: 'bb',
    age: 26,
    sex: 'm',
    height: 180,
    weight: 80,
    activity: 2, // moderate
    bb: {
      goal: 'cut',
      bf: 15,
      days: [0, 2, 4],
      time: 'afternoon',
      sup: { whey: true, creatine: true },
    },
    hx: {},
    labs: {},
  };

  // Cut goal
  const cutTargets = computeTargetsBB(baseBB);
  assert.equal(cutTargets.goal, 'cut');
  assert.ok(cutTargets.prot >= 80 * 2.0, 'Bodybuilding cut requires high protein');

  // Bulk goal
  const bulkBB = { ...baseBB, bb: { ...baseBB.bb, goal: 'bulk' } };
  const bulkTargets = computeTargetsBB(bulkBB);
  assert.equal(bulkTargets.goal, 'bulk');
  assert.ok(bulkTargets.kcal > cutTargets.kcal, 'Bulk calories should exceed Cut calories');
});

test('Mizaj traditional Iranian medicine scores', () => {
  const mizajScore = vm.runInContext('mizajScore', context);
  const MIZAJ_Q = vm.runInContext('MIZAJ_Q', context);
  
  // Neutral questionnaire: answer all active questions with value 5
  const neutralAnswers: Record<string, number> = {};
  MIZAJ_Q.forEach((q: any) => {
    neutralAnswers[q.id] = 5;
  });
  const score = mizajScore(neutralAnswers);
  assert.ok(score, 'Mizaj score object returned');
  assert.equal(score.H, 'mid');
  assert.equal(score.W, 'mid');
  assert.equal(score.key, 'mid-mid');
  assert.equal(score.hot, 50);
  assert.equal(score.wet, 50);

  // Hot & Dry questionnaire: answer hot questions with 10, dry with 0
  const hotDryAnswers: Record<string, number> = {};
  MIZAJ_Q.forEach((q: any) => {
    if (q.ax === 'h') hotDryAnswers[q.id] = 10;
    if (q.ax === 'w') hotDryAnswers[q.id] = 0;
  });
  const hotDryScore = mizajScore(hotDryAnswers);
  assert.ok(hotDryScore);
  assert.equal(hotDryScore.H, 'hot');
  assert.equal(hotDryScore.W, 'dry');
  assert.equal(hotDryScore.key, 'hot-dry');
});

test('Supplement brands and ratings database integrity', () => {
  const SUPP_BRANDS = vm.runInContext('SUPP_BRANDS', context);
  const SUPP_CATEGORIES = vm.runInContext('SUPP_CATEGORIES', context);
  const suppBrandSvg = vm.runInContext('suppBrandSvg', context);
  const getBrandImg = vm.runInContext('getBrandImg', context);
  const suppBrandImgTag = vm.runInContext('suppBrandImgTag', context);

  assert.ok(Array.isArray(SUPP_BRANDS) && SUPP_BRANDS.length >= 20, 'At least 20 verified supplement brands');
  assert.ok(Array.isArray(SUPP_CATEGORIES) && SUPP_CATEGORIES.length >= 10, 'At least 10 supplement categories');

  // Verify Iranian brands category and Magnesium category exist
  assert.ok(SUPP_CATEGORIES.some((c: any) => c.id === 'iranian'), 'Category iranian must exist');
  assert.ok(SUPP_CATEGORIES.some((c: any) => c.id === 'magnesium'), 'Category magnesium must exist');

  // Verify Iranian pharmacy brands representation
  const iranianBrands = SUPP_BRANDS.filter((b: any) => b.isIranian);
  assert.ok(iranianBrands.length >= 12, `Must have at least 12 Iranian brands, found ${iranianBrands.length}`);
  iranianBrands.forEach((b: any) => {
    assert.ok(b.darukadeScore, `Iranian brand ${b.id} must have darukadeScore`);
  });

  // Verify all brands have valid ratings (between 3.5 and 5.0), rank >= 1, and image container support
  SUPP_BRANDS.forEach((b: any) => {
    assert.ok(b.id, 'Brand must have id');
    assert.ok(b.nameFa, 'Brand must have Persian name');
    assert.ok(b.nameEn, 'Brand must have English name');
    assert.ok(b.score >= 3.5 && b.score <= 5.0, `Score out of range: ${b.score}`);
    assert.ok(b.rank >= 1 && b.rank <= 10, `Rank out of range: ${b.rank}`);
    assert.ok(['S', 'A', 'B'].includes(b.tier), `Tier invalid: ${b.tier}`);

    // Verify brand has image property and getBrandImg returns valid URI
    const imgUri = getBrandImg(b);
    assert.ok(imgUri && (imgUri.startsWith('data:image/') || imgUri.startsWith('http')), `Image URI must be valid: ${b.id}`);

    // Verify suppBrandImgTag produces valid img tag
    const tag = suppBrandImgTag(b);
    assert.ok(tag.startsWith('<img') && tag.includes('src=') && tag.includes('alt='), 'Valid img tag produced');

    // Verify SVG generator produces valid SVG markup
    const svg = suppBrandSvg(b, 80, 100);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), 'Valid SVG markup generated');
    assert.ok(svg.includes('SCORE') || svg.includes('امتیاز') || svg.includes('★'), 'SVG reflects rating visual');
  });
});

test('Meal item removal and dynamic calorie recalculation', () => {
  const { generatePlan, computeTargets, dayTotals, mealTotals } = context as any;

  const patient = {
    prog: 'sp',
    name: 'تست حذف قلم غذایی',
    age: 32,
    sex: 'f',
    height: 165,
    weight: 78,
    activity: 1,
    dose: 5,
    doseWeek: 4,
    side: {},
    hx: {},
    labs: {},
  };

  const targets = computeTargets(patient);
  const plan = generatePlan(patient, targets);
  const day0 = plan.days[0];
  const meal0 = day0.meals[0]; // breakfast
  const initialCount = meal0.items.length;
  assert.ok(initialCount >= 2, 'Breakfast has at least two items');

  const initialMealTotals = mealTotals(meal0.items);
  const initialDayTotals = dayTotals(day0);

  // Remove first item (e.g. tea, bread, or cheese)
  const removedItem = meal0.items[0];
  meal0.items.splice(0, 1);

  assert.equal(meal0.items.length, initialCount - 1, 'Item successfully removed from meal');
  const newMealTotals = mealTotals(meal0.items);
  const newDayTotals = dayTotals(day0);

  // Recalculated calories must be less than or equal to initial calories
  assert.ok(newMealTotals.kcal <= initialMealTotals.kcal, 'Meal calories reduced or equal');
  assert.ok(newDayTotals.kcal <= initialDayTotals.kcal, 'Day calories reduced or equal');
});

test('WHEY_DATABASE integrity and completeness', () => {
  const WHEY_DATABASE = vm.runInContext('WHEY_DATABASE', context);

  assert.ok(WHEY_DATABASE, 'WHEY_DATABASE must exist');
  assert.equal(WHEY_DATABASE.products.length, 30, 'Must have exactly 30 whey protein products');

  // Verify fields on every product
  WHEY_DATABASE.products.forEach((p: any) => {
    assert.ok(p.id, `Product missing id: ${JSON.stringify(p)}`);
    assert.ok(p.brand_fa, `Product missing brand_fa: ${p.id}`);
    assert.ok(p.base_weight_g > 0, `Invalid package weight: ${p.id}`);
    assert.ok(p.avg_price_toman > 0, `Invalid price: ${p.id}`);
    assert.ok(p.protein_per_serving_g > 0, `Invalid protein per serving: ${p.id}`);
    assert.ok(p.price_per_g_protein_toman > 0, `Invalid price per gram protein: ${p.id}`);
    assert.ok(p.satisfaction_rate_percent >= 50 && p.satisfaction_rate_percent <= 100, `Satisfaction rate out of bounds: ${p.id}`);
    assert.ok(p.user_rating >= 3.0 && p.user_rating <= 5.0, `User rating out of bounds: ${p.id}`);
  });

  // Verify recommender engine rules
  assert.ok(Array.isArray(WHEY_DATABASE.recommender_engine), 'recommender_engine must be an array');
  const rules = WHEY_DATABASE.recommender_engine;
  assert.equal(rules.length, 4, 'Must have 4 recommender rules');
  const ruleIds = rules.map((r: any) => r.rule_id);
  assert.equal(ruleIds.join(','), 'REC-01,REC-02,REC-03,REC-04');
});

test('CREATINE_DATABASE integrity and IFDA warnings', () => {
  const CREATINE_DATABASE = vm.runInContext('CREATINE_DATABASE', context);

  assert.ok(CREATINE_DATABASE, 'CREATINE_DATABASE must exist');
  assert.equal(CREATINE_DATABASE.brands.length, 77, 'Must have 77 creatine brands');
  
  const scored = CREATINE_DATABASE.brands.filter((b: any) => b.score_0_100 !== null);
  assert.equal(scored.length, 31, 'Must have exactly 31 scored brands');

  assert.ok(CREATINE_DATABASE.regulatory_warning, 'Regulatory warning must exist');
  assert.equal(CREATINE_DATABASE.regulatory_warning.brands.length, 41, 'Must have 41 IFDA warning brands');

  // Verify fields on every brand
  CREATINE_DATABASE.brands.forEach((b: any) => {
    assert.ok(b.id, `Brand missing id: ${b.brand_en}`);
    assert.ok(b.brand_fa, `Brand missing brand_fa: ${b.id}`);
    assert.ok(b.package_weight_g > 0, `Invalid package weight: ${b.id}`);
    assert.ok(b.avg_price_toman > 0, `Invalid price: ${b.id}`);
    assert.ok(b.price_per_g_creatine_toman > 0, `Invalid price per gram creatine: ${b.id}`);
    assert.ok(typeof b.in_ifda_warning_list === 'boolean', `in_ifda_warning_list must be boolean: ${b.id}`);
  });
});

test('exact package price formatting and labels', () => {
  const cmpFormatToman = vm.runInContext('cmpFormatToman', context);
  const cmpPackagePriceLabel = vm.runInContext('cmpPackagePriceLabel', context);

  const price1 = cmpFormatToman(8800000);
  assert.ok(price1.includes('۸٬۸۰۰٬۰۰۰') || price1.includes('۸,۸۰۰,۰۰۰'), `Formatted price must include thousands separators: ${price1}`);
  assert.ok(price1.includes('تومان'), `Formatted price must include Toman currency: ${price1}`);

  const label1800 = cmpPackagePriceLabel({ base_weight_g: 1800, avg_price_toman: 8800000 });
  assert.ok(label1800.includes('۱٬۸۰۰') || label1800.includes('۱۸۰۰'), `Must include package weight: ${label1800}`);
  assert.ok(label1800.includes('۸٬۸۰۰٬۰۰۰') || label1800.includes('۸,۸۰۰,۰۰۰'), `Must include formatted exact price: ${label1800}`);

  const label300 = cmpPackagePriceLabel({ package_weight_g: 300, avg_price_toman: 1437300 });
  assert.ok(label300.includes('قوطی ۳۰۰ گرمی') || label300.includes('۳۰۰'), `Must include 300g weight: ${label300}`);
  assert.ok(label300.includes('۱٬۴۳۷٬۳۰۰') || label300.includes('۱,۴۳۷,۳۰۰'), `Must include 1,437,300 price: ${label300}`);
});

test('creatine comparison view and IFDA filter', () => {
  vm.runInContext("setCmpCat('creatine')", context);
  const compareView = vm.runInContext('compareView', context);
  const html = compareView();

  assert.ok(html.includes('هشدار رسمی سازمان غذا و دارو (IFDA)'), 'IFDA warning section present in creatine view');
  assert.ok(html.includes('قیمت دقیق قوطی'), 'Exact package price column present');
  assert.ok(html.includes('سی پی ان') || html.includes('CPN'), 'Top creatine brand CPN present');
  assert.ok(html.includes('یوروویتال') || html.includes('Euro Vital'), 'Top creatine brand Euro Vital present');
  assert.ok(html.includes('بلید اسپورت') || html.includes('Blade Sport'), 'Top creatine brand Blade Sport present');
  assert.ok(html.includes('قوطی ۳۰۰ گرمی') || html.includes('قوطی ۲۵۰ گرمی'), 'Container weight present in table');
});

test('visual comparison chart container and update function', () => {
  const compareView = vm.runInContext('compareView', context);
  const html = compareView();

  assert.ok(html.includes('id="cmpVisualChartContainer"'), 'Visual chart container must be present in compareView');

  const updateCmpVisualChart = vm.runInContext('updateCmpVisualChart', context);
  assert.equal(typeof updateCmpVisualChart, 'function', 'updateCmpVisualChart must be a defined function');
});

test('Bodybuilding custom food selection prioritizes specified staple foods', () => {
  const { computeTargetsBB, generatePlan } = context as any;

  // Patient selects a strict classic bodybuilding food basket:
  const selectedFoods = ['F01', 'F10', 'F22', 'F24', 'F40', 'N12', 'F29']; // Chicken, egg whites, rice, oats, peanut butter, broccoli, banana
  const patient = {
    prog: 'bb',
    name: 'تست بدنسازی با غذای انتخابی',
    age: 28,
    sex: 'm',
    height: 182,
    weight: 84,
    activity: 2,
    bb: {
      goal: 'cut',
      days: [0, 2, 4],
      time: 'afternoon',
      foods: selectedFoods
    },
    hx: {},
    labs: {}
  };

  const targets = computeTargetsBB(patient);
  assert.ok(targets.kcal > 1800, 'Adequate calories for athlete');
  assert.ok(targets.prot >= 84 * 2.0, 'High protein target for bodybuilding cut');

  const plan = generatePlan(patient, targets);
  assert.equal(plan.days.length, 7, 'Plan has 7 days');

  const allUsedFoodIds = new Set<string>();
  plan.days.forEach((day: any) => {
    day.meals.forEach((meal: any) => {
      meal.items.forEach((item: any) => {
        allUsedFoodIds.add(item.id);
      });
    });
  });

  // Verify that all core selected foods appear in the generated plan
  const matchedCount = selectedFoods.filter(fid => allUsedFoodIds.has(fid)).length;
  assert.equal(matchedCount, selectedFoods.length, `All ${selectedFoods.length} selected foods should appear in the plan`);

  // Verify that chicken (F01) and rice (F22) or oats (F24) are prominently present
  assert.ok(allUsedFoodIds.has('F01'), 'Chicken breast is used');
  assert.ok(allUsedFoodIds.has('F22'), 'Rice is used');
  assert.ok(allUsedFoodIds.has('F24'), 'Oats are used');
});





