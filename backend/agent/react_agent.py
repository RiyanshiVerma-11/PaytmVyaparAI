import re
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService

class ReactAgent:
    @staticmethod
    def process_query(query: str):
        q = query.lower().strip()
        thoughts = []
        action_name = None
        result_payload = None

        # 1. Udhaar / Ledger Intent
        if any(w in q for w in ["udhaar", "diya", "likho", "likh lo", "khata", "jama", "baaki", "chutta", "chukta", "settle", "clear", "छुट्टा", "चुकता"]):
            thoughts.append(f"🧠 Thought: Query implies ledger transaction on customer account.")

            # Dynamic customer name extraction from DB (Longest full-name first, then unique first-name)
            customer = None
            cust_pending = 0.0
            try:
                from database import get_connection
                _conn = get_connection()
                _cur = _conn.cursor()
                _cur.execute("SELECT id, name, pending_udhaar FROM customers")
                _all = [dict(r) for r in _cur.fetchall()]
                _conn.close()

                # 1. Match full name first (sorted descending by length)
                _sorted = sorted(_all, key=lambda c: len(c["name"]), reverse=True)
                for _c in _sorted:
                    _fn = _c["name"].lower().strip()
                    if _fn and re.search(r'(?<![a-zA-Z0-9])' + re.escape(_fn) + r'(?![a-zA-Z0-9])', q):
                        customer = _c["name"]
                        cust_pending = float(_c.get("pending_udhaar", 0) or 0)
                        break

                # 2. Match unique first name
                if not customer:
                    _first_counts = {}
                    for _c in _sorted:
                        _f = _c["name"].lower().strip().split()[0]
                        _first_counts[_f] = _first_counts.get(_f, 0) + 1
                    for _c in _sorted:
                        _f = _c["name"].lower().strip().split()[0]
                        if len(_f) >= 3 and _first_counts.get(_f, 0) == 1:
                            if re.search(r'(?<![a-zA-Z0-9])' + re.escape(_f) + r'(?![a-zA-Z0-9])', q):
                                customer = _c["name"]
                                cust_pending = float(_c.get("pending_udhaar", 0) or 0)
                                break
            except Exception:
                pass

            if not customer:
                customer = "Valued Customer"

            # Amount extraction
            amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)', q)
            if amt_match:
                amount = float(amt_match.group(1))
            elif any(w in q for w in ["chutta", "chukta", "settle", "clear", "hisab", "pura", "poora", "छुट्टा", "चुकता"]):
                amount = cust_pending if cust_pending > 0 else 250.0
            else:
                amount = 450.0

            # Item extraction
            item = "Kirana Items"
            for it in ["refine tel", "butter", "maggi", "oil", "salt", "atta", "tea", "doodh"]:
                if it in q:
                    item = it.title()
                    break

            is_jama = any(w in q for w in [
                "jama", "chutta", "chukta", "settle", "clear", "wapas", "prapt", "mil gaye", "mil gaya",
                "aa gaye", "aa gaya", "paid", "pay", "diye", "de diya", "छुट्टा", "चुकता"
            ])
            entry_type = "jama" if is_jama else "udhaar"
            thoughts.append(f"🛠️ Action: Calling KhataService.record_entry(customer='{customer}', amount={amount}, item='{item}', type='{entry_type}')")
            result_payload = KhataService.record_entry(customer, amount, item, entry_type)
            action_name = "RECORD_KHATA_ENTRY"

        # 2. Inventory / Stock Reorder Intent
        elif any(w in q for w in ["stock", "khatam", "kitna bacha", "supplier", "order", "reorder", "po"]):
            thoughts.append("🧠 Thought: User requested stock status check and supplier reorder.")
            item = "Amul Butter 100g"
            for it in ["butter", "oil", "maggi", "salt", "atta", "tea"]:
                if it in q:
                    item = it
                    break

            thoughts.append(f"🛠️ Action: Calling InventoryService.create_supplier_po(item='{item}', quantity=15)")
            result_payload = InventoryService.create_supplier_po(item, 15)
            action_name = "SUPPLIER_EMAIL_PO"

        # 3. Growth & Churn Offers Intent
        elif any(w in q for w in ["grahak", "customer", "offer", "discount", "churn", "growth", "sms"]):
            thoughts.append("🧠 Thought: User triggered Merchant Growth AI for customer win-back.")
            thoughts.append("🛠️ Action: Calling GrowthService.get_campaigns()")
            result_payload = GrowthService.get_campaigns()
            action_name = "GROWTH_CAMPAIGN"

        # 4. Credit Health / Loan Intent
        elif any(w in q for w in ["loan", "credit", "score", "capital", "paise"]):
            thoughts.append("🧠 Thought: User requested real-time Paytm Credit Health & Loan Eligibility.")
            thoughts.append("🛠️ Action: Calling CreditService.get_merchant_credit_health()")
            result_payload = CreditService.get_merchant_credit_health()
            action_name = "CREDIT_HEALTH"

        # 5. Default General Response
        else:
            thoughts.append("🧠 Thought: Query is general greeting or briefing request.")
            action_name = "GENERAL_BRIEFING"
            result_payload = {
                "message": "Paytm Vyapar Saathi is ready. Speak in Hindi or Hinglish to record Udhaar, manage stock, or check your loan score.",
                "soundbox_payload": {
                    "chime": True,
                    "speech_text": "Paytm Vyapar Saathi taiyaar hai. Kahiye, kya madad karu?"
                }
            }

        return {
            "query": query,
            "action_name": action_name,
            "thoughts": thoughts,
            "result": result_payload
        }
