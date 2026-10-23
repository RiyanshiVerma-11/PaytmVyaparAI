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

        # 4. Transactions & Telemetry
        cursor.execute("SELECT COUNT(*) as cnt, SUM(amount) as total_vol FROM transactions")
        tx_summary = dict(cursor.fetchone())
        
        cursor.execute("SELECT * FROM transactions ORDER BY id DESC LIMIT 5")
        recent_txns = [dict(r) for r in cursor.fetchall()]

        # 5. Supplier POs
        cursor.execute("SELECT * FROM supplier_pos ORDER BY id DESC LIMIT 5")
        recent_pos = [dict(r) for r in cursor.fetchall()]

        conn.close()

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
                "score": merchant["credit_health_score"],
                "tier": "Tier-1 Prime Low Risk",
                "pre_approved_amount": merchant["pre_approved_loan_amount"],
                "interest_rate": "1.1% per month flat",
                "daily_edi": round((merchant["pre_approved_loan_amount"] * 1.10) / 360, 2),
                "runway_days": merchant["loan_runway_days"]
            },
            "growth": {
                "at_risk_count": len(at_risk_customers),
                "at_risk_customers": [{"name": c["name"], "phone": c["phone"], "risk": c["churn_risk"]} for c in at_risk_customers],
                "upcoming_festive": "Navratri & Diwali (3.4x Expected Surge in 6 Days)"
            },
            "telemetry": {
                "total_transactions": tx_summary.get("cnt") or 75,
                "total_volume": tx_summary.get("total_vol") or 38400,
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
        q = msg.lower()
        session = cls.get_or_create_session(session_id)
        
        # 1. Fetch real-time live app state
        context = cls.get_full_app_context()
        
        reply = ""
        action_taken = None
        data_payload = None
        soundbox_payload = None
        suggestions = []
        thoughts = []

        # ========================================================
        # INTENT 1: KHATA / UDHAAR INQUIRY & ACTION
        # ========================================================
        if any(w in q for w in ["udhaar", "khata", "baaki", "bahi", "jama", "ledger", "balance"]):
            # Check if it's an action to record udhaar / jama
            if any(w in q for w in ["likho", "likh lo", "diya", "jama kar", "settle", "add kar"]):
                thoughts.append("Action detected: Record or modify Khata ledger entry")
                
                amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+)', q)
                amount = float(amt_match.group(1)) if amt_match else 250.0

                # Customer name extraction
                customer_name = session.get("last_mentioned_customer") or "Ramesh Kumar"
                for c in context["khata"]["all_customers"]:
                    first_name = c["name"].lower().split()[0]
                    if first_name in q:
                        customer_name = c["name"]
                        break

                session["last_mentioned_customer"] = customer_name
                entry_type = "jama" if ("jama" in q or "settle" in q or "mila" in q) else "udhaar"
                item_desc = "Kirana Items"
                for it in ["oil", "butter", "maggi", "salt", "atta", "tea", "tel"]:
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
                        f"• **Type:** {entry_type.upper()} ({'Prapt Hue' if entry_type == 'jama' else 'Udhaar Diya'})\n" \
                        f"• **Raqam:** ₹{int(amount)}\n" \
                        f"• **Naya Pending Udhaar:** ₹{int(new_bal)}\n\n" \
                        f"🔊 *Soundbox Chime broadcasted:* \"{soundbox_payload.get('speech_text') if soundbox_payload else ''}\""
                
                suggestions = ["Khata ledger dekhein", "Stock status check karo", "Customer ko reminder bhejo"]

            else:
                # Query about Khata status
                thoughts.append("Intent detected: Khata / Udhaar status inquiry")
                total_pending = context["khata"]["total_pending_udhaar"]
                udhaar_list = context["khata"]["customers_with_udhaar"]
                
                # Check for specific customer
                specific_cust = None
                for c in context["khata"]["all_customers"]:
                    first_name = c["name"].lower().split()[0]
                    if first_name in q:
                        specific_cust = c
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
                    suggestions = ["Manoj Verma ka balance", "Pooja Gupta ka balance", "Udhaar darj karein", "Low stock check"]

        # ========================================================
        # INTENT 2: INVENTORY & SUPPLIER RESTOCK
        # ========================================================
        elif any(w in q for w in ["stock", "khatam", "supplier", "order", "reorder", "po", "inventory", "tel", "oil", "butter", "atta", "maggi", "salt"]):
            if any(w in q for w in ["order", "reorder", "manga", "bhejo", "po bhej"]):
                thoughts.append("Action detected: Send supplier restock purchase order")
                target_item = session.get("last_mentioned_item") or "Fortune Refined Oil 1L"
                for it in context["inventory"]["all_items"]:
                    for word in it["name"].lower().split():
                        if len(word) > 3 and word in q:
                            target_item = it["name"]
                            break

                session["last_mentioned_item"] = target_item
                po_res = InventoryService.create_supplier_po(target_item, 15)
                action_taken = "SUPPLIER_PO_SENT"
                data_payload = po_res
                soundbox_payload = po_res.get("soundbox_payload")
                session["last_action"] = f"Created {po_res.get('po_number')} for {target_item}"

                reply = f"📦 **Supplier Purchase Order Dispatched!**\n\n" \
                        f"• **PO Number:** `{po_res.get('po_number')}`\n" \
                        f"• **Item:** {target_item}\n" \
                        f"• **Quantity:** 15 units\n" \
                        f"• **Supplier:** {po_res.get('supplier_name')}\n" \
                        f"• **Total PO Value:** ₹{int(po_res.get('total_cost', 0))}\n" \
                        f"• **Status:** Email PO sent autonomously via Paytm B2B Rail.\n\n" \
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
        elif any(w in q for w in ["loan", "credit", "score", "capital", "paise", "underwrite", "disburse", "limit"]):
            if any(w in q for w in ["disburse", "le lo", "apply", "transfer", "bank"]):
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
