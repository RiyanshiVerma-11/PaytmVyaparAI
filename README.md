# Paytm Vyapar Saathi (Soundbox 4.0 Pro AI Retail OS)

> **Autonomous AI Business Copilot & Intelligent Soundbox for India's 30M+ Retail Merchants**  
> **Official Track:** Track 1 — *Merchant Growth AI ("Beyond Payments")*  
> **Platform & Finals:** Paytm Build for India AI Hackathon (Paytm HQ, SkymarkOne, Noida)

---

![Paytm Soundbox AI Copilot](./assets/soundbox_copilot.jpg)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite / PostgreSQL Ready](https://img.shields.io/badge/Database-SQLite%20%2F%20PostgreSQL%20Ready-07405E?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Web Audio API](https://img.shields.io/badge/Hardware_Audio-Soundbox_Chime_Synthesizer-00BAF2?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Render Backend](https://img.shields.io/badge/Render-Live_Backend-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://paytmvyaparai.onrender.com/)
[![Live Vercel Demo](https://img.shields.io/badge/Vercel-Live_Demo_Cockpit-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://paytm-vyapar-ai-chi.vercel.app/)

---

## 1. Executive Summary

> 🏆 **Notice for Evaluators & Judges:**  
> **“A fully populated demo merchant is provided so judges can test the complete product without manual onboarding.”**  
> * **Demo Merchant:** Sharma Kirana Store (Sector 18, Noida)
> * **Demo Credentials:** `ramesh.kirana@paytm.com` | PIN: `1234` (Or 1-click **"Continue as Demo Merchant"**)
> * **Reset Demo Data:** Available in the top navbar and Merchant Profile modal to instantly restore original balances, inventory, and ledger history at any time.

**Paytm Vyapar Saathi** transforms the iconic **Paytm Soundbox** from a passive payment confirmation speaker into an **active, proactive digital business partner (Munshi + Inventory Guardian + CFO)** for 30 million Indian Kirana and retail merchants.

During peak counter rush (6 PM – 9 PM), shopkeepers cannot open apps, browse nested menus, or type on keyboards. Unrecorded credit transactions (*udhaar*), missed reorders, and unnoticed customer churn cost Indian retail merchants an estimated ₹1.2 Lakh Crore annually.

**Paytm Vyapar Saathi solves this via voice-first ambient intelligence:**
1. **Zero-Typing Vernacular Ledger:** The merchant speaks naturally in Hindi, Hinglish, or English with strict entity resolution (no silent fallbacks).
2. **Instant Physical Trust:** The Soundbox plays its iconic dual-tone chime and confirms the action aloud in vernacular Hindi (*"Paytm par Manoj Verma ji ka ₹1,000 jama ho gaya"*).
3. **Automated Supply Chain:** Stock is automatically tracked, and supplier Purchase Orders (POs) are drafted and dispatched with simulation demo badges.
4. **Transparent Underwriting:** Real transaction velocity and ledger recovery rates feed directly into a 0–100 Credit Health Score (0 artificial floor) with a transparent 5-factor breakdown.

---

## 2. Live Cloud Deployment

| Service | Environment | URL | Details |
|---|---|---|---|
| **Live Frontend Cockpit** | Production (Vercel) | [https://paytm-vyapar-ai-chi.vercel.app/](https://paytm-vyapar-ai-chi.vercel.app/) | Live interactive merchant cockpit, Soundbox audio synthesizer & speech engine |
| **Backend API** | Production (Render) | [https://paytmvyaparai.onrender.com/](https://paytmvyaparai.onrender.com/) | FastAPI, Uvicorn, SQLite persistent store, CORS enabled |
| **Interactive Swagger Docs** | Production (Render) | [https://paytmvyaparai.onrender.com/docs](https://paytmvyaparai.onrender.com/docs) | Full OpenAPI schema & interactive test suite |

---

## 3. The 4 Core Pillars ("Beyond Payments")

![Paytm Vyapar Dashboard UI](./assets/dashboard_ui.jpg)

### Pillar 1: Grow Their Business (Merchant Growth AI)
* **Zero-Effort QR Telemetry CRM:** Inactive regular customers are automatically detected from incoming Paytm QR payments with zero manual typing.
* **Dynamic RFM Churn Detection:** Computes recency, frequency, and monetary metrics on actual transactions to score churn risk dynamically.
* **Customer Win-Back Engine:** Detects inactive regulars (*"Customer #9811 hasn't visited in 30 days"*) and crafts 1-tap native SMS discount vouchers with embedded UPI deep-links (clearly labeled with demo draft badges).
* **Dynamic Festive Surge Forecaster:** Analyzes 14-day transaction velocity and daily turnover to forecast seasonal restock requirements rather than static templates.

### Pillar 2: Manage Operations (Autonomous Copilot)
* **Hands-Free Voice Khata (Zero Silent Fallbacks):** Merchants speak natural Hindi/Hinglish commands (*"Ramesh bhai ko ₹450 ka refine tel udhaar diya"* or *"मनोज वर्मा 1000 पैड"*). If a customer or product is unknown, the copilot explicitly asks for clarification rather than silently inventing records.
* **Automated Supplier Email POs (SMTP):** Dispatches formal wholesale reorders directly to distributors when inventory falls below threshold, badged with explicit Demo Mode tracking.
* **Real SKU Unit Economics & Profit Pulse:** End-of-day debrief calculates actual gross profit using stored wholesale cost vs retail selling prices for each SKU.

### Pillar 3: Serve Customers Better (Trust & Transparency)
* **Two-Way Soundbox Voice Handshake:** Dual-frequency chime (440Hz / 880Hz) + vernacular voice repetition guarantees 100% mutual trust between shopkeeper and customer.
* **Financial Confirmation Cards:** Visual confirmation cards showing amount, party name, item, date, and status are rendered before and upon saving every ledger entry, PO, or loan draw.
* **Digital E-Bills & Statements:** Clear itemized receipts sent via 1-tap native SMS with direct UPI payment links (`upi://pay`).
* **1-Tap Fail-Safe Undo:** 5-second on-screen safety countdown allows instant cancellation if voice input was misheard.

### Pillar 4: Beyond Payments (Paytm Lending Rails)
* **Transparent 0–100 Credit Health Score:** Evaluates 5 mathematical factors with zero artificial score floor:
  - **Transaction Volume:** Up to 30 pts based on 30-day inflow.
  - **Payment Frequency:** Up to 10 pts based on active trading days.
  - **Repayment Recovery:** Up to 35 pts based on timely khata recoveries.
  - **Customer Retention:** Up to 15 pts based on repeat buyer ratio.
  - **Business Stability:** Up to 10 pts based on merchant tenure.
* **Insufficient History Protection:** Displays *"Insufficient transaction history for underwriting."* when transaction data is missing.
* **Explicit Prototype Assumptions:** Pre-approved loan limits (₹50k – ₹3L) and interest rates (1.2% – 1.5% flat monthly) are transparently labeled as prototype parameters.
* **Simulated Disbursal Execution:** Instant loan draws are executed with clear simulation notices (*"Loan approved in simulation. No real funds disbursed."*).

---

## 4. Production Vernacular NLP Engine

The copilot is built with high-tolerance vernacular entity extraction supporting both Devanagari Hindi and Hinglish:

| Action / Intent | Example Vernacular Utterances | Engine Execution |
|---|---|---|
| **Khata Credit (Udhaar)** | *"Ramesh ₹450 udhaar"*, *"रमेश 450 का सामान ले गए"* | Logs udhaar, decrements stock, plays Soundbox chime |
| **Vernacular Repayment** | *"मनोज वर्मा 1000 पैड"*, *"मनोज पेड ₹500"*, *"रमेश ने 450 पे किया"*, *"अमित ₹300 जमा"* | Credits ledger, marks paid/partial, Soundbox repeat-back |
| **Zero-Amount Full Settlement** | *"मनोज वर्मा सेटल"*, *"मनोज का पूरा हिसाब चुकता हो गया"* | Queries SQLite balance, settles entire amount to ₹0 |
| **Wholesale Stock Reorder** | *"फॉर्चून तेल मंगा लो"*, *"टाटा नमक ऑर्डर कर दो"* | Creates wholesale PO, dispatches SMTP email to distributor |
| **Working Capital Disbursal** | *"₹50,000 लोन निकाल लो"*, *"लोन क्रेडिट कर दो"* | Verifies pre-approval score, credits store working capital |

---

## 5. System Architecture

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
                               │     Persistent Store (SQLite / PostgreSQL)   │
                               │  • merchants  • customers  • khata_ledger    │
                               │  • inventory  • soundbox_tx  • supplier_pos  │
                               └──────────────────────────────────────────────┘
```

### Database Persistence & PostgreSQL Portability
- **Primary Engine:** SQLite at `backend/vyapar.db` with ACID guarantees.
- **Portability:** All schema definitions in `backend/database.py` adhere strictly to standard ANSI SQL types (`INTEGER`, `REAL`, `TEXT`, `TIMESTAMP`).
- **Zero-Friction Migration:** Transitioning to enterprise PostgreSQL is achieved simply by providing a standard `DATABASE_URL` connection string.

---

## 6. Frontend Deployment on Vercel

The frontend is fully decoupled and configured for zero-configuration deployment on Vercel with transparent reverse-proxying to the live Render backend.

### Deployment Steps:
1. Connect your GitHub repository (`PaytmVyaparAI`) to [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend` (or keep root).
3. Vercel automatically reads `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/api/(.*)",
         "destination": "https://paytmvyaparai.onrender.com/api/$1"
       }
     ]
   }
   ```
4. All client requests to `/api/*` are securely proxied with zero CORS latency. In addition, `frontend/js/api.js` automatically detects non-localhost hostnames and targets Render directly if accessed as a standalone client.

---

## 7. Local Development Quickstart

### Option A: Native Python Setup

```bash
# 1. Clone repository
git clone https://github.com/RiyanshiVerma-11/PaytmVyaparAI.git
cd PaytmVyaparAI

# 2. Create virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start backend server
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### Option B: Docker Compose Setup

```bash
docker-compose up --build
```

---

## 8. Technology Stack

* **Backend Services:** Python 3.10+, FastAPI, Uvicorn, Pydantic v2
* **Storage Engine:** SQLite (`vyapar.db`), ANSI SQL schema portable to PostgreSQL
* **Hardware Audio Synthesis:** Web Audio API (dual-tone 440Hz / 880Hz square-wave oscillator) + Web Speech API (Hindi/Hinglish TTS)
* **Communications:** Python `smtplib` (Wholesale Supplier POs & Daily P&L Statements) + Native SMS URI Protocol (`sms:`) for 100% deliverability with zero ban risk
* **Design & Frontend:** Semantic HTML5, Vanilla Modern CSS Design System (Bento Grid, Paytm Corporate Color Tokens `#002970` / `#00BAF2`), Vanilla JavaScript ES6+

---

## 9. Project Contributors & Venue

* **Team:** Riyanshi Verma & Team
* **Hackathon:** Paytm Build for India AI Hackathon – Delhi Edition
* **Venue:** Paytm Headquarters, SkymarkOne, Sector 98, Noida, Uttar Pradesh 201304
* **Track:** Track 1 — *Merchant Growth AI ("Beyond Payments")*

---
*Built for Bharat's 30 Million Retail Shopkeepers.*
