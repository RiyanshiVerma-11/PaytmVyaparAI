/**
 * Paytm Vyapar Saathi - Full Real-Time API Client
 * Supports single-host deployment and decoupled hosting (e.g. Vercel frontend + Render backend)
 */
const RENDER_BACKEND_URL = 'https://paytmvyaparai.onrender.com';

const isLocalhost = typeof window !== 'undefined' && Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.endsWith('.run.app')
);

const API_BASE = (
  (typeof window !== 'undefined' && window.PAYTM_API_BASE) || 
  (typeof localStorage !== 'undefined' && localStorage.getItem('PAYTM_API_BASE')) || 
  (isLocalhost && (window.location.port === '8000' || window.location.port === '3000' || !window.location.port) ? '' : (isLocalhost ? 'http://127.0.0.1:8000' : RENDER_BACKEND_URL))
).replace(/\/$/, '');

function endpoint(path) {
  return `${API_BASE}${path}`;
}

const API = {
  baseUrl: API_BASE,

  // Helper to dynamically point frontend to Render backend
  setBaseUrl(url) {
    if (url) {
      localStorage.setItem('PAYTM_API_BASE', url);
    } else {
      localStorage.removeItem('PAYTM_API_BASE');
    }
  },

  // 1. Agent Voice & Chat
  async sendQuery(queryText) {
    const res = await fetch(endpoint('/api/agent/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
    return await res.json();
  },

  // 2. Khata Ledger
  async getKhata() {
    const res = await fetch(endpoint('/api/khata'));
    return await res.json();
  },

  async addKhataEntry(customerName, amount, itemDescription = 'Kirana Items', entryType = 'udhaar', phone = null) {
    const res = await fetch(endpoint('/api/khata/entry'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName,
        amount: parseFloat(amount),
        item_description: itemDescription,
        entry_type: entryType,
        phone: phone
      })
    });
    return await res.json();
  },

  async settleKhataCustomer(customerId) {
    const res = await fetch(endpoint('/api/khata/settle'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: parseInt(customerId) })
    });
    return await res.json();
  },

  // 3. Inventory & Smart Restock
  async getInventory() {
    const res = await fetch(endpoint('/api/inventory'));
    return await res.json();
  },

  async orderPO(itemName, quantity = null) {
    const res = await fetch(endpoint('/api/inventory/po'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: itemName, quantity: quantity ? parseInt(quantity) : null })
    });
    return await res.json();
  },

  async receivePO(poIdentifier) {
    const res = await fetch(endpoint('/api/inventory/po/receive'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ po_identifier: poIdentifier })
    });
    return await res.json();
  },

  async getMerchantProfile(merchantId = 1) {
    const res = await fetch(endpoint(`/api/merchant/profile?merchant_id=${merchantId}`));
    return await res.json();
  },

  async addInventoryItem(itemData) {
    const res = await fetch(endpoint('/api/inventory/item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemData)
    });
    return await res.json();
  },

  // 4. Growth Campaigns & Festive Forecast
  async getGrowth() {
    const res = await fetch(endpoint('/api/growth'));
    return await res.json();
  },

  // 5. Merchant Credit Underwriting & Instant Disbursal
  async getCredit() {
    const res = await fetch(endpoint('/api/credit'));
    return await res.json();
  },

  async disburseLoan(amount = 75000) {
    const res = await fetch(endpoint('/api/credit/disburse'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(amount) })
    });
    return await res.json();
  },

  // 6. Transactions & Soundbox Telemetry
  async getTransactions(limit = 100) {
    const res = await fetch(endpoint(`/api/transactions?limit=${limit}`));
    return await res.json();
  },

  async getProfitTrends(days = 7) {
    const res = await fetch(endpoint(`/api/transactions/profit-trends?days=${days}`));
    return await res.json();
  },

  async simulateTransaction(amount, phone = '+91 9810998877', paymentMode = 'UPI_Soundbox', itemTag = null) {
    const res = await fetch(endpoint('/api/transactions/simulate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: parseFloat(amount),
        customer_phone: phone,
        payment_mode: paymentMode,
        item_tag: itemTag
      })
    });
    return await res.json();
  },

  // 7. Dynamic Chatbot with Full App Context
  async sendChatMessage(message, sessionId = 'default_merchant') {
    const res = await fetch(endpoint('/api/chatbot/message'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message, session_id: sessionId })
    });
    return await res.json();
  },

  async getChatContext() {
    const res = await fetch(endpoint('/api/chatbot/context'));
    return await res.json();
  },

  async clearChatMemory(sessionId = 'default_merchant') {
    const res = await fetch(endpoint('/api/chatbot/clear'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '', session_id: sessionId })
    });
    return await res.json();
  }
};

window.API = API;
