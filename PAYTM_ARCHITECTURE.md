# PaytmVyaparAI — Paytm Enterprise Stack Integration & Architecture

> **Hackathon Edition:** Paytm Build for India AI Hackathon – Noida (SkymarkOne)  
> **Target Track:** Track 1 (Merchant Growth AI) & Track 3 (Autonomous AI Teammates)  
> **Deployment Model:** Extension & Mini-App Module for **Paytm for Business (P4B)** and **Paytm Soundbox 4.0 IoT**

---

## 1. Executive Summary & Integration Thesis

> 🏆 **Notice for Evaluators & Judges:**  
> **“A fully populated demo merchant is provided so judges can test the complete product without manual onboarding.”**  
> * **Preloaded Demo Store:** Sharma Kirana Store (MID: `MID_SHARMA_KIRANA_01`)  
> * **Judge Login Credentials:** `ramesh.kirana@paytm.com` | PIN: `1234` (or 1-click **"Continue as Demo Merchant"**)  
> * **Sandbox Reset:** Click **"Reset Demo Data"** anytime to return all customer balances, inventory counts, and transaction telemetry back to initial baseline.

PaytmVyaparAI is architected not as an isolated, redundant 3rd-party silo, but as a **native intelligent intelligence layer built directly on Paytm's existing hardware, payments, and financial services stack**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PAYTM FOR BUSINESS (P4B) ECOSYSTEM                    │
│                                                                             │
│  ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────┐  │
│  │ Paytm Soundbox 4.0 IoT│   │  Paytm QR Telemetry   │   │ Paytm P4B App │  │
│  │ (Hardware Speaker)    │   │  (Payment Gateway)    │   │ (Merchant UI) │  │
│  └───────────▲───────────┘   └───────────▲───────────┘   └───────▲───────┘  │
└──────────────┼───────────────────────────┼───────────────────────┼──────────┘
               │ MQTT Topic                │ Webhook Callback      │ Mini-App SDK
               ▼                           ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PAYTM VYAPAR AI: INTELLIGENT AGENT LAYER                 │
│                                                                             │
│   • Groq ReAct Dual-Engine: Tool Calling + Zero Silent Fallbacks            │
│   • Mathematical Credit Underwriting (Soundbox Velocity + Khata Ratio)      │
│   • Kirana Procurement & Deferred Delivery Stock Tracking                   │
│   • Universal Dynamic UPI Reminders (Native SMS & WhatsApp Deep-Links)      │
└──────────────┬───────────────────────────┬───────────────────────┬──────────┘
               │                           │                       │
               ▼                           ▼                       ▼
┌──────────────────────────┐   ┌───────────────────────┐   ┌──────────────────┐
│ Paytm Merchant Lending   │   │ Paytm Payouts (B2B)   │   │ Paytm Merchant   │
│ API (/v2/lending)        │   │ (/v1/payouts/transfer)│   │ DB & Identity    │
└──────────────────────────┘   └───────────────────────┘   └──────────────────┘
```

---

## 2. Paytm Enterprise API Mapping

Each feature of PaytmVyaparAI maps 1-to-1 with real Paytm Enterprise APIs and IoT device protocols:

| Feature in PaytmVyaparAI | Real Paytm Enterprise API / Protocol | Status in Demo Sandbox |
| :--- | :--- | :--- |
| **Voice Repeat-Back & Alerts** | **Paytm Soundbox MQTT Protocol**<br>`Topic: merchant/{MID}/soundbox/tts`<br>`Payload: {"text": "...", "lang": "hi-IN", "chime": true}` | **Live Synthesizer Simulation** (HTML5 Web Audio Chime + Web Speech Synthesis mimicking Soundbox 4.0 hardware) |
| **QR Telemetry & Inflow** | **Paytm Payment Gateway Webhook**<br>`POST /v1/merchant/callback`<br>`Event: PAYMENT_SUCCESS, BANK_TXN_ID` | **Live Database Telemetry** (Aggregating real incoming Soundbox transactions) |
| **Working Capital Micro-Loans** | **Paytm Capital / Merchant Lending API**<br>`POST /v2/lending/merchant/underwrite`<br>`POST /v2/lending/merchant/disburse` | **High-Fidelity Sandbox Simulation** (Validated against computed underwriting limit & logged under `Loan_Disbursal` to prevent revenue inflation) |
| **Supplier PO Escrow Payout** | **Paytm Payouts API**<br>`POST /v1/payouts/transfer`<br>`Payload: {"subwalletId": "...", "beneficiaryVpa": "..."}` | **B2B Outbox RFC-5322 MIME Relay** (Live SMTP when host configured; otherwise structured Outbox) |
| **Khata Payment Deep Links** | **Paytm Universal UPI Intent**<br>`upi://pay?pa={VPA}&am={AMT}&pn={SHOP}&cu=INR` | **LIVE Real-World Account Integration** (Configured with testing VPA `8171008964@ptaxis`) |

