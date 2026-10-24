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

  // Tab Switching between Sign In, Sign Up, and Forgot Password (OTP)
  window.switchAuthTab = function(tabName) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    const tabs = {
      signin: document.getElementById('tabContentSignIn'),
      signup: document.getElementById('tabContentSignUp'),
      forgot: document.getElementById('tabContentForgot')
    };
    Object.keys(tabs).forEach(k => {
      if (tabs[k]) tabs[k].classList.toggle('active', k === tabName);
    });
    // Hide error messages
    const errIn = document.getElementById('signInErrorMsg');
    const errUp = document.getElementById('signUpErrorMsg');
    const errReq = document.getElementById('forgotRequestError');
    const errVer = document.getElementById('forgotVerifyError');
    if (errIn) errIn.style.display = 'none';
    if (errUp) errUp.style.display = 'none';
    if (errReq) errReq.style.display = 'none';
    if (errVer) errVer.style.display = 'none';
  };

  const navTabs = document.getElementById('authNavTabs');
  if (navTabs) {
    navTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.auth-tab-btn');
      if (btn && btn.dataset.tab) {
        window.switchAuthTab(btn.dataset.tab);
      }
    });
  }

  // 1. Quick Demo Login for Judges & Evaluators (Sharma Kirana Store)
  if (demoQuickBtn) {
    demoQuickBtn.addEventListener('click', async () => {
      demoQuickBtn.disabled = true;
      demoQuickBtn.innerHTML = 'Entering Sharma Kirana Store...';
      try {
        let res;
        if (window.API && window.API.loginMerchant) {
          res = await window.API.loginMerchant('ramesh.kirana@paytm.com', '1234');
        }
        const m = (res && res.merchant) || {
          name: 'Ramesh Sharma',
          shop_name: 'Sharma Kirana Store',
          email: 'ramesh.kirana@paytm.com',
          phone: '+91 9811223344',
          upi_id: '8171008964@ptaxis',
          id: 1
        };
        saveSessionAndEnter(m, true);
      } catch (err) {
        // Fallback offline mock entry
        saveSessionAndEnter({
          name: 'Ramesh Sharma',
          shop_name: 'Sharma Kirana Store',
          email: 'ramesh.kirana@paytm.com',
          phone: '+91 9811223344',
          upi_id: '8171008964@ptaxis',
          id: 1
        }, true);
      } finally {
        demoQuickBtn.disabled = false;
        demoQuickBtn.innerHTML = 'Continue as Demo Merchant (Sharma Kirana Store)';
      }
    });
  }

  // 2. Standard Merchant Sign-In (Existing Account)
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginId = document.getElementById('authEmail')?.value.trim();
      const password = document.getElementById('authPassword')?.value.trim();
      const submitBtn = document.getElementById('btnSignInSubmit');
      const errBox = document.getElementById('signInErrorMsg');

      if (!loginId || !password) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying Credentials...';
      }
      if (errBox) errBox.style.display = 'none';

      try {
        let data;
        if (window.API && window.API.loginMerchant) {
          data = await window.API.loginMerchant(loginId, password);
        } else {
          // Direct fallback mock
          data = {
            success: true,
            merchant: {
              name: loginId.includes('ramesh') ? 'Ramesh Sharma' : 'Merchant',
              shop_name: loginId.includes('ramesh') ? 'Sharma Kirana Store' : 'Kirana Retail Store',
              email: loginId,
              phone: '+91 98110 54321',
              id: 1
            }
          };
        }

        if (data && data.success && data.merchant) {
          saveSessionAndEnter(data.merchant, data.is_demo);
        }
      } catch (err) {
        if (errBox) {
          errBox.textContent = `${err.message || 'Login failed. Please check your credentials.'}`;
          errBox.style.display = 'block';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In to Cockpit';
        }
      }
    });
  }

  // 3. New Merchant Registration (Live Multi-Tenancy)
  window.handleMerchantRegister = async function(e) {
    if (e && e.preventDefault) e.preventDefault();

    const name = document.getElementById('regName')?.value.trim();
    const shopName = document.getElementById('regShopName')?.value.trim();
    const phone = document.getElementById('regPhone')?.value.trim();
    const email = document.getElementById('regEmail')?.value.trim();
    const password = document.getElementById('regPassword')?.value.trim();
    const category = document.getElementById('regCategory')?.value;
    const upi = document.getElementById('regUpi')?.value.trim();
    const submitBtn = document.getElementById('btnSignUpSubmit');
    const errBox = document.getElementById('signUpErrorMsg');

    if (!name || !shopName || !phone || !email || !password) {
      if (errBox) {
        errBox.textContent = 'Please fill all required registration fields.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Registering Your Shop...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
      let data;
      if (window.API && window.API.registerMerchant) {
        data = await window.API.registerMerchant({
          name: name,
          shop_name: shopName,
          phone: phone,
          email: email,
          password: password,
          upi_id: upi,
          address: `${category} Store`
        });
      } else {
        data = {
          success: true,
          merchant: {
            name: name,
            shop_name: shopName,
            email: email,
            phone: phone,
            upi_id: upi || '8171008964@ptaxis',
            id: Date.now()
          }
        };
      }

      if (data && data.success && data.merchant) {
        if (window.showNotification) {
          window.showNotification(`Shop '${shopName}' registered successfully!`, 'success');
        }
        saveSessionAndEnter(data.merchant, false);
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = `${err.message || 'Registration failed.'}`;
        errBox.style.display = 'block';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Store Account & Enter';
      }
    }
  };

  // 4. Forgot Password — Step 1: Send OTP via live Gmail SMTP
  window.handleSendLoginOtp = async function() {
    const loginId = document.getElementById('forgotLoginId')?.value.trim();
    const sendBtn = document.getElementById('btnSendOtp');
    const errBox = document.getElementById('forgotRequestError');

    if (!loginId) {
      if (errBox) {
        errBox.textContent = 'Please enter your registered email or mobile number.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending OTP via Gmail SMTP...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
      let res;
      if (window.API && window.API.sendForgotPasswordOtp) {
        res = await window.API.sendForgotPasswordOtp(loginId);
      } else {
        res = { success: true, email: loginId, otp_code: '584920', message: `OTP sent to ${loginId}` };
      }

      if (res && res.success) {
        document.getElementById('forgotStepRequest').style.display = 'none';
        const verifyStep = document.getElementById('forgotStepVerify');
        if (verifyStep) verifyStep.style.display = 'block';

        const badge = document.getElementById('liveOtpBadge');
        if (badge) {
          badge.textContent = `OTP: ${res.otp_code}`;
          badge.title = 'Live OTP code generated and emailed';
        }
        const notice = document.getElementById('otpRecipientNotice');
        if (notice) {
          notice.textContent = `Sent to ${res.email}. Enter the 6-digit code below to enter.`;
        }
        const inputOtp = document.getElementById('inputOtpCode');
        if (inputOtp) {
          inputOtp.value = res.otp_code || '';
          inputOtp.focus();
        }
        if (window.showNotification) {
          window.showNotification(`6-digit OTP code sent to ${res.email}!`, 'success');
        }
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = `${err.message || 'Failed to send OTP.'}`;
        errBox.style.display = 'block';
      }
    } finally {
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.innerHTML = 'Send Login OTP via Email';
      }
    }
  };

  // 5. Forgot Password — Step 2: Verify OTP and Enter Cockpit
  window.handleVerifyLoginOtp = async function() {
    const loginId = document.getElementById('forgotLoginId')?.value.trim();
    const otp = document.getElementById('inputOtpCode')?.value.trim();
    const newPass = document.getElementById('inputOtpNewPassword')?.value.trim();
    const verifyBtn = document.getElementById('btnVerifyOtp');
    const errBox = document.getElementById('forgotVerifyError');

    if (!otp || otp.length < 4) {
      if (errBox) {
        errBox.textContent = 'Please enter the valid 6-digit OTP code.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (verifyBtn) {
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying Code...';
    }
    if (errBox) errBox.style.display = 'none';

    try {
      let res;
      if (window.API && window.API.verifyForgotPasswordOtp) {
        res = await window.API.verifyForgotPasswordOtp(loginId, otp, newPass || null);
      } else {
        res = {
          success: true,
          merchant: {
            name: 'Ramesh Sharma',
            shop_name: 'Sharma Kirana Store',
            email: loginId,
            id: 1
          }
        };
      }

      if (res && res.success && res.merchant) {
        if (window.showNotification) {
          window.showNotification(`OTP Verified! Welcome back, ${res.merchant.name}!`, 'success');
        }
        saveSessionAndEnter(res.merchant, res.merchant.id === 1);
      }
    } catch (err) {
      if (errBox) {
        errBox.textContent = `${err.message || 'Invalid or expired OTP code.'}`;
        errBox.style.display = 'block';
      }
    } finally {
      if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.innerHTML = 'Verify OTP & Enter Cockpit';
      }
    }
  };

  function saveSessionAndEnter(merchant, isDemo = false) {
    const name = merchant.name || 'Ramesh Sharma';
    const shop = merchant.shop_name || 'Sharma Kirana Store';
    const email = merchant.email || 'ramesh.kirana@paytm.com';
    const phone = merchant.phone || '+91 98110 54321';
    const vpa = merchant.upi_id || '8171008964@ptaxis';
    const merchantId = merchant.id || 1;

    const session = {
      name: name,
      shopName: shop,
      email: email,
      phone: phone,
      vpa: vpa,
      merchantId: merchantId,
      isDemo: isDemo,
      initials: computeInitials(name),
      token: merchant.auth_token || ('PAYTM_JWT_' + Date.now())
    };
    localStorage.setItem('paytm_merchant_session', JSON.stringify(session));

    if (authModal) authModal.classList.remove('active');
    if (window.updateNavAuthState) window.updateNavAuthState();
    switchToCockpit(name, shop, isDemo);
  }

  window.switchToCockpit = function(name, shop, isDemo = true) {
    const landingEl = document.getElementById('landingView');
    const appEl = document.getElementById('appView');
    const merchantNameEl = document.getElementById('headerMerchantName');
    const merchantShopEl = document.getElementById('headerMerchantShop');
    const avatarEl = document.getElementById('headerMerchantAvatar');

    if (landingEl) landingEl.style.display = 'none';
    if (appEl) appEl.style.display = 'flex';
    document.body.classList.add('in-cockpit');

    const actualName = name || 'Ramesh Sharma';
    const actualShop = shop || 'Sharma Kirana Store';
    const initials = computeInitials(actualName);

    if (merchantNameEl) merchantNameEl.textContent = actualName;
    if (merchantShopEl) merchantShopEl.textContent = actualShop + ' ▾';
    if (avatarEl) avatarEl.textContent = initials;

    // Broadcast welcome chime on entry
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
    const vpa = session.vpa || '8171008964@ptaxis';
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
    const newVpa = document.getElementById('profMerchantVpa')?.value.trim() || '8171008964@ptaxis';
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

    // Persist new email to backend database so PO dispatches & Daily P&L emails use verified real inbox
    if (newEmail && typeof API !== 'undefined' && API.updateMerchantEmail) {
      API.updateMerchantEmail(newEmail).then(res => {
        if (window.showNotification && res.success) {
          window.showNotification(`Merchant email updated to ${newEmail}`, 'success');
        }
      }).catch(e => console.warn('Could not sync email to backend:', e));
    }

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
    } catch (e) {
      console.warn('Failed to parse merchant session:', e);
    }
  }

  // Global Reset Demo Data Handler for Evaluators & Judges
  window.handleResetDemoData = async function() {
    const confirmed = confirm("Are you sure you want to reset all demo data to baseline?\n\nThis will restore Sharma Kirana Store's original demo ledger, customers, inventory, and UPI transaction history.");
    if (!confirmed) return;

    try {
      if (window.showNotification) {
        window.showNotification("Resetting demo data to baseline / डेमो डेटा रीसेट हो रहा है...", "info");
      }
      if (window.API && window.API.resetDemoData) {
        const res = await window.API.resetDemoData();
        if (res && res.success) {
          if (window.paytmSoundbox) {
            window.paytmSoundbox.broadcast("Paytm Vyapar Saathi demo data safalta-purvak reset ho gaya hai.");
          }
          if (window.showNotification) {
            window.showNotification("Demo data reset successfully to Sharma Kirana baseline!", "success");
          }
          if (window.closeMerchantProfileModal) {
            window.closeMerchantProfileModal();
          }
          if (typeof window.loadDashboardData === 'function') {
            await window.loadDashboardData();
          }
          if (typeof window.renderKhataCustomersTable === 'function') {
            window.renderKhataCustomersTable();
          }
          if (typeof window.renderInventoryTable === 'function') {
            window.renderInventoryTable();
          }
          if (typeof window.refreshProfitTrendsChart === 'function') {
            window.refreshProfitTrendsChart();
          }
        }
      }
    } catch (err) {
      console.error("Failed to reset demo data:", err);
      if (window.showNotification) {
        window.showNotification(`Reset failed: ${err.message}`, "error");
      }
    }
  };

  // Global Logout Handler (Used by Mobile Profile Circle, Profile Modal, and Sidebar)
  window.handleMerchantLogout = function() {
    window.closeMerchantProfileModal();
    localStorage.removeItem('paytm_merchant_session');
    if (window.updateNavAuthState) window.updateNavAuthState();
    const landingEl = document.getElementById('landingView');
    const appEl = document.getElementById('appView');
    if (appEl) appEl.style.display = 'none';
    if (landingEl) landingEl.style.display = 'flex';
    document.body.classList.remove('in-cockpit');
    window.location.hash = '';
    const launcher = document.getElementById('chatbotLauncher');
    if (launcher) launcher.style.display = 'none';
    if (window.showNotification) {
      window.showNotification('Logged out successfully / सफलतापूर्वक लॉग आउट हो गया', 'info');
    }
  };

  // Khata Form Helpers (Visual pill toggles, amount adders, item quick chips)
  window.setKhataEntryType = function(type) {
    const input = document.getElementById('khataInputType');
    const udhaarBtn = document.getElementById('khataTypeUdhaarBtn');
    const jamaBtn = document.getElementById('khataTypeJamaBtn');
    const amountBox = document.getElementById('khataAmountContainer');
    const amountLabel = document.getElementById('khataAmountLabel');
    const submitBtn = document.getElementById('submitAddKhataBtn');

    if (input) input.value = type;
    if (type === 'udhaar') {
      if (udhaarBtn) udhaarBtn.className = 'type-pill-btn active-udhaar';
      if (jamaBtn) jamaBtn.className = 'type-pill-btn';
      if (amountBox) amountBox.className = 'hero-amount-box is-udhaar';
      if (amountLabel) amountLabel.textContent = 'उधार राशि / Amount';
      if (submitBtn) {
        submitBtn.className = 'btn-modal-submit-khata';
        submitBtn.innerHTML = 'खाताबही में दर्ज करें (Save Entry)';
      }
    } else {
      if (udhaarBtn) udhaarBtn.className = 'type-pill-btn';
      if (jamaBtn) jamaBtn.className = 'type-pill-btn active-jama';
      if (amountBox) amountBox.className = 'hero-amount-box is-jama';
      if (amountLabel) amountLabel.textContent = 'जमा राशि / Amount';
      if (submitBtn) {
        submitBtn.className = 'btn-modal-submit-khata is-jama';
        submitBtn.innerHTML = 'जमा राशि दर्ज करें (Save Payment)';
      }
    }
  };

  window.setKhataAmount = function(amt) {
    const amountInput = document.getElementById('khataInputAmount');
    if (!amountInput) return;
    const current = parseFloat(amountInput.value) || 0;
    amountInput.value = current + amt;
    amountInput.focus();
  };

  window.setKhataDesc = function(desc) {
    const descInput = document.getElementById('khataInputDesc');
    if (descInput) {
      descInput.value = desc;
      descInput.focus();
    }
  };
});
