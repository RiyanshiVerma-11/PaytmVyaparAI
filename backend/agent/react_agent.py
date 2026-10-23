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
        if any(w in q for w in ["udhaar", "diya", "likho", "likh lo", "khata", "jama", "baaki"]):
            thoughts.append(f"🧠 Thought: Query implies ledger transaction on customer account.")
            
            # Amount extraction
            amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+)', q)
            amount = float(amt_match.group(1)) if amt_match else 450.0

            # Customer name extraction
            customer = "Ramesh Kumar"
            for n in ["ramesh", "pooja", "manoj", "ananya", "rajesh", "sunil", "sharma", "gupta", "verma"]:
                if n in q:
                    customer = n.title()
                    break

            # Item extraction
            item = "1L Refined Oil"
            for it in ["refine tel", "butter", "maggi", "oil", "salt", "atta", "tea"]:
                if it in q:
                    item = it.title()
                    break

            entry_type = "jama" if "jama" in q else "udhaar"
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
