# 🏗️ Paytm Vyapar Saathi — Technical Execution & Architecture Plan

> **Track 1:** Build the AI business partner for every Paytm merchant.  
> **Mandate:** *Help Paytm merchants grow their business, manage operations, and serve customers better. Think beyond payments.*  
> **Directory:** `d:\Riyanshi\01_coding\projects\46 paytm  noida\PaytmVyaparAI`  
> **Communication Strategy:** Production Email SMTP (Suppliers & P&L) + Native SMS URI Protocol + Soundbox Audio Handshake

---

## 🏛️ 1. Architecture: The 4-Pillar AI Business Copilot

```
                            ┌──────────────────────────────────────────────┐
                            │    Paytm Merchant Cockpit (Web & Mobile)     │
                            │  • Web Speech API (Hinglish/Hindi/English)   │
                            │  • Iconic Soundbox Chime & Audio Feedback    │
                            │  • Real-Time Growth & Operations Dashboard   │
                            │  • Live Agent Thought & Action Telemetry     │
                            └──────────────────────┬───────────────────────┘
                                                   │ HTTP / REST / SSE
                                                   ▼
                            ┌──────────────────────────────────────────────┐
                            │      FastAPI Backend & Agent Controller      │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
                            ┌──────────────────────────────────────────────┐
                            │           Autonomous ReAct Agent             │
                            │  • Intent Extraction & Entity Resolution     │
                            │  • Dual-Engine: LLM + Deterministic Fallback │
                            └──────────────────────┬───────────────────────┘
                                                   │
        ┌───────────────────────────┬──────────────┴────────────┬───────────────────────────┐
        ▼                           ▼                           ▼                           ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ 🚀 1. GROW BIZ   │        │ ⚙️ 2. OPERATIONS │        │ ❤️ 3. CUSTOMERS  │        │ 💳 4. BEYOND PAY │
│ • QR Telemetry   │        │ • Voice Khata    │        │ • Digital Bills  │        │ • Credit Health  │
│ • Churn Win-Back │        │ • Stock Guardian │        │ • Soundbox Voice │        │ • Loan Runway    │
│ • Festive Surge  │        │ • Email PO (SMTP)│        │ • Native 1-Tap   │        │ • Working Capital│
│ • Cross-Sell AI  │        │ • Daily P&L Email│        │   SMS Payment    │        │   Disbursement   │
└────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘
         │                           │                           │                           │
         └───────────────────────────┴─────────────┬─────────────┴───────────────────────────┘
                                                   ▼
                            ┌──────────────────────────────────────────────┐
                            │           SQLite Persistent Store            │
                            │  • merchants (Profile & Store Info)          │
                            │  • customers (Purchase & Visit Frequency)    │
                            │  • khata_entries (Ledger & Udhaar Data)      │
                            │  • inventory_items (SKU, Stock, Reorder)     │
                            │  • supplier_pos (Wholesale Orders via Email) │
                            │  • sales_transactions (Cash & Soundbox UPI)  │
                            └──────────────────────────────────────────────┘
```

---

## 🛠️ 2. The 8 Concrete Autonomous Tools

Every tool represents an executable action that takes inputs, modifies or queries state, and triggers physical/digital side-effects:

### 🚀 Pillar 1: Grow Their Business (Growth AI)
1. **`detect_customer_churn_and_draft_sms(threshold_days, discount_pct)`**
   - *Inputs:* `threshold_days` (default 30), `discount_pct` (default 10)
   - *Action:* Scans customer visit frequencies from QR transaction history; drafts 1-tap native SMS discount vouchers with embedded UPI payment links.
2. **`predict_festival_demand(festival_name, store_category)`**
   - *Inputs:* `festival_name` (e.g., *Diwali*, *Navratri*, *Holi*), `store_category` (*Kirana*, *FMCG*)
   - *Action:* Predicts demand surges based on historical patterns, alerts merchant 7 days in advance, and calculates recommended wholesale replenishment.
3. **`recommend_cross_sell_combos(anchor_item)`**
   - *Inputs:* `anchor_item` (e.g., *Milk*, *Atta*)
   - *Action:* Mines co-purchase patterns and suggests bundle offers (*e.g., "Pair Amul Milk with Bread for ₹5 off to increase basket size by 28%"*).

