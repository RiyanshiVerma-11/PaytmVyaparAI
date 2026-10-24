import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import QRCode from 'qrcode';
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

function CustomProfitTooltip({ active, payload, isHindi }) {
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

function DigitalKhataQRSection({ isHindi }) {
  const [customers, setCustomers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [merchant, setMerchant] = useState({
    name: 'Ramesh Sharma',
    shop_name: 'Sharma Kirana & General Store',
    upi_id: '8171008964@ptaxis',
    phone: '+91 9811223344',
    address: 'Shop #14, Main Market, Chandni Chowk, Delhi'
  });
  const [selectedCustId, setSelectedCustId] = useState('store_all');
  const [qrMode, setQrMode] = useState('passbook'); // 'passbook' | 'upi_direct'
  const [svgMarkup, setSvgMarkup] = useState('');
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleSuccessBanner, setSettleSuccessBanner] = useState('');

  const loadKhataAndMerchant = useCallback(async () => {
    try {
      const [khataRes, merchRes] = await Promise.all([
        window.API.getKhata(),
        window.API.getMerchantProfile ? window.API.getMerchantProfile(1) : Promise.resolve(null)
      ]);
      if (khataRes) {
        setCustomers(khataRes.customers || []);
        setEntries(khataRes.entries || []);
      }
      if (merchRes && merchRes.shop_name) {
        setMerchant(merchRes);
      }
    } catch (e) {
      console.error('Error loading Digital Khata QR data:', e);
    }
  }, []);

  useEffect(() => {
    loadKhataAndMerchant();
    window.refreshDigitalKhataQR = loadKhataAndMerchant;

    // Allow opening/focusing a specific customer's Digital Khata QR from anywhere in the Dashboard
    window.openDigitalKhataQRModal = (customerId, openCustomerPreview = false) => {
      loadKhataAndMerchant();
      if (customerId) {
        setSelectedCustId(String(customerId));
      }
      if (openCustomerPreview) {
        setScanModalOpen(true);
      } else {
        const el = document.getElementById('digitalKhataQrStudioCard');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    };

    // Auto-open Customer Self-Serve Khata Passbook if URL has ?khata_qr=1
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('khata_qr') === '1') {
        const cid = params.get('cid');
        if (cid) setSelectedCustId(String(cid));
        setScanModalOpen(true);
      }
    }
  }, [loadKhataAndMerchant]);

  const selectedCustomer = useMemo(() => {
    if (selectedCustId === 'store_all') return null;
    return customers.find((c) => String(c.id) === String(selectedCustId)) || null;
  }, [customers, selectedCustId]);

  const totalPendingStore = useMemo(
    () => customers.reduce((acc, c) => acc + Number(c.pending_udhaar || 0), 0),
    [customers]
  );

  // Build QR payload URL or UPI URI
  const qrPayload = useMemo(() => {
    const upiVpa = merchant.upi_id || '8171008964@ptaxis';
    const shopName = encodeURIComponent(merchant.shop_name || 'Sharma Kirana Store');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://paytm-vyapar-ai-chi.vercel.app';

    if (qrMode === 'upi_direct') {
      if (selectedCustomer && Number(selectedCustomer.pending_udhaar) > 0) {
        const amt = Number(selectedCustomer.pending_udhaar).toFixed(2);
        const note = encodeURIComponent(`Khata Settlement - ${selectedCustomer.name}`);
        return `upi://pay?pa=${upiVpa}&pn=${shopName}&am=${amt}&cu=INR&tn=${note}`;
      }
      return `upi://pay?pa=${upiVpa}&pn=${shopName}&cu=INR&tn=${encodeURIComponent('Bahi Khata Udhaar Settlement')}`;
    }

    if (selectedCustomer) {
      return `${origin}/?khata_qr=1&cid=${selectedCustomer.id}`;
    }
    return `${origin}/?khata_qr=1`;
  }, [qrMode, selectedCustomer, merchant]);

  // Generate SVG QR whenever qrPayload changes
  useEffect(() => {
    let active = true;
    QRCode.toString(
      qrPayload,
      {
        type: 'svg',
        width: 196,
        margin: 1,
        color: {
          dark: '#002970',
          light: '#FFFFFF'
        }
      },
      (err, svg) => {
        if (!err && active) {
          setSvgMarkup(svg);
        }
      }
    );
    return () => {
      active = false;
    };
  }, [qrPayload]);

  const customerEntries = useMemo(() => {
    if (!selectedCustomer) return entries.slice(0, 6);
    return entries.filter(
      (e) =>
        String(e.customer_id) === String(selectedCustomer.id) ||
        (e.customer_name && e.customer_name.toLowerCase() === selectedCustomer.name.toLowerCase())
    );
  }, [entries, selectedCustomer]);

  const handlePrintStandee = () => {
    document.body.classList.add('printing-khata-qr');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-khata-qr');
    }, 600);
  };

  const handleDownloadSvg = () => {
    if (!svgMarkup) return;
    const custSlug = selectedCustomer
      ? selectedCustomer.name.replace(/\s+/g, '_')
      : 'Store_Counter_Standee';
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Paytm_Digital_Khata_QR_${custSlug}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInstantCustomerSettle = async (cust) => {
    if (!cust || Number(cust.pending_udhaar) <= 0 || settling) return;
    setSettling(true);
    setSettleSuccessBanner('');
    try {
      const res = await window.API.settleKhataCustomer(cust.id);
      if (res && res.success) {
        setSettleSuccessBanner(
          isHindi
            ? `🎉 धन्यवाद ${cust.name} जी! ₹${cust.pending_udhaar} का बही-खाता UPI से चुकता हो गया।`
            : `🎉 Thank you ${cust.name}! ₹${cust.pending_udhaar} Khata balance settled via UPI.`
        );
        if (res.soundbox_payload && window.paytmSoundbox) {
          window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
        }
        await loadKhataAndMerchant();
        if (typeof window.loadDashboardData === 'function') {
          window.loadDashboardData();
        }
      }
    } catch (e) {
      console.error('Failed to settle from customer QR view:', e);
    } finally {
      setSettling(false);
    }
  };

  const filteredModalCustomers = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, lookupQuery]);

  const upiDeepLink = useMemo(() => {
    const upiVpa = merchant.upi_id || '8171008964@ptaxis';
    const shopName = encodeURIComponent(merchant.shop_name || 'Sharma Kirana Store');
    if (selectedCustomer && Number(selectedCustomer.pending_udhaar) > 0) {
      const amt = Number(selectedCustomer.pending_udhaar).toFixed(2);
      const note = encodeURIComponent(`Khata Settlement - ${selectedCustomer.name}`);
      return `upi://pay?pa=${upiVpa}&pn=${shopName}&am=${amt}&cu=INR&tn=${note}`;
    }
    return `upi://pay?pa=${upiVpa}&pn=${shopName}&cu=INR&tn=${encodeURIComponent('Khata Udhaar Settlement')}`;
  }, [merchant, selectedCustomer]);

  return (
    <>
      {/* Print-Only Stylesheet so "Print Digital Khata QR Standee" prints a crisp counter standee */}
      <style>{`
        @media print {
          body.printing-khata-qr * {
            visibility: hidden !important;
          }
          body.printing-khata-qr #printableKhataStandeeCard,
          body.printing-khata-qr #printableKhataStandeeCard * {
            visibility: visible !important;
          }
          body.printing-khata-qr #printableKhataStandeeCard {
            position: fixed !important;
            left: 50% !important;
            top: 24px !important;
            transform: translateX(-50%) !important;
            width: 420px !important;
            box-shadow: none !important;
            border: 2px solid #002970 !important;
            background: #FFFFFF !important;
            z-index: 999999 !important;
          }
        }
      `}</style>

      <div
        id="digitalKhataQrStudioCard"
        className="pos-bento-card"
        style={{
          gridColumn: '1 / -1',
          padding: '1.25rem 1.4rem',
          marginTop: '0.2rem',
          fontVariantNumeric: 'tabular-nums'
        }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0F172A' }}>
                {isHindi
                  ? '📱 डिजिटल बही-खाता QR जनरेटर और प्रिंट स्टैंडी (Digital Khata QR)'
                  : '📱 Personalized Digital Khata QR Generator & Print Standee'}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#0284C7', fontWeight: 700 }}>
                · UPI ID: {merchant.upi_id || '8171008964@ptaxis'}
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#475569' }}>
              {isHindi
                ? 'दुकान के काउंटर के लिए या किसी भी उधार ग्राहक के लिए पर्सनलाइज्ड QR बनाएं और प्रिंट करें — ग्राहक स्कैन करके अपना बकाया देख सकते हैं और तुरंत UPI से पेमेंट कर सकते हैं।'
                : 'Generate and print a counter standee or customer-specific Khata QR. Customers scan to view their itemized pending balance and settle via UPI in one tap.'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setScanModalOpen(true)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #0284C7',
                background: '#F0F9FF',
                color: '#0369A1',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {isHindi ? '👁️ ग्राहक स्कैन व्यू देखें (Customer Preview)' : '👁️ Preview Customer Scan View'}
            </button>

            <button
              type="button"
              onClick={handlePrintStandee}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #002970, #00BAF2)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0, 41, 112, 0.2)'
              }}
            >
              {isHindi ? '🖨️ QR स्टैंडी प्रिंट करें (Print QR)' : '🖨️ Print Digital Khata QR'}
            </button>
          </div>
        </div>

        {/* Main 2-Column Layout: Left Controls + Customer List | Right Printable Paytm Standee */}
        <div
          className="digital-khata-responsive-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.25rem',
            alignItems: 'stretch'
          }}
        >
          {/* Left Column: Customer Selection & QR Configuration */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#F8FAFC',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            padding: '14px 16px'
          }}>
            <div>
              {/* Step 1: Select Customer or Counter Universal Standee */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  {isHindi ? '1. किसके लिए Digital Khata QR बनाना है?' : '1. Select Personalized Customer or Universal Counter QR'}
                </label>
                <select
                  value={selectedCustId}
                  onChange={(e) => {
                    setSelectedCustId(e.target.value);
                    setSettleSuccessBanner('');
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    cursor: 'pointer'
                  }}
                >
                  <option value="store_all">
                    {isHindi
                      ? `🏪 दुकान काउंटर मास्टर QR — सभी ग्राहक (कुल बकाया: ₹${totalPendingStore.toLocaleString('en-IN')})`
                      : `🏪 Store Counter Master QR — All Customers (Total Pending: ₹${totalPendingStore.toLocaleString('en-IN')})`}
                  </option>
                  {customers.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name} ({c.phone}) — {Number(c.pending_udhaar) > 0 ? `₹${Number(c.pending_udhaar).toLocaleString('en-IN')} Pending` : '₹0 Settled'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Customer Pills for Pending Udhaar Customers */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedCustId('store_all')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: selectedCustId === 'store_all' ? '1.5px solid #002970' : '1px solid #CBD5E1',
                    background: selectedCustId === 'store_all' ? '#002970' : '#FFFFFF',
                    color: selectedCustId === 'store_all' ? '#FFFFFF' : '#334155'
                  }}
                >
                  {isHindi ? '🏪 काउंटर स्टैंडी' : '🏪 Store Counter Standee'}
                </button>
                {customers
                  .filter((c) => Number(c.pending_udhaar) > 0)
                  .map((c) => {
                    const active = String(c.id) === String(selectedCustId);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustId(String(c.id))}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: active ? '1.5px solid #0284C7' : '1px solid #CBD5E1',
                          background: active ? '#E0F2FE' : '#FFFFFF',
                          color: active ? '#0369A1' : '#334155'
                        }}
                      >
                        {c.name.split(' ')[0]} · ₹{Number(c.pending_udhaar).toLocaleString('en-IN')}
                      </button>
                    );
                  })}
              </div>

              {/* Step 2: QR Scan Action Mode */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                  {isHindi ? '2. QR स्कैन मोड चुनें (Scan Behavior)' : '2. Choose QR Scan Destination Mode'}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setQrMode('passbook')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: qrMode === 'passbook' ? '1.5px solid #002970' : '1px solid #CBD5E1',
                      background: qrMode === 'passbook' ? '#EFF6FF' : '#FFFFFF',
                      color: '#0F172A',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#002970' }}>
                      {isHindi ? '📒 पासबुक + UPI पेमेंट' : '📒 Khata Passbook + UPI'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                      {isHindi ? 'पूरा हिसाब देखें और 1-Tap में चुकाएं' : 'View itemized bill & settle via UPI'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrMode('upi_direct')}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: qrMode === 'upi_direct' ? '1.5px solid #002970' : '1px solid #CBD5E1',
                      background: qrMode === 'upi_direct' ? '#EFF6FF' : '#FFFFFF',
                      color: '#0F172A',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669' }}>
                      {isHindi ? '⚡ डायरेक्ट UPI Auto-Amount' : '⚡ Direct UPI Auto-Amount'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                      {isHindi ? 'Paytm/GPay में बकाया रकम ऑटो-भरे' : 'Pre-fills exact pending ₹ in UPI app'}
                    </div>
                  </button>
                </div>
              </div>

              {/* Live Selected Customer / Store Summary */}
              <div style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '10px 12px',
                marginBottom: '10px'
              }}>
                {selectedCustomer ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>
                        👤 {selectedCustomer.name} ({selectedCustomer.phone})
                      </strong>
                      <span style={{
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        color: Number(selectedCustomer.pending_udhaar) > 0 ? '#DC2626' : '#059669'
                      }}>
                        {Number(selectedCustomer.pending_udhaar) > 0
                          ? `₹${Number(selectedCustomer.pending_udhaar).toLocaleString('en-IN')} Udhaar`
                          : '₹0 All Clear'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginBottom: '8px' }}>
                      {isHindi ? 'पिछली खरीद:' : 'Recent items:'}{' '}
                      {customerEntries.length > 0
                        ? customerEntries.map((e) => `${e.item_description} (₹${e.amount})`).slice(0, 2).join(' · ')
                        : 'Kirana Ration Items'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={upiDeepLink}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: '#059669',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        ⚡ {isHindi ? `UPI ऐप खोलें (₹${selectedCustomer.pending_udhaar})` : `Open UPI App (₹${selectedCustomer.pending_udhaar})`}
                      </a>
                      {Number(selectedCustomer.pending_udhaar) > 0 && (
                        <button
                          type="button"
                          disabled={settling}
                          onClick={() => handleInstantCustomerSettle(selectedCustomer)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #059669',
                            background: '#ECFDF5',
                            color: '#065F46',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {settling
                            ? '...'
                            : isHindi
                            ? '✓ QR पेमेंट सिमुलेट और चुकता करें'
                            : '✓ Simulate Customer QR Scan & Settle'}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.86rem', color: '#0F172A' }}>
                        🏪 {merchant.shop_name} — Universal Counter Khata QR
                      </strong>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284C7' }}>
                        {customers.filter((c) => Number(c.pending_udhaar) > 0).length} Active Accounts
                      </span>
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      {isHindi
                        ? 'इसे प्रिंट करके दुकान के गल्ले पर लगाएं। कोई भी ग्राहक स्कैन करके अपना मोबाइल नंबर या नाम चुनकर बकाया देख और चुका सकता है।'
                        : 'Print and place this on your shop counter. Any customer can scan, select their name/phone, check their itemized balance, and pay via UPI.'}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Actions Row */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={handlePrintStandee}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                🖨️ {isHindi ? 'प्रिंट स्टैंडी' : 'Print Standee'}
              </button>
              <button
                type="button"
                onClick={handleDownloadSvg}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                ⬇️ {isHindi ? 'QR डाउनलोड (SVG)' : 'Download QR (SVG)'}
              </button>
              <button
                type="button"
                onClick={() => setScanModalOpen(true)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#002970',
                  color: '#FFFFFF',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                📱 {isHindi ? 'कस्टमर व्यू खोलें' : 'Open Customer View'}
              </button>
            </div>
          </div>

          {/* Right Column: Printable Paytm Branded Digital Khata QR Standee */}
          <div
            id="printableKhataStandeeCard"
            style={{
              background: '#FFFFFF',
              borderRadius: '12px',
              border: '2px solid #002970',
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              textAlign: 'center',
              boxShadow: '0 6px 20px rgba(0, 41, 112, 0.08)'
            }}
          >
            {/* Standee Top Brand Header */}
            <div style={{ width: '100%', borderBottom: '2px solid #00BAF2', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#002970', letterSpacing: '-0.5px' }}>
                  Pay<span style={{ color: '#00BAF2' }}>tm</span>
                </span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                  · Digital Bahi-Khata QR
                </span>
              </div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                {merchant.shop_name || 'Sharma Kirana & General Store'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#475569' }}>
                {selectedCustomer
                  ? `${isHindi ? 'ग्राहक खाता:' : 'Customer Khata:'} ${selectedCustomer.name} (${selectedCustomer.phone})`
                  : isHindi
                  ? 'अपना बही-खाता बैलेंस देखने और UPI से पेमेंट करने के लिए स्कैन करें'
                  : 'Scan to View Your Live Khata Balance & Settle Instantly via UPI'}
              </div>
            </div>

            {/* Scannable Vector QR Code Frame */}
            <div
              onClick={() => setScanModalOpen(true)}
              title="Click to simulate scanning this QR code"
              style={{
                padding: '10px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1.5px solid #E2E8F0',
                cursor: 'pointer',
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              {svgMarkup ? (
                <div
                  style={{ width: '176px', height: '176px' }}
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
              ) : (
                <div style={{ width: '176px', height: '176px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontSize: '0.8rem' }}>
                  Generating QR...
                </div>
              )}
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#002970', marginTop: '4px' }}>
                {selectedCustomer
                  ? Number(selectedCustomer.pending_udhaar) > 0
                    ? `${selectedCustomer.name} · ₹${Number(selectedCustomer.pending_udhaar).toLocaleString('en-IN')} Due`
                    : `${selectedCustomer.name} · ₹0 All Clear`
                  : `UPI VPA: ${merchant.upi_id || '8171008964@ptaxis'}`}
              </div>
            </div>

            {/* Standee Footer */}
            <div style={{ width: '100%', marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #CBD5E1', fontSize: '0.72rem', color: '#475569' }}>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>
                Paytm · Google Pay · PhonePe · BHIM UPI Accepted
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '2px' }}>
                🔊 Paytm Soundbox 4.0 Pro Instant Audio Confirmation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Customer Self-Serve Khata Passbook Modal (When QR is Scanned) */}
      {scanModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setScanModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #E2E8F0',
              boxShadow: '0 24px 48px rgba(0, 20, 60, 0.35)',
              fontVariantNumeric: 'tabular-nums'
            }}
          >
            {/* Customer Passbook Header */}
            <div style={{
              background: 'linear-gradient(135deg, #002970 0%, #0056B3 100%)',
              color: '#FFFFFF',
              padding: '16px 18px',
              borderTopLeftRadius: '15px',
              borderTopRightRadius: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Paytm Digital Khata · Customer Self-Serve Passbook
                </div>
                <h3 style={{ margin: '3px 0 2px', fontSize: '1.1rem', fontWeight: 800 }}>
                  {merchant.shop_name || 'Sharma Kirana & General Store'}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                  Verified Merchant · UPI: {merchant.upi_id || '8171008964@ptaxis'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScanModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  fontWeight: 800
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '16px 18px' }}>
              {settleSuccessBanner && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '12px'
                }}>
                  {settleSuccessBanner}
                </div>
              )}

              {/* Customer Switcher / Phone Search inside Customer Self-Serve View */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  {isHindi ? 'अपना नाम या मोबाइल नंबर चुनें:' : 'Find Your Customer Khata Account:'}
                </label>
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder={isHindi ? 'नाम या मोबाइल नंबर खोजें...' : 'Type your name or phone number...'}
                  style={{
                    width: '100%',
                    padding: '8px 11px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    marginBottom: '8px',
                    boxSizing: 'border-box'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {filteredModalCustomers.map((c) => {
                    const isSel = selectedCustomer && String(selectedCustomer.id) === String(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustId(String(c.id));
                          setSettleSuccessBanner('');
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSel ? '1.5px solid #002970' : '1px solid #CBD5E1',
                          background: isSel ? '#002970' : '#F8FAFC',
                          color: isSel ? '#FFFFFF' : '#0F172A'
                        }}
                      >
                        {c.name} · ₹{Number(c.pending_udhaar).toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Customer Balance & One-Tap UPI Settle Card */}
              {selectedCustomer ? (
                <div>
                  <div style={{
                    background: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '14px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                          {isHindi ? 'ग्राहक का नाम' : 'Customer Account'}
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                          {selectedCustomer.name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                          {selectedCustomer.phone} · {isHindi ? 'पिछली विजिट:' : 'Last visit:'} {selectedCustomer.last_visit_date || 'Today'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 600 }}>
                          {isHindi ? 'कुल बाकी उधार' : 'Pending Balance'}
                        </div>
                        <div style={{
                          fontSize: '1.55rem',
                          fontWeight: 900,
                          color: Number(selectedCustomer.pending_udhaar) > 0 ? '#DC2626' : '#059669'
                        }}>
                          ₹{Number(selectedCustomer.pending_udhaar).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>

                    {/* Itemized Entries List */}
                    <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                        {isHindi ? '🧾 सामान और लेन-देन का विवरण (Itemized Ledger):' : '🧾 Itemized Khata Statement:'}
                      </div>
                      {customerEntries.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {isHindi ? 'कोई पुराना रिकॉर्ड नहीं मिला।' : 'No recent ledger entries.'}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
                          {customerEntries.slice(0, 6).map((ent, i) => (
                            <div
                              key={ent.id || i}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '0.78rem',
                                padding: '6px 8px',
                                background: '#FFFFFF',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0'
                              }}
                            >
                              <div>
                                <strong style={{ color: '#0F172A' }}>{ent.item_description || 'Kirana Items'}</strong>
                                <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{ent.created_at || 'Recent'}</div>
                              </div>
                              <span style={{
                                fontWeight: 800,
                                color: ent.entry_type === 'jama' ? '#059669' : '#DC2626'
                              }}>
                                {ent.entry_type === 'jama' ? `-₹${ent.amount} (Paid)` : `+₹${ent.amount} (Udhaar)`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer UPI Payment Buttons */}
                  {Number(selectedCustomer.pending_udhaar) > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={settling}
                        onClick={() => handleInstantCustomerSettle(selectedCustomer)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          cursor: 'pointer',
                          boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)'
                        }}
                      >
                        {settling
                          ? isHindi
                            ? 'पेमेंट प्रोसेस हो रहा है...'
                            : 'Processing UPI Settlement...'
                          : isHindi
                          ? `⚡ अभी ₹${Number(selectedCustomer.pending_udhaar).toLocaleString('en-IN')} UPI से चुकाएं (Instant Settle + Soundbox Chime)`
                          : `⚡ Pay & Settle ₹${Number(selectedCustomer.pending_udhaar).toLocaleString('en-IN')} Now via UPI (Instant Soundbox Chime)`}
                      </button>

                      <a
                        href={upiDeepLink}
                        style={{
                          display: 'block',
                          textAlign: 'center',
                          padding: '9px',
                          borderRadius: '8px',
                          border: '1px solid #0284C7',
                          background: '#F0F9FF',
                          color: '#0369A1',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          textDecoration: 'none'
                        }}
                      >
                        📱 {isHindi ? 'Paytm / GPay / PhonePe ऐप में खोलें' : 'Launch Installed UPI App (upi://pay)'}
                      </a>
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      color: '#065F46',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '0.88rem'
                    }}>
                      ✓ {isHindi ? 'आपका पूरा हिसाब चुकता है (₹0 बाकी)!' : 'Your Khata Balance is Fully Settled (₹0 Due)!'}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  fontSize: '0.82rem',
                  color: '#475569'
                }}>
                  {isHindi
                    ? 'ऊपर दिए गए बटन से अपना नाम चुनें ताकि आपका बकाया हिसाब और UPI पेमेंट लिंक दिख सके।'
                    : 'Tap your name above to view your itemized Khata statement and 1-tap UPI payment button.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
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
    window.refreshProfitTrendsChart = () => {
      fetchTrends();
      if (typeof window.refreshDigitalKhataQR === 'function') {
        window.refreshDigitalKhataQR();
      }
    };

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
      {/* SECTION A: 7-Day Daily Profit Trends & Chhota Galla */}
      <div className="pos-bento-card pos-profit-trends-card" style={{ gridColumn: '1 / -1', padding: '1.25rem 1.4rem', fontVariantNumeric: 'tabular-nums' }}>
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

        <div
          className="profit-chart-responsive-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1.2rem',
            alignItems: 'stretch'
          }}
        >
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
                  <YAxis yAxisId="left" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#059669', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomProfitTooltip isHindi={isHindi} />} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Area yAxisId="left" type="monotone" dataKey="revenue" name={isHindi ? 'कुल बिक्री (Sales ₹)' : 'Daily Sales Revenue (₹)'} stroke="#00BAF2" strokeWidth={2} fillOpacity={1} fill="url(#revenueFill)" />
                  <Bar yAxisId="right" dataKey="profit" name={isHindi ? 'शुद्ध मुनाफा (Net Profit ₹)' : 'Net Take-Home Profit (₹)'} fill="#059669" radius={[6, 6, 0, 0]} barSize={26} />
                  <Line yAxisId="right" type="monotone" dataKey="profit" name={isHindi ? 'मुनाफा ट्रेंड' : 'Profit Trend Line'} stroke="#002970" strokeWidth={2.5} dot={{ r: 4, fill: '#002970', stroke: '#FFFFFF', strokeWidth: 1.5 }} />
                </ComposedChart>
              ) : (
                <ComposedChart data={days} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} axisLine={{ stroke: '#CBD5E1' }} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip content={<CustomProfitTooltip isHindi={isHindi} />} />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Bar dataKey="upi_revenue" stackId="a" name={isHindi ? 'ऑटो Soundbox QR (₹)' : 'Auto Soundbox QR Sales (₹)'} fill="#002970" barSize={28} />
                  <Bar dataKey="micro_revenue" stackId="a" name={isHindi ? 'छोटा गल्ला: ₹15 दही / ₹20 दूध (₹)' : 'Chhota Galla Micro-Sales (₹)'} fill="#F59E0B" radius={[6, 6, 0, 0]} barSize={28} />
                  <Line type="monotone" dataKey="profit" name={isHindi ? 'शुद्ध मुनाफा (Net Profit ₹)' : 'Net Profit (₹)'} stroke="#059669" strokeWidth={2.5} dot={{ r: 4, fill: '#059669' }} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>

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

      {/* SECTION B: Personalized Digital Khata QR & Print Standee Studio */}
      <DigitalKhataQRSection isHindi={isHindi} />
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
