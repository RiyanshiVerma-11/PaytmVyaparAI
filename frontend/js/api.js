/**
 * Paytm Vyapar API Client
 */
const API = {
  async sendQuery(queryText) {
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryText })
    });
    return await res.json();
  },

  async getKhata() {
    const res = await fetch('/api/khata');
    return await res.json();
  },

  async getInventory() {
    const res = await fetch('/api/inventory');
    return await res.json();
  },

  async orderPO(itemName, quantity = 15) {
    const res = await fetch('/api/inventory/po', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name: itemName, quantity })
    });
    return await res.json();
  },

  async getGrowth() {
    const res = await fetch('/api/growth');
    return await res.json();
  },

  async getCredit() {
    const res = await fetch('/api/credit');
    return await res.json();
  }
};

window.API = API;
