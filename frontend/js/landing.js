/**
 * Landing Page Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  const launchBtn = document.getElementById('launchCockpitBtn');
  const loginNavBtn = document.getElementById('loginNavBtn');
  const authModal = document.getElementById('authOverlay');
  const demoLaunchBtn = document.getElementById('demoLaunchBtn');

  // Open Auth Modal
  if (launchBtn) {
    launchBtn.addEventListener('click', () => {
      openAuthModal();
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

  function openAuthModal() {
    if (authModal) {
      authModal.classList.add('active');
    }
  }

  window.openAuthModal = openAuthModal;
});
