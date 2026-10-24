import re
import os
import json
from datetime import datetime
from database import get_connection
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService
from services.transaction_service import TransactionService

class ChatbotService:
    # In-memory session store: session_id -> { "history": [...], "last_entity": {...}, "created_at": ... }
    _sessions = {}

    @classmethod
    def get_full_app_context(cls):
        """
        Dynamically inspects SQLite database and returns complete real-time
        state across all Paytm Vyapar modules.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Merchant Profile
        cursor.execute("SELECT * FROM merchants LIMIT 1")
        m_row = cursor.fetchone()
        merchant = dict(m_row) if m_row else {
            "name": "Ramesh Sharma", "shop_name": "Sharma Kirana Store",
            "phone": "+91 9811223344", "credit_health_score": 88,
            "pre_approved_loan_amount": 75000, "loan_runway_days": 45
        }

        # 2. Khata & Customers
        cursor.execute("SELECT * FROM customers")
        customers = [dict(r) for r in cursor.fetchall()]
        total_pending_udhaar = sum(c.get("pending_udhaar", 0) for c in customers)
        udhaar_customers = [c for c in customers if c.get("pending_udhaar", 0) > 0]
        at_risk_customers = [c for c in customers if c.get("churn_risk") in ["At-Risk", "Dormant"]]

        # 3. Inventory
        cursor.execute("SELECT * FROM inventory")
        inventory = [dict(r) for r in cursor.fetchall()]
        low_stock_items = [i for i in inventory if i["current_stock"] <= i["reorder_threshold"]]

        # 4. Transactions & Telemetry (Excluding loan disbursals so merchant revenue volume is pure)
        cursor.execute("""
        SELECT COUNT(*) as cnt, COALESCE(SUM(amount), 0) as total_vol 
        FROM transactions 
        WHERE payment_mode != 'Loan_Disbursal' AND status = 'SUCCESS'
        """)
        tx_summary = dict(cursor.fetchone() or {"cnt": 0, "total_vol": 0})
        
        cursor.execute("SELECT * FROM transactions WHERE payment_mode != 'Loan_Disbursal' ORDER BY id DESC LIMIT 5")
        recent_txns = [dict(r) for r in cursor.fetchall()]

        # 5. Supplier POs
        cursor.execute("SELECT * FROM supplier_pos ORDER BY id DESC LIMIT 5")
        recent_pos = [dict(r) for r in cursor.fetchall()]

        conn.close()

        # 6. Live Underwriting & Credit Health (Direct mathematical calculation)
        credit_data = CreditService.get_merchant_credit_health(merchant.get("id", 1))

        return {
            "merchant": merchant,
            "khata": {
                "total_pending_udhaar": total_pending_udhaar,
                "udhaar_customer_count": len(udhaar_customers),
                "customers_with_udhaar": [
                    {"name": c["name"], "phone": c["phone"], "pending": c["pending_udhaar"], "last_visit": c["last_visit_date"]}
                    for c in udhaar_customers
                ],
                "all_customers": [
                    {"name": c["name"], "phone": c["phone"], "spent": c["total_spent"], "pending": c["pending_udhaar"], "churn_risk": c["churn_risk"]}
                    for c in customers
                ]
            },
            "inventory": {
                "total_skus": len(inventory),
                "low_stock_count": len(low_stock_items),
                "low_stock_items": [
                    {"name": i["item_name"], "stock": i["current_stock"], "threshold": i["reorder_threshold"], "unit": i["unit"], "supplier": i["supplier_name"]}
                    for i in low_stock_items
                ],
                "all_items": [
                    {"name": i["item_name"], "stock": i["current_stock"], "price": i["unit_price"], "wholesale": i["wholesale_price"]}
                    for i in inventory
                ]
            },
            "credit": {
                "score": credit_data["credit_health_score"],
                "tier": credit_data["rating"],
                "pre_approved_amount": credit_data["pre_approved_loan"],
                "interest_rate": credit_data["interest_rate"],
                "monthly_emi": credit_data["monthly_emi"],
                "daily_edi": credit_data["daily_edi"],
                "runway_days": credit_data["working_capital_runway_days"]
            },
            "growth": {
                "at_risk_count": len(at_risk_customers),
                "at_risk_customers": [{"name": c["name"], "phone": c["phone"], "risk": c["churn_risk"]} for c in at_risk_customers],
                "upcoming_festive": "Navratri & Diwali (3.4x Expected Surge in 6 Days)"
            },
            "telemetry": {
                "total_transactions": tx_summary.get("cnt", 0),
                "total_volume": round(float(tx_summary.get("total_vol", 0)), 2),
                "recent_payments": [
                    {"id": t.get("txn_id"), "amount": t.get("amount"), "time": t.get("timestamp")}
                    for t in recent_txns
                ]
            },
            "recent_pos": [
                {"po": p.get("po_number"), "item": p.get("item_name"), "qty": p.get("quantity"), "supplier": p.get("supplier_name")}
                for p in recent_pos
            ]
        }

    @classmethod
    def get_or_create_session(cls, session_id: str):
        if session_id not in cls._sessions:
            cls._sessions[session_id] = {
                "history": [],
                "last_mentioned_customer": None,
                "last_mentioned_item": None,
                "last_action": None,
                "created_at": datetime.now().isoformat()
            }
        return cls._sessions[session_id]

    @classmethod
    def clear_session(cls, session_id: str):
        if session_id in cls._sessions:
            cls._sessions[session_id]["history"] = []
            cls._sessions[session_id]["last_mentioned_customer"] = None
            cls._sessions[session_id]["last_mentioned_item"] = None
            cls._sessions[session_id]["last_action"] = None
        return {"success": True, "message": "Memory cleared."}

    @classmethod
    def handle_message(cls, message: str, session_id: str = "default_merchant"):
        msg = message.strip()
        # Normalize Devanagari numerals (०-९) to standard digits (0-9)
        devanagari_digits = str.maketrans("०१२३४५६७८९", "0123456789")
        q = msg.lower().translate(devanagari_digits)
        session = cls.get_or_create_session(session_id)
        
        # 1. Fetch real-time live app state
        context = cls.get_full_app_context()
        
        reply = ""
        action_taken = None
        data_payload = None
        soundbox_payload = None
        suggestions = []
        thoughts = []

        # Customer name aliases - dynamically loaded from DB plus Hindi Devanagari mappings
        customer_alias_map = {
            "रमेश": "Ramesh Kumar", "रमेश कुमार": "Ramesh Kumar",
            "राजेश": "Rajesh Chawla", "राजेश चावला": "Rajesh Chawla",
            "पूजा": "Pooja Gupta", "पूजा गुप्ता": "Pooja Gupta",
            "मनोज": "Manoj Verma", "मनोज वर्मा": "Manoj Verma",
            "अनन्या": "Ananya Singh", "अनन्या सिंह": "Ananya Singh",
            "सुनील": "Sunil Yadav", "सुनील यादव": "Sunil Yadav",
        }
        # Dynamically index all customers from live SQLite DB
        try:
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT id, name, phone FROM customers")
            rows = [dict(r) for r in cur.fetchall()]
            conn.close()

            # First calculate first-name frequencies so we only index unique first names
            first_name_freq = {}
            for row in rows:
                c_name = row["name"].strip()
                c_lower = c_name.lower()
                customer_alias_map[c_lower] = c_name
                parts = c_lower.split()
                if parts and len(parts[0]) >= 3:
                    first_name_freq[parts[0]] = first_name_freq.get(parts[0], 0) + 1

            for row in rows:
                c_name = row["name"].strip()
                c_lower = c_name.lower()
                parts = c_lower.split()
                # ONLY index first name if it uniquely identifies this single customer!
                # NEVER index generic surnames ('verma', 'sharma', 'gupta', 'kumar', 'singh') alone!
                if parts and len(parts[0]) >= 3 and first_name_freq.get(parts[0], 0) == 1:
                    customer_alias_map[parts[0]] = c_name
                if row["phone"]:
                    digits = ''.join(ch for ch in str(row["phone"]) if ch.isdigit())
                    if len(digits) >= 10:
                        customer_alias_map[digits[-10:]] = c_name
        except Exception as e:
            print("Dynamic customer indexing error:", e)

        # ========================================================
        # INTENT 1: KHATA / UDHAAR INQUIRY & REAL-TIME ACTION
        # ========================================================
        has_amount = bool(re.search(r'(?:rs\.?|inr|₹|रुपये|रुपया|रू)?\s*(\d+(?:\.\d+)?)', q))
        is_jama_phrase = any(w in q for w in [
            # Hinglish / English - Chutta / Chukta / Settle / Clear
            "chutta", "chutta kar", "chutta karo", "chutta kar do", "chutta kardo",
            "chutta kar rahi", "chutta kar rahe", "chutta karna", "chutta kiya", "chutta ho gaya", "chutta kar dijiye",
            "chuta", "chuta kar", "chuta karo", "chuta kar do",
            "chukta", "chukta kar", "chukta karo", "chukta kar do", "chukta kardo",
            "chukta kar rahi", "chukta kar rahe", "chukta karna", "chuka diya", "chuka diye", "chuka do",
            "hisab chutta", "hisab chukta", "udhaar chutta", "udhaar chukta",
            "aa gaye", "aa gaya", "aagye", "aagaya", "aaye", "aaya", "aagayi", "aa gayi",
            "mil gaye", "mil gaya", "mila", "mile", "received", "receive", "rcvd", "recvd",
            "jama", "jama kar", "jama karo", "jama kar do", "jama kardo", "jama ho", "settle", "settled", "clear", "cleared",
            "pay kar", "paid", "pad", "pay", "payed", "pe", "payment",
            "de diya", "de diye", "de gaya", "diya", "diye", "dia",
            "prapt", "bhar diya", "bhar diye",
            "bhi aa gaye", "bhi aa gaya",
            "wapas", "wapas aa gaye", "wapas aa gaya", "wapas mil gaye", "paisa aaya", "paise aa gaye",
            # Devanagari Hindi - छुट्टा / चुकता / जमा / सेटल
            "छुट्टा", "छुट्टा कर", "छुट्टा करो", "छुट्टा कर दो", "छुट्टा कर रही", "छुट्टा कर रहे", "छुट्टा करना",
            "छुट्टा हुआ", "छुट्टा हो गया", "छुट्टा कर दीजिए", "हिसाब छुट्टा", "उधार छुट्टा",
            "चुकता", "हिसाब चुकता", "उधार चुकता", "चुकता कर", "चुकता करो", "चुकता कर दो", "चुकता कर रही", "चुकता कर रहे", "चुकता करना",
            "निपटा दिया", "क्लियर", "सेटल", "सैटल", "सेटल कर", "सेटल करो", "सेटल कर दो",
            "पैड", "पेड", "पेड़", "पे", "पेमेंट", "पे कर", "पे किया", "पे कर दिया", "पे हुआ", "पे हो गए", "पे हो गया",
            "आ गए", "आ गया", "आ गई", "आगए", "आगया", "आए", "आया", "आये",
            "मिल गए", "मिल गया", "मिला", "मिले",
            "जमा", "जमा कर", "जमा करो", "जमा कर लो", "जमा कर दो", "जमा हो गए", "जमा हुआ",
            "प्राप्त", "प्राप्त हुए", "प्राप्त हुआ",
            "दे दिए", "दे दिया", "दे गया", "दिए", "दिया", "दिये",
            "चुका दिया", "चुका दिए", "चुकाया", "चुकाए",
            "भर दिया", "भर दिए", "भुगतान", "भुगतान किया", "भुगतान हुआ",
            "पूरा चुकता", "खाता चुकता",
            "वापस", "वापस आ गए", "वापस मिल गए", "पैसे आ गए", "पैसा आया"
        ])
        is_inquiry = any(w in q for w in [
            "kitna", "kitne", "kitni", "kya", "batao", "bataiye", "bata do", "check", "dekho", "dekhein", "dikhao", "status", "summary",
            "कितना", "कितने", "कितनी", "क्या", "बताओ", "बताइए", "बता दो", "चेक", "देखो", "दिखाओ", "स्थिति"
        ])
        is_udhaar_action = any(w in q for w in [
            # Hinglish / English - action verbs for writing/giving udhaar
            "likho", "likh lo", "likh do", "likh", "likhiye",
            "udhaar diya", "udhaar de do", "udhaar likho", "udhaar likh", "udhari likho",
            "add kar", "jod do", "le gaya", "le gaye",
            # Devanagari Hindi
            "लिखो", "लिख लो", "लिख दो", "लिख लेना", "लिखिये", "लिखिए",
            "उधार दिया", "उधार दे दो", "उधार लिखो", "उधार लिख", "उधारी लिखो",
            "जोड़ दो", "जोड़ो", "ले गया", "ले गए"
        ]) and not is_inquiry
        is_khata_general = any(w in q for w in [
            "khata", "baaki", "bahi", "ledger", "balance", "udhaar", "jama", "hisab", "kitna", "kitne",
            "खाता", "बही", "बाकी", "बैलेंस", "हिसाब", "उधार", "कितना बाकी", "कितना"
        ]) or is_inquiry

        # Customer presence check
        has_known_customer = any(k in q for k in customer_alias_map) or any(c["name"].lower().split()[0] in q for c in context["khata"]["all_customers"])

        # Check if it's a direct ledger action (Jama / Udhaar entry / Settle) - Never record on pure inquiries!
        if (is_jama_phrase or is_udhaar_action) and not (is_inquiry and not is_jama_phrase) and (has_amount or has_known_customer or any(w in q for w in ["chutta", "chukta", "settle", "clear", "छुट्टा", "चुकता"])):
            thoughts.append("Action detected: Record real-time Khata ledger transaction")
            customer_name = None
            all_custs = context["khata"]["all_customers"]
            
            # 1. Exact full-name match from DB customers (sorted descending by length so "Riyanshi Verma" matches before single words)
            sorted_customers = sorted(all_custs, key=lambda c: len(c["name"]), reverse=True)
            for c in sorted_customers:
                c_full = c["name"].lower().strip()
                if c_full and re.search(r'(?<![a-zA-Z0-9])' + re.escape(c_full) + r'(?![a-zA-Z0-9])', q):
                    customer_name = c["name"]
                    break

            # 2. Check known alias mapping (sorted longest alias first, with word boundaries)
            if not customer_name:
                sorted_aliases = sorted(customer_alias_map.items(), key=lambda x: len(x[0]), reverse=True)
                for alias, official_name in sorted_aliases:
                    if re.search(r'(?<![a-zA-Z0-9])' + re.escape(alias) + r'(?![a-zA-Z0-9])', q):
                        customer_name = official_name
                        break

            # 3. First-name unique match against DB customers
            if not customer_name:
                first_name_freq = {}
                for c in sorted_customers:
                    first = c["name"].lower().strip().split()[0]
                    first_name_freq[first] = first_name_freq.get(first, 0) + 1
                for c in sorted_customers:
                    first = c["name"].lower().strip().split()[0]
                    if len(first) >= 3 and first_name_freq.get(first, 0) == 1:
                        if re.search(r'(?<![a-zA-Z0-9])' + re.escape(first) + r'(?![a-zA-Z0-9])', q):
                            customer_name = c["name"]
                            break

            # 4. Hindi Devanagari phrase parsing: e.g. "रमेश कुमार के ₹450" or "सुनील से 500" or "रियांशी का उधार छुट्टा"
            if not customer_name:
                hi_match = re.search(r'([^\s,₹\d।]+(?:\s+[^\s,₹\d।]+)?)\s*(?:के|का|की|ने|को|से|भी)', msg)
                if hi_match:
                    cand = hi_match.group(1).strip()
                    if cand in customer_alias_map:
                        customer_name = customer_alias_map[cand]
                    elif len(cand) > 1 and cand not in ["आज", "कल", "भाई", "साउंडबॉक्स", "पेटीएम", "खाता", "उधार", "नया", "पुराना", "सबका"]:
                        customer_name = cand

            # 5. English / Hinglish phrase parsing: "...<Name> ka/ke/ki/ko/se/ne..." anywhere in query
            if not customer_name:
                name_match = re.search(r'(?:ab\s+|maine\s+|main\s+|kisi\s+ka\s+)?\b([a-zA-Z]{3,}(?:\s+[a-zA-Z]{3,})?)\s*(?:ka\b|ke\b|ki\b|ko\b|se\b|ne\b)', message, re.IGNORECASE)
                if name_match:
                    cand = name_match.group(1).strip()
                    cand_lower = cand.lower()
                    stop_words = {"aaj", "kal", "bhai", "soundbox", "paytm", "khata", "udhaar", "naya", "new", "purana", "sabka", "poora", "pura", "aajka", "abhi", "kisi", "usi", "uska", "unki", "mera", "meri"}
                    if cand_lower not in stop_words:
                        for c in sorted_customers:
                            if cand_lower == c["name"].lower() or c["name"].lower().startswith(cand_lower):
                                customer_name = c["name"]
                                break
                        if not customer_name:
                            customer_name = cand.title()

            # 6. Fallback: session last mentioned, or first pending customer
            if not customer_name:
                customer_name = session.get("last_mentioned_customer")
            if not customer_name:
                pending_custs = [c["name"] for c in context["khata"]["customers_with_udhaar"]]
                customer_name = pending_custs[0] if pending_custs else "Valued Customer"

            session["last_mentioned_customer"] = customer_name

            # Look up customer's current balance in DB
            cust_record = next((c for c in context["khata"]["all_customers"] if c["name"].lower() == customer_name.lower()), None)
            if not cust_record:
                cust_record = next((c for c in context["khata"]["all_customers"] if c["name"].lower().split()[0] == customer_name.lower().split()[0]), None)
            cust_pending = float(cust_record.get("pending", 0)) if cust_record else 0.0

            # Check if this is a full settlement request without an explicit amount
            is_full_settlement = any(w in q for w in [
                "chutta", "chutta kar", "chutta karo", "chutta kar do", "chutta kardo",
                "chutta kar rahi", "chutta kar rahe", "chutta karna", "chuta",
                "chukta", "chukta kar", "chukta karo", "chukta kar do", "chukta kardo",
                "chukta kar rahi", "chukta kar rahe", "chukta karna",
                "pura chukta", "poora chukta", "hisab chukta", "hisab clear", "hisab chutta",
                "sab chukta", "pura clear", "poora clear", "full settle", "pura settle", 
                "settle", "चुकता", "हिसाब चुकता", "पूरा चुकता", "खाता चुकता", "सेटल", "क्लियर",
                "छुट्टा", "छुट्टा कर", "छुट्टा करो", "छुट्टा कर दो", "छुट्टा कर रही", "छुट्टा करना", "हिसाब छुट्टा"
            ]) and not re.search(r'(?:rs\.?|inr|₹|रुपये|रुपया|रू)?\s*(\b\d{1,6}(?:\.\d+)?\b)', q)

            if is_full_settlement:
                if cust_pending <= 0:
                    reply = f"ℹ️ **{customer_name} Ji Ka Khata Pehle Se Chukta Hai!**\n\n" \
                            f"• **Grahak:** {customer_name}\n" \
                            f"• **Pending Udhaar:** ₹0 (All Clear)\n" \
                            f"• **Status:** Koi bakaya rashi bachi nahi hai."
                    suggestions = ["Khata ledger dekhein", "Stock status check karo", "Customer ko offer bhejo"]
                    session["history"].append({"role": "user", "content": message, "timestamp": datetime.now().isoformat()})
                    session["history"].append({"role": "assistant", "content": reply, "timestamp": datetime.now().isoformat()})
                    return {
                        "reply": reply,
                        "action_taken": "KHATA_ALREADY_CLEARED",
                        "data": {"customer_name": customer_name, "pending": 0},
                        "soundbox_payload": {
                            "chime": True,
                            "speech_text": f"Paytm par {customer_name} ji ka koi baaki udhaar nahi hai. Hisab chukta hai."
                        },
                        "suggestions": suggestions,
                        "thoughts": ["Customer has 0 pending udhaar; no settlement required."],
                        "context_summary": {
                            "pending_udhaar": context["khata"]["total_pending_udhaar"],
                            "low_stock_count": context["inventory"]["low_stock_count"],
                            "credit_score": context["credit"]["score"],
                            "memory_turns": len(session["history"])
                        }
                    }
                amount = cust_pending
            else:
                amt_match = re.search(r'(?:rs\.?|inr|₹|रुपये|रुपया|रू)?\s*(\b\d{1,6}(?:\.\d+)?\b)', q)
                amount = float(amt_match.group(1)) if amt_match else (cust_pending if cust_pending > 0 else 250.0)

            # Settle or Jama phrases are always JAMA; only pure udhaar actions are UDHAAR
            entry_type = "jama" if (is_jama_phrase or is_full_settlement) else "udhaar"
            
            item_desc = "Kirana Items"
            for it in ["oil", "butter", "maggi", "salt", "atta", "tea", "tel", "doodh", "biscuit", "sugar", "तेल", "मक्खन", "आटा", "मैगी", "नमक"]:
                if it in q:
                    item_desc = it.title()
                    break

            action_res = KhataService.record_entry(customer_name, amount, item_desc, entry_type)
            action_taken = "KHATA_ENTRY_RECORDED"
            data_payload = action_res
            soundbox_payload = action_res.get("soundbox_payload")
            
            # Dynamic memory update
            session["last_action"] = f"{entry_type.title()} of ₹{int(amount)} for {customer_name}"
            new_bal = action_res.get("new_pending_balance", 0)

            reply = f"✅ **Entry Darj Ho Gayi Hai!**\n\n" \
                    f"• **Grahak:** {customer_name}\n" \
                    f"• **Type:** {entry_type.upper()} ({'Prapt Hue (Hisab Chukta / Jama)' if entry_type == 'jama' else 'Udhaar Diya'})\n" \
                    f"• **Raqam:** ₹{int(amount):,}\n" \
                    f"• **Naya Pending Udhaar:** ₹{int(new_bal):,}\n\n" \
                    f"🔊 *Soundbox Chime broadcasted:* \"{soundbox_payload.get('speech_text') if soundbox_payload else ''}\""
            
            suggestions = ["Khata ledger dekhein", "Stock status check karo", "Customer ko reminder bhejo"]

        elif is_khata_general:
            # Query about Khata status
            thoughts.append("Intent detected: Khata / Udhaar status inquiry")
            total_pending = context["khata"]["total_pending_udhaar"]
            udhaar_list = context["khata"]["customers_with_udhaar"]
            all_custs = context["khata"]["all_customers"]
            
            # Check for specific customer with robust longest-first lookup
            specific_cust = None
            sorted_customers = sorted(all_custs, key=lambda c: len(c["name"]), reverse=True)
            for c in sorted_customers:
                c_full = c["name"].lower().strip()
                if c_full and re.search(r'(?<![a-zA-Z0-9])' + re.escape(c_full) + r'(?![a-zA-Z0-9])', q):
                    specific_cust = c
                    break

            if not specific_cust:
                first_name_freq = {}
                for c in sorted_customers:
                    first = c["name"].lower().strip().split()[0]
                    first_name_freq[first] = first_name_freq.get(first, 0) + 1
                for c in sorted_customers:
                    first = c["name"].lower().strip().split()[0]
                    if len(first) >= 3 and first_name_freq.get(first, 0) == 1:
                        if re.search(r'(?<![a-zA-Z0-9])' + re.escape(first) + r'(?![a-zA-Z0-9])', q):
                            specific_cust = c
                            break

            if not specific_cust:
                sorted_aliases = sorted(customer_alias_map.items(), key=lambda x: len(x[0]), reverse=True)
                for alias, official_name in sorted_aliases:
                    if re.search(r'(?<![a-zA-Z0-9])' + re.escape(alias) + r'(?![a-zA-Z0-9])', q):
                        specific_cust = next((c for c in all_custs if c["name"] == official_name), None)
                        if specific_cust:
                            break

            if specific_cust:
                session["last_mentioned_customer"] = specific_cust["name"]
                reply = f"📋 **{specific_cust['name']} Ji Ka Khata Details:**\n\n" \
                        f"• **Pending Udhaar:** ₹{int(specific_cust['pending'])}\n" \
                        f"• **Mobile:** `{specific_cust['phone']}`\n" \
                        f"• **Total Spent Till Date:** ₹{int(specific_cust['spent'])}\n" \
                        f"• **Risk Status:** {specific_cust['churn_risk']}\n\n" \
                        f"Aap bol sakte hain: *'{specific_cust['name'].split()[0]} ka ₹{int(specific_cust['pending'])} jama kar lo'* ya WhatsApp reminder bhej sakte hain."
                suggestions = [f"{specific_cust['name'].split()[0]} ka udhaar clear karo", "Bahi-Khata ledger khole", "Baaki grahakon ka udhaar"]
            else:
                cust_str = "\n".join([f"• **{c['name']}**: ₹{int(c['pending'])} (Last visit: {c['last_visit']})" for c in udhaar_list])
                reply = f"📊 **Sharma Kirana — Bahi-Khata Summary:**\n\n" \
                        f"Aapka kul **₹{int(total_pending):,}** udhaar market me pending hai across **{len(udhaar_list)} grahak**:\n\n" \
                        f"{cust_str}\n\n" \
                        f"💡 *Tip: Kisi bhi grahak ka naam lekar bol sakte hain unka udhaar jama ya darj karne ke liye.*"
                dynamic_sugg = [f"{c['name'].split()[0]} ka balance" for c in udhaar_list[:2]]
                suggestions = dynamic_sugg + ["Udhaar darj karein", "Low stock check"]

        # ========================================================
        # INTENT 1B: QUICK COUNTER MICRO-SALE (CHHOTA GALLA: ₹15 Dahi, ₹20 Doodh)
        # ========================================================
        elif has_amount and not has_known_customer and any(w in q for w in [
            "dahi", "curd", "doodh", "milk", "chai", "biscuit", "parle", "bread", "chips",
            "anda", "egg", "toffee", "namkeen", "cash", "galla", "bikri", "sale",
            "दही", "दूध", "चाय", "बिस्कुट", "ब्रेड", "अंडा", "गल्ला", "नकद", "बिक्री", "कैश"
        ]):
            thoughts.append("Action detected: Quick Counter Micro-Sale (Zero Customer Name Required)")
            amt_match = re.search(r'(?:rs\.?|inr|₹|रुपये|रुपया|रू)?\s*(\b\d{1,5}(?:\.\d+)?\b)', q)
            amount = float(amt_match.group(1)) if amt_match else 20.0

            micro_item_map = {
                "dahi": "Dahi", "curd": "Dahi", "दही": "Dahi",
                "doodh": "Doodh", "milk": "Doodh", "दूध": "Doodh",
                "chai": "Chai Pack", "चाय": "Chai Pack",
                "biscuit": "Biscuit", "parle": "Parle-G", "बिस्कुट": "Biscuit",
                "bread": "Bread", "ब्रेड": "Bread",
                "chips": "Chips/Namkeen", "namkeen": "Chips/Namkeen",
                "anda": "Eggs", "egg": "Eggs", "अंडा": "Eggs",
                "maggi": "Maggi", "मैगी": "Maggi"
            }
            item_tag = "Counter Item"
            for k, label in micro_item_map.items():
                if k in q:
                    item_tag = label
                    break

            sim_res = TransactionService.simulate_payment(amount, f"Micro: {item_tag} ₹{int(amount)}", "Cash_Micro", item_tag)
            action_taken = "MICRO_SALE_LOGGED"
            data_payload = sim_res
            soundbox_payload = sim_res.get("soundbox_payload")
            est_profit = round(amount * 0.21, 1)

            reply = f"⚡ **Chhota Galla Micro-Sale Darj!** (No Customer Name Needed)\n\n" \
                    f"• **Item:** {item_tag}\n" \
                    f"• **Sale Amount:** ₹{int(amount)}\n" \
                    f"• **Est. Margin Profit (~21%):** +₹{est_profit}\n" \
                    f"• **7-Day Profit Chart:** Updated Live\n\n" \
                    f"🔊 *Soundbox:* \"{soundbox_payload.get('speech_text') if soundbox_payload else ''}\""
            suggestions = ["20 rupaye doodh cash", "15 rupaye dahi", "Khata ledger dekhein", "Stock check"]

        # ========================================================
        # INTENT 2: INVENTORY & SUPPLIER RESTOCK
        # ========================================================
        elif any(w in q for w in ["stock", "khatam", "supplier", "order", "reorder", "po", "inventory", "tel", "oil", "butter", "atta", "maggi", "salt", "स्टॉक", "माल", "खत्म", "सप्लायर", "ऑर्डर", "तेल", "मक्खन", "आटा", "मैगी", "नमक", "फॉर्च्यून", "अमूल"]):
            if any(w in q for w in ["order", "reorder", "manga", "bhejo", "po bhej", "ऑर्डर", "मंगा", "मंगाओ", "मंगा लो", "भेज", "भेजो", "मंगवा", "मंगवा लो", "बुक"]):
                thoughts.append("Action detected: Send supplier restock purchase order")
                target_item = session.get("last_mentioned_item") or "Fortune Refined Oil 1L"
                for it in context["inventory"]["all_items"]:
                    for word in it["name"].lower().split():
                        if len(word) > 3 and word in q:
                            target_item = it["name"]
                            break

                session["last_mentioned_item"] = target_item
                qty_match = re.search(r'\b(\d+)\s*(?:packet|pack|unit|piece|pouch|dibba|kg|litre|l)?\b', q)
                quantity = int(qty_match.group(1)) if qty_match else None
                po_res = InventoryService.create_supplier_po(target_item, quantity)
                action_taken = "SUPPLIER_PO_SENT"
                data_payload = po_res
                soundbox_payload = po_res.get("soundbox_payload")
                session["last_action"] = f"Created {po_res.get('po_number')} for {target_item}"

                po_qty = po_res.get("quantity")
                po_unit = po_res.get("unit", "units")
                reply = f"📦 **Supplier Purchase Order Dispatched!**\n\n" \
                        f"• **PO Number:** `{po_res.get('po_number')}`\n" \
                        f"• **Item:** {target_item}\n" \
                        f"• **Quantity:** {po_qty} {po_unit}\n" \
                        f"• **Supplier:** {po_res.get('supplier_name')}\n" \
                        f"• **Total PO Value:** ₹{int(po_res.get('total_cost', 0))}\n" \
                        f"• **Expected Delivery:** {po_res.get('expected_delivery_date')} (Stock will credit on delivery)\n" \
                        f"• **Status:** Email PO sent via Paytm B2B Rail ({po_res.get('email_preview', {}).get('email_status')}).\n\n" \
                        f"🔊 *Soundbox Audio Chime Triggered!*"
                suggestions = ["Low stock list dekhein", "Khata udhaar check karo", "Credit health score"]

            else:
                thoughts.append("Intent detected: Inventory stock level inquiry")
                low_stock = context["inventory"]["low_stock_items"]
                low_stock_str = "\n".join([
                    f"⚠️ **{item['name']}** — Sirf **{item['stock']} {item['unit']} bache hain** (Threshold: {item['threshold']}, Supplier: {item['supplier']})"
                    for item in low_stock
                ])
                reply = f"📦 **Live Inventory & Stock Health:**\n\n" \
                        f"Aapki dukan me **{context['inventory']['total_skus']} total SKUs** hain, jinme se **{len(low_stock)} items critical threshold** par hain:\n\n" \
                        f"{low_stock_str}\n\n" \
                        f"Kya aap kisi item ka 1-Click Wholesale PO supplier ko dispatch karna chahte hain?"
                suggestions = ["Oil 1-click reorder", "Amul Butter reorder", "Bahi-Khata ledger", "Mera loan status"]

        # ========================================================
        # INTENT 3: PAYTM LOAN & CREDIT HEALTH
        # ========================================================
        elif any(w in q for w in ["loan", "credit", "score", "capital", "paise", "underwrite", "disburse", "limit", "लोन", "क्रेडिट", "कर्ज", "उधार पैसा", "पूंजी"]):
            if any(w in q for w in ["disburse", "le lo", "apply", "transfer", "bank", "निकाल", "ले लो", "चाहिए", "ट्रांसफर", "डाल दो", "लेना", "अप्लाई", "दे दो"]):
                thoughts.append("Action detected: Disburse pre-approved merchant loan")
                disburse_res = CreditService.disburse_loan(context["credit"]["pre_approved_amount"])
                action_taken = "LOAN_DISBURSED"
                data_payload = disburse_res
                soundbox_payload = disburse_res.get("soundbox_payload")
                session["last_action"] = f"Disbursed loan of ₹{context['credit']['pre_approved_amount']:,}"

                reply = f"🎉 **Mubarak Ho! Working Capital Disbursed!**\n\n" \
                        f"• **Raqam:** ₹{int(context['credit']['pre_approved_amount']):,}\n" \
                        f"• **Disbursal Method:** Instant RTGS/IMPS to Paytm Payments Bank\n" \
                        f"• **Paperwork:** 0 Physical Verification (Soundbox UPI Telemetry)\n" \
                        f"• **Daily Auto EDI:** ₹{context['credit']['daily_edi']}/day deducted seamlessly from QR settlements.\n\n" \
                        f"🔊 *Soundbox Chime Activated!*"
                suggestions = ["Transaction history dekho", "Khata udhaar check karo", "Stock alerts"]

            else:
                thoughts.append("Intent detected: Credit score and loan eligibility inquiry")
                cr = context["credit"]
                reply = f"🏛️ **Paytm Merchant Credit Health & Underwriting:**\n\n" \
                        f"• **Paytm Credit Score:** **{cr['score']}/100** ({cr['tier']})\n" \
                        f"• **Pre-Approved Working Capital:** **₹{int(cr['pre_approved_amount']):,}**\n" \
                        f"• **Interest Rate:** {cr['interest_rate']}\n" \
                        f"• **Estimated Daily EMI:** ₹{cr['daily_edi']} (Auto-deducted from daily QR payments)\n" \
                        f"• **Working Capital Runway:** {cr['runway_days']}\n\n" \
                        f"Yeh score aapke **Soundbox 30-day cashflow (₹{int(context['telemetry']['total_volume']):,})** aur timely Udhaar recovery par based hai."
                suggestions = ["₹75,000 loan disburse karo", "Khata udhaar status", "Stock alerts"]

        # ========================================================
        # INTENT 4: CUSTOMER RETENTION & FESTIVE GROWTH
        # ========================================================
        elif any(w in q for w in ["customer", "grahak", "offer", "discount", "churn", "sms", "festive", "diwali", "growth"]):
            thoughts.append("Intent detected: Merchant Growth & Win-back campaign inquiry")
            at_risk = context["growth"]["at_risk_customers"]
            at_risk_str = "\n".join([f"• **{c['name']}** ({c['risk']} • `{c['phone']}`)" for c in at_risk])
            
            reply = f"📈 **AI Merchant Growth & Retention Engine:**\n\n" \
                    f"**Customer Churn Warning:**\n" \
                    f"Pichle 30-45 din se yeh regular grahak nahi aaye hain:\n" \
                    f"{at_risk_str}\n\n" \
                    f"🪔 **Festive Intelligence:**\n" \
                    f"**{context['growth']['upcoming_festive']}**! High demand grocery items (Fortune Oil, Atta, Dry Fruits) par 25% extra stock rakhne ki sifarish hai.\n\n" \
                    f"Kya aap at-risk customers ko 1-Tap Paytm UPI discount voucher bhejna chahte hain?"
            suggestions = ["Rajesh Chawla ko offer bhejo", "Low stock items", "Khata ledger summary"]

        # ========================================================
        # INTENT 5: SOUNDBOX / TELEMETRY / PAYMENT SIMULATION
        # ========================================================
        elif any(w in q for w in ["soundbox", "telemetry", "payment", "upi", "qr", "chime"]):
            if any(w in q for w in ["test", "baja", "simulate", "play"]):
                thoughts.append("Action detected: Soundbox audio test / QR simulation")
                sim_res = TransactionService.simulate_payment(250.0, "+91 9810998877", "UPI_Soundbox")
                action_taken = "SOUNDBOX_TESTED"
                data_payload = sim_res
                soundbox_payload = sim_res.get("soundbox_payload")
                reply = f"🔊 **Paytm Soundbox 4.0 Telemetry Test Completed!**\n\n" \
                        f"• **Amount:** ₹250\n" \
                        f"• **Mode:** UPI Soundbox QR\n" \
                        f"• **Chime Frequency:** Dual Tone (880Hz + 1320Hz)\n" \
                        f"• **Voice:** \"Paytm par do sau pachaas rupaye prapt hue.\""
                suggestions = ["Khata balance dekhein", "Stock check", "Loan health score"]
            else:
                thoughts.append("Intent detected: Soundbox status inquiry")
                reply = f"🔊 **Paytm Soundbox 4.0 Status:**\n\n" \
                        f"• **Hardware Status:** Online & Active (0 hardware Capex)\n" \
                        f"• **Audio Chime Uptime:** 99.98%\n" \
                        f"• **30-Day Collections:** ₹{int(context['telemetry']['total_volume']):,} across {context['telemetry']['total_transactions']} transactions\n" \
                        f"• **Language Engine:** Hindi & Hinglish Dual-Speech Engine"
                suggestions = ["Test soundbox chime", "Khata status", "Low stock alerts"]

        # ========================================================
        # INTENT 6: GENERAL GREETING / APP CAPABILITIES
        # ========================================================
        else:
            thoughts.append("Intent detected: General query / Greeting / Help")
            m_name = context["merchant"]["name"]
            shop = context["merchant"]["shop_name"]
            reply = f"Namaste {m_name} ji! Main **Paytm Vyapar Saathi Copilot** hoon.\n\n" \
                    f"Mere paas aapki **{shop}** ka complete real-time data hai:\n" \
                    f"• **Bahi-Khata Ledger:** ₹{int(context['khata']['total_pending_udhaar']):,} pending udhaar across {context['khata']['udhaar_customer_count']} grahak\n" \
                    f"• **Stock Alerts:** {context['inventory']['low_stock_count']} items low on stock\n" \
                    f"• **Credit Score:** {context['credit']['score']}/100 (₹{int(context['credit']['pre_approved_amount']):,} loan pre-approved)\n" \
                    f"• **Soundbox 4.0:** Connected & Ready\n\n" \
                    f"Aap mujhse Hindi, Hinglish ya English me kuch bhi pooch ya karwa sakte hain!"
            suggestions = ["Kitna udhaar baaki hai?", "Kaun sa stock kam hai?", "Mera loan status", "Soundbox chime test"]

        # 2. Append to Session History (Dynamic Memory)
        session["history"].append({"role": "user", "content": message, "timestamp": datetime.now().isoformat()})
        session["history"].append({"role": "assistant", "content": reply, "timestamp": datetime.now().isoformat()})

        # Keep history to max 20 messages for memory compactness
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]

        return {
            "reply": reply,
            "action_taken": action_taken,
            "data": data_payload,
            "soundbox_payload": soundbox_payload,
            "suggestions": suggestions,
            "thoughts": thoughts,
            "context_summary": {
                "pending_udhaar": context["khata"]["total_pending_udhaar"],
                "low_stock_count": context["inventory"]["low_stock_count"],
                "credit_score": context["credit"]["score"],
                "memory_turns": len(session["history"])
            }
        }
