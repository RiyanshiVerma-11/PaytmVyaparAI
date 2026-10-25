from database import get_connection
from datetime import datetime

def normalize_phone(raw_phone: str) -> str:
    if not raw_phone:
        return ""
    digits = ''.join(c for c in str(raw_phone) if c.isdigit())
    if len(digits) == 10:
        return f"+91 {digits}"
    elif len(digits) == 11 and digits.startswith("0"):
        return f"+91 {digits[1:]}"
    elif len(digits) == 12 and digits.startswith("91"):
        return f"+91 {digits[2:]}"
    elif digits:
        return f"+{digits}" if not str(raw_phone).startswith("+") else str(raw_phone).strip()
    return str(raw_phone).strip()

def get_phone_last10(raw_phone: str) -> str:
    if not raw_phone:
        return ""
    digits = ''.join(c for c in str(raw_phone) if c.isdigit())
    return digits[-10:] if len(digits) >= 10 else digits

class KhataService:
    @staticmethod
    def record_entry(customer_name: str, amount: float, item_description: str = "General Items", entry_type: str = "udhaar", phone: str | None = None, merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()

        norm_phone = normalize_phone(phone) if phone else None
        phone_10 = get_phone_last10(phone) if phone else None
        clean_name = (customer_name or "").strip()

        # Strict Validation: Never write fake/empty ledger entries
        if not clean_name:
            conn.close()
            return {
                "success": False,
                "error": "Customer name is required for Bahi-Khata ledger entry.",
                "message": "Grahak ka naam batana zaroori hai."
            }

        try:
            amount = float(amount)
            if amount <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            conn.close()
            return {
                "success": False,
                "error": "Valid positive transaction amount is required.",
                "message": "Valid transaction amount batana zaroori hai."
            }

        # Fetch all existing customers for this merchant for precise matching
        customer = None
        cursor.execute("SELECT * FROM customers WHERE merchant_id = ?", (merchant_id,))
        all_customers = [dict(r) for r in cursor.fetchall()]

        # 1. Match by exact full name (case-insensitive) first
        if clean_name:
            target_name_lower = clean_name.lower()
            for c in all_customers:
                if c["name"].strip().lower() == target_name_lower:
                    customer = c
                    break

        # 2. Match by exact first name if clean_name is a single word and matches exactly one customer
        if not customer and clean_name and " " not in clean_name:
            matching_first_names = [c for c in all_customers if c["name"].strip().lower().split()[0] == clean_name.lower()]
            if len(matching_first_names) == 1:
                customer = matching_first_names[0]

        # 3. Match by phone number ONLY if no name given or if name is compatible with existing customer
        if not customer and phone_10:
            for c in all_customers:
                c_10 = get_phone_last10(c["phone"])
                if c_10 and c_10 == phone_10:
                    if not clean_name or clean_name.lower() in c["name"].lower() or c["name"].lower() in clean_name.lower():
                        customer = c
                        break

        if customer:
            cust_id = customer["id"]
            # If a new phone is provided, dynamically update it; otherwise keep existing
            cust_phone = norm_phone or customer["phone"]
            cust_name = clean_name.title() if clean_name else customer["name"]
            curr_pending = float(customer["pending_udhaar"] or 0)
        else:
            cust_name = clean_name.title()
            cust_phone = norm_phone or "+91 (Mobile Not Registered)"
            cursor.execute("""
            INSERT INTO customers (merchant_id, name, phone, pending_udhaar, last_visit_date, visit_count, churn_risk)
            VALUES (?, ?, ?, 0, date('now'), 1, 'Normal')
            """, (merchant_id, cust_name, cust_phone))
            cust_id = cursor.lastrowid
            curr_pending = 0.0

        amount = float(amount)
        new_pending = (curr_pending + amount) if entry_type.lower() == "udhaar" else max(0.0, curr_pending - amount)

        # Update customer balance, visit count, AND phone & name dynamically
        cursor.execute("""
        UPDATE customers 
        SET name = ?, phone = ?, pending_udhaar = ?, last_visit_date = date('now'), visit_count = visit_count + 1
        WHERE id = ? AND merchant_id = ?
        """, (cust_name, cust_phone, new_pending, cust_id, merchant_id))

        # Insert Khata record
        cursor.execute("""
        INSERT INTO khata_entries (merchant_id, customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'pending')
        """, (merchant_id, cust_id, cust_name, amount, item_description, entry_type.lower()))
        entry_id = cursor.lastrowid

        # Also log to transactions table with dynamic phone and merchant_id
        txn_id = f"TXN_{int(datetime.now().timestamp())}"
        cursor.execute("""
        INSERT INTO transactions (merchant_id, txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, ?, ?, ?, datetime('now'), 'SUCCESS')
        """, (merchant_id, txn_id, amount, cust_phone, 'Udhaar' if entry_type.lower() == 'udhaar' else 'Cash'))

        # Check and auto-decrement stock if specific item mentioned in this merchant's inventory
        stock_decremented = None
        for item_key in ["butter", "oil", "tel", "maggi", "salt", "atta", "tea"]:
            if item_key in item_description.lower():
                cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ? AND merchant_id = ?", (f"%{item_key}%", merchant_id))
                item = cursor.fetchone()
                if item:
                    new_stock = max(0, item["current_stock"] - 1)
                    cursor.execute("UPDATE inventory SET current_stock = ? WHERE id = ?", (new_stock, item["id"]))
                    stock_decremented = f"{item['item_name']} (Remaining: {new_stock} {item['unit']})"
                break

        # Fetch dynamic merchant UPI ID & store details
        cursor.execute("SELECT shop_name, upi_id FROM merchants WHERE id = ?", (merchant_id,))
        m_row = cursor.fetchone()
        if not m_row:
            cursor.execute("SELECT shop_name, upi_id FROM merchants LIMIT 1")
            m_row = cursor.fetchone()
        shop_title = m_row["shop_name"] if m_row and m_row["shop_name"] else "Kirana Store"
        merchant_upi = m_row["upi_id"] if m_row and m_row["upi_id"] else "8171008964@ptaxis"

        conn.commit()
        conn.close()

        # Hindi speech conversion
        hindi_numbers = {
            100: "ek sau", 150: "ek sau pachaas", 200: "do sau", 250: "dhai sau",
            300: "teen sau", 350: "saadhe teen sau", 400: "char sau", 450: "char sau pachaas",
            500: "paanch sau", 800: "aath sau", 1000: "ek hazaar", 1200: "baarah sau"
        }
        amt_spoken = hindi_numbers.get(int(amount), f"{int(amount)}")
        if entry_type.lower() == "udhaar":
            speech_text = f"Paytm par {cust_name} ji ka {amt_spoken} rupaye udhaar darj ho gaya. Kul baaki {int(new_pending)} rupaye."
        else:
            if new_pending <= 0:
                speech_text = f"Paytm par {cust_name} ji se {amt_spoken} rupaye prapt hue. Poora udhaar chukta ho gaya."
            else:
                speech_text = f"Paytm par {cust_name} ji se {amt_spoken} rupaye prapt hue. Baaki udhaar {int(new_pending)} rupaye bache hain."

        upi_link = f"upi://pay?pa={merchant_upi}&am={int(new_pending)}&pn={shop_title.replace(' ', '')}&cu=INR"
        sms_msg = f"Namaste {cust_name} ji, {shop_title} se aapka Rs.{int(amount)} ka {entry_type} darj hua. Kul baaki: Rs.{int(new_pending)}. Pay via UPI: {upi_link}"
        sms_uri = f"sms:{cust_phone}?body={sms_msg.replace(' ', '%20')}"

        return {
            "success": True,
            "entry_id": entry_id,
            "customer_name": cust_name,
            "customer_phone": cust_phone,
            "amount": amount,
            "new_pending_balance": new_pending,
            "item_description": item_description,
            "entry_type": entry_type.lower(),
            "stock_decremented": stock_decremented,
            "sms_uri": sms_uri,
            "merchant_id": merchant_id,
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount,
                "entry_type": entry_type
            }
        }

    @staticmethod
    def settle_customer(customer_id: int, merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE id = ? AND merchant_id = ?", (customer_id, merchant_id))
        c = cursor.fetchone()
        if not c:
            # Fallback if merchant_id = 1
            cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
            c = cursor.fetchone()

        if not c:
            conn.close()
            return {"success": False, "message": "Customer not found."}

        settled_amount = c["pending_udhaar"]
        cursor.execute("UPDATE customers SET pending_udhaar = 0 WHERE id = ?", (c["id"],))
        cursor.execute("""
        INSERT INTO khata_entries (merchant_id, customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES (?, ?, ?, ?, 'Full Balance Settled', 'jama', datetime('now'), 'settled')
        """, (c.get("merchant_id", merchant_id), c["id"], c["name"], settled_amount))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "customer_name": c["name"],
            "settled_amount": settled_amount,
            "merchant_id": merchant_id,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm par {c['name']} ji ka pura balance chukta ho gaya."
            }
        }

    @staticmethod
    def undo_entry(entry_id: int):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM khata_entries WHERE id = ?", (entry_id,))
        entry = cursor.fetchone()
        if not entry:
            conn.close()
            return {"success": False, "message": f"Ledger entry #{entry_id} not found."}

        cust_id = entry["customer_id"]
        amount = float(entry["amount"] or 0)
        entry_type = (entry["entry_type"] or "udhaar").lower()
        cust_name = entry["customer_name"]

        # 1. Reverse customer's pending_udhaar balance
        cursor.execute("SELECT pending_udhaar FROM customers WHERE id = ?", (cust_id,))
        c = cursor.fetchone()
        new_pending = 0.0
        if c:
            curr_pending = float(c["pending_udhaar"] or 0)
            if entry_type == "udhaar":
                new_pending = max(0.0, curr_pending - amount)
            else:
                new_pending = curr_pending + amount
            cursor.execute("UPDATE customers SET pending_udhaar = ? WHERE id = ?", (new_pending, cust_id))

        # 2. Restore decremented inventory if Kirana item was reduced
        item_desc = entry["item_description"] or ""
        restored_item = None
        for item_key in ["butter", "oil", "tel", "maggi", "salt", "atta", "tea"]:
            if item_key in item_desc.lower():
                cursor.execute("SELECT id, item_name, current_stock FROM inventory WHERE item_name LIKE ?", (f"%{item_key}%",))
                inv_item = cursor.fetchone()
                if inv_item:
                    cursor.execute("UPDATE inventory SET current_stock = current_stock + 1 WHERE id = ?", (inv_item["id"],))
                    restored_item = inv_item["item_name"]
                break

        # 3. Delete the mistaken khata entry
        cursor.execute("DELETE FROM khata_entries WHERE id = ?", (entry_id,))

        conn.commit()
        conn.close()

        speech_text = f"Paytm alert: {cust_name} ji ki {int(amount)} rupaye ki entri cancel kar di gayi hai."
        return {
            "success": True,
            "entry_id": entry_id,
            "customer_name": cust_name,
            "amount": amount,
            "new_pending_balance": new_pending,
            "restored_inventory": restored_item,
            "message": f"Entry #{entry_id} undone successfully.",
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text
            }
        }

    @staticmethod
    def get_all_entries(merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM khata_entries WHERE merchant_id = ? ORDER BY id DESC LIMIT 50", (merchant_id,))
        entries = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT * FROM customers WHERE merchant_id = ? ORDER BY pending_udhaar DESC", (merchant_id,))
        customers = [dict(r) for r in cursor.fetchall()]
        conn.close()

        total_pending = sum(float(c.get("pending_udhaar") or 0) for c in customers)
        total_recovered = sum(float(e.get("amount") or 0) for e in entries if e.get("entry_type") == "jama")
        pending_count = len([c for c in customers if float(c.get("pending_udhaar") or 0) > 0])

        return {
            "entries": entries,
            "customers": customers,
            "total_pending_udhaar": round(total_pending, 2),
            "total_recovered": round(total_recovered, 2),
            "pending_customers_count": pending_count,
            "merchant_id": merchant_id
        }
