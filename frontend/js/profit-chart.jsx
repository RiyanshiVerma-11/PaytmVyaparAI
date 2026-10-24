import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const MICRO_BUTTONS = [
  { labelEn: '+₹15 Dahi', labelHi: '+₹15 दही', amount: 15, itemTag: 'Dahi', margin: '22%', mode: 'Cash_Micro' },
  { labelEn: '+₹20 Doodh', labelHi: '+₹20 दूध', amount: 20, itemTag: 'Doodh', margin: '14%', mode: 'Cash_Micro' },
  { labelEn: '+₹10 Parle-G / Chai', labelHi: '+₹10 बिस्कुट/चाय', amount: 10, itemTag: 'Parle-G', margin: '22%', mode: 'Cash_Micro' },
  { labelEn: '+₹14 Maggi', labelHi: '+₹14 मैगी', amount: 14, itemTag: 'Maggi', margin: '18%', mode: 'UPI_Soundbox' },
  { labelEn: '+₹25 Bread / Anda', labelHi: '+₹25 ब्रेड/अंडा', amount: 25, itemTag: 'Bread', margin: '20%', mode: 'Cash_Micro' },
  { labelEn: '+₹35 Namkeen / Chips', labelHi: '+₹35 नमकीन/चिप्स', amount: 35, itemTag: 'Chips/Namkeen', margin: '22%', mode: 'UPI_Soundbox' }
];

function CustomProfitTooltip({ active, payload, label, isHindi }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div style={{
      background: '#0F172A',
      color: '#F8FAFC',
      padding: '12px 14px',
      borderRadius: '10px',
      border: '1px solid rgba(0, 186, 242, 0.35)',
      boxShadow: '0 10px 25px rgba(0, 20, 60, 0.25)',
      fontSize: '0.8rem',
      minWidth: '220px',
      fontVariantNumeric: 'tabular-nums'
    }}>
      <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#38BDF8', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
        {d.label} ({d.date})
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#CBD5E1' }}>{isHindi ? 'कुल बिक्री (Revenue):' : 'Total Revenue:'}</span>
        <strong style={{ color: '#FFFFFF' }}>₹{Number(d.revenue).toLocaleString('en-IN')}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#94A3B8' }}>{isHindi ? '• ऑटो Soundbox UPI:' : '• Auto Soundbox QR:'}</span>
        <span style={{ color: '#E2E8F0' }}>₹{Number(d.upi_revenue).toLocaleString('en-IN')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ color: '#94A3B8' }}>{isHindi ? `• छोटा गल्ला (${d.micro_count} बिक्री):` : `• Micro-Sales (${d.micro_count} items):`}</span>
        <span style={{ color: '#FBBF24', fontWeight: 700 }}>₹{Number(d.micro_revenue).toLocaleString('en-IN')}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ color: '#94A3B8' }}>{isHindi ? 'थोक लागत (Wholesale COGS):' : 'Wholesale Cost (COGS):'}</span>
        <span style={{ color: '#CBD5E1' }}>₹{Number(d.cogs).toLocaleString('en-IN')}</span>
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        paddingTop: '6px',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        color: '#34D399',
        fontWeight: 800,
        fontSize: '0.86rem'
      }}>
        <span>{isHindi ? 'शुद्ध मुनाफा (Net Profit):' : 'Net Profit:'}</span>
        <span>₹{Number(d.profit).toLocaleString('en-IN')} ({d.margin_pct}%)</span>
      </div>
    </div>
  );
}