### ⚙️ 2. Manage Operations (Operations Copilot)
4. **`record_khata_entry(customer_name, phone, amount, item_description, entry_type)`**
   - *Inputs:* `customer_name`, `phone`, `amount`, `item_description`, `entry_type` (`udhaar` | `jama`)
   - *Action:* Writes directly to SQLite ledger, recalculates running customer balance, and decrements relevant inventory items.
5. **`check_and_update_inventory(item_name, quantity_delta, action)`**
   - *Inputs:* `item_name`, `quantity_delta`, `action` (`deduct` | `add` | `query`)
   - *Action:* Updates stock levels; triggers automated Low-Stock Alert with supplier wholesale restock draft if stock drops below reorder threshold.
6. **`send_supplier_po_email(supplier_email, item_name, quantity, expected_delivery)`**
   - *Inputs:* `supplier_email`, `item_name`, `quantity`, `expected_delivery`
   - *Action:* Uses Python's built-in `smtplib` to dispatch a formal, professional Purchase Order (PO) to the wholesale distributor with zero third-party bot dependency.
7. **`generate_daily_business_pulse_and_email(merchant_email)`**
   - *Inputs:* `merchant_email`
   - *Action:* Aggregates total UPI collections, cash receipts, new Udhaar given, Udhaar collected, and emails an end-of-day P&L statement to the merchant while triggering a 60-second audio summary through the Soundbox.

### ❤️ 3. Serve Customers Better (Customer Delight)
8. **`trigger_soundbox_voice_broadcast(event_type, amount, customer_name, custom_text)`**
   - *Inputs:* `event_type` (`udhaar_recorded` | `payment_received` | `stock_alert` | `greeting`), `amount`, `customer_name`, `custom_text`
   - *Action:* Formats audio payload and triggers Web Audio dual-tone chime (440Hz / 880Hz) followed by natural vernacular speech synthesis.

### 💳 4. Beyond Payments (Credit & Growth Capital)
- **`calculate_merchant_credit_health(evaluation_period_days)`**
  - *Inputs:* `evaluation_period_days` (default 30/90)
  - *Action:* Evaluates Soundbox transaction consistency, average daily ticket size, and Khata recovery rate to produce a **0–100 Paytm Merchant Health Score** and unlocked pre-approved loan tier (e.g., *₹50,000 to ₹2,00,000 Instant Working Capital*).

---

## 💻 3. Technology Stack & Project Structure

```
d:\Riyanshi\01_coding\projects\46 paytm  noida\PaytmVyaparAI\
│
├── idea.md                       # Strategic Concept & Problem Alignment Doc
├── plan.md                       # Complete Technical Blueprint & Architecture
├── presentation.md               # Official Hackathon Screening Pitch Deck
├── requirements.txt              # Python dependencies (fastapi, uvicorn, pydantic, etc.)
│
├── backend/
│   ├── main.py                   # FastAPI server entry point
│   ├── config.py                 # App settings & SMTP configuration
│   ├── database.py               # SQLite connection & schema initialization
│   ├── seed_data.py              # Realistic Kirana store initial state
│   ├── agent/
│   │   ├── react_engine.py       # ReAct reasoning loop & tool executor
│   │   ├── prompts.py            # Vernacular Hinglish/Hindi prompt templates
│   │   └── vernacular_parser.py  # Regex/deterministic NLP fallback engine
│   └── tools/
│       ├── growth_tools.py       # Customer loyalty, Churn, Festive demand
│       ├── operations_tools.py   # Voice Khata, Inventory, Email PO, Daily Pulse
│       ├── customer_tools.py     # Native SMS payment links, Soundbox audio
│       └── credit_tools.py       # Credit health scoring & loan qualification
│
└── frontend/
    ├── index.html                # Single-page Paytm Business Cockpit
    ├── style.css                 # Premium Paytm corporate design system
    ├── app.js                    # UI state, event handling & API communication
    ├── soundbox_audio.js         # Web Audio API Paytm chime & Web Speech synthesis
    └── speech_recognition.js     # Web Speech API real-time vernacular mic capture
```
