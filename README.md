# Paytm Vyapar Saathi (Soundbox AI Retail OS)

> **Voice-First Retail Operating System & Proactive Business Partner for Indian Retail Merchants**  
> **Hackathon Track:** Track 1 — *Merchant Growth AI ("Beyond Payments")*  
> **Event & Finals:** Paytm Build for India AI Hackathon (Paytm HQ, SkymarkOne, Noida)

---

![Paytm Soundbox AI Copilot](./assets/soundbox_copilot.jpg)

[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20(vyapar.db)-07405E?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Web_Audio_API_(440Hz%2F880Hz)-00BAF2?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Render Backend](https://img.shields.io/badge/Render-Live_Backend-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://paytmvyaparai.onrender.com/)
[![Live Vercel Demo](https://img.shields.io/badge/Vercel-Live_Frontend-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://paytm-vyapar-ai-chi.vercel.app/)

---

## 1. Quick Testing Guide for Evaluators & Judges

A pre-seeded demo merchant profile is included in the persistent database so you can immediately test all features without manual onboarding:

* **Demo Merchant:** Ramesh Sharma — *Sharma Kirana Store* (Sector 18, Noida)
* **Login Credentials:** `ramesh.kirana@paytm.com` | PIN: `1234` (or click **"Continue as Demo Merchant"**)
* **Reset Database to Clean State:** Click **"Reset Demo Data"** in the top navigation bar at any time to restore the initial baseline of 6 customers, 8 FMCG inventory items, 4 ledger entries, and 75 QR transactions.

---

## 2. Live Cloud Deployment

| Component | Platform | URL | Role |
|---|---|---|---|
| **Frontend Cockpit** | Vercel | [https://paytm-vyapar-ai-chi.vercel.app/](https://paytm-vyapar-ai-chi.vercel.app/) | Static web app, Web Speech recognition, Web Audio API soundbox chime synthesizer |
| **Backend REST API** | Render | [https://paytmvyaparai.onrender.com/](https://paytmvyaparai.onrender.com/) | FastAPI application serving all business logic and SQLite database queries |
| **Interactive API Docs** | Render | [https://paytmvyaparai.onrender.com/docs](https://paytmvyaparai.onrender.com/docs) | Swagger UI for testing all API endpoints directly |

*Note: The Vercel frontend reverse-proxies `/api/*` requests directly to the Render backend via `vercel.json` rewrites.*

---

## 3. Core Capabilities Implemented in Code

### 3.1 Digital Bahi-Khata (Voice-First Ledger)
* **Vernacular Voice Entry:** Shopkeepers speak in Hindi or Hinglish (e.g. *"रमेश ₹450 का सामान ले गए"* or *"मनोज वर्मा 1000 पैड"*).
* **Entity Resolution:** Matches customers by exact full name first, single first name if unambiguous, or phone number.
* **"Chutta" / Settlement Intent:** Phrases like *"चुकता"*, *"छुट्टा कर दो"*, or *"हिसाब क्लियर"* are parsed as full repayment (**JAMA**) and set the pending balance to ₹0.
* **Soundbox Audio Feedback:** Plays a synthesized dual-tone chime (440Hz / 880Hz square wave) and speaks the action aloud in Hindi via the Web Speech API.
* **Confirmation & Undo:** Displays a visual confirmation card with a 5-second countdown timer allowing the merchant to undo misheard entries.
* **Native SMS Reminders:** Generates `sms:` protocol links with embedded `upi://pay` deep links to request pending payments.

### 3.2 Inventory Guardian & Wholesale Reordering
* **Automatic Stock Deduction:** Deducts stock on counter sales or voice-logged credit entries.
* **Low-Stock Detection:** Flags items where `current_stock <= reorder_threshold`.
* **Purchase Order (PO) Generation:** Formats an RFC-5322 MIME email to the distributor with calculated order quantity, unit wholesale cost, and expected delivery date.
* **Email Transmission / Outbox:** Transmits via SMTP if credentials are configured in `.env`; otherwise queues the PO in the `supplier_pos` table with `status = 'PO_DISPATCHED_PENDING_DELIVERY'`.
* **Physical Delivery Receiving:** Exposes `/api/inventory/receive-delivery` to confirm that physical goods arrived before crediting `current_stock`.

### 3.3 Mathematical Credit Underwriting & Working Capital
* **Dynamic Underwriting (0–99 Scale):** Computed from SQLite data on every request:
  - **Cashflow Volume & Velocity (Max 40 pts):** Based on 30-day QR volume and transaction count.
  - **Khata Repayment Discipline (Max 35 pts):** Ratio of recovered credit (`jama`) to total credit issued.
  - **Customer Retention (Max 15 pts):** Ratio of active patrons to total customers.
  - **Store Vintage & Footfall (Max 10 pts):** Scaled by the number of registered patrons.
* **Pre-Approved Facility Calculation:** Sets credit limit between $0.75\times$ and $2.0\times$ 30-day QR volume based on risk tier.
* **Simulated Instant Disbursal:** Validates `amount <= pre_approved_loan`, increments `loan_runway_days`, logs the transaction under `payment_mode = 'Loan_Disbursal'` (isolated from merchant sales volume), and triggers a Soundbox voice announcement.

### 3.4 Merchant Growth AI (RFM Churn Engine)
* **RFM Evaluation:** Evaluates each customer's `last_visit_date`, `visit_count`, and `pending_udhaar`:
  - `Dormant`: Inactive for $> 30$ days.
  - `At-Risk`: Inactive for $\ge 15$ days, or holding $> ₹1,000$ udhaar with $\ge 10$ days inactivity.
  - `Normal`: Active within the last 14 days.
* **Win-Back Campaigns:** Crafts personalized Hindi discount messages with direct WhatsApp (`wa.me/91...`) and native SMS links.

---

## 4. System Architecture

The following diagrams represent the exact architecture implemented in the codebase:

### 4.1 End-to-End System Architecture

```mermaid
graph TB
    subgraph Client ["Client / Browser (Frontend)"]
        UI["Merchant Cockpit UI<br/>(index.html, cockpit.css)"]
        State["UI State Manager<br/>(app.js, landing.js)"]
        APIClient["API Client<br/>(api.js)"]
        SpeechIn["Speech Recognition<br/>(Web Speech API)"]
        SoundboxAudio["Soundbox Synthesizer<br/>(Web Audio API 440/880Hz + TTS)"]
    end

    subgraph Hosting ["Hosting & Routing"]
        Vercel["Vercel Edge<br/>(Static Hosting)"]
        Proxy["Vercel Rewrite Proxy<br/>(/api/* -> Render)"]
    end

    subgraph Server ["FastAPI Backend (Render)"]
        App["FastAPI App Controller<br/>(main.py)"]
        Router["Agent Router<br/>(react_agent.py / chatbot_service.py)"]
        
        subgraph Services ["Domain Services"]
            KhataSvc["KhataService<br/>(khata_service.py)"]
            InvSvc["InventoryService<br/>(inventory_service.py)"]
            CreditSvc["CreditService<br/>(credit_service.py)"]
            GrowthSvc["GrowthService<br/>(growth_service.py)"]
            TxnSvc["TransactionService<br/>(transaction_service.py)"]
        end
    end

    subgraph Storage ["Persistence & External"]
        DB[("SQLite Database<br/>(vyapar.db)")]
        SMTP["SMTP Server<br/>(Optional Outbound POs)"]
    end

    UI -->|"Voice Input"| SpeechIn
    SpeechIn -->|"Transcribed Text"| State
    State --> APIClient
    APIClient --> Vercel
    Vercel --> Proxy
    Proxy --> App

    App --> Router
    Router --> KhataSvc
    Router --> InvSvc
    Router --> CreditSvc
    Router --> GrowthSvc
    Router --> TxnSvc

    KhataSvc --> DB
    InvSvc --> DB
    CreditSvc --> DB
    GrowthSvc --> DB
    TxnSvc --> DB

    InvSvc -.->|"Dispatch Email"| SMTP
    App -.->|"Soundbox Payload (JSON)"| State
    State --> SoundboxAudio
```

---

### 4.2 Voice-to-Action Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Merchant as Shopkeeper (Kirana)
    participant UI as Browser Cockpit (app.js)
    participant Audio as Web Audio Synthesizer
    participant Backend as FastAPI (main.py)
    participant Agent as ReactAgent (react_agent.py)
    participant Svc as Domain Services
    participant DB as SQLite (vyapar.db)

    Merchant->>UI: Speaks: "मनोज वर्मा 1000 पैड"
    UI->>Backend: POST /api/agent/chat { message: "मनोज वर्मा 1000 पैड" }
    
    activate Backend
    Backend->>Agent: process_query(message)
    Agent->>Agent: Entity & Intent Resolution ("Manoj Verma", jama, ₹1,000)
    Agent->>Svc: KhataService.record_entry("Manoj Verma", 1000, "jama")
    
    activate Svc
    Svc->>DB: SELECT id, pending_udhaar FROM customers WHERE name LIKE 'Manoj Verma'
    DB-->>Svc: Found customer (pending_udhaar = 1200)
    Svc->>DB: INSERT INTO khata_entries (customer_id, amount=1000, type='jama')
    Svc->>DB: UPDATE customers SET pending_udhaar = 200 WHERE id = 3
    Svc->>DB: INSERT INTO transactions (payment_mode='UPI_Soundbox', amount=1000)
    Svc-->>Agent: Result { customer: "Manoj Verma", new_balance: 200 }
    deactivate Svc

    Agent-->>Backend: Agent Response + Soundbox Payload
    deactivate Agent

    Backend-->>UI: 200 OK (JSON)
    
    par Play Dual-Tone Chime
        UI->>Audio: Play 440Hz -> 880Hz square-wave chime
    and Vernacular Voice Confirmation
        UI->>Audio: SpeechSynthesis: "Paytm par Manoj Verma se 1,000 rupaye jama ho gaye"
    and UI State Refresh
        UI->>UI: Show financial confirmation card with 5s undo timer
        UI->>UI: Update Ledger balances & Recovery Rate
    end
```

---

### 4.3 Mathematical Underwriting & Loan Disbursal Pipeline

```mermaid
flowchart TD
    subgraph Step1 ["1. Fetch Live Operational Data (SQLite)"]
        T1["transactions table<br/>SUM(amount) WHERE payment_mode != 'Loan_Disbursal'<br/>-> total_upi, tx_count"]
        T2["khata_entries table<br/>SUM(amount) WHERE entry_type = 'jama'<br/>-> total_jama"]
        T3["customers table<br/>SUM(pending_udhaar) -> total_udhaar<br/>COUNT(*) WHERE churn_risk = 'Normal' -> active_customers"]
    end

    subgraph Step2 ["2. Underwriting Scoring Engine (credit_service.py)"]
        P1["Volume & Velocity (Max 40 pts)<br/>• vol_score = min(30.0, (total_upi / 40000.0) * 30.0)<br/>• freq_score = min(10.0, (tx_count / 50.0) * 10.0)"]
        P2["Khata Recovery (Max 35 pts)<br/>• recovery_ratio = total_jama / (total_jama + total_udhaar)<br/>• recovery_points = min(35.0, recovery_ratio * 35.0)"]
        P3["Customer Retention (Max 15 pts)<br/>• retention_ratio = active_customers / total_customers<br/>• retention_points = min(15.0, retention_ratio * 15.0)"]
        P4["Store Stability (Max 10 pts)<br/>• stability_points = min(10.0, total_customers * 1.25)"]
        
        Score["computed_score = Round(P1 + P2 + P3 + P4)<br/>credit_score = max(0, min(99, computed_score))"]
    end

    subgraph Step3 ["3. Tier Assignment & Facility Sizing"]
        Tiers{"Score Range"}
        T1Prime["Tier-1 Prime (Score >= 82)<br/>0.95%/mo flat | 12 Mo | 2.0x Cashflow"]
        T2Std["Tier-2 Standard (Score 68-81)<br/>1.25%/mo flat | 9 Mo | 1.3x Cashflow"]
        T3Growth["Tier-3 Growth (Score < 68)<br/>1.60%/mo flat | 6 Mo | 0.75x Cashflow"]
        
        Limit["Pre-Approved Loan = round((total_upi * multiplier) / 1000) * 1000<br/>Capped at ₹1,50,000 (if score >= 40, else 0)"]
    end

    subgraph Step4 ["4. Disbursal Execution (POST /api/credit/disburse)"]
        Check{"amount <= pre_approved?"}
        Reject["Return Error: Exceeds Limit"]
        Apply["1. Update merchants: loan_runway_days += added_days<br/>2. INSERT INTO transactions: payment_mode = 'Loan_Disbursal'<br/>3. Broadcast Soundbox speech announcement"]
    end

    T1 & T2 & T3 --> P1 & P2 & P3 & P4
    P1 & P2 & P3 & P4 --> Score
    Score --> Tiers
    Tiers -->|">= 82"| T1Prime
    Tiers -->|"68 - 81"| T2Std
    Tiers -->|"< 68"| T3Growth
    T1Prime & T2Std & T3Growth --> Limit
    Limit --> Check
    Check -->|"No"| Reject
    Check -->|"Yes"| Apply
```

---

### 4.4 Inventory Guardian & Supply Chain Reorder Loop

```mermaid
flowchart TD
    A["Sale Recorded (Counter Sale or Khata Credit)"] --> B["Decrement current_stock in inventory table"]
    B --> C{"current_stock <= reorder_threshold?"}
    C -->|"No"| D["Stock Healthy (No Action)"]
    C -->|"Yes"| E["InventoryService.create_supplier_po()"]
    
    E --> F["Calculate Quantity: max(5, (threshold * 2) - current_stock)"]
    F --> G["Calculate Total Cost = quantity * wholesale_price"]
    G --> H["Generate Unique PO Number (PO-PAYTM-...)"]
    H --> I["Compile RFC-5322 MIME EmailMessage"]
    
    I --> J{"SMTP credentials configured?"}
    J -->|"Yes"| K["Send email via smtplib.SMTP<br/>email_status = 'SENT_VIA_SMTP'"]
    J -->|"No"| L["Queue in outbox spool<br/>email_status = 'DISPATCHED_TO_OUTBOX'"]
    
    K & L --> M["Insert into supplier_pos table<br/>status = 'PO_DISPATCHED_PENDING_DELIVERY'"]
    M --> N["Delivery Arrives at Store<br/>POST /api/inventory/receive-delivery"]
    N --> O["Update supplier_pos: delivery_status = 'DELIVERED'<br/>Update inventory: current_stock += quantity"]
```

---

### 4.5 RFM Customer Telemetry & Churn Segmentation

```mermaid
flowchart LR
    subgraph Data ["Data Inputs"]
        C["customers table"]
        Today["Today's Date"]
    end

    subgraph RFM ["GrowthService.get_campaigns()"]
        Calc["days_inactive = (today - last_visit_date).days"]
        Rule{"Inactivity Check"}
        Dorm["Dormant<br/>(days_inactive > 30)"]
        AtRisk["At-Risk<br/>(days_inactive >= 15 OR<br/>udhaar > 1000 & days_inactive >= 10)"]
        Norm["Normal<br/>(Active within 14 days)"]
    end

    subgraph Output ["Campaign Generation"]
        Target["Identify Inactive Customers"]
        Draft["Draft Personalized SMS Voucher<br/>with shop name & discount"]
        Links["Provide 1-Tap Trigger:<br/>• Native SMS URI ('sms:')<br/>• WhatsApp ('https://wa.me/91...')"]
    end

    C & Today --> Calc
    Calc --> Rule
    Rule -->|"> 30 Days"| Dorm
    Rule -->|">= 15 Days"| AtRisk
    Rule -->|"< 15 Days"| Norm

    Dorm & AtRisk --> Target
    Target --> Draft
    Draft --> Links
```

---

### 4.6 Database Entity-Relationship (ER) Schema

The exact schema defined in `backend/database.py`:

```mermaid
erDiagram
    MERCHANTS ||--o{ CUSTOMERS : "serves"
    MERCHANTS ||--o{ INVENTORY : "manages"
    MERCHANTS ||--o{ SUPPLIER_POS : "issues"
    MERCHANTS ||--o{ TRANSACTIONS : "logs"
    CUSTOMERS ||--o{ KHATA_ENTRIES : "has"
    CUSTOMERS ||--o{ TRANSACTIONS : "associated_with"

    MERCHANTS {
        INTEGER id PK
        TEXT name
        TEXT shop_name
        TEXT phone
        TEXT email
        TEXT password
        TEXT otp
        TEXT otp_expiry
        TEXT upi_id
        TEXT address
        TEXT bank_name
        TEXT bank_account_masked
        TEXT ifsc_code
        TEXT auth_token
        INTEGER credit_health_score
        INTEGER pre_approved_loan_amount
        INTEGER loan_runway_days
    }

    CUSTOMERS {
        INTEGER id PK
        TEXT name
        TEXT phone
        REAL total_spent
        REAL pending_udhaar
        TEXT last_visit_date
        INTEGER visit_count
        TEXT churn_risk
    }

    KHATA_ENTRIES {
        INTEGER id PK
        INTEGER customer_id FK
        TEXT customer_name
        REAL amount
        TEXT item_description
        TEXT entry_type
        TEXT created_at
        TEXT status
    }

    INVENTORY {
        INTEGER id PK
        TEXT item_name UK
        TEXT category
        INTEGER current_stock
        INTEGER reorder_threshold
        TEXT unit
        REAL unit_price
        REAL wholesale_price
        TEXT supplier_name
        TEXT supplier_email
    }

    SUPPLIER_POS {
        INTEGER id PK
        TEXT po_number UK
        TEXT supplier_name
        TEXT supplier_email
        TEXT item_name
        INTEGER quantity
        REAL total_cost
        TEXT status
        TEXT sent_at
        TEXT expected_delivery_date
        TEXT delivery_received_at
        TEXT delivery_status
        TEXT email_status
        TEXT email_raw
    }

    TRANSACTIONS {
        INTEGER id PK
        TEXT txn_id UK
        REAL amount
        TEXT customer_phone
        TEXT payment_mode
        TEXT timestamp
        TEXT status
    }
```

---

## 5. Vernacular NLP & Entity Resolution Rules

Implemented in `backend/agent/react_agent.py` and `backend/services/chatbot_service.py`:

1. **Dual-Engine Intent Architecture:**
   - **Primary Engine:** Groq LLM API with `qwen/qwen3.8-27b` using native function calling when `GROQ_API_KEY` is present.
   - **Fallback Engine:** Deterministic vernacular parser utilizing exact regex token extraction, word boundaries (`\b(po|diya|likho)\b`), and Devanagari keyword matching.
2. **Customer Matching Order:**
   - Exact case-insensitive full name matching across all database customers.
   - If clean input is a single word, matches against first names only if exactly one customer shares that first name.
   - Phone matching (last 10 digits) if no name match is found.
   - If no customer exists, a new customer record is automatically created.
3. **No Silent Defaults:** If a customer name or transaction amount is missing, the agent does not invent dummy data; it prompts the merchant for the missing information.
4. **Settlement Mapping:** Keywords like *"चुकता"*, *"छुट्टा"*, *"clear"*, *"settle"* map to `entry_type = 'jama'` with the customer's full outstanding balance.

---

## 6. Complete API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate merchant with email & PIN |
| `POST` | `/api/auth/otp/send` | Send simulated 6-digit OTP |
| `POST` | `/api/auth/otp/verify` | Verify OTP and return session token |
| `GET` | `/api/auth/me` | Fetch active merchant session |
| `GET` | `/api/merchant/profile` | Retrieve shop, bank account, and IFSC details |
| `POST` | `/api/agent/chat` | AI agent endpoint (voice/text reasoning & soundbox payload) |
| `GET` | `/api/khata` | Get customer list, pending udhaar, and recent entries |
| `POST` | `/api/khata/entry` | Record an udhaar (debit) or jama (credit) ledger entry |
| `POST` | `/api/khata/settle` | Settle a customer's entire pending balance to ₹0 |
| `POST` | `/api/khata/remind` | Generate a payment reminder text with UPI link |
| `GET` | `/api/inventory` | List all inventory items, low stock counts, and recent POs |
| `POST` | `/api/inventory/reorder` | Draft and dispatch a supplier PO |
| `GET` | `/api/inventory/pos` | List all supplier Purchase Orders |
| `POST` | `/api/inventory/receive-delivery` | Confirm physical goods arrival and restock inventory |
| `GET` | `/api/credit` | Run mathematical underwriting and return credit score & limit |
| `POST` | `/api/credit/disburse` | Execute simulated loan disbursal to merchant bank account |
| `GET` | `/api/growth` | Run RFM evaluation and return customer win-back campaigns |
| `GET` | `/api/transactions` | Retrieve recent Soundbox transactions |
| `GET` | `/api/transactions/profit-trends` | Compute daily turnover and gross profit for the last 7 days |
| `POST` | `/api/system/reset-demo` | Restore SQLite database to initial baseline state |

---

## 7. Local Setup & Execution

### Prerequisites
* Python 3.10+
* Git

### Step-by-Step Instructions

```bash
# 1. Clone the repository
git clone https://github.com/RiyanshiVerma-11/PaytmVyaparAI.git
cd PaytmVyaparAI

# 2. Set up virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize SQLite database with seed data
python backend/database.py

# 5. Start the application
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

### Docker Setup

```bash
docker-compose up --build
```

Access the application at [http://localhost:8000](http://localhost:8000).

---

## 8. Team & Venue

* **Project:** Paytm Vyapar Saathi
* **Team:** Riyanshi Verma & Team
* **Hackathon:** Paytm Build for India AI Hackathon
* **Venue:** Paytm Headquarters, SkymarkOne, Tower D, Sector 98, Noida, Uttar Pradesh 201304
* **Track:** Track 1 — *Merchant Growth AI ("Beyond Payments")*
