/**
 * Main Application Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      navItems.forEach(n => n.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // Voice Mic Setup
  const micBtn = document.getElementById('micBtn');
  const voiceStatus = document.getElementById('voiceStatus');
  const queryInput = document.getElementById('queryInput');
  const sendBtn = document.getElementById('sendBtn');
  const thoughtStream = document.getElementById('thoughtStream');

  function addThought(text) {
    if (!thoughtStream) return;
    const entry = document.createElement('div');
    entry.className = 'thought-entry';
    entry.textContent = `> ${text}`;
    thoughtStream.appendChild(entry);
    thoughtStream.scrollTop = thoughtStream.scrollHeight;
  }

  const speech = new SpeechEngine(
    (transcript) => {
      if (queryInput) queryInput.value = transcript;
      executeAgentQuery(transcript);
    },
    (isListening) => {
      if (micBtn) {
        if (isListening) {
          micBtn.classList.add('listening');
          voiceStatus.textContent = 'Listening to shopkeeper voice (Hindi/Hinglish)...';
        } else {
          micBtn.classList.remove('listening');
          voiceStatus.textContent = 'Tap Mic or Type command';
        }
      }
    }
  );

  if (micBtn) {
    micBtn.addEventListener('click', () => speech.toggle());
  }

  if (sendBtn && queryInput) {
    sendBtn.addEventListener('click', () => {
      const q = queryInput.value.trim();
      if (q) executeAgentQuery(q);
    });
    queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = queryInput.value.trim();
        if (q) executeAgentQuery(q);
      }
    });
  }

  // Quick Action Chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.getAttribute('data-query');
      if (queryInput) queryInput.value = text;
      executeAgentQuery(text);
    });
  });

  // Execute Agent Query
  async function executeAgentQuery(queryText) {
    addThought(`Received Input: "${queryText}"`);
    try {
      const res = await API.sendQuery(queryText);
      if (res.thoughts) {
        res.thoughts.forEach(t => addThought(t));
      }

      // Check for Soundbox payload
      if (res.result && res.result.soundbox_payload) {
        const sp = res.result.soundbox_payload;
        addThought(`🔊 Soundbox Event: "${sp.speech_text}"`);
        window.paytmSoundbox.broadcast(sp.speech_text);
      }

      // Refresh Dashboard State
      refreshAll();
    } catch (err) {
      addThought(`❌ Error executing agent: ${err.message}`);
    }
  }

  // Render Functions
  async function refreshAll() {
    loadKhata();
    loadInventory();
    loadGrowth();
    loadCredit();
  }

  async function loadKhata() {
    try {
      const data = await API.getKhata();
      const tbody = document.getElementById('khataTableBody');
      const totalUdhaarEl = document.getElementById('totalPendingUdhaar');
      
      let total = 0;
      if (tbody && data.customers) {
        tbody.innerHTML = '';
        data.customers.forEach(c => {
          total += c.pending_udhaar;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${c.name}</strong><br><small class="text-muted">${c.phone}</small></td>
            <td><strong style="color: ${c.pending_udhaar > 0 ? '#ff4d4f' : '#00d26a'}">₹${c.pending_udhaar}</strong></td>
            <td><span class="badge ${c.churn_risk === 'Normal' ? 'badge-success' : 'badge-danger'}">${c.churn_risk}</span></td>
            <td>${c.last_visit_date || 'Today'}</td>
            <td>
              <a href="sms:${c.phone}?body=Namaste%20${c.name}%20ji,%20Sharma%20Kirana%20se%20aapka%20pending%20udhaar%20Rs.${c.pending_udhaar}%20hai.%20Pay%20via%20Paytm%20UPI" class="btn-sm btn-cyan">📲 SMS Bill</a>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
      if (totalUdhaarEl) totalUdhaarEl.textContent = `₹${total.toLocaleString()}`;
    } catch (e) {
      console.error(e);
    }
  }

  async function loadInventory() {
    try {
      const data = await API.getInventory();
      const listEl = document.getElementById('lowStockList');
      const allListEl = document.getElementById('allInventoryList');

      if (listEl && data.low_stock_items) {
        listEl.innerHTML = '';
        if (data.low_stock_items.length === 0) {
          listEl.innerHTML = '<div class="text-muted">All stock levels healthy!</div>';
        } else {
          data.low_stock_items.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:0.8rem; background:#fff8e6; border-radius:8px; margin-bottom:0.5rem; border:1px solid #ffe58f;';
            div.innerHTML = `
              <div>
                <strong>⚠️ ${item.item_name}</strong>
                <div style="font-size:0.8rem; color:#874d00;">Only ${item.current_stock} ${item.unit} left (Threshold: ${item.reorder_threshold})</div>
              </div>
              <button class="btn-sm btn-primary" onclick="window.orderRestock('${item.item_name}')">📦 1-Click PO</button>
            `;
            listEl.appendChild(div);
          });
        }
      }

      if (allListEl && data.items) {
        allListEl.innerHTML = '';
        data.items.forEach(i => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${i.item_name}</strong></td>
            <td>${i.category}</td>
            <td><strong style="color: ${i.current_stock <= i.reorder_threshold ? '#ff4d4f' : '#172033'}">${i.current_stock} ${i.unit}</strong></td>
            <td>₹${i.unit_price}</td>
            <td><span class="text-muted">${i.supplier_name}</span></td>
          `;
          allListEl.appendChild(tr);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  window.orderRestock = async function(itemName) {
    addThought(`Ordering Restock PO for: "${itemName}"...`);
    const res = await API.orderPO(itemName, 15);
    if (res.success) {
      addThought(`✅ ${res.po_number} emailed to ${res.supplier_email}`);
      if (res.soundbox_payload) {
        window.paytmSoundbox.broadcast(res.soundbox_payload.speech_text);
      }
      refreshAll();
    }
  };

  async function loadGrowth() {
    try {
      const data = await API.getGrowth();
      const container = document.getElementById('churnCampaignsContainer');
      if (container && data.campaigns) {
        container.innerHTML = '';
        data.campaigns.forEach(c => {
          const div = document.createElement('div');
          div.style.cssText = 'padding:1rem; border-radius:10px; background:#ffffff; border:1px solid #e2e8f0; margin-bottom:0.8rem; display:flex; justify-content:space-between; align-items:center;';
          div.innerHTML = `
            <div>
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <strong>${c.customer_name}</strong>
                <span class="badge badge-danger">${c.churn_risk}</span>
              </div>
              <div style="font-size:0.8rem; color:#5c6c84; margin-top:0.2rem;">Last visit: ${c.last_visit} | Offer: <strong>${c.suggested_discount}</strong></div>
            </div>
            <a href="${c.sms_uri}" class="btn-sm btn-cyan">🎁 1-Tap SMS Voucher</a>
          `;
          container.appendChild(div);
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadCredit() {
    try {
      const data = await API.getCredit();
      const scoreEl = document.getElementById('creditScoreValue');
      const loanEl = document.getElementById('preApprovedAmount');
      const runwayEl = document.getElementById('capitalRunway');

      if (scoreEl) scoreEl.textContent = `${data.credit_health_score}/100`;
      if (loanEl) loanEl.textContent = `₹${data.pre_approved_loan.toLocaleString()}`;
      if (runwayEl) runwayEl.textContent = data.working_capital_runway_days;
    } catch (e) {
      console.error(e);
    }
  }

  // Initial Load
  refreshAll();
});