---

## 3. High-Fidelity Sandbox vs. Live Production Components

To ensure complete credibility and transparency during judging at Paytm HQ, all components are explicitly categorized:

### 🟢 Live Production Components
1. **Groq Dual-Engine ReAct Agent (`qwen/qwen3.8-27b`):** Real-time conversational tool router extracting parameters from vernacular Hindi/Hinglish speech with strict word boundaries.
2. **Zero Silent Fallbacks:** No default ₹20, ₹250, or ₹50,000 values; if a customer or product is missing, the system explicitly asks for clarification rather than inventing fake data.
3. **Dynamic Unit Economics & Catalog Synonyms:** Profit trends calculate actual margins from SKU wholesale vs selling prices; aliases are derived from active customer & inventory tables.
4. **Transparent Mathematical Underwriting Engine:** Real-time 0–100 scoring based on 5 transparent mathematical factors (Volume, Frequency, Recovery, Retention, Stability) with zero artificial score floors. Returns *"Insufficient transaction history for underwriting."* when history is absent.
5. **Universal UPI Payment Deep Links:** Real mobile intent links (`upi://pay?pa=8171008964@ptaxis`) opening Google Pay, PhonePe, and Paytm on consumer smartphones.
6. **Bahi-Khata Ledger & Deferred Restocking:** Real SQLite database enforcing physical delivery receipts before crediting store inventory.
7. **Financial Confirmation Cards:** Visual confirmation cards showing exact party, item, date, and INR amount before committing transactions.

### 🟡 Paytm Developer Sandbox Simulations (Explicitly Labeled)
1. **Paytm Soundbox 4.0 Hardware Simulation:** Generates Paytm's signature two-tone audio chime and Hindi audio playback using browser audio APIs because physical IoT hardware is connected over private cellular SIMs (APN).
2. **Merchant Lending Disbursal Simulation:** Executes instant loan verification, updates credit runway, and simulates RTGS/IMPS disbursement labeled *"Loan approved in simulation. No real funds disbursed."* Prototype loan limits and interest rates are clearly disclosed.
3. **B2B Supplier Procurement Email:** Compiles authentic RFC-5322 MIME messages and saves them to the B2B Outbox table, triggering live dispatch when `SMTP_HOST` credentials are provided (labeled *"PO created and queued for supplier email (Demo Mode)"*).
4. **Paytm QR Payment Simulator:** Provides one-click customer QR payment generation for judges with a visible *"SIMULATED SOUNDBOX TX"* badge.

---

## 4. Why This Architecture Wins for Paytm

1. **Zero New Hardware Needed:** Works on the 10+ Million Paytm Soundboxes already deployed on kirana counters across India.
2. **No Meta WhatsApp Ban Risk:** Uses native SMS and direct universal UPI deep-links, completely immune to 3rd-party WhatsApp API pricing spikes or business account bans.
3. **Soundbox Becomes a 2-Way Terminal:** Transforms a passive one-way payment speaker into a proactive AI business manager that alerts merchants when stock is low, credit is approved, or daily settlements are ready.
