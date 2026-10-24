import os
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from database import get_connection

class InventoryService:
    @staticmethod
    def get_inventory():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory ORDER BY current_stock ASC")
        items = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM supplier_pos ORDER BY id DESC LIMIT 10")
        recent_pos = [dict(r) for r in cursor.fetchall()]
        conn.close()

        low_stock = [i for i in items if i["current_stock"] <= i["reorder_threshold"]]
        return {
            "items": items,
            "low_stock_items": low_stock,
            "low_stock_count": len(low_stock),
            "recent_pos": recent_pos
        }

    @staticmethod
    def create_supplier_po(item_name: str, quantity: int = None, merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Fetch item from inventory
        cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ?", (f"%{item_name}%",))
        item = cursor.fetchone()

        if not item:
            conn.close()
            return {"success": False, "message": f"Item '{item_name}' dukan ki inventory mein nahi mila."}

        # 2. Dynamic quantity calculation if not explicitly specified
        if quantity is None or quantity <= 0:
            threshold = int(item["reorder_threshold"] or 5)
            curr = int(item["current_stock"] or 0)
            quantity = max(5, (threshold * 2) - curr)

        # 3. Fetch active merchant details dynamically (No hardcoded shop name)
        cursor.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
        m_row = cursor.fetchone()
        if not m_row:
            cursor.execute("SELECT * FROM merchants LIMIT 1")
            m_row = cursor.fetchone()
        merchant = dict(m_row) if m_row else {}

        shop_title = merchant.get("shop_name") or "Sharma Kirana Store"
        shop_address = merchant.get("address") or "Main Market, Delhi"
        merchant_email = merchant.get("email") or "orders@kirana.mock"
        merchant_phone = merchant.get("phone") or "+91 9811223344"

        # Unique PO Number with millisecond and random entropy
        import random
        entropy = random.randint(100, 999)
        po_num = f"PO-PAYTM-{int(datetime.now().timestamp() * 10) % 1000000}{entropy}"
        total_cost = round(float(item["wholesale_price"]) * quantity, 2)
        expected_delivery = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")

        # 4. Compile authentic RFC-5322 MIME Email
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = (os.getenv("SMTP_PASS") or os.getenv("SMTP_PASSWORD") or "").replace(" ", "").strip()
        from_name = os.getenv("SMTP_FROM_NAME", "Vyapar Saathi")

        msg = EmailMessage()
        msg["Subject"] = f"URGENT RESTOCK PO #{po_num} - {shop_title}, {shop_address.split(',')[0]}"
        msg["From"] = f"{from_name} <{smtp_user}>" if smtp_user else merchant_email
        msg["Reply-To"] = merchant_email
        msg["To"] = item["supplier_email"]
        
        body_text = (
            f"====================================================\n"
            f"PAYTM MERCHANT B2B PURCHASE ORDER\n"
            f"====================================================\n"
            f"PO Number: {po_num}\n"
            f"Date: {datetime.now().strftime('%d %b %Y, %I:%M %p')}\n\n"
            f"BUYER / MERCHANT DETAILS:\n"
            f"Store: {shop_title}\n"
            f"Address: {shop_address}\n"
            f"Phone: {merchant_phone}\n"
            f"Email: {merchant_email}\n\n"
            f"SUPPLIER / VENDOR DETAILS:\n"
            f"Vendor: {item['supplier_name']}\n"
            f"Email: {item['supplier_email']}\n\n"
            f"ORDER SPECIFICATION:\n"
            f"• Item Name: {item['item_name']}\n"
            f"• Category: {item['category']}\n"
            f"• Quantity: {quantity} {item['unit']}\n"
            f"• Agreed Wholesale Rate: Rs.{item['wholesale_price']:.2f} per {item['unit']}\n"
            f"• Total Invoice Value: Rs.{total_cost:,.2f}\n\n"
            f"SETTLEMENT & LOGISTICS:\n"
            f"• Settlement Mode: Paytm Merchant B2B Direct Escrow\n"
            f"• Expected Delivery: By {expected_delivery} (within 48 hours)\n"
            f"• Verification: Delivery receipt via Paytm Soundbox scanner\n"
            f"===================================================="
        )
        msg.set_content(body_text)

        # 5. Real SMTP Attempt or Validated Local B2B Outbox
        email_status = "DISPATCHED_TO_OUTBOX"
        smtp_note = "Compiled RFC-5322 MIME dispatch saved to verified B2B Outbox (Set SMTP_HOST in .env for live gateway)."

        if smtp_host and smtp_user and smtp_pass:
            try:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=8)
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                server.quit()
                email_status = "SENT_VIA_SMTP"
                smtp_note = f"Dispatched live via SMTP server {smtp_host} to {item['supplier_email']}."
            except Exception as smtp_err:
                email_status = "FAILED_SMTP_FALLBACK_OUTBOX"
                smtp_note = f"SMTP live dispatch failed ({smtp_err}); safely persisted in Outbox."

        # 6. Insert PO record — NOTE: Stock is NOT increased yet!
        # Stock increases ONLY when supplier physical delivery is received via receive_supplier_delivery()!
        cursor.execute("""
        INSERT INTO supplier_pos (
            po_number, supplier_name, supplier_email, item_name, quantity, total_cost,
            status, sent_at, expected_delivery_date, delivery_status, email_status, email_raw
        )
        VALUES (?, ?, ?, ?, ?, ?, 'PO_DISPATCHED_PENDING_DELIVERY', datetime('now'), ?, 'PENDING', ?, ?)
        """, (po_num, item["supplier_name"], item["supplier_email"], item["item_name"], quantity, total_cost, expected_delivery, email_status, str(msg)))

        po_id = cursor.lastrowid
        conn.commit()
        conn.close()

        email_preview = {
            "to": item["supplier_email"],
            "from": merchant_email,
            "subject": msg["Subject"],
            "body": body_text,
            "email_status": email_status,
            "smtp_note": smtp_note
        }

        return {
            "success": True,
            "po_id": po_id,
            "po_number": po_num,
            "item_name": item["item_name"],
            "quantity": quantity,
            "unit": item["unit"],
            "current_stock": item["current_stock"],
            "supplier_name": item["supplier_name"],
            "supplier_email": item["supplier_email"],
            "total_cost": total_cost,
            "expected_delivery_date": expected_delivery,
            "delivery_status": "PENDING",
            "email_preview": email_preview,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm supplier restock order #{po_num[-4:]} bhej diya gaya hai. {quantity} {item['unit']} {item['item_name']} ka order lag gaya."
            }
        }

    @staticmethod
    def receive_supplier_delivery(po_identifier: str):
        """
        Receives physical goods delivery from supplier:
        Marks PO as DELIVERED and CREDITS stock to inventory.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # Find PO by ID or PO Number (latest first)
        cursor.execute("""
        SELECT * FROM supplier_pos 
        WHERE po_number = ? OR id = ? OR po_number LIKE ?
        ORDER BY id DESC
        LIMIT 1
        """, (str(po_identifier), str(po_identifier), f"%{po_identifier}%"))
        po = cursor.fetchone()

        if not po:
            conn.close()
            return {"success": False, "message": f"Purchase order '{po_identifier}' nahi mila."}

        if po["delivery_status"] == "DELIVERED":
            conn.close()
            return {
                "success": False,
                "message": f"PO #{po['po_number']} ki delivery pehle se receive ho chuki hai ({po['delivery_received_at']})."
            }

        # 1. Update PO Status to DELIVERED
        now_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        UPDATE supplier_pos 
        SET delivery_status = 'DELIVERED', status = 'DELIVERED', delivery_received_at = ?
        WHERE id = ?
        """, (now_ts, po["id"]))

        # 2. NOW credit the stock into inventory!
        cursor.execute("SELECT * FROM inventory WHERE item_name = ?", (po["item_name"],))
        item = cursor.fetchone()
        if item:
            new_stock = item["current_stock"] + po["quantity"]
            cursor.execute("UPDATE inventory SET current_stock = ? WHERE id = ?", (new_stock, item["id"]))
        else:
            new_stock = po["quantity"]

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": f"Successfully received {po['quantity']} units of {po['item_name']}. New stock is {new_stock}.",
            "po_number": po["po_number"],
            "item_name": po["item_name"],
            "quantity_received": po["quantity"],
            "new_stock": new_stock,
            "delivery_received_at": now_ts,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm stock alert: {po['quantity']} packet {po['item_name']} dukan mein receive ho gaye. Naya stock {new_stock} hai."
            }
        }

    @staticmethod
    def add_or_update_item(item_name: str, category: str, current_stock: int, reorder_threshold: int, unit: str, unit_price: float, wholesale_price: float, supplier_name: str, supplier_email: str):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT id FROM inventory WHERE item_name = ?", (item_name,))
        existing = cursor.fetchone()

        if existing:
            cursor.execute("""
            UPDATE inventory 
            SET category = ?, current_stock = ?, reorder_threshold = ?, unit = ?, unit_price = ?, wholesale_price = ?, supplier_name = ?, supplier_email = ?
            WHERE id = ?
            """, (category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email, existing["id"]))
            item_id = existing["id"]
        else:
            cursor.execute("""
            INSERT INTO inventory (item_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (item_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email))
            item_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return {
            "success": True,
            "item_id": item_id,
            "item_name": item_name,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm inventory mein {item_name} update ho gaya."
            }
        }

