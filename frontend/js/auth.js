/**
 * Paytm Merchant Authentication & Profile Controller
 */

function computeInitials(name) {
  if (!name || typeof name !== 'string') return 'RK';
  if (name.toLowerCase().includes('ramesh')) return 'RK';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().substring(0, 2).toUpperCase();
}

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
      loginMerchant('Ramesh Sharma', 'Sharma Kirana & General Store', 'ramesh.kirana@paytm.com');
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('authEmail').value.trim();
      const shopName = emailInput.split('@')[0].replace(/[._]/g, ' ') + ' Store';
      loginMerchant('Ramesh Sharma', shopName, emailInput);
    });
  }

  function loginMerchant(name, shop, email) {
    const session = {
      name: name,
      shopName: shop,
      email: email,
      phone: '+91 98110 54321',
      vpa: 'paytm@sharmakirana',
      initials: computeInitials(name),
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
    const avatarEl = document.getElementById('headerMerchantAvatar');

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';

    const actualName = name || 'Ramesh Sharma';
    const actualShop = shop || 'Sharma Kirana & General Store';
    const initials = computeInitials(actualName);

    if (merchantNameEl) merchantNameEl.textContent = actualName;
    if (merchantShopEl) merchantShopEl.textContent = actualShop + ' ▾';
    if (avatarEl) avatarEl.textContent = initials;

    // Broadcast welcome chime on first entry
    if (window.paytmSoundbox) {
      window.paytmSoundbox.playChime();
    }

    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
  };

  // Dedicated Merchant Profile Modal Handlers
  window.openMerchantProfileModal = function() {
    const modal = document.getElementById('merchantProfileModal');
    if (!modal) return;

    let session = {};
    try {
      session = JSON.parse(localStorage.getItem('paytm_merchant_session') || '{}');
    } catch(err) {}

    const name = session.name || document.getElementById('headerMerchantName')?.textContent || 'Ramesh Sharma';
    const rawShop = session.shopName || document.getElementById('headerMerchantShop')?.textContent || 'Sharma Kirana & General Store';
    const shop = rawShop.replace(' ▾', '').trim();
    const email = session.email || 'ramesh.kirana@paytm.com';
    const phone = session.phone || '+91 98110 54321';
    const vpa = session.vpa || 'paytm@sharmakirana';
    const initials = computeInitials(name);

    const modalInitials = document.getElementById('modalAvatarInitials');
    const modalName = document.getElementById('modalMerchantDisplayName');
    const modalShop = document.getElementById('modalShopDisplayName');

    if (modalInitials) modalInitials.textContent = initials;
    if (modalName) modalName.textContent = name;
    if (modalShop) modalShop.textContent = shop;

    const inputName = document.getElementById('profMerchantName');
    const inputShop = document.getElementById('profShopName');
    const inputEmail = document.getElementById('profMerchantEmail');
    const inputPhone = document.getElementById('profMerchantPhone');
    const inputVpa = document.getElementById('profMerchantVpa');

    if (inputName) inputName.value = name;
    if (inputShop) inputShop.value = shop;
    if (inputEmail) inputEmail.value = email;
    if (inputPhone) inputPhone.value = phone;
    if (inputVpa) inputVpa.value = vpa;

    const successMsg = document.getElementById('profileSaveSuccess');
    if (successMsg) successMsg.style.display = 'none';

    modal.classList.add('active');
  };

  window.closeMerchantProfileModal = function() {
    const modal = document.getElementById('merchantProfileModal');
    if (modal) modal.classList.remove('active');
  };

  window.saveMerchantProfile = function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const newName = document.getElementById('profMerchantName')?.value.trim() || 'Ramesh Sharma';
    const newShop = document.getElementById('profShopName')?.value.trim() || 'Sharma Kirana Store';
    const newEmail = document.getElementById('profMerchantEmail')?.value.trim() || 'ramesh.kirana@paytm.com';
    const newPhone = document.getElementById('profMerchantPhone')?.value.trim() || '+91 98110 54321';
    const newVpa = document.getElementById('profMerchantVpa')?.value.trim() || 'paytm@sharmakirana';
    const initials = computeInitials(newName);

    // Update Header Avatar & Text
    const headerAvatar = document.getElementById('headerMerchantAvatar');
    const headerName = document.getElementById('headerMerchantName');
    const headerShop = document.getElementById('headerMerchantShop');
    const modalInitials = document.getElementById('modalAvatarInitials');
    const modalName = document.getElementById('modalMerchantDisplayName');
    const modalShop = document.getElementById('modalShopDisplayName');

    if (headerAvatar) headerAvatar.textContent = initials;
    if (headerName) headerName.textContent = newName;
    if (headerShop) headerShop.textContent = newShop + ' ▾';
    if (modalInitials) modalInitials.textContent = initials;
    if (modalName) modalName.textContent = newName;
    if (modalShop) modalShop.textContent = newShop;

    // Save in localStorage session
    const session = {
      name: newName,
      shopName: newShop,
      email: newEmail,
      phone: newPhone,
      vpa: newVpa,
      initials: initials,
      token: 'PAYTM_JWT_MOCK_' + Date.now()
    };
    localStorage.setItem('paytm_merchant_session', JSON.stringify(session));

    // Show feedback
    const successMsg = document.getElementById('profileSaveSuccess');
    if (successMsg) {
      successMsg.style.display = 'block';
      setTimeout(() => {
        window.closeMerchantProfileModal();
      }, 700);
    } else {
      window.closeMerchantProfileModal();
    }

    if (window.paytmSoundbox) {
      window.paytmSoundbox.playChime();
    }
  };

  // Close modal when clicking outside card
  const profileModal = document.getElementById('merchantProfileModal');
  if (profileModal) {
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) {
        window.closeMerchantProfileModal();
      }
    });
  }

  // Restore saved session if exists
  const existingSession = localStorage.getItem('paytm_merchant_session');
  if (existingSession) {
    try {
      const s = JSON.parse(existingSession);
      const avatarEl = document.getElementById('headerMerchantAvatar');
      const merchantNameEl = document.getElementById('headerMerchantName');
      const merchantShopEl = document.getElementById('headerMerchantShop');
      if (s.name) {
        if (avatarEl) avatarEl.textContent = computeInitials(s.name);
        if (merchantNameEl) merchantNameEl.textContent = s.name;
        if (merchantShopEl) merchantShopEl.textContent = (s.shopName || 'Kirana Store') + ' ▾';
      }
    } catch(e) {}
  }
});
