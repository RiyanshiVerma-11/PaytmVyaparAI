from database import get_connection
from datetime import datetime

class KhataService:
    @staticmethod
    def record_entry(customer_name: str, amount: float, item_description: str = "General Items", entry_type: str = "udhaar", phone: str = None):
        conn = get_connection()
        cursor = conn.cursor()

        # Find or create customer
        cursor.execute("SELECT * FROM customers WHERE name LIKE ? OR phone = ?", (f"%{customer_name}%", phone or ""))
        customer = cursor.fetchone()

        if customer:
            cust_id = customer["id"]
            cust_name = customer["name"]
            cust_phone = phone or customer["phone"]
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
        new_pending = (curr_pending + amount) if entry_type.lower() == "udhaar" else max(0.0, curr_pending - amount)

        # Update customer balance & visit count
        cursor.execute("""
        UPDATE customers 
        SET pending_udhaar = ?, last_visit_date = date('now'), visit_count = visit_count + 1
        WHERE id = ?
        """, (new_pending, cust_id))

        # Insert Khata record
        cursor.execute("""
        INSERT INTO khata_entries (customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES (?, ?, ?, ?, ?, datetime('now'), 'pending')
        """, (cust_id, cust_name, amount, item_description, entry_type.lower()))

        # Also log to transactions table
        txn_id = f"TXN_{int(datetime.now().timestamp())}"
        cursor.execute("""
        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, ?, ?, datetime('now'), 'SUCCESS')
        """, (txn_id, amount, cust_phone, 'Udhaar' if entry_type.lower() == 'udhaar' else 'Cash'))

        # Check and auto-decrement stock if specific Kirana item mentioned
        stock_decremented = None
        for item_key in ["butter", "oil", "tel", "maggi", "salt", "atta", "tea"]:
            if item_key in item_description.lower():
                cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ?", (f"%{item_key}%",))
                item = cursor.fetchone()
                if item:
                    new_stock = max(0, item["current_stock"] - 1)
                    cursor.execute("UPDATE inventory SET current_stock = ? WHERE id = ?", (new_stock, item["id"]))
                    stock_decremented = f"{item['item_name']} (Remaining: {new_stock} {item['unit']})"
                break

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

        sms_msg = f"Namaste {cust_name} ji, Sharma Kirana se aapka Rs.{int(amount)} ka {entry_type} darj hua. Kul baaki: Rs.{int(new_pending)}. Pay via UPI: upi://pay?pa=paytm@sharmakirana&am={int(new_pending)}"
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

    @staticmethod
    def settle_customer(customer_id: int):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
        c = cursor.fetchone()
        if not c:
            conn.close()
            return {"success": False, "message": "Customer not found."}

        settled_amount = c["pending_udhaar"]
        cursor.execute("UPDATE customers SET pending_udhaar = 0 WHERE id = ?", (customer_id,))
        cursor.execute("""
        INSERT INTO khata_entries (customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES (?, ?, ?, 'Full Balance Settled', 'jama', datetime('now'), 'settled')
        """, (customer_id, c["name"], settled_amount))

        conn.commit()
        conn.close()

        return {
            "success": True,
            "customer_name": c["name"],
            "settled_amount": settled_amount,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm par {c['name']} ji ka pura balance chukta ho gaya."
            }
        }

    @staticmethod
    def get_all_entries():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM khata_entries ORDER BY id DESC LIMIT 50")
        entries = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT * FROM customers ORDER BY pending_udhaar DESC")
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
            "pending_customers_count": pending_count
        }
