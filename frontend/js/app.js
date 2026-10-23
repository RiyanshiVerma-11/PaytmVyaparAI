/**
 * Flagship Cockpit UI Controller - Fully Dynamic Real-Time Vyapar Operating System
 * Connects all sidebar views (Dashboard, Bahi-Khata, Inventory, History, Analytics)
 * to real-time SQLite database endpoints with live Soundbox voice feedback.
 */
document.addEventListener('DOMContentLoaded', () => {

  // Current Active State
  let currentView = 'dashboard';
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
  // 2. THEME SWITCH (DARK / LIGHT MODE)
  // ========================================================
  const themeSwitch = document.getElementById('themeSwitch');
  const savedTheme = localStorage.getItem('paytm_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (themeSwitch) {
    themeSwitch.querySelector('.theme-switch-slider').textContent = savedTheme === 'dark' ? '🌙' : '☀️';
    themeSwitch.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('paytm_theme', newTheme);
      themeSwitch.querySelector('.theme-switch-slider').textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });
  }

  // ========================================================
  // 3. LOGOUT HANDLER
  // ========================================================
  const logoutBtn = document.getElementById('sidebarLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('paytm_merchant_session');
      const landingEl = document.getElementById('landingView');
      const appEl = document.getElementById('appView');
      if (appEl) appEl.style.display = 'none';
      if (landingEl) landingEl.style.display = 'flex';
      showNotification('Logged out successfully', 'info');
    });
  }

  // ========================================================
  // 4. SIDEBAR NAVIGATION & DYNAMIC VIEW SWITCHING
  // ========================================================
  const sidebarItems = document.querySelectorAll('.sidebar-item[data-view]');
  const viewSections = document.querySelectorAll('.cockpit-view-section');

  function switchView(viewName) {
    currentView = viewName;

    // Update active sidebar item
    sidebarItems.forEach(item => {
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

      // Refresh current view
      if (currentView === 'dashboard') loadDashboardData();
      else if (currentView === 'khata') loadKhataView();
      else if (currentView === 'inventory') loadInventoryView();
      else if (currentView === 'history') loadHistoryView();
      else if (currentView === 'analytics') loadAnalyticsView();
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
  async function loadLedgerCard() {
    try {
      const data = await API.getKhata();
      const listEl = document.getElementById('liveLedgerList');
      if (!listEl) return;

      listEl.innerHTML = '';
      const recentCustomers = data.customers ? data.customers.slice(0, 4) : [];

      if (recentCustomers.length === 0) {
        listEl.innerHTML = '<div style="padding:1rem; color:var(--text-muted); text-align:center;">No khata entries recorded yet.</div>';
        return;
      }

      recentCustomers.forEach((c) => {
        const isPaid = c.pending_udhaar === 0;
        const amountDisplay = isPaid ? `₹${c.total_spent > 0 ? c.total_spent : 2500}` : `₹${c.pending_udhaar}`;
        const typeDisplay = isPaid ? 'Paid' : 'Udhaar';

        const item = document.createElement('div');
        item.className = 'ledger-item';
        item.innerHTML = `
          <div style="display:flex; align-items:center;">
            <span class="ledger-dot ${isPaid ? 'dot-green' : 'dot-orange'}"></span>
            <div>
              <strong style="font-size:0.95rem; font-weight:800; color:var(--text-primary);">${c.name}</strong> 
              <span class="badge-ledger-amount ${isPaid ? 'badge-ledger-paid' : 'badge-ledger-udhaar'}">${amountDisplay} • ${typeDisplay}</span>
            </div>
          </div>
          <div class="date-stamp-pill">${c.last_visit_date || 'Today'}</div>
        `;
        listEl.appendChild(item);
      });
    } catch(e) {
      console.error('Error loading ledger card:', e);
    }
  }

  // Card 2: AI Merchant Growth Engine
  async function loadGrowthCard() {
    try {
      const data = await API.getGrowth();
      const nameEl = document.getElementById('growthCustomerName');
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

      if (displayItems.length === 0) {
        container.innerHTML = '<div style="padding:1rem; color:#00d26a; text-align:center;">✓ All inventory items well stocked!</div>';
        return;
      }

      displayItems.forEach(item => {
        const isLow = item.current_stock <= item.reorder_threshold;
        const div = document.createElement('div');
        div.className = 'stock-warning-item';
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:1.2rem; flex-shrink:0;">${isLow ? '⚠️' : '✅'}</span>
            <div>
              <strong style="font-size:0.95rem; font-weight:800; color:var(--text-primary); display:block;">${item.item_name}</strong>
              <span class="stock-warning-badge">${item.current_stock} ${item.unit || 'units'} left (Threshold: ${item.reorder_threshold})</span>
            </div>
          </div>
          <button class="btn-action-cyan" onclick="window.reorderStock('${item.item_name}')">1-Click Reorder</button>
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

      if (scoreEl) scoreEl.textContent = `${data.credit_health_score}/100`;
      if (detailsEl) {
        detailsEl.textContent = `Current Eligibility: ₹${data.pre_approved_loan.toLocaleString()} | Recent repayment performance: Great | Instant Disbursal Ready!`;
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
              <a href="${whatsappUrl}" target="_blank" class="btn-secondary-flat" style="padding:0.4rem 0.8rem; font-size:0.8rem; text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem;" title="Send WhatsApp Reminder">
                💬 WhatsApp
              </a>
              <button class="btn-action-cyan" style="padding:0.4rem 0.8rem; font-size:0.8rem;" onclick="window.settleKhata(${c.id}, '${c.name}', ${c.pending_udhaar})">
                ✓ Settle
              </button>
            ` : `
              <span style="color:#00d26a; font-weight:700; font-size:0.85rem;">All Clear</span>
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
      div.className = 'ledger-item';
      div.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.8rem;">
          <span class="ledger-dot ${isUdhaar ? 'dot-orange' : 'dot-green'}"></span>
          <div>
            <strong>${entry.customer_name}</strong>
            <span style="color:var(--text-secondary); font-size:0.85rem;">— ₹${entry.amount} (${isUdhaar ? 'Udhaar Added' : 'Jama / Repaid'})</span>
            <div style="font-size:0.8rem; color:var(--text-muted);">${entry.item_description || 'General Items'}</div>
          </div>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${entry.created_at || 'Just now'}</div>
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
  async function loadInventoryView() {
    try {
      const data = await API.getInventory();
      inventoryCache = data;

      // Update stat cards
      const lowCount = data.low_stock_count || 0;
      const totalSkus = data.items ? data.items.length : 0;
      let totalValue = 0;
      (data.items || []).forEach(i => {
        totalValue += (i.current_stock || 0) * (i.unit_price || 0);
      });

      const invLowStockCountEl = document.getElementById('invLowStockCount');
      const invTotalSkusEl = document.getElementById('invTotalSkus');
      const invTotalValEl = document.getElementById('invTotalVal');

      if (invLowStockCountEl) invLowStockCountEl.textContent = lowCount;
      if (invTotalSkusEl) invTotalSkusEl.textContent = totalSkus;
      if (invTotalValEl) invTotalValEl.textContent = `₹${Math.round(totalValue).toLocaleString()}`;

      renderInventoryTable();
    } catch(e) {
      console.error('Error loading inventory view:', e);
    }
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
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">No products match your filter.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      const isLow = item.current_stock <= item.reorder_threshold;
      const marginPct = Math.round(((item.unit_price - item.wholesale_price) / item.unit_price) * 100);

      // Stock progress percentage
      const targetStock = item.reorder_threshold * 3;
      const fillPercent = Math.min(100, Math.round((item.current_stock / targetStock) * 100));

      tr.innerHTML = `
        <td>
          <strong>${item.item_name}</strong>
          <div style="font-size:0.78rem; color:var(--text-muted);">Packaging: ${item.unit || 'Pack'}</div>
        </td>
        <td>
          <span class="badge-status badge-cyan">${item.category || 'General'}</span>
        </td>
        <td style="min-width:140px;">
          <div style="display:flex; justify-content:space-between; font-size:0.85rem; font-weight:700; margin-bottom:0.25rem;">
            <span style="color:${isLow ? '#ff4d4f' : '#00d26a'};">${item.current_stock} left</span>
            <span style="color:var(--text-muted); font-size:0.75rem;">Min: ${item.reorder_threshold}</span>
          </div>
          <div style="width:100%; height:6px; background:var(--border-glass); border-radius:3px; overflow:hidden;">
            <div style="width:${fillPercent}%; height:100%; background:${isLow ? 'linear-gradient(90deg, #ff4d4f, #ff9f1c)' : 'linear-gradient(90deg, #00d26a, #00baf2)'}; border-radius:3px;"></div>
          </div>
        </td>
        <td style="font-weight:700;">₹${item.unit_price}</td>
        <td>
          <span style="color:var(--text-secondary);">₹${item.wholesale_price}</span>
          <span style="font-size:0.75rem; color:#00d26a; font-weight:700; margin-left:0.3rem;">(${marginPct}% margin)</span>
        </td>
        <td style="font-size:0.85rem;">
          <div>${item.supplier_name || 'Wholesale Supplier'}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">${item.supplier_email || 'orders@distributor.mock'}</div>
        </td>
        <td style="text-align:right;">
          <button class="btn-action-cyan" style="padding:0.45rem 1rem;" onclick="window.reorderStock('${item.item_name}', 15)">
            ⚡ 1-Click Reorder (15)
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
              <a href="${c.sms_uri}" target="_blank" class="btn-action-cyan" style="text-decoration:none; padding:0.45rem 1rem; font-size:0.85rem;" onclick="window.paytmSoundbox.broadcast('Customer win-back offer sent to ${c.customer_name}')">
                📲 Send 1-Tap SMS
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

  // Initial Load
  loadDashboardData();
});
