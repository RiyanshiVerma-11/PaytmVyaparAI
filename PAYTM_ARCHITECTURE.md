# PaytmVyaparAI — Paytm Enterprise Stack Integration & Architecture

> **Hackathon Edition:** Paytm Build for India AI Hackathon – Noida (SkymarkOne)  
> **Target Track:** Track 1 (Merchant Growth AI) & Track 3 (Autonomous AI Teammates)  
> **Deployment Model:** Extension & Mini-App Module for **Paytm for Business (P4B)** and **Paytm Soundbox 4.0 IoT**

---

## 1. Executive Summary & Integration Thesis

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
│   • Groq ReAct Dual-Engine: Tool Calling + Zero Silent Fallbacks           │
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
2. **Mathematical Underwriting Engine:** Real-time 0–100 scoring calculated from live database cashflow velocity, recovery ratios, and customer retention.
3. **Universal UPI Payment Deep Links:** Real mobile intent links (`upi://pay?pa=8171008964@ptaxis`) opening Google Pay, PhonePe, and Paytm on consumer smartphones.
4. **Bahi-Khata Ledger & Deferred Restocking:** Real SQLite database enforcing physical delivery receipts before crediting store inventory.

### 🟡 Paytm Developer Sandbox Simulations
1. **Paytm Soundbox 4.0 Hardware Simulation:** Generates Paytm's signature two-tone audio chime and Hindi audio playback using browser audio APIs because physical IoT hardware is connected over private cellular SIMs (APN).
2. **Merchant Lending Disbursal Simulation:** Executes instant loan verification, updates credit runway, and simulates RTGS/IMPS disbursement adhering strictly to the Paytm Capital API schema.
3. **B2B Supplier Procurement Email:** Compiles authentic RFC-5322 MIME messages and saves them to the B2B Outbox table, triggering live dispatch when `SMTP_HOST` credentials are provided.

---

## 4. Why This Architecture Wins for Paytm

1. **Zero New Hardware Needed:** Works on the 10+ Million Paytm Soundboxes already deployed on kirana counters across India.
2. **No Meta WhatsApp Ban Risk:** Uses native SMS and direct universal UPI deep-links, completely immune to 3rd-party WhatsApp API pricing spikes or business account bans.
3. **Soundbox Becomes a 2-Way Terminal:** Transforms a passive one-way payment speaker into a proactive AI business manager that alerts merchants when stock is low, credit is approved, or daily settlements are ready.
