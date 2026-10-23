/**
 * Paytm Merchant Authentication Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const authModal = document.getElementById('authOverlay');
  const authCloseBtn = document.getElementById('authCloseBtn');
  const authForm = document.getElementById('authForm');
  const demoQuickBtn = document.getElementById('demoQuickBtn');

  if (authCloseBtn && authModal) {
    authCloseBtn.addEventListener('click', () => {
      authModal.classList.remove('active');
    });
  }

  // Quick Demo Login (Ramesh Kirana Store)
  if (demoQuickBtn) {
    demoQuickBtn.addEventListener('click', () => {
      loginMerchant('Ramesh Sharma', 'Sharma Kirana & General Store', 'paytm@sharmakirana');
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('authEmail').value.trim();
      const shopName = emailInput.split('@')[0].replace(/[._]/g, ' ') + ' Store';
      loginMerchant('Verified Merchant', shopName, emailInput);
    });
  }

  function loginMerchant(name, shop, email) {
    const session = {
      name: name.toUpperCase(),
      shopName: shop,
      email: email,
      token: 'PAYTM_JWT_MOCK_' + Date.now()
    };
    localStorage.setItem('paytm_merchant_session', JSON.stringify(session));

    if (authModal) authModal.classList.remove('active');
    switchToCockpit(name, shop);
  }

  window.switchToCockpit = function(name, shop) {
    const landingEl = document.getElementById('landingView');
    const appEl = document.getElementById('appView');
    const merchantNameEl = document.getElementById('headerMerchantName');
    const merchantShopEl = document.getElementById('headerMerchantShop');

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';

    if (merchantNameEl) merchantNameEl.textContent = name || 'Ramesh Sharma';
    if (merchantShopEl) merchantShopEl.textContent = shop || 'Grocery Store';

    // Broadcast welcome chime on first entry
    if (window.paytmSoundbox) {
      window.paytmSoundbox.playChime();
    }

    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
  };

  // Check if session exists
  const existingSession = localStorage.getItem('paytm_merchant_session');
  if (existingSession) {
    try {
      const s = JSON.parse(existingSession);
      // Auto open cockpit or keep landing ready
    } catch(e) {}
  }
});
