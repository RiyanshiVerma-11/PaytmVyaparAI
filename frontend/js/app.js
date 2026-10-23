/**
 * Flagship Cockpit UI Controller
 * Strictly matching assets/dashboard_ui.jpg aesthetics & interactions
 */
document.addEventListener('DOMContentLoaded', () => {

  // 1. COLLAPSIBLE SIDEBAR TOGGLE
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

  // 2. DARK / LIGHT MODE SWITCH
  const themeSwitch = document.getElementById('themeSwitch');
  const savedTheme = localStorage.getItem('paytm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  if (themeSwitch) {
    themeSwitch.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('paytm_theme', newTheme);
    });
  }

  // 3. LOGOUT BUTTON
  const logoutBtn = document.getElementById('sidebarLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('paytm_merchant_session');
      const landingEl = document.getElementById('landingView');
      const appEl = document.getElementById('appView');
      if (appEl) appEl.style.display = 'none';
      if (landingEl) landingEl.style.display = 'flex';
    });
  }

  // 4. SPEECH & VOICE MIC INTEGRATION
  const micBtn = document.getElementById('voiceMicTrigger');
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
        micBtn.style.color = isListening ? '#ff4d4f' : 'var(--paytm-blue)';
      }
    }
  );

  if (micBtn) {
    micBtn.addEventListener('click', () => speech.toggle());
  }

  // 5. SEARCH INPUT FOR DIRECT VOICE / TEXT COMMANDS
  const topSearchInput = document.getElementById('topSearchInput');
  if (topSearchInput) {
    topSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = topSearchInput.value.trim();
        if (q) executeVoiceQuery(q);
      }
    });
  }

  // Execute Voice / NLP Query
  async function executeVoiceQuery(queryText) {
    showNotification(`🎤 Processing: "${queryText}"`, 'info');
    try {
      const res = await API.sendQuery(queryText);

      // Play Soundbox Chime & Voice
      if (res.result && res.result.soundbox_payload) {
        const sp = res.result.soundbox_payload;
        if (window.paytmSoundbox) {
          window.paytmSoundbox.broadcast(sp.speech_text);
        }
        showNotification(`🔊 Soundbox: ${sp.speech_text}`, 'success');
      }

      // Refresh Ledger & Stock State
      loadDashboardData();
    } catch (err) {
      showNotification(`❌ Error: ${err.message}`, 'error');
    }
  }

  // 6. DASHBOARD DATA LOADER (Matching assets/dashboard_ui.jpg)
  async function loadDashboardData() {
    loadLedgerCard();
    loadGrowthCard();
    loadStockCard();
    loadLoanCard();
  }

  // Card 1: Live Voice Khata Ledger
  async function loadLedgerCard() {
    try {
      const data = await API.getKhata();
      const listEl = document.getElementById('liveLedgerList');
      if (!listEl) return;

      listEl.innerHTML = '';
      const recentCustomers = data.customers ? data.customers.slice(0, 4) : [];

      recentCustomers.forEach((c, idx) => {
        const dotColors = ['dot-green', 'dot-orange', 'dot-cyan', 'dot-gray'];
        const types = ['Paid (Cash)', 'Udhaar', 'Online (QR)', 'Udhaar'];
        const times = ['2 min ago', 'Today, 10:15 AM', 'Yesterday, 6:30 PM', '18 Oct'];
        
        const isPaid = c.pending_udhaar === 0;
        const amountDisplay = isPaid ? `₹${c.total_spent > 0 ? c.total_spent : 2500}` : `₹${c.pending_udhaar}`;
        const typeDisplay = isPaid ? 'Paid' : 'Udhaar';

        const item = document.createElement('div');
        item.className = 'ledger-item';
        item.innerHTML = `
          <div style="display:flex; align-items:center;">
            <span class="ledger-dot ${isPaid ? 'dot-green' : 'dot-orange'}"></span>
            <div>
              <strong style="font-size:0.95rem;">${c.name}</strong> 
              <span style="color:var(--text-secondary); font-size:0.85rem;">- ${amountDisplay} - ${typeDisplay}</span>
            </div>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${c.last_visit_date || times[idx % times.length]}</div>
        `;
        listEl.appendChild(item);
      });
    } catch(e) {
      console.error(e);
    }
  }

  // Card 2: AI Merchant Growth Engine
  async function loadGrowthCard() {
    try {
      const data = await API.getGrowth();
      const nameEl = document.getElementById('growthCustomerName');
      const textEl = document.getElementById('growthAlertSubtext');
      const offerBtn = document.getElementById('growthSendOfferBtn');

      if (data.campaigns && data.campaigns.length > 0) {
        const c = data.campaigns[0];
        if (nameEl) nameEl.textContent = `${c.customer_name} hasn't visited in 45 days. High churn risk.`;
        if (offerBtn) {
          offerBtn.onclick = () => {
            window.location.href = c.sms_uri;
            showNotification(`📲 1-Tap SMS Voucher prepared for ${c.customer_name}`, 'success');
          };
        }
      }
    } catch(e) {
      console.error(e);
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

      displayItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'stock-warning-item';
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.1rem; color:var(--color-warning);">⚠️</span>
            <div>
              <strong style="font-size:0.95rem;">${item.item_name}</strong>
              <div style="font-size:0.8rem; color:var(--text-muted);">(${item.current_stock} units left)</div>
            </div>
          </div>
          <button class="btn-action-cyan" onclick="window.reorderStock('${item.item_name}')">1-Click Reorder</button>
        `;
        container.appendChild(div);
      });
    } catch(e) {
      console.error(e);
    }
  }

  window.reorderStock = async function(itemName) {
    showNotification(`📦 Sending Wholesale PO for ${itemName}...`, 'info');
    const res = await API.orderPO(itemName, 15);
    if (res.success) {
      showNotification(`✅ PO #${res.po_number} emailed to ${res.supplier_name}!`, 'success');
      if (res.soundbox_payload && window.paytmSoundbox) {
        window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
      }
      loadStockCard();
    }
  };

  // Card 4: Pre-Approved Loan Radial Gauge
  async function loadLoanCard() {
    try {
      const data = await API.getCredit();
      const scoreEl = document.getElementById('loanScoreNumber');
      const detailsEl = document.getElementById('loanEligibilityDetails');

      if (scoreEl) scoreEl.textContent = `${data.credit_health_score}/100`;
      if (detailsEl) {
        detailsEl.textContent = `Current Eligibility: ₹${data.pre_approved_loan.toLocaleString()} | Recent repayment performance: Great | Instant Disbursement Available!`;
      }
    } catch(e) {
      console.error(e);
    }
  }

  // Toast Notification System
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

  // Initial Load
  loadDashboardData();
});
