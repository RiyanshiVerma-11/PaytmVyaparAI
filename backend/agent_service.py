import re
import os
import json
from datetime import datetime, timedelta
from database import get_connection

class VyaparAgentService:
    def __init__(self):
        pass

    # ----------------------------------------------------
    # TOOL 1: Record Khata Entry (Udhaar / Jama)
    # ----------------------------------------------------
    def record_khata_entry(self, customer_name, amount, item_description="General Items", entry_type="udhaar", phone=None):
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Resolve or Create Customer
        cursor.execute("SELECT * FROM customers WHERE name LIKE ?", (f"%{customer_name}%",))
        customer = cursor.fetchone()

        if customer:
            cust_id = customer["id"]
            cust_name = customer["name"]
            cust_phone = customer["phone"]
            curr_pending = customer["pending_udhaar"]
        else:
            cust_name = customer_name.title()
            cust_phone = phone or "+91 9810000000"
            cursor.execute("""
            INSERT INTO customers (name, phone, pending_udhaar, last_visit_date, visit_count, churn_risk)
            VALUES (?, ?, 0, date('now'), 1, 'Normal')
            """, (cust_name, cust_phone))
            cust_id = cursor.lastrowid
            curr_pending = 0

        amount = float(amount)
        if entry_type.lower() == "udhaar":
            new_pending = curr_pending + amount
        else:
            new_pending = max(0.0, curr_pending - amount)

        # 2. Update Customer Balance
        cursor.execute("""
        UPDATE customers 
        SET pending_udhaar = ?, last_visit_date = date('now'), visit_count = visit_count + 1
        WHERE id = ?
        """, (new_pending, cust_id))

        # 3. Insert Khata Entry
        cursor.execute("""
        INSERT INTO khata_entries (customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES (?, ?, ?, ?, ?, datetime('now'), 'pending')
        """, (cust_id, cust_name, amount, item_description, entry_type.lower()))

        # 4. Auto-Decrement Stock if item is mentioned
        stock_decremented = None
        for item_keyword in ["butter", "oil", "tel", "maggi", "salt", "namak", "atta", "tea", "chai"]:
            if item_keyword in item_description.lower():
                cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ?", (f"%{item_keyword}%",))
                inv_item = cursor.fetchone()
                if inv_item:
                    new_stock = max(0, inv_item["current_stock"] - 1)
                    cursor.execute("UPDATE inventory SET current_stock = ? WHERE id = ?", (new_stock, inv_item["id"]))
                    stock_decremented = f"{inv_item['item_name']} (Remaining: {new_stock} {inv_item['unit']})"
                break

        conn.commit()
        conn.close()

        # Build Hindi Number text for Soundbox
        hindi_numbers = {
            100: "ek sau", 150: "ek sau pachaas", 200: "do sau", 250: "dhai sau",
            300: "teen sau", 350: "saadhe teen sau", 400: "char sau", 450: "char sau pachaas",
            500: "paanch sau", 800: "aath sau", 1000: "ek hazaar", 1200: "baarah sau"
        }
        amount_int = int(amount)
        amt_spoken = hindi_numbers.get(amount_int, f"{amount_int}")

        if entry_type.lower() == "udhaar":
            speech_text = f"Paytm par {cust_name} ji ka {amt_spoken} rupaye udhaar darj ho gaya."
        else:
            speech_text = f"Paytm par {cust_name} ji se {amt_spoken} rupaye prapt hue."

        # Native 1-Tap SMS URI
        merchant_upi = "paytm@sharmakirana"
        sms_msg = f"Namaste {cust_name} ji, Sharma Kirana se aapka Rs.{int(amount)} ka {entry_type} bill darj hua. Kul baaki: Rs.{int(new_pending)}. Pay directly via Paytm UPI: upi://pay?pa={merchant_upi}&am={int(new_pending)}"
        sms_uri = f"sms:{cust_phone}?body={sms_msg.replace(' ', '%20')}"

        return {
            "success": True,
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "amount": amount,
            "new_pending_balance": new_pending,
            "item_description": item_description,
            "stock_decremented": stock_decremented,
            "sms_uri": sms_uri,
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount,
                "entry_type": entry_type
            }
        }

    # ----------------------------------------------------
    # TOOL 2: Check & Update Inventory
    # ----------------------------------------------------
    def get_inventory_status(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory ORDER BY current_stock ASC")
        items = [dict(row) for row in cursor.fetchall()]
        conn.close()

        low_stock_items = [i for i in items if i["current_stock"] <= i["reorder_threshold"]]
        return {
            "all_items": items,
            "low_stock_items": low_stock_items,
            "low_stock_count": len(low_stock_items)
        }

    # ----------------------------------------------------
    # TOOL 3: Send Supplier Email Purchase Order (PO)
    # ----------------------------------------------------
    def send_supplier_po_email(self, item_name, quantity=10):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ?", (f"%{item_name}%",))
        item = cursor.fetchone()

        if not item:
            conn.close()
            return {"success": False, "message": f"Item '{item_name}' not found in inventory."}

        po_number = f"PO-PAYTM-{int(datetime.now().timestamp()) % 100000}"
        total_cost = item["wholesale_price"] * quantity

        cursor.execute("""
        INSERT INTO supplier_pos (po_number, supplier_name, supplier_email, item_name, quantity, total_cost, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Sent_via_Email', datetime('now'))
        """, (po_number, item["supplier_name"], item["supplier_email"], item["item_name"], quantity, total_cost))

        # Restock inventory item
        cursor.execute("""
        UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?
        """, (quantity, item["id"]))

        conn.commit()
        conn.close()

        email_preview = {
            "to": item["supplier_email"],
            "subject": f"URGENT RESTOCK ORDER: {po_number} - Sharma Kirana, Chandni Chowk",
            "body": f"Dear {item['supplier_name']},\n\nPlease dispatch {quantity} units of {item['item_name']} at wholesale rate Rs.{item['wholesale_price']}/unit.\nTotal PO Value: Rs.{total_cost}\nDelivery Location: Shop #14, Main Market, Chandni Chowk, Delhi.\nBilled via: Paytm Merchant B2B Procurement Rail."
        }

        return {
            "success": True,
            "po_number": po_number,
            "item_name": item["item_name"],
            "quantity_ordered": quantity,
            "supplier_name": item["supplier_name"],
            "supplier_email": item["supplier_email"],
            "total_cost": total_cost,
            "email_preview": email_preview,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm supplier restock order bhej diya gaya hai. {quantity} packet {item['item_name']} dispatch ho rahe hain."
            }
        }

    # ----------------------------------------------------
    # TOOL 4: Detect Customer Churn & Draft Win-Back SMS
    # ----------------------------------------------------
    def get_growth_campaigns(self):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers ORDER BY last_visit_date ASC")
        customers = [dict(row) for row in cursor.fetchall()]
        conn.close()

        campaigns = []
        for c in customers:
            if c["churn_risk"] in ["At-Risk", "Dormant"]:
                discount = 20 if c["churn_risk"] == "At-Risk" else 40
                sms_body = f"Namaste {c['name']} ji! Sharma Kirana me aapka swagat hai. Aaj visit karein aur paayein Flat Rs.{discount} OFF on pure grocery bill. Use code: PAYTMVYAPAR"
                sms_uri = f"sms:{c['phone']}?body={sms_body.replace(' ', '%20')}"
                campaigns.append({
                    "customer_name": c["name"],
                    "phone": c["phone"],
                    "churn_risk": c["churn_risk"],
                    "last_visit": c["last_visit_date"],
                    "suggested_discount": f"₹{discount} OFF",
                    "sms_uri": sms_uri,
                    "sms_preview": sms_body
                })

        return {
            "total_at_risk": len(campaigns),
            "campaigns": campaigns,
            "festive_alert": {
                "festival": "Navratri & Diwali Surge",
                "days_left": 6,
                "surge_multiplier": "3.4x",
                "high_demand_items": ["Fortune Refined Oil", "Aashirvaad Atta", "Taj Mahal Tea", "Dry Fruits Pack"],
                "recommendation": "Stock 25% higher inventory to prevent festive stockout losses."
            }
        }

    # ----------------------------------------------------
    # TOOL 5: Pre-Approved Credit Health & Working Capital
    # ----------------------------------------------------
    def get_credit_health(self):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM merchants LIMIT 1")
        merchant = dict(cursor.fetchone())

        cursor.execute("SELECT SUM(amount) as total_upi, COUNT(*) as count FROM transactions")
        tx_stats = dict(cursor.fetchone())

        cursor.execute("SELECT SUM(pending_udhaar) as total_udhaar FROM customers")
        udhaar_stats = dict(cursor.fetchone())

        conn.close()

        score = merchant["credit_health_score"]
        pre_approved = merchant["pre_approved_loan_amount"]

        return {
            "credit_health_score": score,
            "rating": "Excellent (Tier-1 Low Risk)",
            "pre_approved_loan": pre_approved,
            "tenure_months": 12,
            "daily_emi_deduction": round((pre_approved * 1.10) / (12 * 30), 2),
            "interest_rate": "1.1% per month flat",
            "working_capital_runway": f"{merchant['loan_runway_days']} Days",
            "soundbox_30d_volume": round(tx_stats["total_upi"] or 34800, 2),
            "total_receivables_pending": round(udhaar_stats["total_udhaar"] or 3100, 2),
            "instant_disbursement_ready": True
        }

    # ----------------------------------------------------
    # Autonomous ReAct Agent Loop: Natural Language Reasoner
    # ----------------------------------------------------
    def process_query(self, query):
        q = query.lower().strip()
        thoughts = []
        action_taken = None
        tool_result = None

        # Scenario 1: Udhaar / Khata Entry
        # e.g., "Ramesh bhai ko ₹450 ka refine tel udhaar diya, note karlo"
        if any(w in q for w in ["udhaar", "diya", "likho", "likh lo", "khata", "jama", "baaki"]):
            thoughts.append(f"Intent recognized: LEDGER_ACTION (Query: '{query}')")
            
            # Extract Amount
            amt_match = re.search(r'(?:rs\.?|inr|₹)?\s*(\d+)', q)
            amount = float(amt_match.group(1)) if amt_match else 250.0

            # Extract Customer Name dynamically from DB
            name = None
            try:
                from database import get_connection
                _conn = get_connection()
                _cur = _conn.cursor()
                _cur.execute("SELECT name FROM customers")
                for _row in _cur.fetchall():
                    _cname = _row["name"]
                    parts = [_cname.lower()] + [p.lower() for p in _cname.split() if len(p) > 2]
                    if any(p in q for p in parts):
                        name = _cname
                        break
                _conn.close()
            except Exception:
                pass
            if not name:
                name = "Valued Customer"

            # Extract Item
            item_desc = "Kirana Items"
            for item in ["refine tel", "butter", "maggi", "oil", "salt", "atta", "tea", "doodh", "milk"]:
                if item in q:
                    item_desc = item.title()
                    break

            entry_type = "jama" if "jama" in q else "udhaar"

            thoughts.append(f"Executing Tool: record_khata_entry(customer='{name}', amount={amount}, item='{item_desc}', type='{entry_type}')")
            tool_result = self.record_khata_entry(name, amount, item_desc, entry_type)
            action_taken = "RECORD_KHATA_ENTRY"

        # Scenario 2: Stock Check & Supplier PO
        # e.g., "Amul butter kitna bacha hai aur restock kar do"
        elif any(w in q for w in ["stock", "khatam", "kitna bacha", "supplier", "order", "reorder", "po"]):
            thoughts.append(f"Intent recognized: INVENTORY_REORDER_ACTION (Query: '{query}')")
            item = "Amul Butter 100g"
            for it in ["butter", "oil", "maggi", "salt", "atta", "tea"]:
                if it in q:
                    item = it
                    break

            thoughts.append(f"Executing Tool: send_supplier_po_email(item='{item}', quantity=15)")
            tool_result = self.send_supplier_po_email(item, 15)
            action_taken = "SEND_SUPPLIER_EMAIL_PO"

        # Scenario 3: Customer Churn / Growth Offers
        # e.g., "Puraane grahak ko discount offer bhejo"
        elif any(w in q for w in ["grahak", "customer", "offer", "discount", "churn", "growth", "sms"]):
            thoughts.append(f"Intent recognized: MERCHANT_GROWTH_AI (Query: '{query}')")
            thoughts.append("Executing Tool: get_growth_campaigns()")
            tool_result = self.get_growth_campaigns()
            action_taken = "CUSTOMER_GROWTH_CAMPAIGN"

        # Scenario 4: Loan / Credit Health Check
        # e.g., "Mera credit score aur loan eligibility kya hai"
        elif any(w in q for w in ["loan", "credit", "score", "capital", "paise"]):
            thoughts.append(f"Intent recognized: CREDIT_HEALTH_SCORING (Query: '{query}')")
            thoughts.append("Executing Tool: get_credit_health()")
            tool_result = self.get_credit_health()
            action_taken = "CALCULATE_CREDIT_HEALTH"

        # Scenario 5: Default General Pulse
        else:
            thoughts.append(f"Intent recognized: BUSINESS_PULSE_REPORT")
            tool_result = {
                "message": "Paytm Vyapar Saathi active. Aap aawaz se Udhaar likh sakte hain, stock check kar sakte hain, ya wholesale PO bhej sakte hain.",
                "soundbox_payload": {
                    "chime": True,
                    "speech_text": "Paytm Vyapar Saathi taiyaar hai. Kahiye, kya madad karu?"
                }
            }
            action_taken = "BUSINESS_PULSE"

        return {
            "query": query,
            "action_taken": action_taken,
            "thoughts": thoughts,
            "result": tool_result
        }

agent_service = VyaparAgentService()
