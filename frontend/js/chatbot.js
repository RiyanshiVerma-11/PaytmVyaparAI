/**
 * Paytm Vyapar Saathi — Autonomous AI Chatbot Controller
 * Full Live App Context & Dynamic Persistent Memory
 */
(function() {
  class VyaparChatbot {
    constructor() {
      this.sessionId = 'merchant_' + (localStorage.getItem('vyapar_merchant_id') || 'ramesh_sharma');
      this.isOpen = false;
      this.isListening = false;
      this.history = JSON.parse(localStorage.getItem('vyapar_chat_history') || '[]');
      this.speechEngine = null;

      this.initElements();
      this.initEvents();
      this.initSpeech();
      this.refreshContext();
      this.renderHistory();
    }

    initElements() {
      // 1. Create Floating Launcher in Bottom Right if not present
      if (!document.getElementById('chatbotLauncher')) {
        const launcher = document.createElement('div');
        launcher.id = 'chatbotLauncher';
        launcher.className = 'chatbot-launcher';
        launcher.title = 'Open Paytm Vyapar AI Copilot';
        launcher.innerHTML = `
          <div class="chatbot-pulse-dot"></div>
          <div class="chatbot-launcher-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              <circle cx="9" cy="10" r="1"></circle>
              <circle cx="15" cy="10" r="1"></circle>
              <path d="M9.5 13.5c.8.8 2.2.8 3 0"></path>
            </svg>
          </div>
          <div class="chatbot-launcher-tooltip">
            <strong>Paytm AI Copilot</strong> • Full Context
          </div>
        `;
        document.body.appendChild(launcher);
      }

      // 2. Create Floating Chatbot Window if not present
      if (!document.getElementById('chatbotWindow')) {
        const chatWin = document.createElement('div');
        chatWin.id = 'chatbotWindow';
        chatWin.className = 'chatbot-window';
        chatWin.innerHTML = `
          <!-- Chatbot Header -->
          <div class="chatbot-header">
            <div class="chatbot-header-left">
              <div class="chatbot-avatar">
                P
                <div class="chatbot-avatar-pulse"></div>
              </div>
              <div class="chatbot-title-box">
                <div class="chatbot-title">
                  <span>Paytm Vyapar AI</span>
                  <span style="font-size:0.65rem; background:rgba(0,186,242,0.25); border:1px solid #00baf2; padding:1px 6px; border-radius:10px; color:#ffffff;">COPILOT</span>
                </div>
                <div class="chatbot-subtitle" id="chatbotSubtitle">Sharma Kirana • Full Context Active</div>
              </div>
            </div>
            <div class="chatbot-header-actions">
              <button class="chatbot-header-btn" id="chatbotClearBtn" title="Clear Memory">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
              <button class="chatbot-header-btn" id="chatbotCloseBtn" title="Close Chat">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>

          <!-- Dynamic Live Context Strip -->
          <div class="chatbot-context-strip" id="chatbotContextStrip">
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span>Live Memory:</span>
              <span id="chatbotMemoryLabel">Syncing...</span>
            </div>
            <div class="chatbot-context-badges" id="chatbotContextBadges">
              <span class="context-mini-badge khata" id="badgeUdhaarPending">Udhaar: ₹...</span>
              <span class="context-mini-badge stock" id="badgeLowStock">Low: ...</span>
              <span class="context-mini-badge loan" id="badgeCreditScore">Score: ...</span>
            </div>
          </div>

          <!-- Messages Scrollable Body -->
          <div class="chatbot-messages" id="chatbotMessages">
            <!-- Messages inserted dynamically -->
            <div class="chat-typing-indicator" id="chatTypingIndicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>

          <!-- Quick Suggestion Chips Bar -->
          <div class="chatbot-suggestions" id="chatbotSuggestions">
            <div class="chat-suggestion-chip" data-query="Kitna udhaar baaki hai?">Udhaar Status</div>
            <div class="chat-suggestion-chip" data-query="Ramesh ₹200 aa gaya">Ramesh ₹200 aa gaya</div>
            <div class="chat-suggestion-chip" data-query="Kaun sa stock kam hai?">Low Stock</div>
            <div class="chat-suggestion-chip" data-query="Mera loan score aur limit kitna hai?">Loan Score</div>
            <div class="chat-suggestion-chip" data-query="Soundbox chime test karo">Test Soundbox</div>
          </div>

          <!-- Input Bar with Voice Mic & Send -->
          <form class="chatbot-input-bar" id="chatbotForm">
            <input type="text" id="chatbotInput" class="chatbot-text-input" placeholder="e.g. &quot;Ramesh ₹200 udhaar&quot; ya &quot;Ramesh ₹200 aa gaya&quot;" autocomplete="off" required>
            <button type="button" id="chatbotMicBtn" class="chatbot-mic-btn" title="Tap to speak">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
            <button type="submit" class="chatbot-send-btn" title="Send message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
        `;
        document.body.appendChild(chatWin);
      }

      this.launcherEl = document.getElementById('chatbotLauncher');
      this.windowEl = document.getElementById('chatbotWindow');
      this.messagesEl = document.getElementById('chatbotMessages');
      this.formEl = document.getElementById('chatbotForm');
      this.inputEl = document.getElementById('chatbotInput');
      this.micBtn = document.getElementById('chatbotMicBtn');
      this.closeBtn = document.getElementById('chatbotCloseBtn');
      this.clearBtn = document.getElementById('chatbotClearBtn');
      this.typingIndicator = document.getElementById('chatTypingIndicator');
      this.suggestionsEl = document.getElementById('chatbotSuggestions');
      this.badgeUdhaar = document.getElementById('badgeUdhaarPending');
      this.badgeStock = document.getElementById('badgeLowStock');
      this.badgeCredit = document.getElementById('badgeCreditScore');
      this.memoryLabel = document.getElementById('chatbotMemoryLabel');
    }

    initEvents() {
      // Toggle Launcher Click
      this.launcherEl.addEventListener('click', () => this.toggleWindow());
      this.closeBtn.addEventListener('click', () => this.closeWindow());

      // Clear Session Memory
      this.clearBtn.addEventListener('click', async () => {
        if (confirm('Kya aap chatbot ki conversation memory clear karna chahte hain?')) {
          this.history = [];
          localStorage.removeItem('vyapar_chat_history');
          if (window.API && API.clearChatMemory) {
            await API.clearChatMemory(this.sessionId);
          }
          this.messagesEl.querySelectorAll('.chat-bubble').forEach(b => b.remove());
          this.appendAssistantBubble("Namaste Ramesh ji! Memory clear kar di gayi hai. Aapki dukan ka live context active hai. Kahiye, aaj kya madad karu?");
          this.refreshContext();
        }
      });

      // Submit Form
      this.formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = this.inputEl.value.trim();
        if (text) {
          this.handleSendMessage(text);
          this.inputEl.value = '';
        }
      });

      // Click Suggestion Chips
      this.suggestionsEl.addEventListener('click', (e) => {
        const chip = e.target.closest('.chat-suggestion-chip');
        if (chip) {
          const query = chip.getAttribute('data-query');
          if (query) {
            this.handleSendMessage(query);
          }
        }
      });
    }

    initSpeech() {
      // Connect to SpeechEngine if available
      if (window.SpeechEngine) {
        this.speechEngine = new window.SpeechEngine(
          (transcript) => {
            if (transcript) {
              this.inputEl.value = transcript;
              this.handleSendMessage(transcript);
            }
          },
          (isListening) => {
            this.isListening = isListening;
            if (this.micBtn) {
              if (isListening) {
                this.micBtn.classList.add('listening');
              } else {
                this.micBtn.classList.remove('listening');
              }
            }
          },
          (errMsg) => {
            if (typeof window.showNotification === 'function') {
              window.showNotification(`${errMsg}`, 'error');
            }
          }
        );

        this.micBtn.addEventListener('click', () => {
          if (this.speechEngine) {
            this.speechEngine.toggle();
          }
        });
      }
    }

    toggleWindow() {
      if (this.isOpen) {
        this.closeWindow();
      } else {
        this.openWindow();
      }
    }

    openWindow() {
      this.isOpen = true;
      this.windowEl.classList.add('active');
      this.refreshContext();
      setTimeout(() => this.inputEl.focus(), 200);
      this.scrollToBottom();
    }

    closeWindow() {
      this.isOpen = false;
      this.windowEl.classList.remove('active');
    }

    async refreshContext() {
      try {
        if (!window.API || !API.getChatContext) return;
        const ctx = await API.getChatContext();
        if (ctx) {
          const udhaarAmt = ctx.khata?.total_pending_udhaar || 0;
          const lowStockCount = ctx.inventory?.low_stock_count || 0;
          const score = ctx.credit?.score || 88;

          if (this.badgeUdhaar) this.badgeUdhaar.textContent = `Udhaar: ₹${Math.round(udhaarAmt)}`;
          if (this.badgeStock) this.badgeStock.textContent = `Low Stock: ${lowStockCount}`;
          if (this.badgeCredit) this.badgeCredit.textContent = `Score: ${score}`;
          if (this.memoryLabel) this.memoryLabel.textContent = `Active (${this.history.length / 2 | 0} turns)`;
        }
      } catch (err) {
        console.warn('Context sync error:', err);
      }
    }

    renderHistory() {
      if (this.history.length === 0) {
        // Welcome message
        this.appendAssistantBubble(
          "Namaste Ramesh Sharma ji! Main **Paytm Vyapar Saathi Copilot** hoon.\n\n" +
          "Mere paas aapki dukan ka **full real-time context** hai:\n" +
          "• **Live Bahi-Khata Ledger** & Customer Balances\n" +
          "• **Kirana Inventory** & 1-Click Wholesale Restock\n" +
          "• **Paytm Loan Score** & Instant Disbursal\n\n" +
          "Aap bol kar ya type karke kuch bhi pooch ya darj kar sakte hain!"
        );
      } else {
        this.history.forEach(item => {
          if (item.role === 'user') {
            this.appendUserBubble(item.content, false);
          } else {
            this.appendAssistantBubble(item.content, false, item.actionTaken, item.confirmationCard);
          }
        });
        this.scrollToBottom();
      }
    }

    async handleSendMessage(userText) {
      // 1. Add User Bubble
      this.appendUserBubble(userText, true);
      this.showTyping(true);
      this.scrollToBottom();

      try {
        // 2. Send to Backend Chatbot Service
        let data;
        if (window.API && API.sendChatMessage) {
          data = await API.sendChatMessage(userText, this.sessionId);
        } else {
          // Fallback to /api/agent/chat
          const res = await fetch('/api/agent/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userText })
          });
          data = await res.json();
        }

        this.showTyping(false);

        const replyText = data.reply || data.result?.message || 'Ji, process ho gaya.';
        const confCard = data.confirmation_card || (data.result && data.result.confirmation_card) || null;
        this.appendAssistantBubble(replyText, true, data.action_taken, confCard);

        // 3. Play Soundbox Audio Chime if action was taken
        if (data.soundbox_payload && window.paytmSoundbox) {
          window.paytmSoundbox.broadcast(data.soundbox_payload.speech_text);
        }

        // 4. Dynamically Refresh Main App Views & Context
        this.refreshContext();
        if (typeof window.loadDashboardData === 'function') {
          await window.loadDashboardData();
        }
        if (typeof window.loadLedgerCard === 'function') {
          await window.loadLedgerCard(false);
        }
        if (typeof window.renderKhataCustomersTable === 'function') {
          window.renderKhataCustomersTable();
        }
        if (typeof window.renderKhataAuditList === 'function') {
          window.renderKhataAuditList();
        }
        if (window.showNotification && data.action_taken) {
          window.showNotification(`${replyText.split('\n')[0].replace(/[#*]/g, '')}`, 'success');
        }

        // 5. Update Suggestions if returned
        if (data.suggestions && data.suggestions.length > 0) {
          this.updateSuggestions(data.suggestions);
        }

      } catch (err) {
        this.showTyping(false);
        this.appendAssistantBubble(`Error processing query: ${err.message}. Kripya dobara try karein.`, true);
      }
    }

    appendUserBubble(text, saveToHistory = true) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble user';
      bubble.textContent = text;
      this.messagesEl.insertBefore(bubble, this.typingIndicator);
      this.scrollToBottom();

      if (saveToHistory) {
        this.history.push({ role: 'user', content: text, time: new Date().toISOString() });
        this.saveHistory();
      }
    }

    appendAssistantBubble(text, saveToHistory = true, actionTaken = null, confirmationCard = null) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble assistant';
      
      // Basic markdown parsing for bold and bullet points
      let html = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:var(--bg-card-subtle); padding:2px 5px; border-radius:4px; font-weight:700;">$1</code>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n• /g, '<br>• ');

      if (actionTaken) {
        html += `<div class="chat-bubble-action-box">Action Executed: <strong>${actionTaken}</strong> • Synced with Live DB</div>`;
      }

      if (confirmationCard) {
        const isSim = Boolean(confirmationCard.simulation);
        const amountStr = confirmationCard.amount !== undefined ? `₹${Number(confirmationCard.amount || 0).toLocaleString('en-IN')}` : '';
        html += `
          <div class="chat-confirmation-card" style="margin-top:10px; padding:12px; background:var(--bg-card); border:1px solid ${isSim ? '#f59e0b' : '#10b981'}; border-radius:8px; box-shadow:0 2px 8px rgba(0,0,0,0.05); text-align:left;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <span style="font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:var(--paytm-blue, #002970);">${confirmationCard.action || 'Transaction Confirmation'}</span>
              <span class="badge ${isSim ? 'badge-amber' : 'badge-green'}" style="font-size:10px; padding:2px 8px; border-radius:12px;">${isSim ? 'DEMO SIMULATION' : 'LIVE LEDGER'}</span>
            </div>
            ${amountStr ? `<div style="font-size:20px; font-weight:800; color:#10b981; margin-bottom:6px;">${amountStr}</div>` : ''}
            <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
              ${confirmationCard.entity ? `<div><strong>Party:</strong> ${confirmationCard.entity}</div>` : ''}
              ${confirmationCard.item ? `<div><strong>Item / SKU:</strong> ${confirmationCard.item}</div>` : ''}
              <div><strong>Date:</strong> ${confirmationCard.date || new Date().toLocaleString('en-IN')}</div>
              <div><strong>Status:</strong> ${confirmationCard.status || 'Confirmed'}</div>
            </div>
            ${confirmationCard.notice ? `<div style="margin-top:8px; padding:6px 10px; background:rgba(245,158,11,0.12); border-left:3px solid #f59e0b; font-size:11px; color:#b45309; border-radius:4px; font-weight:500;">ℹ️ ${confirmationCard.notice}</div>` : ''}
          </div>
        `;
      }

      bubble.innerHTML = html;
      this.messagesEl.insertBefore(bubble, this.typingIndicator);
      this.scrollToBottom();

      if (saveToHistory) {
        this.history.push({ role: 'assistant', content: text, actionTaken, confirmationCard, time: new Date().toISOString() });
        this.saveHistory();
      }
    }

    showTyping(show) {
      if (this.typingIndicator) {
        this.typingIndicator.style.display = show ? 'flex' : 'none';
      }
    }

    updateSuggestions(list) {
      if (!this.suggestionsEl) return;
      this.suggestionsEl.innerHTML = '';
      list.forEach(item => {
        const chip = document.createElement('div');
        chip.className = 'chat-suggestion-chip';
        chip.setAttribute('data-query', item);
        chip.textContent = item;
        this.suggestionsEl.appendChild(chip);
      });
    }

    saveHistory() {
      if (this.history.length > 20) {
        this.history = this.history.slice(-20);
      }
      localStorage.setItem('vyapar_chat_history', JSON.stringify(this.history));
      if (this.memoryLabel) {
        this.memoryLabel.textContent = `Active (${this.history.length / 2 | 0} turns)`;
      }
    }

    scrollToBottom() {
      setTimeout(() => {
        this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
      }, 50);
    }
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.paytmChatbot = new VyaparChatbot();
    });
  } else {
    window.paytmChatbot = new VyaparChatbot();
  }
})();
