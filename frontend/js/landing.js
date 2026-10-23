/**
 * Landing Page Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const launchBtn = document.getElementById('launchCockpitBtn');
  const loginNavBtn = document.getElementById('loginNavBtn');
  const authModal = document.getElementById('authOverlay');
  const demoLaunchBtn = document.getElementById('demoLaunchBtn');

  // Launch Cockpit Directly
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
  if (window.location.hash === '#dashboard' || window.location.hash === '#cockpit' || window.location.search.includes('cockpit')) {
    switchToCockpit('Ramesh Sharma', 'Sharma Kirana & General Store');
  }

  function openAuthModal() {
    if (authModal) {
      authModal.classList.add('active');
    }
  }

  window.openAuthModal = openAuthModal;
});
