/**
 * Antigravity UI & Motion Engine
 * Merchant-First Design: Stable, Solid, Non-Wobbly Interface for Fast Kirana POS
 * Delivers Smooth View Entrances, Soundbox Live Visualizer, and Mobile Ergonomics
 */

(function () {
  'use strict';

  // Wait for DOM to be ready
  document.addEventListener('DOMContentLoaded', initAntigravityMotion);

  function initAntigravityMotion() {
    // 3D mousemove tilting permanently disabled as requested for stable merchant POS ergonomics
    setupGSAPEntrances();
    setupSoundboxLiveVisualizer();
    setupMobileHapticFeedback();
  }

  /**
   * 1. Smooth, Weightless Staggered Entrances on View Switch
   */
  function setupGSAPEntrances() {
    if (!window.gsap) return;

    // Hook into view transitions
    const originalSwitchView = window.switchView;
    if (typeof originalSwitchView === 'function') {
      window.switchView = function (viewId) {
        originalSwitchView(viewId);
        triggerStaggeredMotion();
      };
    }

    // Trigger on initial cockpit enter buttons
    ['authNavBtn', 'demoLaunchBtn', 'launchCockpitBtn'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          setTimeout(triggerStaggeredMotion, 80);
        });
      }
    });

    // If cockpit already active, trigger once
    const cockpit = document.getElementById('cockpitView');
    if (cockpit && cockpit.classList.contains('active')) {
      triggerStaggeredMotion();
    }
  }

  function triggerStaggeredMotion() {
    if (!window.gsap) return;

    // Animate Glance Cards gently into place (then clear transform completely)
    gsap.fromTo(
      '.glance-card',
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      }
    );

    // Animate Bento Cards gently into place (then clear transform completely)
    gsap.fromTo(
      '.pos-bento-card',
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      }
    );

    // Animate Bottom Credit Strip
    gsap.fromTo(
      '.pos-credit-strip',
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        delay: 0.15,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      }
    );
  }

  /**
   * 2. Soundbox Live Audio Waveform Physics
   */
  function setupSoundboxLiveVisualizer() {
    const bars = document.querySelectorAll('.soundbar');
    if (!bars.length) return;

    // React to window.playPaytmSoundbox or simulated payment events
    const origSimulate = window.simulatePayment;
    if (typeof origSimulate === 'function') {
      window.simulatePayment = function (amount) {
        animateWaveBurst();
        return origSimulate(amount);
      };
    }

    function animateWaveBurst() {
      if (!window.gsap) return;
      bars.forEach((bar, i) => {
        gsap.to(bar, {
          scaleY: 1.8 + Math.random() * 0.8,
          duration: 0.12,
          yoyo: true,
          repeat: 7,
          delay: i * 0.03,
          ease: 'power1.inOut',
        });
      });
    }

    // Expose globally
    window.burstSoundwave = animateWaveBurst;
  }

  /**
   * 3. Mobile Haptic & Micro-touch Feedback
   */
  function setupMobileHapticFeedback() {
    const mobileBtns = document.querySelectorAll('.mobile-nav-item, .pos-btn-ghost-sm, .amount-chip');
    mobileBtns.forEach((btn) => {
      btn.addEventListener('touchstart', () => {
        btn.style.transform = 'scale(0.97)';
      }, { passive: true });
      btn.addEventListener('touchend', () => {
        btn.style.transform = 'scale(1)';
      }, { passive: true });
    });
  }

  // Expose engine API
  window.AntigravityMotion = {
    triggerStaggeredMotion,
  };
})();
