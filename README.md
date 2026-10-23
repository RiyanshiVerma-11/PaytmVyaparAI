# 🇮🇳 Paytm Vyapar Saathi (AI Business Copilot)
> **Autonomous AI Business Partner & Intelligent Soundbox for 30M+ Indian Merchants**  
> *Built for Paytm Build for India AI Hackathon – Delhi (Offline Finals @ Paytm HQ, SkymarkOne, Noida)*  
> **Track:** Track 1 — *Merchant Growth AI ("Beyond Payments")*

---

![Paytm Soundbox AI Copilot](./assets/soundbox_copilot.jpg)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/SQLite-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio-Soundbox_Chime-00BAF2?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Track](https://img.shields.io/badge/Track-Merchant_Growth_AI-002970?style=for-the-badge)](https://devsemble.com/hackathons/Paytm%20Build%20for%20India%20AI%20Hackathon%20%E2%80%93%20Delhi%20-by-paytm)

---

## 📌 Executive Summary

**Paytm Vyapar Saathi** transforms the iconic **Paytm Soundbox** from a passive payment confirmation speaker into an **active, proactive digital business partner (Munshi + Marketing Manager + CFO)** for 30 million Indian Kirana and retail merchants.

Instead of forcing busy shopkeepers to navigate complicated English apps during peak counter rush, **they simply speak in Hinglish or Hindi**. The autonomous ReAct agent executes business actions in real-time:
1. **Records Udhaar (Credit)** in a persistent digital ledger.
2. **Decrements stock** and alerts before fast-moving items run out.
3. **Dispatches automated wholesale Purchase Orders via Email SMTP** to suppliers.
4. **Broadcasts verbal confirmation** through the Soundbox with the signature dual-frequency chime.
5. **Generates pre-approved working capital loan scores** (0–100) powered by Paytm Lending telemetry.

---

## 🚀 The 4 Core Pillars ("Beyond Payments")

![Paytm Vyapar Dashboard UI](./assets/dashboard_ui.jpg)

### 1. 📈 Grow Their Business (Merchant Growth AI)
* **Zero-Effort QR Telemetry CRM:** Automatically logs customer visit frequencies from incoming Paytm QR payments with zero manual typing.
* **Customer Win-Back Engine:** Detects inactive regulars (*"Customer #9811 hasn't visited in 30 days"*) and crafts 1-tap native SMS discount vouchers.
* **Festive Surge Forecaster:** Alerts merchants 7 days before festivals (Diwali, Navratri, Eid) to capitalize on 3x-4x demand spikes.

### 2. ⚙️ Manage Operations (Autonomous Copilot)
* **Hands-Free Voice Khata:** Shopkeeper speaks naturally:  
  *👉 "Ramesh bhai ko ₹450 ka refine tel udhaar diya, note karlo."*
* **Automated Supplier Email POs (Python SMTP):** Sends formal, professional reorders directly to wholesale distributors when stock dips below threshold.
* **60-Second Daily Profit Pulse:** End-of-day audio summary through the Soundbox + branded P&L statement delivered directly to the merchant's email.

### 3. ❤️ Serve Customers Better (Trust & Transparency)
* **Two-Way Soundbox Voice Handshake:** Chime + verbal confirmation ensures 100% mutual trust between shopkeeper and customer.
* **Instant Digital Bills:** Clear itemized receipts sent via 1-tap native SMS with direct UPI payment links (`upi://pay`).
* **1-Tap Fail-Safe Undo:** 5-second safety timer on screen allows instant reversal if voice is misheard.

### 4. 💳 Beyond Payments (Paytm Lending Rails)
* **0–100 Merchant Credit Health Score:** Aggregates Soundbox QR consistency and ledger recovery rates to underwrite collateral-free loans of ₹50,000 to ₹3,00,000.

---

## 🏛️ System Architecture

```
                              ┌──────────────────────────────────────────────┐
                              │    Paytm Merchant Cockpit (Web & Mobile)     │
                              │  • Web Speech API (Hinglish/Hindi NLP)       │
                              │  • Web Audio API Soundbox Chime Synthesizer  │
                              │  • Live Agent Thought & Action Telemetry     │
                              └──────────────────────┬───────────────────────┘
                                                     │ REST / SSE API
                                                     ▼
                              ┌──────────────────────────────────────────────┐
                              │      FastAPI Backend & Agent Controller      │
                              │  • Asynchronous Tool Dispatcher              │
                              │  • Dual-Engine: LLM + Deterministic Fallback │
                              └──────────────────────┬───────────────────────┘
                                                     │
      ┌───────────────────────────┬──────────────────┴────────────────┬───────────────────────────┐
      ▼                           ▼                                   ▼                           ▼
┌──────────────┐          ┌──────────────┐                    ┌──────────────┐            ┌──────────────┐
│ Tool 1:      │          │ Tool 2:      │                    │ Tool 3:      │            │ Tool 4:      │
│ Voice Khata  │          │ Stock & PO   │                    │ Email SMTP & │            │ Credit &     │
│ Ledger       │          │ Guardian     │                    │ SMS Dispatch │            │ Loan Scorer  │
└──────┬───────┘          └──────┬───────┘                    └──────┬───────┘            └──────┬───────┘
       │                         │                                   │                           │
       └─────────────────────────┴─────────────────┬─────────────────┴───────────────────────────┘
                                                   ▼
                              ┌──────────────────────────────────────────────┐
                              │           SQLite Persistent Store            │
                              │  • merchants  • customers  • khata_ledger    │
                              │  • inventory  • soundbox_tx  • supplier_pos  │
                              └──────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

* **Backend:** Python 3.10+, FastAPI, Pydantic v2
* **Agent Core:** ReAct (Reasoning + Acting) autonomous agent with multi-tool dispatch
* **Database:** SQLite (ACID compliant, zero-latency local state persistence)
* **Audio Synthesis:** Web Audio API (authentic dual-tone 440Hz / 880Hz Paytm Soundbox chime) + Web Speech API (Hindi / Hinglish TTS)
* **Communications:** Python `smtplib` (Wholesale Supplier POs & Daily P&L Statements) + Native SMS URI Protocol (`sms:`) for 100% deliverability with zero ban risk.

---

## ⚡ Quickstart

### 1. Clone the repository
```bash
git clone https://github.com/[your-username]/PaytmVyaparAI.git
cd PaytmVyaparAI
```

### 2. Set up virtual environment & dependencies
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the application
```bash
python backend/main.py
```
Open your browser at `http://localhost:8000` to interact with the **Paytm Merchant Cockpit**.

---

## 👥 Team
* **Riyanshi Verma** & Team
* **Event:** Paytm Build for India AI Hackathon – Delhi Edition
* **Venue:** Paytm, SkymarkOne, Sector 98, Noida, Uttar Pradesh 201304

---
*Built with ❤️ for Bharat's 30 Million Retail Shopkeepers.*
