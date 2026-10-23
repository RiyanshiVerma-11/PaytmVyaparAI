/**
 * Flagship Cockpit UI Controller - Fully Dynamic Real-Time Vyapar Operating System
 * Connects all sidebar views (Dashboard, Bahi-Khata, Inventory, History, Analytics)
 * to real-time SQLite database endpoints with live Soundbox voice feedback.
 */
document.addEventListener('DOMContentLoaded', () => {

  // Current Active State
  let currentView = 'dashboard';
  window.currentView = 'dashboard';
  let khataCache = { customers: [], entries: [] };
  let inventoryCache = { items: [], low_stock_items: [] };
  let transactionsCache = { transactions: [] };
  let khataFilter = 'all';
  let inventoryFilter = 'all';
  let historyFilter = 'all';

  // ========================================================
  // 1. COLLAPSIBLE SIDEBAR & RESPONSIVE TOGGLE
  // ========================================================
  const sidebar = document.getElementById('cockpitSidebar');
  const collapseBtn = document.getElementById('sidebarCollapseBtn');

  if (collapseBtn && sidebar) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('paytm_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    });

    if (localStorage.getItem('paytm_sidebar_collapsed') === 'true') {
      sidebar.classList.add('collapsed');
    }
  }

  // ========================================================
  // 2. THEME SETUP (PERMANENT CRISP PAYTM LIGHT THEME)
  // ========================================================
  localStorage.setItem('paytm_theme', 'light');
  document.documentElement.setAttribute('data-theme', 'light');
  const themeSwitch = document.getElementById('themeSwitch');
  if (themeSwitch) {
    themeSwitch.style.display = 'none';
  }

  // ========================================================
  // 2.5 BILINGUAL LANGUAGE ENGINE (English/Hinglish & शुद्ध हिन्दी)
  // ========================================================
  const I18N = {
    en: {
      voiceAction: "Bol Kar Likhein",
      voiceTag: "Hindi • Hinglish",
      voiceListening: "Sun raha hai...",
      navDashboard: "Dashboard",
      navKhata: "Bahi-Khata",
      navInventory: "Stock & Samaan",
      navHistory: "Transactions",
      navGrowth: "Growth & Loans",
      logout: "Log Out",
      todayEarningsLabel: "Aaj Ki Kamai",
      todayEarningsSub: "28 Payments • Settled",
      pendingUdhaarLabel: "Baaki Udhaar",
      pendingUdhaarSub: "₹1,450 Wapas Aaya",
      soundboxStatusLabel: "Soundbox Status",
      soundboxStatusVal: "● Connected",
      soundboxStatusSub: "Battery: 94% • Hindi Ready",
      loanAvailableLabel: "Loan Available",
      loanAvailableSub: "0 Paperwork • Turant Milega",
      khataTitle: "Bahi-Khata",
      khataMicBtn: "Bol Kar Likhein",
      khataChipPending: "Pending",
      khataChipRecovered: "Recovered",
      khataChipActive: "Accounts",
      soundboxConnected: "Soundbox Connected",
      voiceHint: 'Bolein: <em>"Ramesh ₹200 udhaar"</em>',
      btnReminder: "Reminder Bhejo",
      btnViewAllKhata: "Poori Khata Dekhein",
      growthTitle: "AI Growth Engine",
      winbackAlert: "Old Customers",
      growthBadgeAlert: "Old Customer",
      growthCustomerText: "Manoj Verma hasn't visited in 45 days. High churn risk.",
      growthOfferSub: "10% Discount Voucher",
      btnSendOffer: "Offer Bhejo (10% Discount)",
      festiveSurgeTitle: "Diwali High Sales",
      festiveBadge: "Diwali +42%",
      festiveCardBody: "Mustard Oil & Basmati demand surges in 4 days. Lock wholesale rates today.",
      festiveSurgeMeta: "Wholesale Margin Gain: <strong>+₹4,200</strong>",
      btnOrderStock: "Order Karein",
      btnOrderStockFast: "Order Karein",
      counterSmartCombo: "Counter Combo",
      comboMargin: "+18% Profit",
      comboCardText: "Tea Leaves + Parle-G bundle recommended at checkout (18% extra margin)",
      stockTitle: "Stock Alert",
      stockChipCatalog: "Stock",
      stockChipVal: "94% Stocked",
      stockChipUrgent: "Low Stock",
      stockChipUrgentVal: "3 Items",
      stockChipAutoPO: "Supplier",
      stockChipAutoPOVal: "Connected",
      stockPartnerSummary: "Wholesale Supplier Connected (24h Delivery)",
      stockPillSalt: "2 pkts left",
      stockPillOil: "3 btls left",
      stockPillAtta: "1 bag left",
      btnViewAllStock: "Stock Dekhein",
      creditScoreTier: "Accha Score",
      creditLoanReady: "PRE-APPROVED LOAN",
      creditTagline: "Collateral-Free Instant Working Capital",
      creditDailyTerms: "₹75,000 Loan Ready • Great Past Record • Direct to Bank Account in 1 Min",
      btnClaimLoan: "Paisa Payein",
      btnClaimLoanSub: "Turant Bank Mein",
      mobileHome: "Home",
      mobileKhata: "Khata",
      mobileStock: "Stock",
      mobileMadad: "Madad"
    },
    hi: {
      voiceAction: "बोल कर लिखें",
      voiceTag: "हिंदी • हिंग्लिश",
      voiceListening: "सुन रहा है...",
      navDashboard: "डैशबोर्ड",
      navKhata: "बही-खाता",
      navInventory: "स्टॉक और सामान",
      navHistory: "लेन-देन का हिसाब",
      navGrowth: "व्यापार ग्रोथ और लोन",
      logout: "लॉग आउट",
      todayEarningsLabel: "आज की कमाई",
      todayEarningsSub: "28 भुगतान • खाते में जमा",
      pendingUdhaarLabel: "बाकी उधार",
      pendingUdhaarSub: "₹1,450 वापस आया",
      soundboxStatusLabel: "साउंडबॉक्स स्थिति",
      soundboxStatusVal: "● कनेक्टेड",
      soundboxStatusSub: "बैटरी: 94% • हिंदी तैयार",
      loanAvailableLabel: "लोन उपलब्ध",
      loanAvailableSub: "0 कागजी कार्रवाई • तुरंत मिलेगा",
      khataTitle: "बही-खाता",
      khataMicBtn: "बोल कर लिखें",
      khataChipPending: "बाकी उधार",
      khataChipRecovered: "वसूल हुआ",
      khataChipActive: "खाते",
      soundboxConnected: "साउंडबॉक्स चालू है",
      voiceHint: 'बोलें: <em>"रमेश ₹200 उधार"</em>',
      btnReminder: "याद दिलाएं",
      btnViewAllKhata: "पूरा खाता देखें",
      growthTitle: "व्यापार ग्रोथ",
      winbackAlert: "पुराने ग्राहक",
      growthBadgeAlert: "पुराने ग्राहक",
      growthCustomerText: "मनोज वर्मा 45 दिनों से नहीं आए। ग्राहक टूटने का रिस्क है।",
      growthOfferSub: "10% छूट कूपन तैयार",
      btnSendOffer: "ऑफर भेजें (10% छूट)",
      festiveSurgeTitle: "दीवाली पर ज्यादा बिक्री",
      festiveBadge: "दीवाली पर ज्यादा बिक्री",
      festiveCardBody: "4 दिनों में सरसों तेल और बासमती की मांग बढ़ेगी। आज ही थोक भाव में बुक करें।",
      festiveSurgeMeta: "थोक में बचत: <strong>₹4,200</strong>",
      btnOrderStock: "ऑर्डर करें",
      btnOrderStockFast: "सस्ते रेट में ऑर्डर करें",
      counterSmartCombo: "काउंटर कॉम्बो",
      comboMargin: "+18% मुनाफा",
      comboCardText: "चाय पत्ती के साथ पारले-जी ऑफर करें (18% ज्यादा मुनाफा)",
      stockTitle: "स्टॉक अलर्ट",
      stockChipCatalog: "स्टॉक",
      stockChipVal: "94% भरा हुआ",
      stockChipUrgent: "कम स्टॉक",
      stockChipUrgentVal: "3 सामान",
      stockChipAutoPO: "सप्लायर",
      stockChipAutoPOVal: "जुड़ा हुआ है",
      stockPartnerSummary: "थोक सप्लायर जुड़ा हुआ है (24 घंटे में डिलीवरी)",
      stockPillSalt: "सिर्फ 2 बचे हैं",
      stockPillOil: "सिर्फ 3 बचे हैं",
      stockPillAtta: "सिर्फ 1 बचा है",
      btnViewAllStock: "स्टॉक देखें",
      creditScoreTier: "शानदार स्कोर",
      creditLoanReady: "लोन प्री-अप्रूव्ड",
      creditTagline: "बिना किसी गारंटी के तुरंत बिजनेस लोन",
      creditDailyTerms: "₹75,000 का लोन तैयार • पुराना रिकॉर्ड बहुत अच्छा • 1 मिनट में सीधे बैंक खाते में",
      btnClaimLoan: "पैसे पाएं",
      btnClaimLoanSub: "सीधे बैंक खाते में",
      mobileHome: "होम",
      mobileKhata: "खाता",
      mobileStock: "स्टॉक",
      mobileMadad: "मदद"
    }
  };

  function setLanguage(lang) {
    localStorage.setItem('paytm_lang', lang);
    const dict = I18N[lang] || I18N.en;

    const toggleBtn = document.getElementById('langToggleBtn');
    if (toggleBtn) {
      const enSpan = toggleBtn.querySelector('[data-lang="en"]');
      const hiSpan = toggleBtn.querySelector('[data-lang="hi"]');
      if (lang === 'hi') {
        if (enSpan) enSpan.className = 'lang-toggle-inactive';
        if (hiSpan) hiSpan.className = 'lang-toggle-active';
      } else {
        if (enSpan) enSpan.className = 'lang-toggle-active';
        if (hiSpan) hiSpan.className = 'lang-toggle-inactive';
      }
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) {
        el.innerHTML = dict[key];
      }
    });

    const topSearch = document.getElementById('topSearchInput');
    if (topSearch) {
      topSearch.placeholder = lang === 'hi' ? 'कुछ भी खोजें या बोलें...' : 'Kuch bhi search karein...';
    }

    const cardSearch = document.getElementById('dashboardKhataSearchInput');
    if (cardSearch) {
      cardSearch.placeholder = lang === 'hi' ? 'ग्राहक खोजें (नाम या मोबाइल)...' : 'Search customer name or phone...';
    }

    if (typeof loadDashboardData === 'function') loadDashboardData();
    if (typeof renderKhataCustomersTable === 'function') renderKhataCustomersTable();
    if (typeof renderInventoryTable === 'function') renderInventoryTable();
  }

  window.setLanguage = setLanguage;

  const langToggleBtn = document.getElementById('langToggleBtn');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const current = localStorage.getItem('paytm_lang') || 'en';
      const next = current === 'en' ? 'hi' : 'en';
      setLanguage(next);
      if (window.paytmSoundbox) {
        window.paytmSoundbox.broadcast(next === 'hi' ? 'Bhasha Hindi chuni gayi' : 'Language set to English');
      }
      showNotification(next === 'hi' ? 'भाषा बदलकर हिंदी कर दी गई है' : 'Language set to English / Hinglish', 'info');
    });
  }

  // Instant 1-Click Loan Disbursal Trigger
  window.disburseLoanInstant = function() {
    const modalLoan = document.getElementById('modalLoanDisbursal');
    if (modalLoan) {
      const successMsg = document.getElementById('loanDisbursalSuccessMessage');
      const confirmBtn = document.getElementById('confirmLoanDisbursalBtn');
      if (successMsg) successMsg.style.display = 'none';
      if (confirmBtn) {
        confirmBtn.disabled = false;
        const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';
        confirmBtn.textContent = isHindi ? 'स्वीकार करें और पैसे लें' : 'Accept & Disburse Now';
      }
      modalLoan.style.display = 'flex';
    } else if (window.switchView) {
      window.switchView('analytics');
    }
  };

  // ========================================================
  // 3. LOGOUT HANDLER
  // ========================================================
  const logoutBtn = document.getElementById('sidebarLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (typeof window.handleMerchantLogout === 'function') {
        window.handleMerchantLogout();
      } else {
        localStorage.removeItem('paytm_merchant_session');
        const landingEl = document.getElementById('landingView');
        const appEl = document.getElementById('appView');
        if (appEl) appEl.style.display = 'none';
        if (landingEl) landingEl.style.display = 'flex';
        document.body.classList.remove('in-cockpit');
        window.location.hash = '';
        showNotification('Logged out successfully', 'info');
      }
    });
  }

  // ========================================================
  // 4. SIDEBAR NAVIGATION & DYNAMIC VIEW SWITCHING
  // ========================================================
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-view]');
  const viewSections = document.querySelectorAll('.cockpit-view-section');

  function switchView(viewName) {
    currentView = viewName;
    window.currentView = viewName;

    // Update active sidebar item
    sidebarItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update active mobile nav item
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Hide all sections and show target
    viewSections.forEach(section => {
      if (section.id === `view-${viewName}`) {
        section.classList.add('active');
        section.style.display = 'block';
      } else {
        section.classList.remove('active');
        section.style.display = 'none';
      }
    });

    // Load dynamic data for view
    if (viewName === 'dashboard') {
      loadDashboardData();
    } else if (viewName === 'khata') {
      loadKhataView();
    } else if (viewName === 'inventory') {
      loadInventoryView();
    } else if (viewName === 'history') {
      loadHistoryView();
    } else if (viewName === 'analytics') {
      loadAnalyticsView();
    }
  }

  window.switchView = switchView;
  window.loadDashboardData = loadDashboardData;
  window.loadLedgerCard = loadLedgerCard;
  window.loadKhataView = loadKhataView;
  window.renderKhataCustomersTable = renderKhataCustomersTable;
  window.renderKhataAuditList = renderKhataAuditList;
  window.loadGrowthCard = loadGrowthCard;
  window.loadStockCard = loadStockCard;
  window.loadLoanCard = loadLoanCard;


  sidebarItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      switchView(targetView);
    });
  });

  // Shortcut from Dashboard Card 1 to Bahi-Khata view
  const dashboardViewLedgerBtn = document.getElementById('dashboardViewLedgerBtn');
  if (dashboardViewLedgerBtn) {
    dashboardViewLedgerBtn.addEventListener('click', () => switchView('khata'));
  }

  // ========================================================
  // 5. VOICE COMMAND & AI AGENT INTEGRATION
  // ========================================================
  const micBtn = document.getElementById('voiceMicTrigger');
  const desktopMicBtn = document.getElementById('desktopVoiceMicBtn');
  const voicePulse = document.getElementById('voicePulseIndicator');

  const speech = new SpeechEngine(
    (transcript) => {
      executeVoiceQuery(transcript);
    },
    (isListening) => {
      if (voicePulse) {
        voicePulse.style.display = isListening ? 'flex' : 'none';
      }
      if (micBtn) {
        if (isListening) {
          micBtn.classList.add('listening');
          const span = micBtn.querySelector('span');
          if (span) span.textContent = '🔴 Sun Rahe Hain...';
        } else {
          micBtn.classList.remove('listening');
          const span = micBtn.querySelector('span');
          if (span) span.textContent = '🎤 Bol Kar Likhein';
        }
      }
      if (desktopMicBtn) {
        if (isListening) {
          desktopMicBtn.classList.add('listening');
          const act = desktopMicBtn.querySelector('.desktop-voice-action');
          if (act) act.textContent = '🔴 Sun Rahe Hain...';
        } else {
          desktopMicBtn.classList.remove('listening');
          const act = desktopMicBtn.querySelector('.desktop-voice-action');
          if (act) act.textContent = 'Bol Kar Likhein (Mic)';
        }
      }
    }
  );

  if (micBtn) {
    micBtn.addEventListener('click', () => speech.toggle());
  }
  if (desktopMicBtn) {
    desktopMicBtn.addEventListener('click', () => speech.toggle());
  }

  // Top Search Input for voice or direct commands
  const topSearchInput = document.getElementById('topSearchInput');
  if (topSearchInput) {
    topSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = topSearchInput.value.trim();
        if (q) executeVoiceQuery(q);
      }
    });
  }

  // Direct In-Card Customer Search Listeners
  const dashboardKhataSearchInput = document.getElementById('dashboardKhataSearchInput');
  const clearDashboardKhataSearch = document.getElementById('clearDashboardKhataSearch');

  if (dashboardKhataSearchInput) {
    dashboardKhataSearchInput.addEventListener('input', () => {
      loadLedgerCard(true);
    });
  }

  if (clearDashboardKhataSearch) {
    clearDashboardKhataSearch.addEventListener('click', () => {
      if (dashboardKhataSearchInput) {
        dashboardKhataSearchInput.value = '';
        dashboardKhataSearchInput.focus();
      }
      loadLedgerCard(true);
    });
  }

  async function executeVoiceQuery(queryText) {
    showNotification(`🎤 Processing: "${queryText}"`, 'info');
    try {
      const res = await API.sendQuery(queryText);

      // Play Soundbox Chime & Voice
      const sp = res.soundbox_payload || (res.result && res.result.soundbox_payload) || (res.data && res.data.soundbox_payload);
      if (sp && window.paytmSoundbox) {
        window.paytmSoundbox.broadcast(sp.speech_text);
        showNotification(`🔊 Soundbox: ${sp.speech_text}`, 'success');
      } else if (res.reply) {
        const firstLine = res.reply.split('\n')[0].replace(/[#*]/g, '');
        showNotification(`🤖 Copilot: ${firstLine}`, 'success');
      }

      // Immediately refresh all views
      await loadDashboardData();
      if (typeof loadKhataView === 'function') await loadKhataView();
      if (typeof renderKhataAuditList === 'function') renderKhataAuditList();
      if (typeof loadHistoryView === 'function') await loadHistoryView();

    } catch (err) {
      showNotification(`❌ Error: ${err.message}`, 'error');
    }
  }

  // ========================================================
  // 6. VIEW 1: DASHBOARD OVERVIEW DATA LOADER
  // ========================================================
  async function loadDashboardData() {
    loadLedgerCard();
    loadGrowthCard();
    loadStockCard();
    loadLoanCard();
  }

  // Card 1: Live Voice Khata Ledger
  async function loadLedgerCard(useCache = false) {
    try {
      let data = khataCache;
      if (!useCache || !data || !data.customers || data.customers.length === 0) {
        data = await API.getKhata();
        if (data) {
          khataCache = data;
        }
      }

      // Dynamically sync Glance Strip and Metric Chips
      const customers = data.customers || [];
      const totalPending = data.total_pending_udhaar !== undefined 
        ? data.total_pending_udhaar 
        : customers.reduce((sum, c) => sum + (c.pending_udhaar || 0), 0);
      const pendingCustomersCount = customers.filter(c => (c.pending_udhaar || 0) > 0).length;
      const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';

      const glancePendingEl = document.getElementById('glancePendingUdhaar');
      if (glancePendingEl) glancePendingEl.textContent = `₹${Math.round(totalPending).toLocaleString('en-IN')}`;

      const glanceCountEl = document.getElementById('glanceUdhaarCount');
      if (glanceCountEl) glanceCountEl.textContent = isHindi ? `कुल ${pendingCustomersCount} ग्राहक` : `${pendingCustomersCount} Grahak`;

      const cardPendingPill = document.getElementById('cardKhataPendingPill');
      if (cardPendingPill) cardPendingPill.textContent = isHindi ? `₹${Math.round(totalPending).toLocaleString('en-IN')} उधार` : `₹${Math.round(totalPending).toLocaleString('en-IN')} Udhaar`;

      const chipPending = document.getElementById('chipPendingUdhaar');
      if (chipPending) chipPending.textContent = `₹${Math.round(totalPending).toLocaleString('en-IN')}`;

      const chipActive = document.getElementById('chipActiveGrahak');
      if (chipActive) chipActive.textContent = isHindi ? `कुल ${pendingCustomersCount} ग्राहक` : `${pendingCustomersCount} Grahak`;

      const recoveredAmt = data.total_recovered !== undefined
        ? data.total_recovered
        : (data.entries || []).filter(e => e.entry_type === 'jama').reduce((sum, e) => sum + (e.amount || 0), 0);

      const chipRecovered = document.getElementById('chipRecoveredUdhaar');
      if (chipRecovered) chipRecovered.textContent = `₹${Math.round(recoveredAmt).toLocaleString('en-IN')}`;

      const glanceRecoveredEl = document.getElementById('glanceUdhaarSubtext');
      if (glanceRecoveredEl) {
        glanceRecoveredEl.textContent = isHindi 
          ? `₹${Math.round(recoveredAmt).toLocaleString('en-IN')} वापस आया` 
          : `₹${Math.round(recoveredAmt).toLocaleString('en-IN')} Wapas Aaya`;
      }

      const listEl = document.getElementById('liveLedgerList');
      if (!listEl) return;

      listEl.innerHTML = '';
      
      // Real-time In-card Search Filter
      const searchInput = document.getElementById('dashboardKhataSearchInput');
      const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const clearBtn = document.getElementById('clearDashboardKhataSearch');
      if (clearBtn) {
        clearBtn.style.display = searchTerm ? 'flex' : 'none';
      }

      // STRICT FILTER: Only show customers who actually have pending udhaar!
      let pendingCustomers = customers.filter(c => (c.pending_udhaar || 0) > 0);
      
      if (searchTerm) {
        pendingCustomers = pendingCustomers.filter(c => 
          (c.name && c.name.toLowerCase().includes(searchTerm)) ||
          (c.phone && c.phone.includes(searchTerm))
        );
      }

      if (pendingCustomers.length === 0) {
        if (searchTerm) {
          listEl.innerHTML = `
            <div style="padding:1.2rem 1rem; color:#64748B; text-align:center; background:#F8FAFC; border:1px dashed #CBD5E1; border-radius:10px; margin:6px 0;">
              <span style="font-size:1.2rem; display:block; margin-bottom:4px;">🔍</span>
              <strong style="font-size:0.88rem; color:#0F172A;">${isHindi ? 'कोई ग्राहक नहीं मिला:' : 'No matching customer:'} "${searchTerm}"</strong>
              <div style="font-size:0.75rem; color:#64748B; margin-top:2px;">${isHindi ? 'स्पेलिंग चेक करें या मोबाइल नंबर डालें' : 'Check spelling or enter phone number'}</div>
            </div>`;
        } else {
          listEl.innerHTML = `
            <div style="padding:1.4rem 1rem; color:#059669; text-align:center; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; margin:6px 0;">
              <div style="font-size:1.6rem; margin-bottom:4px;">🎉</div>
              <strong style="font-size:0.95rem; display:block; color:#065F46;">${isHindi ? 'कोई बाकी उधार नहीं है!' : 'No Pending Udhaar!'}</strong>
              <span style="font-size:0.8rem; color:#047857;">${isHindi ? 'सभी ग्राहकों का हिसाब चुकता है। पूरा खाता नीचे देखें।' : 'All customer accounts are clear & settled.'}</span>
            </div>`;
        }
        return;
      }

      pendingCustomers.forEach((c) => {
        const item = document.createElement('div');
        item.className = 'pos-feed-row';
        item.id = `khataRow-${c.id}`;

        const reminderMsg = encodeURIComponent(
          `Namaste ${c.name} ji! Sharma Kirana Store se aapka kul baaki udhaar Rs.${c.pending_udhaar} hai. Kripya is Paytm UPI link se bhugtan karein: upi://pay?pa=paytm@sharmakirana&am=${c.pending_udhaar}&pn=SharmaKirana. Dhanyawad!`
        );
        const whatsappUrl = `https://wa.me/${(c.phone || '').replace(/[^0-9]/g, '')}?text=${reminderMsg}`;

        const settleBtnText = isHindi ? '✓ पैसे मिले' : '✓ Paid';

        item.innerHTML = `
          <div class="pos-row-left">
            <span class="pos-dot pos-dot-coral"></span>
            <div class="pos-customer-meta">
              <span class="pos-customer-name">${c.name}</span>
              <span class="pos-customer-sub">${c.phone || '+91 98112XXXXX'}</span>
            </div>
          </div>
          <div class="pos-row-right">
            <span class="pos-amount-tag pos-amount-coral">₹${c.pending_udhaar.toLocaleString('en-IN')} ${isHindi ? 'उधार' : 'Udhaar'}</span>
            <span class="pos-time-tag">${c.last_visit_date || 'Today'}</span>
            <div style="display:flex; align-items:center; gap:5px;">
              <button class="pos-btn-action-sm pos-btn-settle-emerald" 
                      title="${isHindi ? 'पूरा पैसा आ गया (खाता चुकता)' : 'Mark full amount paid'}"
                      onclick="window.settleKhataDirect(${c.id}, '${c.name}', ${c.pending_udhaar}, this)">
                ${settleBtnText}
              </button>
              <a href="${whatsappUrl}" target="_blank" class="pos-btn-action-sm pos-btn-reminder-blue" 
                 style="text-decoration:none; display:inline-flex; align-items:center; gap:2px;"
                 title="${isHindi ? 'व्हाट्सएप पर याद दिलाएं' : 'Send WhatsApp Reminder'}">
                💬
              </a>
            </div>
          </div>
        `;
        listEl.appendChild(item);
      });
    } catch(e) {
      console.error('Error loading ledger card:', e);
    }
  }

  // 1-Click Instant Settle Interaction with Smooth Fade-Out
  window.settleKhataDirect = async function(customerId, customerName, pendingAmount, btn) {
    const row = btn ? btn.closest('.pos-feed-row') : document.getElementById(`khataRow-${customerId}`);
    if (row) {
      row.style.transition = 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)';
      row.style.opacity = '0';
      row.style.transform = 'translateX(25px)';
    }

    const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';
    showNotification(isHindi ? `✅ ${customerName}: ₹${pendingAmount} हिसाब चुकता हो गया!` : `✅ ${customerName}: ₹${pendingAmount} settled!`, 'success');

    try {
      const res = await API.settleKhataCustomer(customerId);
      if (res.soundbox_payload && window.paytmSoundbox) {
        window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
      }
      setTimeout(async () => {
        if (row) row.remove();
        await loadDashboardData();
        if (typeof renderKhataAuditList === 'function') renderKhataAuditList();
      }, 350);
    } catch(err) {
      showNotification(`❌ Error: ${err.message}`, 'error');
      if (row) {
        row.style.opacity = '1';
        row.style.transform = 'none';
      }
    }
  };

  // Card 2: AI Merchant Growth Engine
  async function loadGrowthCard() {
    try {
      const data = await API.getGrowth();
      const nameEl = document.getElementById('growthCustomerName');
      const offerBtn = document.getElementById('growthSendOfferBtn');
      const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';

      if (data.campaigns && data.campaigns.length > 0) {
        const c = data.campaigns[0];
        if (nameEl) {
          nameEl.textContent = isHindi 
            ? 'मनोज वर्मा 45 दिनों से नहीं आए। ग्राहक टूटने का रिस्क है।'
            : "Manoj Verma hasn't visited in 45 days. High churn risk.";
        }
        if (offerBtn) {
          offerBtn.innerHTML = `<span>📲</span> ${isHindi ? 'ऑफर भेजें (10% छूट)' : 'Offer Bhejo (10% Discount)'}`;
          offerBtn.onclick = () => {
            window.location.href = c.sms_uri;
            showNotification(isHindi ? '📲 मनोज वर्मा के लिए 10% छूट का एसएमएस तैयार' : '📲 Offer SMS prepared for Manoj Verma', 'success');
          };
        }
      }
    } catch(e) {
      console.error('Error loading growth card:', e);
    }
  }

  // Card 3: Low Stock Warnings
  async function loadStockCard() {
    try {
      const data = await API.getInventory();
      const container = document.getElementById('stockWarningContainer');
      if (!container) return;

      container.innerHTML = '';
      const displayItems = data.low_stock_items && data.low_stock_items.length > 0 
        ? data.low_stock_items.slice(0, 3) 
        : (data.items ? data.items.slice(0, 3) : []);
      const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';

      if (displayItems.length === 0) {
        container.innerHTML = `<div style="padding:1rem; color:#00d26a; text-align:center;">${isHindi ? '✓ सारा सामान स्टॉक में मौजूद है!' : '✓ All inventory items well stocked!'}</div>`;
        return;
      }

      displayItems.forEach(item => {
        const isLow = item.current_stock <= item.reorder_threshold;
        const orderText = isHindi ? 'ऑर्डर करें' : 'Order Karein';
        let stockLeftText = `${item.current_stock} left`;
        if (isHindi) {
          stockLeftText = item.current_stock === 1 ? 'सिर्फ 1 बचा है' : `सिर्फ ${item.current_stock} बचे हैं`;
        }

        const div = document.createElement('div');
        div.className = 'pos-stock-row';
        div.innerHTML = `
          <div class="pos-stock-meta">
            <span class="pos-stock-icon">📦</span>
            <div>
              <strong class="pos-stock-name">${item.item_name}</strong>
              <span class="pos-stock-sub">${isHindi ? 'थोक भाव' : 'Wholesale'}: ₹${item.wholesale_price || 50}/unit</span>
            </div>
          </div>
          <div class="pos-stock-action">
            <span class="pos-stock-pill ${isLow ? 'pos-stock-pill-critical' : 'pos-stock-pill-healthy'}">${stockLeftText}</span>
            <button class="pos-btn-action-sm" onclick="window.reorderStock('${item.item_name}', 15)">${orderText}</button>
          </div>
        `;
        container.appendChild(div);
      });
    } catch(e) {
      console.error('Error loading stock card:', e);
    }
  }

  // Card 4: Pre-Approved Loan Radial Gauge
  async function loadLoanCard() {
    try {
      const data = await API.getCredit();
      const scoreEl = document.getElementById('loanScoreNumber');
      const detailsEl = document.getElementById('loanEligibilityDetails');
      const isHindi = (localStorage.getItem('paytm_lang') || 'en') === 'hi';

      if (scoreEl) {
        const cleanScore = String(data.credit_health_score || '88').replace('/100', '');
        scoreEl.textContent = cleanScore;
      }
      if (detailsEl) {
        detailsEl.textContent = isHindi
          ? '₹75,000 का लोन तैयार • पुराना रिकॉर्ड बहुत अच्छा • 1 मिनट में सीधे बैंक खाते में'
          : `Current Eligibility: ₹${data.pre_approved_loan.toLocaleString()} | Recent repayment performance: Great | 1-Min Instant Disbursal Ready!`;
      }
    } catch(e) {
      console.error('Error loading loan card:', e);
    }
  }

  // ========================================================
  // 7. VIEW 2: BAHI-KHATA (DIGITAL UDHAAR LEDGER)
  // ========================================================
  async function loadKhataView() {
    try {
      const data = await API.getKhata();
      khataCache = data;

      // Calculate totals
      let totalPending = 0;
      let activeAccounts = data.customers ? data.customers.length : 0;
      data.customers.forEach(c => {
        totalPending += parseFloat(c.pending_udhaar || 0);
      });

      const totalPendingEl = document.getElementById('khataTotalPending');
      const customerCountEl = document.getElementById('khataCustomerCount');
      if (totalPendingEl) totalPendingEl.textContent = `₹${totalPending.toLocaleString()}`;
      if (customerCountEl) customerCountEl.textContent = activeAccounts;

      renderKhataCustomersTable();
      renderKhataAuditList();
    } catch (e) {
      console.error('Error loading Khata view:', e);
    }
  }

  function renderKhataCustomersTable() {
    const tbody = document.getElementById('khataCustomersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('khataSearchInput')?.value || '').toLowerCase().trim();

    let filtered = (khataCache.customers || []).filter(c => {
      // Search term filter
      const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm) || (c.phone && c.phone.includes(searchTerm));
      if (!matchesSearch) return false;

      // Filter pill
      if (khataFilter === 'pending') return c.pending_udhaar > 0;
      if (khataFilter === 'cleared') return c.pending_udhaar === 0;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No matching customer khata accounts found.</td></tr>`;
      return;
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      const isPending = c.pending_udhaar > 0;

      // Risk profile badge
      let riskBadge = `<span class="badge-status badge-green">Normal</span>`;
      if (c.churn_risk === 'At-Risk') riskBadge = `<span class="badge-status badge-orange">At-Risk</span>`;
      else if (c.churn_risk === 'Dormant') riskBadge = `<span class="badge-status badge-red">Dormant</span>`;

      // Polite Hindi WhatsApp Reminder message with UPI Deep Link
      const reminderMsg = encodeURIComponent(
        `Namaste ${c.name} ji! Sharma Kirana Store se aapka kul baaki udhaar Rs.${c.pending_udhaar} hai. Kripya is Paytm UPI link se bhugtan karein: upi://pay?pa=paytm@sharmakirana&am=${c.pending_udhaar}&pn=SharmaKirana. Dhanyawad!`
      );
      const whatsappUrl = `https://wa.me/${(c.phone || '').replace(/[^0-9]/g, '')}?text=${reminderMsg}`;

      tr.innerHTML = `
        <td>
          <div style="display:flex; align-items:center; gap:0.7rem;">
            <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg, var(--paytm-blue), var(--paytm-cyan)); color:white; font-weight:800; font-size:0.85rem; display:flex; align-items:center; justify-content:center;">
              ${c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <strong>${c.name}</strong>
          </div>
        </td>
        <td style="color:var(--text-secondary);">${c.phone || '+91 9810000000'}</td>
        <td style="font-weight:600;">₹${(c.total_spent || 0).toLocaleString()}</td>
        <td>
          <span class="badge-status ${isPending ? 'badge-orange' : 'badge-green'}" style="font-size:0.9rem;">
            ${isPending ? `₹${c.pending_udhaar.toLocaleString()}` : '₹0 (Clear)'}
          </span>
        </td>
        <td style="color:var(--text-secondary); font-size:0.85rem;">${c.last_visit_date || 'Today'}</td>
        <td>${riskBadge}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex; gap:0.5rem; justify-content:flex-end;">
            ${isPending ? `
              <a href="${whatsappUrl}" target="_blank" class="pos-btn-action-sm" style="text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem;" title="Send WhatsApp Reminder">
                💬 ${(localStorage.getItem('paytm_lang') || 'en') === 'hi' ? 'व्हाट्सएप भेजें' : 'WhatsApp Bhejo'}
              </a>
              <button class="pos-btn-action-sm" style="background:#059669;" onclick="window.settleKhata(${c.id}, '${c.name}', ${c.pending_udhaar})">
                ✓ ${(localStorage.getItem('paytm_lang') || 'en') === 'hi' ? 'पैसा आया' : 'Paisa Aaya'}
              </button>
            ` : `
              <span style="color:#059669; font-weight:700; font-size:0.85rem;">✓ ${(localStorage.getItem('paytm_lang') || 'en') === 'hi' ? 'चुकाया गया' : 'All Clear'}</span>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function renderKhataAuditList() {
    const auditList = document.getElementById('khataAuditList');
    if (!auditList) return;
    auditList.innerHTML = '';

    const entries = khataCache.entries || [];
    if (entries.length === 0) {
      auditList.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:1rem;">No transactions recorded yet.</div>';
      return;
    }

    entries.slice(0, 8).forEach(entry => {
      const isUdhaar = entry.entry_type === 'udhaar';
      const div = document.createElement('div');
      div.className = 'ledger-item audit-item';
      div.innerHTML = `
        <div style="display:flex; align-items:flex-start; gap:0.75rem; flex:1; min-width:0;">
          <span class="ledger-dot ${isUdhaar ? 'dot-orange' : 'dot-green'}" style="margin-top:5px;"></span>
          <div style="flex:1; min-width:0; line-height:1.35;">
            <div style="display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;">
              <strong style="font-size:0.90rem; font-weight:800; color:#0F172A;">${entry.customer_name}</strong>
              <span style="color:${isUdhaar ? '#DC2626' : '#059669'}; font-size:0.82rem; font-weight:700;">— ₹${entry.amount} (${isUdhaar ? 'Udhaar Added' : 'Jama / Repaid'})</span>
            </div>
            <div style="font-size:0.78rem; color:#64748B; margin-top:3px; font-weight:500;">${entry.item_description || 'Kirana Items'}</div>
          </div>
        </div>
        <div style="font-size:0.75rem; color:#64748B; white-space:nowrap; margin-left:12px; font-weight:600; flex-shrink:0;">${entry.created_at || 'Just now'}</div>
      `;
      auditList.appendChild(div);
    });
  }

  // Settle Khata Balance
  window.settleKhata = async function(customerId, customerName, pendingAmount) {
    if (!confirm(`Confirm full settlement of ₹${pendingAmount} for ${customerName}?`)) return;

    showNotification(`Processing settlement for ${customerName}...`, 'info');
    try {
      const res = await API.settleKhataCustomer(customerId);
      if (res.success) {
        showNotification(`✅ Balance settled for ${customerName}!`, 'success');
        if (res.soundbox_payload && window.paytmSoundbox) {
          window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
        }
        loadKhataView();
        loadDashboardData();
      }
    } catch(err) {
      showNotification(`❌ Error: ${err.message}`, 'error');
    }
  };

  // Khata Filter Pills
  document.querySelectorAll('[data-khata-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-khata-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      khataFilter = pill.getAttribute('data-khata-filter');
      renderKhataCustomersTable();
    });
  });

  const khataSearchInput = document.getElementById('khataSearchInput');
  if (khataSearchInput) {
    khataSearchInput.addEventListener('input', () => renderKhataCustomersTable());
  }

  // Khata Modal Controls
  const modalAddKhata = document.getElementById('modalAddKhata');
  const openAddKhataBtn = document.getElementById('openAddKhataModalBtn');
  const closeAddKhataBtn = document.getElementById('closeAddKhataModalBtn');
  const cancelAddKhataBtn = document.getElementById('cancelAddKhataBtn');
  const formAddKhata = document.getElementById('formAddKhata');

  if (openAddKhataBtn && modalAddKhata) {
    openAddKhataBtn.addEventListener('click', () => {
      modalAddKhata.style.display = 'flex';
      document.getElementById('khataInputName')?.focus();
    });
  }

  function closeKhataModal() {
    if (modalAddKhata) modalAddKhata.style.display = 'none';
  }
  if (closeAddKhataBtn) closeAddKhataBtn.addEventListener('click', closeKhataModal);
  if (cancelAddKhataBtn) cancelAddKhataBtn.addEventListener('click', closeKhataModal);

  if (formAddKhata) {
    formAddKhata.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('khataInputName').value.trim();
      const phone = document.getElementById('khataInputPhone').value.trim();
      const amount = document.getElementById('khataInputAmount').value.trim();
      const type = document.getElementById('khataInputType').value;
      const desc = document.getElementById('khataInputDesc').value.trim();

      if (!name || !amount) return;

      showNotification('Recording entry into Paytm Bahi-Khata...', 'info');
      try {
        const res = await API.addKhataEntry(name, amount, desc, type, phone);
        if (res.success) {
          closeKhataModal();
          formAddKhata.reset();
          showNotification(`✅ Entry recorded for ${res.customer_name}!`, 'success');
          if (res.soundbox_payload && window.paytmSoundbox) {
            window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
          }
          loadKhataView();
          loadDashboardData();
        }
      } catch(err) {
        showNotification(`❌ Error: ${err.message}`, 'error');
      }
    });
  }

  // ========================================================
  // 8. VIEW 3: INVENTORY & SMART REORDER
  // ========================================================
  const DEFAULT_MOCK_INVENTORY_ITEMS = [
    { item_name: 'Aashirvaad Shudh Chakki Atta 5kg', category: 'Flour', current_stock: 2, reorder_threshold: 6, unit: 'Bag', unit_price: 240, wholesale_price: 215, supplier_name: 'Gupta Oil & Grains Traders', supplier_email: 'orders@guptatraders.mock' },
    { item_name: 'Amul Butter 100g', category: 'Dairy', current_stock: 3, reorder_threshold: 10, unit: 'Pack', unit_price: 58, wholesale_price: 51, supplier_name: 'Delhi Dairy Wholesale Hub', supplier_email: 'orders@delhidairy.mock' },
    { item_name: 'Fortune Refined Oil 1L', category: 'Oil & Ghee', current_stock: 2, reorder_threshold: 8, unit: 'Pouch', unit_price: 145, wholesale_price: 130, supplier_name: 'Gupta Oil & Grains Traders', supplier_email: 'orders@guptatraders.mock' },
    { item_name: 'Maggi 2-Minute Noodles', category: 'Snacks', current_stock: 6, reorder_threshold: 24, unit: 'Pack', unit_price: 14, wholesale_price: 11.5, supplier_name: 'Nestle Regional Distributor', supplier_email: 'restock@nestledistributor.mock' },
    { item_name: 'Tata Salt 1kg', category: 'Groceries', current_stock: 19, reorder_threshold: 10, unit: 'Pouch', unit_price: 28, wholesale_price: 23, supplier_name: 'National FMCG Suppliers', supplier_email: 'orders@nationalfmcg.mock' },
    { item_name: 'Surf Excel Quick Wash 1kg', category: 'Detergent', current_stock: 7, reorder_threshold: 5, unit: 'Pack', unit_price: 135, wholesale_price: 118, supplier_name: 'Delhi FMCG Depot', supplier_email: 'orders@delhifmcg.mock' },
    { item_name: 'Parle-G Biscuits', category: 'Biscuits', current_stock: 8, reorder_threshold: 15, unit: 'Pack', unit_price: 10, wholesale_price: 8.2, supplier_name: 'National FMCG Suppliers', supplier_email: 'orders@nationalfmcg.mock' },
    { item_name: 'Taj Mahal Tea 250g', category: 'Beverages', current_stock: 14, reorder_threshold: 8, unit: 'Box', unit_price: 160, wholesale_price: 138, supplier_name: 'National FMCG Suppliers', supplier_email: 'orders@nationalfmcg.mock' }
  ];

  async function loadInventoryView() {
    try {
      const data = await API.getInventory();
      if (data && data.items && data.items.length > 0) {
        inventoryCache = data;
      } else if (!inventoryCache.items || inventoryCache.items.length === 0) {
        inventoryCache = {
          items: DEFAULT_MOCK_INVENTORY_ITEMS,
          low_stock_items: DEFAULT_MOCK_INVENTORY_ITEMS.filter(i => i.current_stock <= i.reorder_threshold),
          low_stock_count: DEFAULT_MOCK_INVENTORY_ITEMS.filter(i => i.current_stock <= i.reorder_threshold).length
        };
      }
    } catch(e) {
      console.warn('Backend unavailable or starting, using default seed inventory:', e);
      if (!inventoryCache.items || inventoryCache.items.length === 0) {
        inventoryCache = {
          items: DEFAULT_MOCK_INVENTORY_ITEMS,
          low_stock_items: DEFAULT_MOCK_INVENTORY_ITEMS.filter(i => i.current_stock <= i.reorder_threshold),
          low_stock_count: DEFAULT_MOCK_INVENTORY_ITEMS.filter(i => i.current_stock <= i.reorder_threshold).length
        };
      }
    }

    // Update stat cards
    const lowCount = inventoryCache.low_stock_count !== undefined 
      ? inventoryCache.low_stock_count 
      : (inventoryCache.items || []).filter(i => i.current_stock <= i.reorder_threshold).length;
    const totalSkus = inventoryCache.items ? inventoryCache.items.length : 0;
    let totalValue = 0;
    (inventoryCache.items || []).forEach(i => {
      totalValue += (i.current_stock || 0) * (i.unit_price || 0);
    });

    const invLowStockCountEl = document.getElementById('invLowStockCount');
    const invTotalSkusEl = document.getElementById('invTotalSkus');
    const invTotalValEl = document.getElementById('invTotalVal');

    if (invLowStockCountEl) invLowStockCountEl.textContent = lowCount;
    if (invTotalSkusEl) invTotalSkusEl.textContent = totalSkus;
    if (invTotalValEl) invTotalValEl.textContent = `₹${Math.round(totalValue).toLocaleString()}`;

    renderInventoryTable();
  }

  function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('inventorySearchInput')?.value || '').toLowerCase().trim();

    let filtered = (inventoryCache.items || []).filter(item => {
      // Search
      const matchesSearch = !searchTerm || item.item_name.toLowerCase().includes(searchTerm) || (item.category && item.category.toLowerCase().includes(searchTerm));
      if (!matchesSearch) return false;

      // Filter pill
      const isLow = item.current_stock <= item.reorder_threshold;
      if (inventoryFilter === 'low') return isLow;
      if (inventoryFilter === 'healthy') return !isLow;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.8rem;">No products match your filter.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'inv-table-row';
      const isLow = item.current_stock <= item.reorder_threshold;
      const marginPct = Math.round(((item.unit_price - item.wholesale_price) / item.unit_price) * 100);

      // Stock progress percentage
      const targetStock = item.reorder_threshold * 3;
      const fillPercent = Math.min(100, Math.round((item.current_stock / targetStock) * 100));

      tr.innerHTML = `
        <td class="inv-col-product">
          <strong class="inv-product-name">${item.item_name}</strong>
          <div class="inv-packaging-sub">Packaging: ${item.unit || 'Pack'}</div>
        </td>
        <td class="inv-col-category">
          <span class="badge-status badge-cyan inv-cat-badge">${item.category || 'General'}</span>
        </td>
        <td class="inv-col-stock">
          <div class="inv-stock-header">
            <span class="inv-stock-status" style="color:${isLow ? '#ff4d4f' : '#00d26a'};">${item.current_stock} left</span>
            <span class="inv-stock-threshold">Min: ${item.reorder_threshold}</span>
          </div>
          <div class="inv-stock-track">
            <div class="inv-stock-bar" style="width:${fillPercent}%; background:${isLow ? 'linear-gradient(90deg, #ff4d4f, #ff9f1c)' : 'linear-gradient(90deg, #00d26a, #00baf2)'};"></div>
          </div>
        </td>
        <td class="inv-col-price">
          <strong class="inv-price-val">₹${item.unit_price}</strong>
        </td>
        <td class="inv-col-cost">
          <span class="inv-wholesale-val">₹${item.wholesale_price}</span>
          <span class="inv-margin-tag">(${marginPct}%)</span>
        </td>
        <td class="inv-col-supplier">
          <div class="inv-supplier-name" title="${item.supplier_name || 'Wholesale Supplier'}">${item.supplier_name || 'Wholesale Supplier'}</div>
          <div class="inv-supplier-contact" title="${item.supplier_email || ''}">${item.supplier_email || 'orders@distributor.mock'}</div>
        </td>
        <td class="inv-col-action" style="text-align:right;">
          <button class="pos-btn-action-sm inv-btn-reorder" onclick="window.reorderStock('${item.item_name}', 15)">
            📦 ${(localStorage.getItem('paytm_lang') || 'en') === 'hi' ? 'ऑर्डर' : 'Order'} (15)
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 1-Click Wholesale Restock Reorder PO
  window.reorderStock = async function(itemName, quantity = 15) {
    showNotification(`📦 Generating Wholesale PO for ${itemName}...`, 'info');
    try {
      const res = await API.orderPO(itemName, quantity);
      if (res.success) {
        // Display PO Receipt Modal
        const poModal = document.getElementById('modalPOReceipt');
        const poTitle = document.getElementById('poReceiptTitle');
        const poSubtitle = document.getElementById('poReceiptSubtitle');
        const poPreview = document.getElementById('poReceiptEmailPreview');

        if (poTitle) poTitle.textContent = `PO #${res.po_number} Successfully Dispatched!`;
        if (poSubtitle) poSubtitle.textContent = `Automated restock email sent to ${res.supplier_name} (${res.supplier_email})`;
        if (poPreview && res.email_preview) {
          poPreview.textContent = `To: ${res.email_preview.to}\nSubject: ${res.email_preview.subject}\n\n${res.email_preview.body}`;
        }
        if (poModal) poModal.style.display = 'flex';

        // Soundbox Voice Announcement
        if (res.soundbox_payload && window.paytmSoundbox) {
          window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
        }

        showNotification(`✅ PO #${res.po_number} emailed to supplier!`, 'success');
        loadInventoryView();
        loadDashboardData();
      }
    } catch(err) {
      showNotification(`❌ Error: ${err.message}`, 'error');
    }
  };

  // Close PO Receipt Modal
  const closePOReceiptBtn = document.getElementById('closePOReceiptModalBtn');
  const okPOReceiptBtn = document.getElementById('okPOReceiptBtn');
  const modalPOReceipt = document.getElementById('modalPOReceipt');
  function closePOModal() {
    if (modalPOReceipt) modalPOReceipt.style.display = 'none';
  }
  if (closePOReceiptBtn) closePOReceiptBtn.addEventListener('click', closePOModal);
  if (okPOReceiptBtn) okPOReceiptBtn.addEventListener('click', closePOModal);

  // Inventory Filter Pills
  document.querySelectorAll('[data-inv-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-inv-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      inventoryFilter = pill.getAttribute('data-inv-filter');
      renderInventoryTable();
    });
  });

  const invSearchInput = document.getElementById('inventorySearchInput');
  if (invSearchInput) {
    invSearchInput.addEventListener('input', () => renderInventoryTable());
  }

  // Add Inventory Item Modal
  const modalAddInventory = document.getElementById('modalAddInventory');
  const openAddInvBtn = document.getElementById('openAddInventoryModalBtn');
  const closeAddInvBtn = document.getElementById('closeAddInventoryModalBtn');
  const cancelAddInvBtn = document.getElementById('cancelAddInventoryBtn');
  const formAddInventory = document.getElementById('formAddInventory');

  if (openAddInvBtn && modalAddInventory) {
    openAddInvBtn.addEventListener('click', () => {
      modalAddInventory.style.display = 'flex';
      document.getElementById('invInputName')?.focus();
    });
  }

  function closeInvModal() {
    if (modalAddInventory) modalAddInventory.style.display = 'none';
  }
  if (closeAddInvBtn) closeAddInvBtn.addEventListener('click', closeInvModal);
  if (cancelAddInvBtn) cancelAddInvBtn.addEventListener('click', closeInvModal);

  if (formAddInventory) {
    formAddInventory.addEventListener('submit', async (e) => {
      e.preventDefault();
      const itemData = {
        item_name: document.getElementById('invInputName').value.trim(),
        category: document.getElementById('invInputCategory').value,
        unit: document.getElementById('invInputUnit').value.trim() || 'Pack',
        current_stock: parseInt(document.getElementById('invInputStock').value),
        reorder_threshold: parseInt(document.getElementById('invInputThreshold').value),
        unit_price: parseFloat(document.getElementById('invInputPrice').value),
        wholesale_price: parseFloat(document.getElementById('invInputWholesale').value),
        supplier_name: document.getElementById('invInputSupplierName').value.trim(),
        supplier_email: document.getElementById('invInputSupplierEmail').value.trim()
      };

      if (!itemData.item_name) return;

      showNotification('Adding product to inventory...', 'info');
      try {
        const res = await API.addInventoryItem(itemData);
        if (res.success) {
          closeInvModal();
          formAddInventory.reset();
          showNotification(`✅ ${res.item_name} added to inventory!`, 'success');
          if (res.soundbox_payload && window.paytmSoundbox) {
            window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
          }
          loadInventoryView();
          loadDashboardData();
        }
      } catch(err) {
        showNotification(`❌ Error: ${err.message}`, 'error');
      }
    });
  }

  // ========================================================
  // 9. VIEW 4: TRANSACTIONS & SOUNDBOX TELEMETRY
  // ========================================================
  async function loadHistoryView() {
    try {
      const data = await API.getTransactions(100);
      transactionsCache = data;

      // Update stat cards
      const txTodayVolEl = document.getElementById('txTodayVol');
      const tx30dVolEl = document.getElementById('tx30dVol');
      const txTotalCountEl = document.getElementById('txTotalCount');

      if (txTodayVolEl) txTodayVolEl.textContent = `₹${data.today_volume.toLocaleString()}`;
      if (tx30dVolEl) tx30dVolEl.textContent = `₹${data.total_volume.toLocaleString()}`;
      if (txTotalCountEl) txTotalCountEl.textContent = `${data.total_count}+`;

      renderTransactionsTable();
    } catch(e) {
      console.error('Error loading history view:', e);
    }
  }

  function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const searchTerm = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();

    let filtered = (transactionsCache.transactions || []).filter(tx => {
      // Search term
      const matchesSearch = !searchTerm || (tx.txn_id && tx.txn_id.toLowerCase().includes(searchTerm)) || (tx.customer_phone && tx.customer_phone.includes(searchTerm));
      if (!matchesSearch) return false;

      // Filter pill
      if (historyFilter !== 'all' && tx.payment_mode !== historyFilter) return false;
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">No transactions match your search or filter.</td></tr>`;
      return;
    }

    filtered.forEach(tx => {
      const tr = document.createElement('tr');

      // Mode Badge
      let modeBadge = `<span class="badge-status badge-cyan">UPI Soundbox</span>`;
      if (tx.payment_mode === 'Cash') modeBadge = `<span class="badge-status badge-green">Cash</span>`;
      else if (tx.payment_mode === 'Udhaar') modeBadge = `<span class="badge-status badge-orange">Khata Udhaar</span>`;
      else if (tx.payment_mode === 'Loan_Disbursal') modeBadge = `<span class="badge-status badge-purple">Loan Disbursal</span>`;

      tr.innerHTML = `
        <td>
          <code style="color:var(--paytm-cyan); font-weight:700;">${tx.txn_id}</code>
        </td>
        <td style="font-weight:800; font-size:1rem; color:var(--text-primary);">
          ₹${parseFloat(tx.amount).toLocaleString()}
        </td>
        <td>${modeBadge}</td>
        <td style="color:var(--text-secondary);">${tx.customer_phone || '+91 9810998877'}</td>
        <td style="font-size:0.85rem; color:var(--text-muted);">${tx.timestamp || 'Today'}</td>
        <td style="text-align:right;">
          <span style="color:#00d26a; font-weight:700; font-size:0.85rem; display:inline-flex; align-items:center; gap:0.25rem;">
            ● SUCCESS
          </span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // History Filter Pills
  document.querySelectorAll('[data-tx-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('[data-tx-filter]').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      historyFilter = pill.getAttribute('data-tx-filter');
      renderTransactionsTable();
    });
  });

  const historySearchInput = document.getElementById('historySearchInput');
  if (historySearchInput) {
    historySearchInput.addEventListener('input', () => renderTransactionsTable());
  }

  // Amount chips for live payment simulator
  document.querySelectorAll('.amount-chip[data-amt]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.amount-chip[data-amt]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const amtInput = document.getElementById('simCustomAmount');
      if (amtInput) amtInput.value = chip.getAttribute('data-amt');
    });
  });

  // Real-Time Soundbox QR Payment Simulator Trigger
  const simulateTxnBtn = document.getElementById('simulateTxnBtn');
  if (simulateTxnBtn) {
    simulateTxnBtn.addEventListener('click', async () => {
      const amtInput = document.getElementById('simCustomAmount');
      const phoneInput = document.getElementById('simCustomerPhone');
      const amount = parseFloat(amtInput?.value || 250);
      const phone = phoneInput?.value.trim() || '+91 9810998877';

      if (!amount || amount <= 0) return;

      simulateTxnBtn.disabled = true;
      simulateTxnBtn.textContent = '🔊 Broadasting Soundbox Chime...';

      try {
        const res = await API.simulateTransaction(amount, phone, 'UPI_Soundbox');
        if (res.success) {
          // Trigger audio broadcast
          if (res.soundbox_payload && window.paytmSoundbox) {
            window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
          }

          showNotification(`🔔 Soundbox Received: ₹${amount}!`, 'success');

          // Reload and flash
          await loadHistoryView();
          await loadDashboardData();
        }
      } catch(err) {
        showNotification(`❌ Error: ${err.message}`, 'error');
      } finally {
        simulateTxnBtn.disabled = false;
        simulateTxnBtn.innerHTML = `<span>🔊</span> Trigger Soundbox Payment`;
      }
    });
  }

  // ========================================================
  // 10. VIEW 5: AI GROWTH ENGINE & PRE-APPROVED CREDIT
  // ========================================================
  async function loadAnalyticsView() {
    try {
      const [growthData, creditData] = await Promise.all([
        API.getGrowth(),
        API.getCredit()
      ]);

      // Update stat cards
      const scoreEl = document.getElementById('analyticsScore');
      const loanAmountEl = document.getElementById('analyticsLoanAmount');
      const runwayEl = document.getElementById('analyticsRunway');
      const modalLoanAmountDisplay = document.getElementById('loanModalAmountDisplay');

      if (scoreEl) scoreEl.textContent = `${creditData.credit_health_score}/100`;
      if (loanAmountEl) loanAmountEl.textContent = `₹${creditData.pre_approved_loan.toLocaleString()}`;
      if (modalLoanAmountDisplay) modalLoanAmountDisplay.textContent = `₹${creditData.pre_approved_loan.toLocaleString()}`;
      if (runwayEl) runwayEl.textContent = `${creditData.working_capital_runway_days} Days`;

      // Render Churn Campaigns
      const campaignsList = document.getElementById('analyticsCampaignsList');
      if (campaignsList) {
        campaignsList.innerHTML = '';
        if (growthData.campaigns && growthData.campaigns.length > 0) {
          growthData.campaigns.forEach(c => {
            const div = document.createElement('div');
            div.style.cssText = `
              background: var(--bg-surface);
              border: 1px solid var(--border-glass);
              border-radius: var(--radius-md);
              padding: 0.9rem 1.1rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 0.8rem;
              flex-wrap: wrap;
            `;
            div.innerHTML = `
              <div>
                <div style="font-weight:700; font-size:0.95rem;">
                  ${c.customer_name} 
                  <span class="badge-status ${c.churn_risk === 'At-Risk' ? 'badge-orange' : 'badge-red'}" style="margin-left:0.4rem;">${c.churn_risk}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.2rem;">
                  Last visit: ${c.last_visit} • Inactive for 30+ days
                </div>
                <div style="font-size:0.8rem; color:var(--paytm-cyan); font-weight:700; margin-top:0.2rem;">
                  Offer: ${c.suggested_discount}
                </div>
              </div>
              <a href="${c.sms_uri}" target="_blank" class="pos-btn-action-sm" style="text-decoration:none; padding:0.5rem 1rem; font-size:0.85rem;" onclick="window.paytmSoundbox.broadcast('Customer win-back offer sent to ${c.customer_name}')">
                📲 ${(localStorage.getItem('paytm_lang') || 'en') === 'hi' ? 'ऑफर भेजें' : 'Offer Bhejo'}
              </a>
            `;
            campaignsList.appendChild(div);
          });
        }
      }

      // Render Festive Alert
      if (growthData.festive_alert) {
        const fa = growthData.festive_alert;
        const fTitle = document.getElementById('festiveTitle');
        const fDetails = document.getElementById('festiveDetails');
        if (fTitle) fTitle.textContent = `${fa.festival} — ${fa.surge_multiplier}`;
        if (fDetails) {
          fDetails.innerHTML = `
            <strong>In ${fa.days_left} days:</strong> ${fa.recommendation}<br>
            <span style="color:var(--paytm-cyan); font-weight:700;">High demand items:</span> ${fa.high_demand_items.join(', ')}
          `;
        }
      }

    } catch(e) {
      console.error('Error loading analytics view:', e);
    }
  }

  // Pre-Approved Loan Instant Disbursal Modal
  const modalLoanDisbursal = document.getElementById('modalLoanDisbursal');
  const openLoanDisbursalBtn = document.getElementById('openLoanDisbursalBtn');
  const closeLoanBtn = document.getElementById('closeLoanModalBtn');
  const cancelLoanBtn = document.getElementById('cancelLoanModalBtn');
  const confirmLoanDisbursalBtn = document.getElementById('confirmLoanDisbursalBtn');
  const loanSuccessMsg = document.getElementById('loanDisbursalSuccessMessage');

  if (openLoanDisbursalBtn && modalLoanDisbursal) {
    openLoanDisbursalBtn.addEventListener('click', () => {
      if (loanSuccessMsg) loanSuccessMsg.style.display = 'none';
      if (confirmLoanDisbursalBtn) {
        confirmLoanDisbursalBtn.disabled = false;
        confirmLoanDisbursalBtn.textContent = 'Accept & Disburse Now';
      }
      modalLoanDisbursal.style.display = 'flex';
    });
  }

  function closeLoanModal() {
    if (modalLoanDisbursal) modalLoanDisbursal.style.display = 'none';
  }
  if (closeLoanBtn) closeLoanBtn.addEventListener('click', closeLoanModal);
  if (cancelLoanBtn) cancelLoanBtn.addEventListener('click', closeLoanModal);

  if (confirmLoanDisbursalBtn) {
    confirmLoanDisbursalBtn.addEventListener('click', async () => {
      confirmLoanDisbursalBtn.disabled = true;
      confirmLoanDisbursalBtn.textContent = 'Processing Instant Transfer...';

      try {
        const res = await API.disburseLoan(75000);
        if (res.success) {
          if (loanSuccessMsg) {
            loanSuccessMsg.textContent = `🎉 ₹${res.loan_amount.toLocaleString()} Disbursed into ${res.bank_account}!`;
            loanSuccessMsg.style.display = 'block';
          }
          confirmLoanDisbursalBtn.textContent = '✓ Funds Transferred';

          // Play Soundbox Audio Announcement
          if (res.soundbox_payload && window.paytmSoundbox) {
            window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
          }

          showNotification(`🚀 ₹${res.loan_amount.toLocaleString()} credited to Paytm Bank Account!`, 'success');

          // Refresh state
          setTimeout(() => {
            closeLoanModal();
            loadAnalyticsView();
            loadDashboardData();
          }, 2000);
        }
      } catch(err) {
        showNotification(`❌ Error: ${err.message}`, 'error');
        confirmLoanDisbursalBtn.disabled = false;
        confirmLoanDisbursalBtn.textContent = 'Accept & Disburse Now';
      }
    });
  }

  // ========================================================
  // 11. TOAST NOTIFICATION SYSTEM
  // ========================================================
  function showNotification(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? '#00d26a' : (type === 'error' ? '#ff4d4f' : '#002970')};
      color: white;
      padding: 0.8rem 1.4rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.9rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: slide-toast 0.3s ease-out;
    `;
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  window.showToast = showNotification;

  // Initial Load with Saved or Default Language
  const savedLang = localStorage.getItem('paytm_lang') || 'en';
  setLanguage(savedLang);
  loadDashboardData();
});
