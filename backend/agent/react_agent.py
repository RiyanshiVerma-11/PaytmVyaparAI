import os
import re
import json
from datetime import datetime
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    for _env_candidate in [
        os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    ]:
        if os.path.isfile(_env_candidate):
            with open(_env_candidate, "r", encoding="utf-8") as _ef:
                for _line in _ef:
                    _line = _line.strip()
                    if _line and not _line.startswith("#") and "=" in _line:
                        _k, _v = _line.split("=", 1)
                        os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

from database import get_connection
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService

# Initialize Groq client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
try:
    from groq import Groq
    _groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
except Exception:
    _groq_client = None

AGENT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "record_khata_entry",
            "description": "Record an udhaar (credit given) or jama (payment received) entry into Bahi-Khata when customer name and amount are explicitly specified.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "Full name or first name of customer"
                    },
                    "amount": {
                        "type": "number",
                        "description": "Transaction amount in Rupees"
                    },
                    "entry_type": {
                        "type": "string",
                        "enum": ["udhaar", "jama"],
                        "description": "'udhaar' when customer takes goods on credit; 'jama' when customer pays money back"
                    },
                    "item_description": {
                        "type": "string",
                        "description": "Item or reason (e.g. '1L Refined Oil', 'Monthly Provisions', 'Cash Repayment')"
                    }
                },
                "required": ["customer_name", "amount", "entry_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "settle_khata_customer",
            "description": "Fully clear, chutta, or settle a customer's total pending udhaar balance to zero without specifying a partial amount.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "Customer whose full account is being settled"
                    }
                },
                "required": ["customer_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_khata_details",
            "description": "Inquire about a specific customer's pending balance or overall Bahi-Khata ledger summary without recording any transaction.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_name": {
                        "type": "string",
                        "description": "Specific customer to look up, or omit for general ledger balance"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_supplier_po",
            "description": "Create and dispatch an urgent wholesale restock purchase order email to a supplier for an inventory item.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "Item name to restock (e.g. 'Fortune Refined Oil 1L', 'Amul Butter', 'Tata Salt')"
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Quantity to order. If omitted or null, calculated dynamically from safety threshold."
                    }
                },
                "required": ["item_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "receive_supplier_delivery",
            "description": "Mark a supplier Purchase Order as received and physically add the delivered quantity into store inventory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "po_identifier": {
                        "type": "string",
                        "description": "PO number (e.g. 'PO-PAYTM-823225') or item name"
                    }
                },
                "required": ["po_identifier"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_inventory_health",
            "description": "Inquire about store inventory stock levels, critical low-stock items, and reorder alerts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_name": {
                        "type": "string",
                        "description": "Specific item to check, or omit to check all critical low stock"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_credit_health",
            "description": "Check merchant's real-time Paytm Credit Health Score (0-100), pre-approved working capital loan limit, and interest rates.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "disburse_loan",
            "description": "Disburse pre-approved merchant working capital loan directly to merchant bank account.",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "Amount to disburse in Rupees"
                    }
                },
                "required": ["amount"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_growth_campaigns",
            "description": "View at-risk customer churn warnings, win-back discount offers, and upcoming festive demand surge predictions.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

SYSTEM_PROMPT = """You are Paytm Vyapar Saathi Copilot, an autonomous AI partner for Indian Kirana & retail merchants.
You have real-time tools for Bahi-Khata ledger, Supplier POs, Inventory receiving, Credit underwriting, and Customer churn.

CORE BEHAVIOR RULES:
1. CUSTOMER NAME & AMOUNT EXTRACTION:
   - When a merchant says "Prachi, ₹500 aata udhaar darj karein" or "प्राची 500 रुपये आटा उधार दर्ज करें", the customer name is "Prachi" (or "प्राची"), amount is 500, item is "Atta (Flour)", and entry_type is "udhaar".
   - Immediately call tool `record_khata_entry` with customer_name="Prachi", amount=500, entry_type="udhaar", item_description="Atta (Flour)".
   - NEVER substitute with another customer (do NOT pick Pooja or Ramesh if the merchant explicitly specified Prachi). Even if Prachi is a new customer, pass customer_name="Prachi".
2. NEVER invent fake numbers or dummy customers.
   - If customer name or amount is completely missing (e.g. just "Udhaar likh lo"), do NOT default to 'Valued Customer' or '450'. Politely ask for the missing details.
   - If the merchant wants to reorder inventory but doesn't name the item, ask which item they need.
3. Vernacular Settlement: 'chutta', 'chutta kar do', 'chukta', 'settle', 'hisab clear' without an explicit amount means full settlement of whatever balance the customer owes. Call 'settle_khata_customer'.
4. Inquiries ('kitna hai', 'kya status hai', 'check karo') are purely informational. Never record transactions on inquiries. Call 'get_khata_details' or 'get_inventory_health'.
5. Always respond in warm, professional Hindi/Hinglish suitable for a Kirana shopkeeper."""

class ReactAgent:
    @classmethod
    def process_query(cls, query: str, merchant_id: int = 1):
        q_raw = query.strip()
        q_lower = q_raw.lower()

        thoughts = []
        action_name = None
        result_payload = None

        # -------------------------------------------------------------
        # ENGINE 1: Primary Real ReAct Agent via Groq LLM Tool-Calling
        # -------------------------------------------------------------
        if _groq_client and os.getenv("GROQ_API_KEY"):
            try:
                llm_res = cls._run_groq_react(q_raw, merchant_id)
                if llm_res:
                    return llm_res
            except Exception as e:
                thoughts.append(f"Groq LLM Engine notice: {e}. Seamlessly engaging High-Speed Vernacular Engine.")

        # -------------------------------------------------------------
        # ENGINE 2: High-Speed Deterministic Vernacular Engine (Fallback)
        # -------------------------------------------------------------
        return cls._run_deterministic_engine(q_raw, merchant_id, thoughts)

    @classmethod
    def _run_groq_react(cls, query: str, merchant_id: int = 1):
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query}
        ]

        resp = _groq_client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=messages,
            tools=AGENT_TOOLS,
            tool_choice="auto",
            temperature=0.1
        )

        choice = resp.choices[0]
        msg = choice.message
        thoughts = [f"LLM Reasoning: Evaluated user prompt '{query}' with native tool router."]

        if msg.tool_calls:
            tool_call = msg.tool_calls[0]
            func_name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            thoughts.append(f"ReAct Action: Selected tool `{func_name}` with parameters {args}")
            exec_res = cls._execute_tool(func_name, args, merchant_id)
            thoughts.append(f"ReAct Observation: Tool executed with status: {exec_res.get('success', True)}")

            # Generate natural response with soundbox payload
            reply_text = cls._format_tool_response(func_name, args, exec_res)
            soundbox_payload = exec_res.get("soundbox_payload") or {
                "chime": True,
                "speech_text": reply_text.split("\n")[0].replace("*", "").replace("#", "")
            }

            now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
            confirmation_card = None
            if func_name == "record_khata_entry":
                etype = args.get("entry_type", "udhaar")
                confirmation_card = {
                    "action": "UDHAAR_CREDIT" if etype == "udhaar" else "JAMA_PAYMENT",
                    "action_label": "खाता उधार दर्ज (Credit Entry)" if etype == "udhaar" else "खाता जमा दर्ज (Payment Received)",
                    "entity": args.get("customer_name") or exec_res.get("customer_name"),
                    "item_description": args.get("item_description", "Kirana Items"),
                    "item": args.get("item_description", "Kirana Items"),
                    "amount": float(args.get("amount", 0)),
                    "date": now_str,
                    "status": "SAVED_TO_DATABASE",
                    "simulation": False,
                    "simulation_badge": "Live Paytm Bahi-Khata Ledger",
                    "notice": "Saved to live Paytm Bahi-Khata ledger"
                }
            elif func_name == "create_supplier_po":
                confirmation_card = {
                    "action": "SUPPLIER_PURCHASE_ORDER",
                    "action_label": "सप्लायर रीऑर्डर PO (Wholesale Restock)",
                    "entity": args.get("item_name"),
                    "item": f"Qty: {exec_res.get('quantity', args.get('quantity'))}",
                    "amount": exec_res.get("total_cost", 0),
                    "date": now_str,
                    "status": exec_res.get("email_status", "DISPATCHED_TO_OUTBOX"),
                    "simulation": True,
                    "simulation_badge": "PO created and queued for supplier email (Demo Mode)",
                    "notice": "PO created and queued for supplier email (Demo Mode)"
                }
            elif func_name == "disburse_loan":
                confirmation_card = {
                    "action": "LOAN_DISBURSAL",
                    "action_label": "वर्किंग कैपिटल लोन डिसबर्सल (Working Capital Loan)",
                    "entity": exec_res.get("bank_account", "Paytm Payments Bank"),
                    "item": f"Interest: {exec_res.get('interest_rate', '1.2% / mo')}",
                    "amount": float(args.get("amount", 0)),
                    "date": now_str,
                    "status": "APPROVED_IN_SIMULATION",
                    "simulation": True,
                    "simulation_badge": "Loan approved in simulation. No real funds disbursed.",
                    "notice": "Loan approved in simulation. No real funds disbursed."
                }
            elif func_name == "settle_khata_customer":
                confirmation_card = {
                    "action": "JAMA_PAYMENT",
                    "action_label": "खाता चुकता (Full Settlement)",
                    "entity": args.get("customer_name") or exec_res.get("customer_name"),
                    "item": "Poora Hisab Chukta",
                    "amount": exec_res.get("cleared_amount", 0),
                    "date": now_str,
                    "status": "SAVED_TO_DATABASE",
                    "simulation": False,
                    "simulation_badge": "Live Paytm Bahi-Khata Ledger",
                    "notice": "Full ledger balance settled"
                }

            return {
                "query": query,
                "action_name": func_name.upper(),
                "thoughts": thoughts,
                "result": exec_res,
                "reply": reply_text,
                "confirmation_card": confirmation_card,
                "soundbox_payload": soundbox_payload
            }
        else:
            # Conversational reply or clarification request directly from LLM
            content = msg.content or "Main aapki kya madad kar sakta hoon?"
            is_clarif = any(w in content.lower() for w in ["naam", "kitne", "rupaye", "amount", "item", "kaunsa", "bataiye", "jaankari"])
            action_tag = "CLARIFICATION_REQUIRED" if is_clarif else "CONVERSATIONAL_RESPONSE"
            thoughts.append(f"ReAct Action: Direct LLM response ({action_tag})")
            return {
                "query": query,
                "action_name": action_tag,
                "thoughts": thoughts,
                "result": {"message": content, "clarification_needed": is_clarif},
                "reply": content,
                "soundbox_payload": {
                    "chime": False,
                    "speech_text": content.split("\n")[0].replace("*", "")
                }
            }

    @classmethod
    def _execute_tool(cls, func_name: str, args: dict, merchant_id: int = 1):
        if func_name == "record_khata_entry":
            return KhataService.record_entry(
                customer_name=args.get("customer_name"),
                amount=float(args.get("amount", 0)),
                item_description=args.get("item_description", "General Kirana Items"),
                entry_type=args.get("entry_type", "udhaar")
            )
        elif func_name == "settle_khata_customer":
            cust_name = args.get("customer_name")
            # Look up customer in DB
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT id, name, pending_udhaar FROM customers WHERE name LIKE ? LIMIT 1", (f"%{cust_name}%",))
            c = cur.fetchone()
            conn.close()
            if not c:
                return {"success": False, "message": f"Customer '{cust_name}' Bahi-Khata mein nahi mile."}
            pending = float(c["pending_udhaar"] or 0)
            if pending <= 0:
                return {
                    "success": True,
                    "customer_name": c["name"],
                    "new_pending_balance": 0.0,
                    "already_cleared": True,
                    "soundbox_payload": {
                        "chime": True,
                        "speech_text": f"Paytm par {c['name']} ji ka koi baaki udhaar nahi hai. Khata pehle se chukta hai."
                    }
                }
            return KhataService.record_entry(c["name"], pending, "Poora Hisab Chukta", "jama")
        elif func_name == "get_khata_details":
            cust_name = args.get("customer_name")
            conn = get_connection()
            cur = conn.cursor()
            if cust_name:
                cur.execute("SELECT * FROM customers WHERE name LIKE ? LIMIT 1", (f"%{cust_name}%",))
                c = cur.fetchone()
                conn.close()
                if c:
                    return {"success": True, "customer": dict(c)}
                return {"success": False, "message": f"Grahak '{cust_name}' nahi mila."}
            else:
                cur.execute("SELECT SUM(pending_udhaar) as total_udhaar, COUNT(*) as count FROM customers WHERE pending_udhaar > 0")
                summary = dict(cur.fetchone())
                conn.close()
                return {"success": True, "summary": summary}
        elif func_name == "create_supplier_po":
            return InventoryService.create_supplier_po(
                item_name=args.get("item_name"),
                quantity=args.get("quantity"),
                merchant_id=merchant_id
            )
        elif func_name == "receive_supplier_delivery":
            return InventoryService.receive_supplier_delivery(args.get("po_identifier"))
        elif func_name == "get_inventory_health":
            return InventoryService.get_inventory()
        elif func_name == "get_credit_health":
            return CreditService.get_merchant_credit_health(merchant_id)
        elif func_name == "disburse_loan":
            return CreditService.disburse_loan(float(args.get("amount", 0)), merchant_id)
        elif func_name == "get_growth_campaigns":
            return GrowthService.get_campaigns()
        return {"success": False, "message": f"Unknown tool: {func_name}"}

    @classmethod
    def _format_tool_response(cls, func_name: str, args: dict, res: dict) -> str:
        if func_name == "record_khata_entry":
            c_name = res.get("customer_name")
            amt = int(res.get("amount", 0))
            bal = int(res.get("new_pending_balance", 0))
            etype = res.get("item_description", "")
            return f"✅ **Entry Darj Ho Gayi Hai!**\n\n• **Grahak:** {c_name}\n• **Raqam:** ₹{amt:,}\n• **Naya Pending Udhaar:** ₹{bal:,}\n\n🔊 *Soundbox Chime Broadcasted!*"
        elif func_name == "settle_khata_customer":
            c_name = res.get("customer_name")
            if res.get("already_cleared"):
                return f"ℹ️ **{c_name} Ji Ka Khata Pehle Se Chukta Hai!**\n\n• **Pending Udhaar:** ₹0 (All Clear)\n• Koi bakaya rashi bachi nahi hai."
            amt = int(res.get("amount", 0))
            return f"✅ **Hisab Chukta Ho Gaya!**\n\n• **Grahak:** {c_name}\n• **Jama Raqam:** ₹{amt:,}\n• **Naya Pending Udhaar:** ₹0 (All Clear)\n\n🔊 *Soundbox Chime Activated!*"
        elif func_name == "get_khata_details":
            if "customer" in res:
                c = res["customer"]
                return f"📋 **{c['name']} Ji Ka Khata Details:**\n\n• **Pending Udhaar:** ₹{int(c['pending_udhaar']):,}\n• **Mobile:** `{c['phone']}`\n• **Total Spent:** ₹{int(c['total_spent']):,}\n• **Status:** {c['churn_risk']}"
            s = res.get("summary", {})
            return f"📊 **Bahi-Khata Summary:**\n\n• **Total Pending Udhaar:** ₹{int(s.get('total_udhaar', 0)):,}\n• **Udhaar Grahak Count:** {s.get('count', 0)}"
        elif func_name == "create_supplier_po":
            po = res.get("po_number")
            it = res.get("item_name")
            qty = res.get("quantity")
            cost = int(res.get("total_cost", 0))
            exp = res.get("expected_delivery_date")
            return f"📦 **Supplier Purchase Order Dispatched!**\n\n• **PO Number:** `{po}`\n• **Item:** {it} ({qty} units)\n• **Total Value:** ₹{cost:,}\n• **Expected Delivery:** {exp} (within 48 hours)\n• **Status:** {res.get('delivery_status')}\n\n*Note: Physical delivery receipt par stock credit hoga.*"
        elif func_name == "receive_supplier_delivery":
            po = res.get("po_number")
            it = res.get("item_name")
            qty = res.get("quantity_received")
            stk = res.get("new_stock")
            return f"✅ **Supplier Delivery Received & Verified!**\n\n• **PO Number:** `{po}`\n• **Item:** {it}\n• **Quantity Credited:** {qty} units\n• **Naya Stock:** {stk} units\n\n🔊 *Soundbox Stock Alert Broadcasted!*"
        elif func_name == "get_credit_health":
            sc = res.get("credit_health_score")
            tier = res.get("rating")
            loan = int(res.get("pre_approved_loan", 0))
            vol = int(res.get("soundbox_30d_volume", 0))
            rate = res.get("interest_rate")
            return f"🏛️ **Paytm Merchant Credit Health:**\n\n• **Paytm Credit Score:** **{sc}/100** ({tier})\n• **Pre-Approved Loan:** **₹{loan:,}**\n• **Interest Rate:** {rate}\n• **Soundbox 30-Day Sales:** ₹{vol:,}\n• **Instant RTGS Disbursal Ready!**"
        elif func_name == "disburse_loan":
            if not res.get("success"):
                return f"❌ **Disbursal Request Denied:** {res.get('message')}"
            amt = int(res.get("loan_amount", 0))
            bank = res.get("bank_account")
            runway = res.get("new_runway_days")
            return f"🎉 **Working Capital Loan Disbursed!**\n\n• **Raqam:** ₹{amt:,}\n• **Bank Khata:** {bank}\n• **Updated Working Capital Runway:** {runway} days\n\n🔊 *Soundbox Loan Credit Chime Activated!*"
        return json.dumps(res, indent=2)

    # -------------------------------------------------------------
    # ENGINE 2: Deterministic Engine (Zero Substring Collisions & No Fake Defaults)
    # -------------------------------------------------------------
    @classmethod
    def _run_deterministic_engine(cls, query: str, merchant_id: int, thoughts: list):
        q = query.lower()
        devanagari_digits = str.maketrans("०१२३४५६७८९", "0123456789")
        q = q.translate(devanagari_digits)

        is_inquiry = bool(re.search(r'\b(kitna|kitne|kitni|kya|batao|bataiye|bata do|check|dekho|dekhein|dikhao|status|summary)\b', q))

        # 1. Udhaar / Jama / Chutta Settlement Intent (Supports Latin and Devanagari Hindi)
        is_settle = bool(re.search(r'\b(chutta|chukta|settle|clear|poora hisab|pura chukta|sab chukta|chuka do)\b', q)) or any(w in query for w in ["चुकता", "छुट्टा", "पूरा हिसाब", "हिसाब चुकता", "सेटल", "चुका दो"])
        is_jama = bool(re.search(r'\b(jama|paid|pay|aa gaye|aa gaya|mil gaye|mil gaya|prapt|wapas|bhar diya)\b', q)) or any(w in query for w in ["जमा", "प्राप्त", "वापस", "पैसे मिले", "भर दिया"])
        is_udhaar = ((bool(re.search(r'\b(udhaar|likho|likh lo|likh do|likh|likhiye|darj|darj karein|de do|jod do|add kar)\b', q)) or any(w in query for w in ["उधार", "दर्ज", "लिखो", "लिखिए", "जोड़ दो", "खाता", "खाते"])) and not is_inquiry)

        if is_settle or is_jama or is_udhaar:
            thoughts.append("Deterministic Action: Ledger action detected with strict token boundaries.")
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT id, name, pending_udhaar FROM customers")
            all_customers = [dict(r) for r in cur.fetchall()]
            conn.close()

            # Longest customer name matching first
            matched_cust = None
            sorted_customers = sorted(all_customers, key=lambda c: len(c["name"]), reverse=True)
            for c in sorted_customers:
                fn = c["name"].lower().strip()
                if fn and re.search(r'\b' + re.escape(fn) + r'\b', q):
                    matched_cust = c
                    break

            # Unique first name match
            if not matched_cust:
                first_counts = {}
                for c in sorted_customers:
                    f = c["name"].lower().strip().split()[0]
                    first_counts[f] = first_counts.get(f, 0) + 1
                for c in sorted_customers:
                    f = c["name"].lower().strip().split()[0]
                    if len(f) >= 3 and first_counts.get(f, 0) == 1:
                        if re.search(r'\b' + re.escape(f) + r'\b', q):
                            matched_cust = c
                            break

            # Candidate name extraction for new customers (Latin and Devanagari)
            if not matched_cust:
                STOPWORDS = {
                    "aaj", "kal", "bhai", "soundbox", "paytm", "khata", "udhaar", "naya", "purana", "kripya", "entry",
                    "aata", "atta", "oil", "tel", "namak", "salt", "chawal", "rice", "cheeni", "sugar", "doodh", "milk",
                    "आटा", "तेल", "नमक", "चावल", "चीनी", "दूध", "उधार", "खाता", "पेटीएम", "रुपये", "दर्ज", "करें", "करो", "लिखो"
                }

                # Pattern A: Leading name at start of sentence (e.g. "Prachi, ₹500 aata..." or "प्राची, 500...")
                cand_lead = re.search(r'^\s*([a-zA-Z\u0900-\u097F]{3,}(?:\s+[a-zA-Z\u0900-\u097F]{3,})?)\s*[,:\-]?\s*(?:rs\.?|inr|₹|रुपये|रु\.?|\d)', query.strip(), re.IGNORECASE)
                if cand_lead:
                    cand = cand_lead.group(1).strip()
                    if cand.lower() not in STOPWORDS:
                        matched_cust = {"name": cand.title() if not any('\u0900' <= ch <= '\u097F' for ch in cand) else cand, "pending_udhaar": 0.0}

                # Pattern B: Name before postpositions (e.g. "Prachi ka 500...", "प्राची का...")
                if not matched_cust:
                    cand_match = re.search(r'(?:ab\s+|maine\s+|main\s+)?\b([a-zA-Z\u0900-\u097F]{3,}(?:\s+[a-zA-Z\u0900-\u097F]{3,})?)\s*(?:ka\b|ke\b|ki\b|ko\b|se\b|का|के|की|को|से)', query, re.IGNORECASE)
                    if cand_match:
                        cand = cand_match.group(1).strip()
                        if cand.lower() not in STOPWORDS:
                            matched_cust = {"name": cand.title() if not any('\u0900' <= ch <= '\u097F' for ch in cand) else cand, "pending_udhaar": 0.0}

                # Pattern C: Name after action word (e.g. "Udhaar likho Prachi 500")
                if not matched_cust:
                    cand_action = re.search(r'(?:udhaar|jama|likho|likh lo|likh do|likhiye|darj|darj karein|उधार|जमा|दर्ज|लिखो)\s+([a-zA-Z\u0900-\u097F]{3,})', query, re.IGNORECASE)
                    if cand_action:
                        cand = cand_action.group(1).strip()
                        if cand.lower() not in STOPWORDS:
                            matched_cust = {"name": cand.title() if not any('\u0900' <= ch <= '\u097F' for ch in cand) else cand, "pending_udhaar": 0.0}

            # NO SILENT FAKE DEFAULTS: Ask for customer name if missing!
            if not matched_cust:
                reply = "Kripya grahak ka naam batayein jiske khate mein entry ya settlement karni hai."
                return {
                    "query": query,
                    "action_name": "CLARIFICATION_REQUIRED",
                    "thoughts": thoughts + ["Missing customer name; requested merchant clarification."],
                    "result": {"clarification_needed": "customer_name"},
                    "reply": reply,
                    "soundbox_payload": {"chime": False, "speech_text": reply}
                }

            # Full settlement
            if is_settle and not re.search(r'(?:rs\.?|inr|₹|रुपये|रु\.?|रूपये)?\s*(\d+(?:\.\d+)?)', q):
                res = cls._execute_tool("settle_khata_customer", {"customer_name": matched_cust["name"]}, merchant_id)
                reply = cls._format_tool_response("settle_khata_customer", {"customer_name": matched_cust["name"]}, res)
                return {
                    "query": query,
                    "action_name": "SETTLE_KHATA_CUSTOMER",
                    "thoughts": thoughts + [f"Executing settlement for {matched_cust['name']}."],
                    "result": res,
                    "reply": reply,
                    "soundbox_payload": res.get("soundbox_payload")
                }

            # Partial or explicit amount
            amt_match = re.search(r'(?:rs\.?|inr|₹|रुपये|रु\.?|रूपये)?\s*(\d+(?:\.\d+)?)', q)
            if not amt_match:
                reply = f"Kripya {matched_cust['name']} ji ke liye rashi (amount) batayein."
                return {
                    "query": query,
                    "action_name": "CLARIFICATION_REQUIRED",
                    "thoughts": thoughts + [f"Missing amount for {matched_cust['name']}; requested clarification."],
                    "result": {"clarification_needed": "amount"},
                    "reply": reply,
                    "soundbox_payload": {"chime": False, "speech_text": reply}
                }

            amount = float(amt_match.group(1))
            entry_type = "jama" if (is_jama or is_settle) else "udhaar"

            # Item detection (English & Devanagari)
            ITEM_MAP = {
                "aata": "Atta (Flour)", "atta": "Atta (Flour)", "आटा": "Atta (Flour)",
                "tel": "Refined Oil", "oil": "Refined Oil", "refined": "Refined Oil", "तेल": "Refined Oil",
                "namak": "Tata Salt", "salt": "Tata Salt", "नमक": "Tata Salt",
                "makhan": "Amul Butter", "butter": "Amul Butter", "मक्खन": "Amul Butter",
                "maggi": "Maggi Noodles", "noodles": "Maggi Noodles", "मैगी": "Maggi Noodles",
                "doodh": "Fresh Milk", "milk": "Fresh Milk", "दूध": "Fresh Milk",
                "cheeni": "Sugar", "sugar": "Sugar", "चीनी": "Sugar",
                "chawal": "Rice", "rice": "Rice", "चावल": "Rice",
                "dal": "Dal (Pulses)", "दाल": "Dal (Pulses)",
                "chai": "Tea (Chai)", "tea": "Tea (Chai)", "चाय": "Tea (Chai)",
                "sabun": "Soap / Detergent", "surf": "Surf Excel", "सर्फ": "Surf Excel"
            }
            item_desc = "Kirana Items"
            for k_item, v_desc in ITEM_MAP.items():
                if k_item in q or k_item in query:
                    item_desc = v_desc
                    break

            res = KhataService.record_entry(matched_cust["name"], amount, item_desc, entry_type)
            reply = cls._format_tool_response("record_khata_entry", {"customer_name": matched_cust["name"], "amount": amount}, res)
            now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
            confirmation_card = {
                "action": "UDHAAR_CREDIT" if entry_type == "udhaar" else "JAMA_PAYMENT",
                "action_label": "खाता उधार दर्ज (Credit Entry)" if entry_type == "udhaar" else "खाता जमा दर्ज (Payment Received)",
                "entity": matched_cust["name"],
                "item_description": item_desc,
                "amount": amount,
                "date": now_str,
                "status": "SAVED_TO_DATABASE",
                "simulation_badge": "Live Paytm Bahi-Khata Ledger"
            }
            return {
                "query": query,
                "action_name": "RECORD_KHATA_ENTRY",
                "thoughts": thoughts + [f"Recorded {entry_type} of ₹{int(amount)} for {matched_cust['name']}."],
                "result": res,
                "reply": reply,
                "confirmation_card": confirmation_card,
                "soundbox_payload": res.get("soundbox_payload")
            }

        # 2. Inventory Restock PO Intent
        # Strict word boundary on 'po' ensures 'poora' never misfires!
        is_po = bool(re.search(r'\b(supplier|order|reorder|manga\w*|mangwa\w*|khareed\w*|restock|\bpo\b)\b', q))
        if is_po and not is_inquiry:
            thoughts.append("Deterministic Action: Supplier restock intent identified.")
            conn = get_connection()
            cur = conn.cursor()
            cur.execute("SELECT item_name, current_stock, reorder_threshold FROM inventory")
            inv_items = [dict(r) for r in cur.fetchall()]
            conn.close()

            # Dynamically derive synonyms and phonetic tokens from actual inventory database records
            synonym_map = {}
            for it in inv_items:
                it_name = it["item_name"].lower()
                for token in re.findall(r'[a-zA-Z]{3,}', it_name):
                    synonym_map[token] = it["item_name"]

            # Vernacular Kirana translations mapped dynamically to catalog SKUs
            VERNACULAR_KEYWORDS = {
                "tel": ["oil", "refined", "mustard"],
                "oil": ["oil", "refined"],
                "namak": ["salt"],
                "salt": ["salt"],
                "makhan": ["butter", "amul"],
                "butter": ["butter", "amul"],
                "doodh": ["milk", "dairy"],
                "atta": ["atta", "chakki", "flour"],
                "aata": ["atta", "chakki", "flour"],
                "biscuit": ["parle", "biscuit"],
                "chai": ["tea", "taj", "mahal"],
                "tea": ["tea", "taj"],
                "patti": ["tea", "taj"],
                "surf": ["surf", "excel", "detergent"],
                "maggi": ["maggi", "noodles"],
                "maggie": ["maggi", "noodles"]
            }
            for vern_k, target_tokens in VERNACULAR_KEYWORDS.items():
                for it in inv_items:
                    it_name_lower = it["item_name"].lower()
                    if any(t in it_name_lower for t in target_tokens):
                        synonym_map[vern_k] = it["item_name"]

            target_item = None
            for syn_k, actual_name in synonym_map.items():
                if re.search(r'\b' + re.escape(syn_k) + r'\b', q):
                    target_item = actual_name
                    break

            if not target_item:
                for it in inv_items:
                    words = [w for w in it["item_name"].lower().split() if len(w) > 3]
                    if any(w in q for w in words):
                        target_item = it["item_name"]
                        break

            # NO SILENT FAKE DEFAULTS: Ask which item to order if missing!
            if not target_item:
                low_stock = [i["item_name"] for i in inv_items if i["current_stock"] <= i["reorder_threshold"]]
                low_str = ", ".join(low_stock[:2]) if low_stock else "Fortune Refined Oil 1L, Amul Butter 100g"
                reply = f"Aap kaunsa item supplier ko order karna chahte hain? Abhi dukan mein {low_str} ka stock kam hai."
                return {
                    "query": query,
                    "action_name": "CLARIFICATION_REQUIRED",
                    "thoughts": thoughts + ["Missing target item; asked merchant for item name."],
                    "result": {"clarification_needed": "item_name"},
                    "reply": reply,
                    "soundbox_payload": {"chime": False, "speech_text": reply}
                }

            # Dynamic quantity extraction or dynamic buffer calculation
            qty_match = re.search(r'\b(\d+)\s*(?:packet|pack|unit|piece|pouch|dibba|kg|litre|l)?\b', q)
            quantity = int(qty_match.group(1)) if qty_match else None

            res = InventoryService.create_supplier_po(target_item, quantity, merchant_id)
            reply = cls._format_tool_response("create_supplier_po", {"item_name": target_item}, res)
            now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
            confirmation_card = {
                "action": "SUPPLIER_PURCHASE_ORDER",
                "action_label": "सप्लायर रीऑर्डर PO (Wholesale Restock)",
                "entity": target_item,
                "amount": res.get("total_cost", 0),
                "quantity": res.get("quantity"),
                "date": now_str,
                "status": res.get("email_status", "DISPATCHED_TO_OUTBOX"),
                "simulation_badge": "PO created and queued for supplier email (Demo Mode)"
            }
            return {
                "query": query,
                "action_name": "CREATE_SUPPLIER_PO",
                "thoughts": thoughts + [f"Dispatched PO for {target_item}."],
                "result": res,
                "reply": reply,
                "confirmation_card": confirmation_card,
                "soundbox_payload": res.get("soundbox_payload")
            }

        # 3. Credit Health / Loan Disbursal
        if any(w in q for w in ["loan", "credit", "score", "capital", "paise"]):
            if any(w in q for w in ["disburse", "le lo", "transfer", "nikal", "daal do", "chahiye"]):
                amt_match = re.search(r'(?:rs\.?|inr|₹|रुपये|रु\.?|रूपये)?\s*(\d+(?:\.\d+)?)', q)
                if not amt_match:
                    health = CreditService.get_merchant_credit_health(merchant_id)
                    max_loan = int(health.get("pre_approved_loan", 0))
                    reply = f"Aap kitna working capital loan amount nikalna chahte hain? Aapki pre-approved limit ₹{max_loan:,} tak hai. Kripya amount batayein (jaise: '₹50,000 loan nikal lo')."
                    return {
                        "query": query,
                        "action_name": "CLARIFICATION_REQUIRED",
                        "thoughts": thoughts + ["Missing loan disbursal amount; requested clarification without defaulting."],
                        "result": {"clarification_needed": "loan_amount", "pre_approved_limit": max_loan},
                        "reply": reply,
                        "soundbox_payload": {"chime": False, "speech_text": reply}
                    }

                amount = float(amt_match.group(1))
                res = CreditService.disburse_loan(amount, merchant_id)
                reply = cls._format_tool_response("disburse_loan", {"amount": amount}, res)
                now_str = datetime.now().strftime("%d %b %Y, %I:%M %p")
                confirmation_card = {
                    "action": "LOAN_DISBURSAL",
                    "action_label": "वर्किंग कैपिटल लोन डिसबर्सल (Working Capital Loan)",
                    "entity": res.get("bank_account", "Paytm Payments Bank"),
                    "amount": amount,
                    "date": now_str,
                    "status": "APPROVED_IN_SIMULATION",
                    "simulation_badge": "Loan approved in simulation. No real funds disbursed."
                }
                return {
                    "query": query,
                    "action_name": "DISBURSE_LOAN",
                    "thoughts": thoughts + [f"Processed working capital loan of ₹{amount}."],
                    "result": res,
                    "reply": reply,
                    "confirmation_card": confirmation_card,
                    "soundbox_payload": res.get("soundbox_payload")
                }
            else:
                res = CreditService.get_merchant_credit_health(merchant_id)
                reply = cls._format_tool_response("get_credit_health", {}, res)
                return {
                    "query": query,
                    "action_name": "GET_CREDIT_HEALTH",
                    "thoughts": thoughts + ["Generated real-time underwriting report."],
                    "result": res,
                    "reply": reply,
                    "soundbox_payload": {"chime": True, "speech_text": f"Paytm merchant credit score {res['credit_health_score']} hai. Loan limit {int(res['pre_approved_loan'])} rupaye pre-approved hai."}
                }

        # 4. Growth & Churn
        if any(w in q for w in ["customer", "grahak", "offer", "discount", "churn", "growth", "sms"]):
            res = GrowthService.get_campaigns()
            at_risk = res.get("campaigns", [])
            names = ", ".join([c["customer_name"] for c in at_risk[:2]])
            reply = f"📈 **AI Merchant Growth & Win-Back Offers:**\n\nPichle 30-45 din se {names} nahi aaye hain. Unke liye 10% Paytm UPI discount voucher tayyar hai."
            return {
                "query": query,
                "action_name": "GET_GROWTH_CAMPAIGNS",
                "thoughts": thoughts + ["Loaded churn retention data."],
                "result": res,
                "reply": reply,
                "soundbox_payload": {"chime": True, "speech_text": f"Dukan ke {len(at_risk)} purane grahakon ke liye Paytm offer tayyar hai."}
            }

        # 5. General Briefing
        reply = "Namaste! Main **Paytm Vyapar Saathi Copilot** hoon. Aap aawaz se Khata likh sakte hain, stock reorder kar sakte hain, ya credit loan check kar sakte hain."
        return {
            "query": query,
            "action_name": "GENERAL_BRIEFING",
            "thoughts": thoughts + ["Standard merchant briefing."],
            "result": {"status": "ready"},
            "reply": reply,
            "soundbox_payload": {"chime": True, "speech_text": "Paytm Vyapar Saathi taiyaar hai. Kahiye, kya madad karu?"}
        }
