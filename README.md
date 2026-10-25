# 🏪 Paytm Vyapar Saathi — AI Retail Copilot for Indian Kirana Merchants

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLM%20Engine-FF6B35?style=for-the-badge)
![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white)

**An autonomous AI-powered business operations copilot for Indian Kirana & retail merchants.**
Voice commands → Instant Bahi-Khata entries, Inventory restocks, Credit scoring, UPI analytics — in Hindi/Hinglish.

</div>

---

## 📌 Table of Contents

1. [What is Paytm Vyapar Saathi?](#what-is-paytm-vyapar-saathi)
2. [Core Features](#core-features)
3. [System Architecture](#system-architecture)
4. [Project Structure](#project-structure)
5. [AI Agent Pipeline](#ai-agent-pipeline)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Frontend Modules](#frontend-modules)
9. [Demo Quick Start](#demo-quick-start)
10. [Local Development](#local-development)
11. [Environment Variables](#environment-variables)
12. [Deployment](#deployment)
13. [Multi-Tenant Architecture](#multi-tenant-architecture)

---

## What is Paytm Vyapar Saathi?

**Paytm Vyapar Saathi** is a full-stack AI copilot built for India''s 65 million+ Kirana (neighborhood grocery) shop owners. Merchants simply **speak in Hindi or Hinglish** — the system understands and executes complex business operations autonomously.

### The Problem It Solves

| Pain Point | Traditional Way | With Vyapar Saathi |
|---|---|---|
| Udhaar (credit) tracking | Paper notebook, prone to loss | Voice → instant DB entry |
| Partial payment tracking | Manual math on paper | Auto-subtraction from balance |
| Inventory restock | Phone call to supplier | AI generates & emails PO |
| Profit visibility | End-of-month calculation | Real-time 7-day P&L chart |
| Working capital | Banks deny without docs | AI credit score → instant loan |

---

## Core Features

### 1. Voice-First AI Agent (Hindi/Hinglish)

The heart of the app. A **3-engine ReAct agent** processes natural language voice commands:

- **"Manoj Verma ke ₹200 aa gaye"** → Records ₹200 jama, shows ₹1,000 remaining balance
- **"Prachi, ₹500 aata udhaar darj karein"** → Creates udhaar entry + decrements Atta inventory
- **"Ramesh ka hisab chukta karo"** → Fully settles pending balance in one shot
- **"Fortune Oil ka order karo"** → Generates supplier PO + dispatches email
- **"₹25,000 loan chahiye"** → Checks eligibility, disburses working capital

**Hindi number word recognition:** `baarah sau` → 1200, `dhai hazaar` → 2500, `ek lakh` → 100000

### 2. Bahi-Khata Ledger (Digital Credit Book)

Real-time udhaar/jama (credit/payment) management:

- **Udhaar entry** — Customer takes goods on credit; balance auto-increments
- **Jama (partial payment)** — `pending_udhaar = max(0, current - paid)` — handles partial payments correctly
- **Full settlement** — One command clears entire balance
- **Undo** — Rollback any mistaken entry with balance reversal
- **Auto SMS URI** — Generates deep-link SMS with UPI payment request to customer
- **Inventory auto-decrement** — Udhaar for oil/atta/salt reduces live stock count

### 3. Inventory Management & Supplier POs

- Live stock levels for 8+ Kirana SKUs (Amul Butter, Fortune Oil, Maggi, Tata Salt, etc.)
- **Low-stock alerts** — Items below reorder threshold flagged in dashboard
- **Supplier PO email dispatch** — AI calculates restock quantity, generates HTML email to supplier
- **Delivery receipt tracking** — Mark PO as received → stock auto-increments
- **Profit margin calculation** — Uses `(unit_price - wholesale_price) / unit_price` per SKU

### 4. AI Credit Health & Working Capital Loans

- **Paytm Credit Score (0–100)** — Computed from Soundbox UPI volume + transaction frequency + udhaar recovery rate
- **Pre-approved loan limits** — Auto-calculated based on 30-day Soundbox throughput
- **Simulated RTGS disbursal** — Loan credited to merchant bank account (simulation mode)
- **Runway calculator** — Shows how many days working capital will last

### 5. Real-Time Profit Dashboard

7-day rolling P&L trend powered by actual transaction data:

- **Per-SKU margin engine** — Matches transactions to inventory for exact margins per item
- **Micro-sale detection** — Identifies cash micro-sales (Maggi, Dahi ≤ ₹60) separately
- **UPI Soundbox revenue** — Aggregates UPI volume from Soundbox transactions
- **Day-over-day growth %** — Compares today''s profit vs yesterday
- **Daily P&L email** — HTML report dispatched via SMTP (Gmail)

### 6. UPI Soundbox Simulation

- Simulates Paytm QR/Soundbox payment receipt
- **Hindi TTS audio** — Browser `SpeechSynthesis` announces payment in Hindi
- **Dual-tone chime** — Web Audio API generates 440Hz + 880Hz square-wave chime
- Logs every simulated transaction into `transactions` table

### 7. AI Chatbot

Separate conversational chatbot powered by Gemini 2.5 Flash:

- Full app context awareness (inventory, udhaar, credit score)
- General business Q&A in Hindi/Hinglish
- Session management with conversation history

### 8. Multi-Tenant Auth System

- Merchant registration with shop name, UPI ID, address
- Email/phone login + OTP-based password reset via Gmail SMTP
- **Demo fast-path** — `ramesh.kirana@paytm.com / 1234` for evaluators
- Each merchant''s data fully isolated by `merchant_id`

### 9. Customer Churn Prediction

- **At-Risk** — No visit in 30+ days
- **Dormant** — No visit in 45+ days
- Win-back discount campaigns auto-generated
- Festive demand surge predictions

### 10. Daily Profit Pulse Email

HTML email report with today''s total collections, gross profit, pending udhaar summary, low-stock inventory alerts, and Paytm Credit Score snapshot — dispatched via Gmail SMTP.

---

## System Architecture

```
+------------------------------------------------------------------+
|                        CLIENT BROWSER                            |
|  +----------------+  +--------------+  +---------------------+   |
|  |  Landing Page  |  |  Auth Pages  |  |  Cockpit Dashboard  |   |
|  |  (landing.js)  |  |  (auth.js)   |  |      (app.js)       |   |
|  +----------------+  +--------------+  +---------------------+   |
|                           |                                       |
|  +----------------------------------------------------------------+|
|  |  api.js | speech.js (STT) | soundbox.js (TTS+Chime) | chatbot ||
|  +----------------------------------------------------------------+|
+-----------------------------+------------------------------------+
                              | HTTPS / REST JSON
+-----------------------------v------------------------------------+
|                  FASTAPI BACKEND  (backend/main.py)              |
|                                                                  |
|  /api/agent/chat    /api/khata    /api/inventory                 |
|  /api/auth/*        /api/credit   /api/transactions              |
|  /api/chatbot/*     /api/growth   /api/demo/*                    |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |              REACT AGENT  (agent/react_agent.py)           |  |
|  |                                                            |  |
|  |  Engine 1: Groq  (Qwen3.8-27B) ---- PRIMARY               |  |
|  |  Engine 2: Gemini 2.5 Flash ------- SECONDARY FALLBACK     |  |
|  |  Engine 3: Deterministic NLP ------ OFFLINE FALLBACK       |  |
|  |                                                            |  |
|  |  Hindi Number Parser: "baarah sau" -> 1200                 |  |
|  |  Tool Router -> _execute_tool() -> Service Layer           |  |
|  +------------------------------------------------------------+  |
|                                                                  |
|  +------------------+  +-----------------+  +-----------------+  |
|  | KhataService     |  | InventoryService|  | TransactionSvc  |  |
|  | CreditService    |  | GrowthService   |  | AuthService     |  |
|  | ChatbotService   |  +-----------------+  +-----------------+  |
|  +------------------+                                            |
|                                                                  |
|  +------------------------------------------------------------+  |
|  |           SQLite  (backend/vyapar.db)                      |  |
|  |  merchants | customers | khata_entries | inventory          |  |
|  |  transactions | supplier_pos                               |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
                              |
            +-----------------v------------------+
            |          EXTERNAL SERVICES          |
            |  Groq API   |   Google Gemini API   |
            |  Gmail SMTP (POs + OTPs + Reports)  |
            +------------------------------------+
```

### Deployment Architecture

```
User Browser
     |
     v
+------------------+         +------------------------------+
|     Vercel       | --/api/--> Render.com (FastAPI server) |
|  (Static HTML)   | <------- | paytmvyaparai.onrender.com  |
|  frontend/       |   JSON   | + SQLite vyapar.db          |
+------------------+         +------------------------------+
```

---

## Project Structure

```
PaytmVyaparAI/
|
+-- backend/                          # FastAPI Python backend
|   +-- main.py                       # App entry point; all 30+ API routes (356 lines)
|   +-- database.py                   # SQLite schema, migrations, seed data (267 lines)
|   +-- vyapar.db                     # SQLite database file (committed for Vercel parity)
|   |
|   +-- agent/
|   |   +-- react_agent.py            # 3-engine ReAct agent + Hindi NLP (1140 lines)
|   |       _run_groq_react()         # Engine 1: Groq Qwen3.8-27B native tool-calling
|   |       _run_gemini_react()       # Engine 2: Gemini 2.5 Flash JSON-mode routing
|   |       _run_deterministic_engine() # Engine 3: Regex + Hindi morphology fallback
|   |       _execute_tool()           # Dispatches to correct service layer
|   |       _hindi_words_to_number()  # "baarah sau" -> 1200
|   |
|   +-- services/
|       +-- khata_service.py          # Bahi-Khata CRUD, partial payment, undo (358 lines)
|       +-- inventory_service.py      # Stock management, PO creation & receipt
|       +-- transaction_service.py    # UPI analytics, 7-day P&L, email reports (538 lines)
|       +-- credit_service.py         # Credit score engine, loan disbursal
|       +-- growth_service.py         # Churn detection, win-back campaigns
|       +-- auth_service.py           # Registration, login, OTP flow (265 lines)
|       +-- chatbot_service.py        # Gemini-powered chatbot with full app context
|
+-- frontend/                         # Vanilla HTML/CSS/JS frontend (SPA)
|   +-- index.html                    # Full single-page application (132 KB)
|   |
|   +-- css/
|   |   +-- variables.css             # Design tokens (colors, fonts, spacing)
|   |   +-- landing.css               # Marketing landing page styles
|   |   +-- auth.css                  # Login/register page styles
|   |   +-- cockpit.css               # Main dashboard (100 KB — largest stylesheet)
|   |   +-- chatbot.css               # Chatbot panel styles
|   |   +-- components.css            # Reusable UI component styles
|   |   +-- layout.css                # Grid and layout utilities
|   |
|   +-- js/
|       +-- app.js                    # Main cockpit dashboard logic (98 KB)
|       +-- api.js                    # Centralized API client for all backend calls
|       +-- auth.js                   # Registration, login, OTP verification (25 KB)
|       +-- chatbot.js                # Chatbot UI and session management (20 KB)
|       +-- speech.js                 # Web Speech API — STT voice recognition
|       +-- soundbox.js               # Audio chime + Hindi TTS via SpeechSynthesis
|       +-- profit-chart.js           # Chart.js profit trend visualizations (719 KB bundled)
|       +-- profit-chart.jsx          # React JSX source for chart components
|       +-- landing.js                # Landing page scroll animations
|       +-- antigravity-motion.js     # Particle / motion effects
|
+-- server.py                         # Alternative Uvicorn server entry point
+-- vercel.json                       # Vercel config: rewrites /api/* -> Render backend
+-- Dockerfile                        # Docker container definition
+-- docker-compose.yml                # Docker Compose for local containerized run
+-- requirements.txt                  # Python dependencies (FastAPI, Uvicorn, Groq, etc.)
+-- .env.example                      # Environment variable template
+-- .gitignore                        # Excludes .env, __pycache__, node_modules etc.
```

---

## AI Agent Pipeline

Every voice/text query flows through `react_agent.py` via a **cascading engine strategy**:

```
User Query (Hindi/Hinglish text or speech transcript)
         |
         v
+-------------------------------------------------------+
|  ENGINE 1: Groq LLM  Qwen3.8-27B  — PRIMARY           |
|  * Native tool-calling via OpenAI-compatible API      |
|  * 10 tools defined with strict JSON schemas          |
|  * Temperature: 0.1  (near-deterministic)             |
|  * Falls back if GROQ_API_KEY missing or on error     |
+------------------------+------------------------------+
                         | on failure
                         v
+-------------------------------------------------------+
|  ENGINE 2: Gemini 2.5 Flash  — SECONDARY FALLBACK     |
|  * JSON-mode generation (application/json MIME type)  |
|  * Custom prompt extracts tool name + typed args      |
|  * Falls back if GEMINI_API_KEY missing or on error   |
+------------------------+------------------------------+
                         | on failure
                         v
+-------------------------------------------------------+
|  ENGINE 3: Deterministic Vernacular Engine  — OFFLINE |
|  * Regex patterns for is_jama / is_udhaar / is_settle |
|  * Hindi/Devanagari word boundary matching            |
|  * Longest-match customer name resolution from DB     |
|  * Hindi number word -> digit conversion              |
|  * Zero LLM dependency — always works                 |
+-------------------------------------------------------+
                         |
                         v
                  _execute_tool()
                  -> Service Layer -> SQLite DB
                         |
                         v
                  Response Formatting
                  + Soundbox Payload (Hindi TTS text)
                  + Confirmation Card (UI widget data)
```

### Supported Agent Tools (10 total)

| Tool Name | Trigger Examples | Service |
|---|---|---|
| `record_khata_entry` | "Manoj ₹500 udhaar", "Prachi ne ₹200 diye" | `KhataService.record_entry()` |
| `settle_khata_customer` | "Ramesh ka hisab chukta", "poora settle karo" | `KhataService.record_entry(jama)` |
| `get_khata_details` | "Ramesh ka kitna baaki hai?" | SQLite direct query |
| `create_supplier_po` | "Fortune Oil order karo", "tel restock" | `InventoryService.create_supplier_po()` |
| `receive_supplier_delivery` | "PO-PAYTM-XXXXX receive hua" | `InventoryService.receive_supplier_delivery()` |
| `get_inventory_health` | "stock kya hai?", "kya khatam hone wala hai?" | `InventoryService.get_inventory()` |
| `get_credit_health` | "mera credit score kya hai?" | `CreditService.get_merchant_credit_health()` |
| `disburse_loan` | "₹25,000 loan chahiye" | `CreditService.disburse_loan()` |
| `get_growth_campaigns` | "kaun sa customer nahi aaya?" | `GrowthService.get_campaigns()` |
| `send_daily_profit_pulse_email` | "aaj ka report email karo" | `TransactionService.send_daily_profit_pulse_email()` |

### Hindi Number Word Parser

| Hindi / Hinglish | Parsed Value |
|---|---|
| `sau` | 100 |
| `do sau` | 200 |
| `dhai sau` | 250 |
| `teen sau` | 300 |
| `saadhe teen sau` | 350 |
| `paanch sau` | 500 |
| `ek hazaar` | 1,000 |
| `baarah sau` | 1,200 |
| `dedh hazaar` | 1,500 |
| `dhai hazaar` | 2,500 |
| `paanch hazaar` | 5,000 |
| `ek lakh` | 1,00,000 |

---

## Database Schema

SQLite at `backend/vyapar.db`. All tables carry `merchant_id` for multi-tenant isolation.

### merchants
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| name | TEXT | Owner full name |
| shop_name | TEXT | Store display name |
| phone | TEXT | Registered mobile |
| email | TEXT | Login email |
| password | TEXT | Plain-text PIN (demo) |
| otp / otp_expiry | TEXT | Password reset OTP |
| upi_id | TEXT | e.g. `8171008964@ptaxis` |
| auth_token | TEXT | Session token |
| credit_health_score | INTEGER | 0–100 |
| pre_approved_loan_amount | INTEGER | In INR |
| loan_runway_days | INTEGER | Days of capital coverage |

### customers
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| merchant_id | INTEGER | Multi-tenant FK |
| name | TEXT | Customer name |
| phone | TEXT | Mobile number |
| pending_udhaar | REAL | **Live balance — auto-updated on every jama/udhaar** |
| total_spent | REAL | Lifetime purchase value |
| last_visit_date | TEXT | ISO date for churn detection |
| churn_risk | TEXT | `Normal` / `At-Risk` / `Dormant` |

### khata_entries
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| merchant_id | INTEGER | |
| customer_id | INTEGER | FK → customers |
| amount | REAL | Transaction amount |
| item_description | TEXT | e.g. `1L Fortune Oil + Tata Salt` |
| entry_type | TEXT | `udhaar` or `jama` |
| status | TEXT | `pending` or `settled` |

### inventory
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| merchant_id | INTEGER | |
| item_name | TEXT UNIQUE | e.g. `Fortune Refined Oil 1L` |
| current_stock | INTEGER | Live count |
| reorder_threshold | INTEGER | Alert level |
| unit_price | REAL | Selling price |
| wholesale_price | REAL | Cost price for margin calc |
| supplier_email | TEXT | For automated PO dispatch |

### transactions
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| merchant_id | INTEGER | |
| txn_id | TEXT | e.g. `TXN_100234` |
| amount | REAL | |
| customer_phone | TEXT | Phone or `Micro: Dahi ₹15` tag |
| payment_mode | TEXT | `UPI_Soundbox` / `Cash_Micro` / `Loan_Disbursal` |
| timestamp | TEXT | ISO datetime |

### supplier_pos
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| po_number | TEXT | e.g. `PO-PAYTM-823225` |
| item_name | TEXT | |
| quantity | INTEGER | |
| total_cost | REAL | |
| delivery_status | TEXT | `PENDING` / `DELIVERED` / `CANCELLED` |
| email_status | TEXT | `SENT_VIA_SMTP` / `DISPATCHED_TO_OUTBOX` |

### Key Business Logic

**Partial Payment Balance** (`khata_service.py` line 100):
```python
new_pending = (curr_pending + amount) if entry_type == "udhaar" \
              else max(0.0, curr_pending - amount)
# Manoj: max(0, 1200 - 200) = 1000 remaining
```

**Per-SKU Profit Margin** (`transaction_service.py`):
```python
margin = (unit_price - wholesale_price) / unit_price
# Fortune Oil: (145 - 130) / 145 = 10.3%
# Micro-cash fallback: 21% (Dahi, Maggi etc.)
```

---

## API Reference

**Production:** `https://paytmvyaparai.onrender.com`
**Local:** `http://localhost:8000`

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new merchant |
| POST | `/api/auth/login` | Login with email/phone + password |
| POST | `/api/auth/forgot-password/send-otp` | Send OTP to registered email |
| POST | `/api/auth/forgot-password/verify-otp` | Verify OTP, set new password |
| GET | `/api/merchant/profile?merchant_id=1` | Fetch merchant profile |
| POST | `/api/merchant/update-email` | Update email address |

### AI Agent

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agent/chat` | Process voice/text via ReAct agent |

**Request:** `{ "query": "Manoj Verma ke ₹200 aa gaye" }`

**Response:**
```json
{
  "action_name": "RECORD_KHATA_ENTRY",
  "result": { "new_pending_balance": 1000, "entry_type": "jama" },
  "reply": "✅ Jama Darj Ho Gayi! Baaki: ₹1,000",
  "soundbox_payload": {
    "chime": true,
    "speech_text": "Paytm par Manoj Verma ji se do sau rupaye prapt hue."
  }
}
```

### Bahi-Khata

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/khata` | All entries + customer balances |
| POST | `/api/khata/entry` | Add udhaar or jama entry |
| POST | `/api/khata/settle` | Fully settle customer `{ customer_id }` |
| POST | `/api/khata/entry/undo` | Rollback entry `{ entry_id }` |

### Inventory

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/inventory` | All SKUs with stock levels and alerts |
| POST | `/api/inventory/item` | Add or update inventory item |
| POST | `/api/inventory/po` | Create supplier purchase order |
| POST | `/api/inventory/po/receive` | Mark PO delivered, update stock |

### Credit & Loans

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/credit?merchant_id=1` | Credit score + loan eligibility |
| POST | `/api/credit/disburse` | Disburse working capital `{ amount }` |

### Transactions & Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | All transactions with P&L summary |
| GET | `/api/transactions/profit-trends?days=7` | Daily P&L for last N days |
| POST | `/api/transactions/simulate` | Simulate Soundbox UPI payment |
| POST | `/api/transactions/daily-pulse-email` | Send P&L email report |

### Chatbot

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chatbot/message` | `{ message, session_id }` |
| GET | `/api/chatbot/context` | Full app context for chatbot |
| POST | `/api/chatbot/clear` | Clear session history |

### Growth & Demo

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/growth` | At-risk customers + win-back campaigns |
| POST | `/api/demo/reset` | Reset demo data to baseline |
| GET | `/api/demo/status` | Get demo credentials + status |

---

## Frontend Modules

The entire frontend is a **single-page application** (`frontend/index.html`) with multiple logical sections:

| Section | JS Module | CSS | Description |
|---|---|---|---|
| Landing Page | `landing.js` | `landing.css` | Marketing page with animated feature showcase |
| Login / Register | `auth.js` | `auth.css` | Multi-step auth with OTP flow |
| Cockpit Dashboard | `app.js` | `cockpit.css` | Main merchant dashboard |
| AI Voice Panel | `app.js` + `speech.js` + `soundbox.js` | `cockpit.css` | Voice command input with chime |
| Bahi-Khata Tab | `app.js` | `cockpit.css` | Customer ledger + undo entries |
| Inventory Tab | `app.js` | `cockpit.css` | Stock levels + PO management |
| Analytics Tab | `profit-chart.js` | `cockpit.css` | 7-day P&L bar charts (Chart.js) |
| Credit Tab | `app.js` | `cockpit.css` | Credit score ring + loan panel |
| Chatbot Panel | `chatbot.js` | `chatbot.css` | Floating Gemini AI assistant |

### Key Frontend Capabilities

- **Web Speech API** (`speech.js`) — Browser-native STT, sends transcript to `/api/agent/chat`
- **SpeechSynthesis TTS** (`soundbox.js`) — Hindi voice announcements for every transaction
- **Web Audio API** (`soundbox.js`) — Generates 440Hz + 880Hz dual-tone chime on payment
- **Chart.js** (`profit-chart.js`) — Interactive 7-day revenue/profit/COGS bar charts
- **5-second Undo Timer** — Every action shows undo button with animated countdown bar
- **Confirmation Cards** — Rich animated cards rendered for every agent action
- **No-cache headers** — Khata data always fresh (`Cache-Control: no-store`)

---

## Demo Quick Start

### Credentials

| Field | Value |
|---|---|
| Email | `ramesh.kirana@paytm.com` |
| PIN | `1234` |
| Shop | Sharma Kirana Store, Sector 18, Noida |

### Sample Voice Commands

```
-- UDHAAR (Credit entries) --
"Prachi, paanch sau rupaye aata udhaar darj karein"
"Ramesh Kumar, do sau rupaye salt aur tel udhaar"

-- JAMA (Payment received) --
"Manoj Verma ke do sau rupaye aa gaye"
"Pooja ne baarah sau rupaye de diye"

-- FULL SETTLEMENT --
"Ramesh ka hisab chukta karo"
"Sunil Yadav ka poora udhaar settle kar do"

-- INVENTORY --
"Fortune Oil ka stock kitna bacha hai?"
"Amul Butter ka order karo"

-- CREDIT & LOANS --
"Mera credit score kya hai?"
"Paanch hazaar rupaye ka loan chahiye"

-- ANALYTICS --
"Aaj ka P&L report email karo"
"Total kitna udhaar baaki hai?"
```

---

## Local Development

### Prerequisites

- Python 3.11+

### Steps

```bash
# 1. Clone
git clone https://github.com/RiyanshiVerma-11/PaytmVyaparAI.git
cd PaytmVyaparAI

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env with your API keys

# 4. Initialize database (creates + seeds vyapar.db)
cd backend
python database.py

# 5. Start server
uvicorn main:app --reload --port 8000

# 6. Open in browser
# http://localhost:8000
```

---

## Environment Variables

```env
# AI Engines (at least one required for LLM features)
GROQ_API_KEY=gsk_xxxxxxxxxxxx        # Primary: Groq Qwen3.8-27B
GEMINI_API_KEY=AIzaSyxxxxxxxxxx      # Secondary: Gemini 2.5 Flash

# Email — OTP delivery & daily P&L reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password          # Gmail App Password (not account password)
SMTP_FROM_NAME=Vyapar Saathi

# Server
PORT=8000
```

> Without any AI key the system falls back to the deterministic engine — all standard Kirana commands still work offline.

---

## Deployment

### Vercel (Frontend)

`vercel.json` rewrites `/api/*` to the Render backend:

```json
{
  "outputDirectory": "frontend",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://paytmvyaparai.onrender.com/api/$1" }
  ]
}
```

Connect GitHub repo → Vercel auto-deploys on every push to `main`.

### Render.com (Backend)

- **Build:** `pip install -r requirements.txt`
- **Start:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Docker

```bash
docker-compose up --build
```

---

## Multi-Tenant Architecture

Every new merchant gets a fully **isolated data space** by `merchant_id`:

```
merchant_id = 1  ->  Ramesh Sharma  (Demo, pre-seeded with 6 customers, 8 SKUs, 75+ transactions)
merchant_id = 2  ->  New Merchant A (blank slate — zero customers, zero udhaar)
merchant_id = 3  ->  New Merchant B (blank slate)
```

**Isolation guarantees:**
- All service-layer queries filter by `merchant_id`
- `_ensure_recent_7day_seed()` has a hard guard: `if merchant_id != 1: return`
- `seed_data()` runs only once at first boot when `merchants WHERE id=1` is empty
- New merchant registration creates a fresh row — no demo data copied or shared

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | FastAPI 0.109+ |
| ASGI Server | Uvicorn |
| Database | SQLite (`sqlite3` stdlib) |
| Primary AI Engine | Groq API — Qwen3.8-27B (native tool-calling) |
| Secondary AI Engine | Google Gemini 2.5 Flash (JSON-mode) |
| Fallback Engine | Custom deterministic NLP (regex + Hindi morphology) |
| Frontend | Vanilla HTML5 + CSS3 + JavaScript ES6+ |
| Charts | Chart.js (bundled in `profit-chart.js`) |
| Speech Input | Browser Web Speech API (STT) |
| Speech Output | Browser SpeechSynthesis API (TTS) |
| Audio Chime | Web Audio API (square-wave generation) |
| Email | Python `smtplib` via Gmail SMTP |
| Frontend Host | Vercel |
| Backend Host | Render.com |
| Container | Docker + Docker Compose |

---

## Author

**Riyanshi Verma**
Built for **Paytm Build for India AI Hackathon 2026 — SheBuilds Track**

> *Empowering India''s 65 million Kirana merchants with AI-first business intelligence, one voice command at a time.*

---

<div align="center">

**Paytm Vyapar Saathi** · Built with love for Bharat''s Kirana shopkeepers
Powered by FastAPI · Groq · Gemini · Paytm Soundbox 4.0 Pro

</div>
