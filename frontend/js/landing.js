/**
 * Landing Page Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const launchBtn = document.getElementById('launchCockpitBtn');
  const loginNavBtn = document.getElementById('loginNavBtn');
  const authNavBtn = document.getElementById('authNavBtn');
  const authNavBtnText = document.getElementById('authNavBtnText');
  const authModal = document.getElementById('authOverlay');
  const demoLaunchBtn = document.getElementById('demoLaunchBtn');

  // Unified Auth Nav Click & Dynamic Button State
  function updateNavAuthState() {
    try {
      const saved = localStorage.getItem('paytm_merchant_session');
      if (saved) {
        const s = JSON.parse(saved);
        if (s && s.name && authNavBtnText) {
          authNavBtnText.textContent = 'Open Cockpit →';
          if (authNavBtn) {
            authNavBtn.title = `Logged in as ${s.name} (${s.shopName || 'Store'})`;
          }
          return;
        }
      }
    } catch (e) {}
    if (authNavBtnText) {
      authNavBtnText.textContent = 'Sign In / Up';
    }
  }

  window.updateNavAuthState = updateNavAuthState;
  updateNavAuthState();

  window.handleAuthNavClick = function() {
    try {
      const saved = localStorage.getItem('paytm_merchant_session');
      if (saved) {
        const s = JSON.parse(saved);
        if (s && s.name && window.switchToCockpit) {
          window.switchToCockpit(s.name, s.shopName || 'Store', s.isDemo || false);
          return;
        }
      }
    } catch (e) {}
    openAuthModal('signin');
  };

  if (authNavBtn) {
    authNavBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.handleAuthNavClick();
    });
  }

  // Launch Cockpit Directly (Backward Compatibility)
  if (launchBtn) {
    launchBtn.addEventListener('click', () => {
      switchToCockpit('Ramesh Sharma', 'Sharma Kirana & General Store');
    });
  }

  if (loginNavBtn) {
    loginNavBtn.addEventListener('click', () => {
      openAuthModal();
    });
  }

  if (demoLaunchBtn) {
    demoLaunchBtn.addEventListener('click', () => {
      // Instant launch into live cockpit
      switchToCockpit('Ramesh Sharma', 'Sharma Kirana & General Store');
    });
  }

  // Auto-launch into cockpit if hash or param is present
  function checkHash() {
    const validViews = ['dashboard', 'khata', 'inventory', 'stock', 'history', 'analytics'];
    const hashClean = (window.location.hash || '').replace('#', '');
    if (validViews.includes(hashClean) || window.location.hash === '#cockpit' || window.location.search.includes('cockpit')) {
      switchToCockpit('Ramesh Sharma', 'Sharma Kirana & General Store');
      const target = hashClean === 'stock' ? 'inventory' : hashClean;
      if (target && target !== 'dashboard' && target !== 'cockpit') {
        setTimeout(() => {
          if (window.switchView) window.switchView(target);
        }, 100);
      }
    }
  }

  checkHash();
  window.addEventListener('hashchange', checkHash);

  function openAuthModal(initialTab = 'signin') {
    if (authModal) {
      if (window.switchAuthTab) {
        window.switchAuthTab(initialTab);
      }
      authModal.classList.add('active');
    }
  }

  window.openAuthModal = openAuthModal;
});
