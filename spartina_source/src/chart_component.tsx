import React, { useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface ProductData {
  id: string;
  brand_fa: string;
  brand_en?: string;
  model?: string;
  category: string;
  base_weight_g?: number;
  package_weight_g?: number;
  avg_price_toman?: number;
  exact_price_toman?: number;
  min_price_toman?: number;
  max_price_toman?: number;
  price_per_kg_toman?: number;
  price_per_g_protein_toman?: number;
  price_per_g_creatine_toman?: number;
  protein_per_serving_g?: number;
  creatine_per_serving_g?: number;
  user_rating?: number;
  satisfaction_rate_percent?: number;
  score_0_100?: number;
  ttac_verified?: boolean;
  in_ifda_warning_list?: boolean;
  digestive_compatibility?: string;
  lactose_free?: boolean;
  image?: string;
}

const COLORS = ['#0E9F9A', '#C7375A', '#F0A133', '#5B2B83', '#2563EB'];

function formatToman(num?: number): string {
  if (!num || isNaN(num) || num <= 0) return '—';
  return Math.round(num).toLocaleString('fa-IR') + ' تومان';
}

function toFaDigits(val: string | number): string {
  return String(val).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
}

// Calculate normalized metric score (0 to 100) for radar dimensions
function calculateRadarScores(p: ProductData) {
  // 1. میزان پروتئین / دوز موثره در سروینگ
  let proteinScore = 75;
  if (p.category === 'whey') {
    const prot = p.protein_per_serving_g || 24;
    proteinScore = Math.max(30, Math.min(100, Math.round((prot / 26) * 100)));
  } else if (p.category === 'creatine') {
    proteinScore = 95; // 5g standard pure dose
  }

  // 2. ارزش خرید اقتصادی (معکوس قیمت هر ۱ گرم ماده خالص)
  const pricePerG = (p.category === 'whey' ? p.price_per_g_protein_toman : p.price_per_g_creatine_toman) || (p.price_per_kg_toman ? p.price_per_kg_toman / 1000 : 8000);
  let valueScore = 70;
  if (p.category === 'whey') {
    // 5,000 T/g -> ~96, 8,000 -> ~85, 15,000 -> ~60, 25,000 -> ~35
    valueScore = Math.max(20, Math.min(100, Math.round(112 - (pricePerG / 320))));
  } else {
    // Creatine: 3,000 T/g -> ~95, 5,000 -> ~85, 12,000 -> ~50, 25,000 -> ~25
    valueScore = Math.max(15, Math.min(100, Math.round(110 - (pricePerG / 250))));
  }

  // 3. رضایت و امتیاز کیفی خریداران
  let satisfactionScore = 80;
  if (p.satisfaction_rate_percent != null) {
    satisfactionScore = Math.max(25, Math.min(100, Math.round(p.satisfaction_rate_percent)));
  } else if (p.score_0_100 != null) {
    satisfactionScore = Math.max(25, Math.min(100, Math.round(p.score_0_100)));
  } else if (p.user_rating) {
    satisfactionScore = Math.max(25, Math.min(100, Math.round(p.user_rating * 20)));
  }

  // 4. اصالت و اعتبار نظارتی (TTAC vs هشدار IFDA)
  let safetyScore = 75;
  if (p.in_ifda_warning_list) {
    safetyScore = 28; // هشدار رسمی عرضه غیرمجاز سازمان غذا و دارو
  } else if (p.ttac_verified) {
    safetyScore = 98; // برچسب اصالت رسمی پیامکی و پروانه IRC
  } else {
    safetyScore = 70; // داروخانه‌ای مجاز
  }

  // 5. سازگاری هضمی و حل‌پذیری
  let digestionScore = 80;
  if (p.category === 'whey') {
    if (p.lactose_free) digestionScore += 15;
    if (p.digestive_compatibility && p.digestive_compatibility.includes('عالی')) digestionScore += 5;
  } else {
    digestionScore = 90; // کراتین میکرونایز استاندارد
  }
  digestionScore = Math.min(100, digestionScore);

  return {
    proteinScore,
    valueScore,
    satisfactionScore,
    safetyScore,
    digestionScore,
  };
}

export function SupplementComparisonChart({
  products,
  onToggleSelect,
  isDefaultSelection,
}: {
  products: ProductData[];
  onToggleSelect?: (id: string) => void;
  isDefaultSelection?: boolean;
}) {
  const [chartType, setChartType] = useState<'radar' | 'bar'>('radar');

  if (!products || products.length === 0) {
    return null;
  }

  // Prepare Radar Data (5 key dimensions balanced symmetrically)
  const radarDimensions = [
    { key: 'proteinScore', label: 'پروتئین و خلوص' },
    { key: 'valueScore', label: 'ارزش خرید اقتصادی' },
    { key: 'satisfactionScore', label: 'رضایت خریداران' },
    { key: 'digestionScore', label: 'سازگاری گوارشی' },
    { key: 'safetyScore', label: 'اصالت و مجوز TTAC' },
  ];

  const radarData = radarDimensions.map((dim) => {
    const row: Record<string, any> = { metric: dim.label };
    products.forEach((p) => {
      const scores = calculateRadarScores(p);
      row[p.id] = (scores as any)[dim.key];
    });
    return row;
  });

  // Prepare Bar Data (Key normalized comparison metrics)
  const barDimensions = [
    { key: 'proteinScore', label: 'دوز در سروینگ' },
    { key: 'valueScore', label: 'ارزش خرید (معکوس قیمت/گرم)' },
    { key: 'satisfactionScore', label: 'امتیاز رضایت خریداران' },
    { key: 'safetyScore', label: 'اصالت رسمی نظارتی' },
    { key: 'digestionScore', label: 'کیفیت هضم و حلالیت' },
  ];

  const barData = barDimensions.map((dim) => {
    const row: Record<string, any> = { metric: dim.label };
    products.forEach((p) => {
      const scores = calculateRadarScores(p);
      row[p.id] = (scores as any)[dim.key];
    });
    return row;
  });

  // Custom Tooltip for Radar Chart
  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const metricLabel = payload[0]?.payload?.metric;
      return (
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1.5px solid #CBD5E1',
            borderRadius: 10,
            padding: '10px 14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            direction: 'rtl',
            fontSize: 12.5,
            lineHeight: 1.7,
            minWidth: 200,
          }}
        >
          <div style={{ fontWeight: 800, color: '#1C2766', marginBottom: 6, borderBottom: '1px solid #E2E8F0', paddingBottom: 4 }}>
            🎯 {metricLabel}
          </div>
          {payload.map((entry: any, index: number) => {
            const p = products.find((x) => x.id === entry.dataKey);
            return (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', margin: '3px 0' }}>
                <span style={{ color: entry.color, fontWeight: 700 }}>● {p?.brand_fa || entry.name}:</span>
                <b style={{ color: '#0F172A' }}>{toFaDigits(entry.value)} از ۱۰۰</b>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="card"
      style={{
        padding: '18px 22px',
        marginBottom: 20,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
        border: '1.5px solid #CBD5E1',
        borderRadius: 16,
        boxShadow: '0 8px 24px rgba(28, 39, 102, 0.06)',
      }}
    >
      {/* هدر بخش مقایسه تصویری */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📊</span>
            <h3 style={{ margin: 0, fontSize: 17, color: '#1C2766', fontWeight: 800 }}>
              مقایسه تصویری و تحلیلی برندها (Recharts Visual Matrix)
            </h3>
            <span
              style={{
                fontSize: 11.5,
                background: '#E2E8F0',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: 99,
                fontWeight: 700,
              }}
            >
              {toFaDigits(products.length)} فرآورده
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748B' }}>
            مقایسه چندبُعدی پروتئین در سروینگ، ارزش خرید اقتصادی (قیمت/گرم)، رضایت خریداران، و راستی‌آزمایی اصالت رسمی.
          </p>
        </div>

        {/* دکمه‌های سوئیچ بین نمودار راداری و میله‌ای */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setChartType('radar')}
            style={{
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 8,
              border: chartType === 'radar' ? '1.5px solid #1C2766' : '1px solid #CBD5E1',
              backgroundColor: chartType === 'radar' ? '#1C2766' : '#FFFFFF',
              color: chartType === 'radar' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            🕸️ نمودار راداری (۵ بُعدی)
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            style={{
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              borderRadius: 8,
              border: chartType === 'bar' ? '1.5px solid #1C2766' : '1px solid #CBD5E1',
              backgroundColor: chartType === 'bar' ? '#1C2766' : '#FFFFFF',
              color: chartType === 'bar' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            📊 نمودار میله‌ای (تطبیقی)
          </button>
        </div>
      </div>

      {/* اعلان در صورت انتخاب پیش‌فرض */}
      {isDefaultSelection && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            color: '#166534',
            padding: '7px 12px',
            borderRadius: 8,
            fontSize: 12,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>💡</span>
          <span>
            <b>نمایش پیش‌فرض برترین‌های بازار:</b> برای مقایسه برندهای دلخواه، تیک مربع کنار محصولات مورد نظر را در جدول یا کارت‌ها بزنید (۲ تا ۴ فرآورده).
          </span>
        </div>
      )}

      {/* خلاصه برچسب‌های برندهای انتخابی همراه با رنگ نمودار و قیمت دقیق */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
          gap: 10,
          marginBottom: 16,
          padding: '10px 12px',
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E2E8F0',
        }}
      >
        {products.map((p, idx) => {
          const color = COLORS[idx % COLORS.length];
          const wt = p.base_weight_g || p.package_weight_g;
          const pr = p.avg_price_toman || p.exact_price_toman;
          return (
            <div
              key={p.id}
              style={{
                borderInlineStart: `4px solid ${color}`,
                background: '#F8FAFC',
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <b style={{ color, fontSize: 13, display: 'block' }}>● {p.brand_fa}</b>
                <div style={{ color: '#64748B', fontSize: 11 }}>
                  {wt ? `قوطی ${toFaDigits(wt)}g: ` : ''}
                  <b style={{ color: '#1E293B' }}>{formatToman(pr)}</b>
                </div>
                <div style={{ color: '#0E7F7A', fontSize: 10.5, marginTop: 2 }}>
                  {p.category === 'whey'
                    ? `${toFaDigits(p.protein_per_serving_g || 24)}g پروتئین · ${toFaDigits(p.price_per_g_protein_toman || 0)} ت/گرم`
                    : `۵g کراتین · ${toFaDigits(p.price_per_g_creatine_toman || 0)} ت/گرم`}
                </div>
              </div>
              {onToggleSelect && !isDefaultSelection && (
                <button
                  type="button"
                  onClick={() => onToggleSelect(p.id)}
                  title="حذف از مقایسه نموداری"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* کانتینر نمودار Recharts */}
      <div style={{ width: '100%', height: 400, position: 'relative' }}>
        {chartType === 'radar' ? (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart cx="50%" cy="50%" outerRadius="68%" data={radarData}>
              <PolarGrid stroke="#CBD5E1" strokeDasharray="3 3" />
              <PolarAngleAxis
                dataKey="metric"
                tick={(props: any) => {
                  const { x, y, cx, cy, payload } = props;
                  // Calculate offsets away from center
                  const dx = x > cx + 5 ? 12 : x < cx - 5 ? -12 : 0;
                  const dy = y > cy + 5 ? 14 : y < cy - 5 ? -14 : 0;
                  const anchor = x > cx + 15 ? 'start' : x < cx - 15 ? 'end' : 'middle';
                  return (
                    <text
                      x={x + dx}
                      y={y + dy}
                      textAnchor={anchor}
                      fill="#0F172A"
                      fontSize={11.5}
                      fontWeight={700}
                      fontFamily="inherit"
                    >
                      {payload.value}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" />
              {products.map((p, idx) => (
                <Radar
                  key={p.id}
                  name={p.brand_fa}
                  dataKey={p.id}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                  fillOpacity={0.28}
                  strokeWidth={2.5}
                />
              ))}
              <Tooltip content={<CustomRadarTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  direction: 'rtl',
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={barData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="metric"
                tick={{ fill: '#1E293B', fontSize: 11.5, fontWeight: 700 }}
                interval={0}
              />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} />
              <Tooltip content={<CustomRadarTooltip />} />
              <Legend
                wrapperStyle={{
                  paddingTop: 10,
                  fontSize: 12.5,
                  fontWeight: 700,
                  direction: 'rtl',
                }}
              />
              {products.map((p, idx) => (
                <Bar
                  key={p.id}
                  name={p.brand_fa}
                  dataKey={p.id}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[6, 6, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 11.5, color: '#64748B', textAlign: 'center' }}>
        * تمام شاخص‌های نمودار بر روی مقیاس نرمال‌شده <b>۰ تا ۱۰۰</b> تطبیق داده شده‌اند؛ شاخص ارزش خرید بر اساس کمترین هزینه به ازای هر ۱ گرم ماده موثره محاسبه گردیده است.
      </div>
    </div>
  );
}

// Global Mount Function
declare global {
  interface Window {
    renderSupplementComparisonChart?: (
      containerId: string,
      options: {
        products: ProductData[];
        onToggleSelect?: (id: string) => void;
        isDefaultSelection?: boolean;
      }
    ) => void;
  }
}

if (typeof window !== 'undefined') {
  window.renderSupplementComparisonChart = function (containerId, options) {
    const el = document.getElementById(containerId) as any;
    if (!el) return;

    let root: Root = el._reactRoot;
    if (!root) {
      root = createRoot(el);
      el._reactRoot = root;
    }

    root.render(
      React.createElement(SupplementComparisonChart, {
        products: options.products,
        onToggleSelect: options.onToggleSelect,
        isDefaultSelection: options.isDefaultSelection,
      })
    );
  };
}