function ProfitTrendsWidget() {
  const [trendData, setTrendData] = useState(null);
  const [chartMode, setChartMode] = useState('profit'); // 'profit' | 'breakdown'
  const [loadingTag, setLoadingTag] = useState(null);
  const [lang, setLang] = useState(() => localStorage.getItem('paytm_lang') || 'en');

  const isHindi = lang === 'hi';

  const fetchTrends = useCallback(async () => {
    try {
      if (window.API && typeof window.API.getProfitTrends === 'function') {
        const res = await window.API.getProfitTrends(7);
        if (res && res.days) {
          setTrendData(res);
        }
      }
    } catch (err) {
      console.error('Failed to load 7-day profit trends:', err);
    }
  }, []);

  useEffect(() => {
    fetchTrends();
    window.refreshProfitTrendsChart = fetchTrends;

    const handleStorageOrLang = () => {
      setLang(localStorage.getItem('paytm_lang') || 'en');
    };
    window.addEventListener('paytm-lang-changed', handleStorageOrLang);
    return () => {
      window.removeEventListener('paytm-lang-changed', handleStorageOrLang);
    };
  }, [fetchTrends]);

  const handleQuickMicroSale = async (btn) => {
    if (loadingTag) return;
    setLoadingTag(btn.itemTag);
    try {
      const res = await window.API.simulateTransaction(
        btn.amount,
        `Micro: ${btn.itemTag} ₹${btn.amount}`,
        btn.mode,
        btn.itemTag
      );
      if (res && res.profit_trends) {
        setTrendData(res.profit_trends);
      } else {
        await fetchTrends();
      }
      if (res && res.soundbox_payload && window.paytmSoundbox) {
        window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
      }
      if (typeof window.loadDashboardData === 'function') {
        window.loadDashboardData();
      }
    } catch (e) {
      console.error('Quick micro-sale error:', e);
    } finally {
      setLoadingTag(null);
    }
  };

  const days = trendData?.days || [];
  const summary = trendData?.summary || {
    total_7d_revenue: 14120,
    total_7d_profit: 2430,
    avg_daily_profit: 347,
    avg_margin_pct: 17.2,
    total_7d_micro_sales: 428,
    total_7d_micro_count: 23,
    today_profit: 382,
    today_revenue: 2213,
    dod_growth_pct: 12.4
  };

  // Sync top dashboard "Aaj Ki Kamai" glance card with live today revenue & profit
  useEffect(() => {
    if (!trendData?.summary) return;
    const todayValEl = document.querySelector('.glance-collections .glance-value');
    const todaySubEl = document.querySelector('.glance-collections .glance-subtext');
    const todayDay = days[days.length - 1];
    if (todayValEl && summary.today_revenue > 0) {
      todayValEl.textContent = `₹${Number(summary.today_revenue).toLocaleString('en-IN')}`;
    }
    if (todaySubEl && todayDay) {
      todaySubEl.textContent = isHindi
        ? `शुद्ध मुनाफा: ₹${Number(summary.today_profit).toLocaleString('en-IN')} • ${todayDay.tx_count} बिक्री`
        : `Net Profit: ₹${Number(summary.today_profit).toLocaleString('en-IN')} • ${todayDay.tx_count} Sales`;
    }
  }, [trendData, days, summary, isHindi]);

  return (
    <div className="pos-bento-card pos-profit-trends-card" style={{ gridColumn: '1 / -1', padding: '1.25rem 1.4rem', fontVariantNumeric: 'tabular-nums' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
              {isHindi ? '📈 7-दिन का मुनाफा और छोटा गल्ला (Daily Profit Trends)' : '📈 7-Day Daily Profit Trends & Zero-Typing Micro-Sales'}
            </h2>
            <span style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700 }}>
              · {summary.dod_growth_pct >= 0 ? `+${summary.dod_growth_pct}%` : `${summary.dod_growth_pct}%`} {isHindi ? 'आज की ग्रोथ' : 'vs Yesterday'}
            </span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#475569' }}>
            {isHindi
              ? 'हर ₹15 दही या ₹20 दूध के लिए ग्राहक का नाम सेव करने की जरूरत नहीं — QR से ऑटो-कैप्चर या 1-टैप छोटा गल्ला इस्तेमाल करें।'
              : 'No need to save customer names for ₹15 Dahi or ₹20 Milk — auto-captured from Soundbox QR scans + 1-Tap Counter Cash Galla.'}
          </p>
        </div>

        {/* Interactive Chart Mode Switcher */}
        <div style={{ display: 'inline-flex', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          <button
            type="button"
            onClick={() => setChartMode('profit')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: chartMode === 'profit' ? '#002970' : 'transparent',
              color: chartMode === 'profit' ? '#FFFFFF' : '#475569'
            }}
          >
            {isHindi ? 'शुद्ध मुनाफा (Net Profit)' : 'Net Profit & Revenue'}
          </button>
          <button
            type="button"
            onClick={() => setChartMode('breakdown')}
            style={{
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              background: chartMode === 'breakdown' ? '#002970' : 'transparent',
              color: chartMode === 'breakdown' ? '#FFFFFF' : '#475569'
            }}
          >
            {isHindi ? 'QR बनाम छोटा गल्ला (₹15/₹20)' : 'UPI QR vs Micro-Sales (₹15/₹20)'}
          </button>
        </div>
      </div>

      {/* 4-Metric Summary Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: '10px',
        marginBottom: '1rem',
        padding: '10px 12px',
        background: '#F8FAFC',
        borderRadius: '10px',
        border: '1px solid #E2E8F0'
      }}>
        <div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            {isHindi ? '7-दिन का शुद्ध मुनाफा' : '7-Day Net Profit'}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
            ₹{Number(summary.total_7d_profit).toLocaleString('en-IN')}
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginLeft: '6px' }}>
              ({summary.avg_margin_pct}% {isHindi ? 'मार्जिन' : 'margin'})
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            {isHindi ? '7-दिन की कुल बिक्री' : '7-Day Total Sales'}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#002970' }}>
            ₹{Number(summary.total_7d_revenue).toLocaleString('en-IN')}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            {isHindi ? 'आज का मुनाफा (Today Profit)' : "Today's Net Profit"}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0284C7' }}>
            ₹{Number(summary.today_profit).toLocaleString('en-IN')}
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
              / ₹{Number(summary.today_revenue).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
            {isHindi ? 'छोटी बिक्री (₹15 दही / ₹20 दूध)' : 'Chhota Galla Micro-Sales'}
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#D97706' }}>
            ₹{Number(summary.total_7d_micro_sales).toLocaleString('en-IN')}
            <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
              · {summary.total_7d_micro_count} {isHindi ? 'ग्राहक' : 'walk-ins'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Left Recharts Graph + Right 1-Tap Chhota Galla Pad */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.2rem',
        alignItems: 'stretch'
      }}>
        {/* Recharts 7-Day Trend Visualization */}
        <div style={{ minHeight: '260px', height: '270px', width: '100%', background: '#FFFFFF', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '10px 8px 4px 0' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'profit' ? (
              <ComposedChart data={days} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00BAF2" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00BAF2" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: '#475569', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: '#059669', fontSize: 11, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip content={<CustomProfitTooltip isHindi={isHindi} />} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name={isHindi ? 'कुल बिक्री (Sales ₹)' : 'Daily Sales Revenue (₹)'}
                  stroke="#00BAF2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revenueFill)"
                />
                <Bar
                  yAxisId="right"
                  dataKey="profit"
                  name={isHindi ? 'शुद्ध मुनाफा (Net Profit ₹)' : 'Net Take-Home Profit (₹)'}
                  fill="#059669"
                  radius={[6, 6, 0, 0]}
                  barSize={26}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="profit"
                  name={isHindi ? 'मुनाफा ट्रेंड' : 'Profit Trend Line'}
                  stroke="#002970"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#002970', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                />
              </ComposedChart>
            ) : (
              <ComposedChart data={days} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip content={<CustomProfitTooltip isHindi={isHindi} />} />
                <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                <Bar
                  dataKey="upi_revenue"
                  stackId="a"
                  name={isHindi ? 'ऑटो Soundbox QR (₹)' : 'Auto Soundbox QR Sales (₹)'}
                  fill="#002970"
                  barSize={28}
                />
                <Bar
                  dataKey="micro_revenue"
                  stackId="a"
                  name={isHindi ? 'छोटा गल्ला: ₹15 दही / ₹20 दूध (₹)' : 'Chhota Galla Micro-Sales (₹)'}
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                  barSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  name={isHindi ? 'शुद्ध मुनाफा (Net Profit ₹)' : 'Net Profit (₹)'}
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#059669' }}
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Right Panel: 1-Tap "Chhota Cash Galla" + 3 Zero-Effort Profit Moves */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F8FAFC',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          padding: '12px 14px'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>
                {isHindi ? '⚡ 1-Tap छोटा कैश गल्ला (बिना नाम लिखे)' : '⚡ 1-Tap "Chhota Galla" (Zero Customer Name)'}
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#0284C7', fontWeight: 700 }}>
                {isHindi ? 'बोलें: "15 रुपये दही"' : 'Or Speak: "15 rupaye dahi"'}
              </span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#475569', lineHeight: 1.4 }}>
              {isHindi
                ? 'फुटकर नकद ग्राहकों (₹15 दही, ₹20 दूध) का नाम मत पूछिए—बस 1 टैप करें या माइक में बोलें, मुनाफा तुरंत ग्राफ में जुड़ जाएगा:'
                : 'Do not ask walk-in cash customers for their name—tap an item below (or speak into Soundbox) to log instant margin:'}
            </p>

            {/* 6 Quick Tap Micro-Sale Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '12px' }}>
              {MICRO_BUTTONS.map((btn) => {
                const isBusy = loadingTag === btn.itemTag;
                return (
                  <button
                    key={btn.itemTag}
                    type="button"
                    disabled={Boolean(loadingTag)}
                    onClick={() => handleQuickMicroSale(btn)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: isBusy ? '#E0F2FE' : '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      transition: 'transform 0.12s ease, border-color 0.12s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <span>{isHindi ? btn.labelHi : btn.labelEn}</span>
                    <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
                      {isBusy ? '...' : btn.margin}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Smart Moves Explainer Box */}
          <div style={{
            borderTop: '1px solid #E2E8F0',
            paddingTop: '8px',
            fontSize: '0.74rem',
            color: '#334155',
            lineHeight: 1.45
          }}>
            <div style={{ fontWeight: 800, color: '#002970', marginBottom: '4px' }}>
              {isHindi ? '💡 दुकानदार के लिए 3 स्मार्ट तरीके (0 मैनुअल टाइपिंग):' : '💡 3 Smart Moves So You Never Type Every ₹15 Customer:'}
            </div>
            <div>
              <strong>1. Auto QR Stream:</strong> {isHindi ? '₹15/₹20 के UPI पेमेंट साउंडबॉक्स से अपने-आप जुड़ते हैं।' : 'Every ₹15/₹20 UPI Soundbox scan auto-logs with ~18% category margin.'}
            </div>
            <div>
              <strong>2. 1-Tap / Voice Galla:</strong> {isHindi ? 'नकद बिक्री पर "+₹15 दही" दबाएं या बोलें—ग्राहक का नाम जरूरी नहीं।' : 'For cash walk-ins, tap "+₹15 Dahi" or say "15 rupaye dahi"—no customer name needed.'}
            </div>
            <div>
              <strong>3. Crate-Level Auto Margin:</strong> {isHindi ? 'थोक खरीद (Wholesale PO) और बचे स्टॉक से कुल मुनाफा अपने-आप निकलता है।' : 'Wholesale PO cost vs remaining stock reconciles daily profit automatically.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function initProfitChart() {
  const container = document.getElementById('profitTrendsRechartsRoot');
  if (container && !container._reactRoot) {
    const root = createRoot(container);
    container._reactRoot = root;
    root.render(<ProfitTrendsWidget />);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProfitChart);
} else {
  initProfitChart();
}
