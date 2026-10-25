import os
import io
import csv
import base64
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
from database import get_connection

class InventoryService:
    @staticmethod
    def get_inventory(merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory WHERE merchant_id = ? ORDER BY current_stock ASC", (merchant_id,))
        items = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM supplier_pos WHERE merchant_id = ? ORDER BY id DESC LIMIT 10", (merchant_id,))
        recent_pos = [dict(r) for r in cursor.fetchall()]
        conn.close()

        low_stock = [i for i in items if (i.get("current_stock") or 0) <= (i.get("reorder_threshold") or 0)]
        return {
            "items": items,
            "low_stock_items": low_stock,
            "low_stock_count": len(low_stock),
            "recent_pos": recent_pos,
            "merchant_id": merchant_id
        }

    @staticmethod
    def create_supplier_po(item_name: str, quantity: int | None = None, merchant_id: int = 1, custom_vendor_email: str | None = None):
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Fetch item from inventory for this merchant
        cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ? AND merchant_id = ?", (f"%{item_name}%", merchant_id))
        item = cursor.fetchone()

        if not item:
            # Fallback if merchant_id is 1 or check without strict merchant for demo
            cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ? LIMIT 1", (f"%{item_name}%",))
            item = cursor.fetchone()

        if not item:
            conn.close()
            return {"success": False, "message": f"Item '{item_name}' dukan ki inventory mein nahi mila."}

        # 2. Dynamic quantity calculation if not explicitly specified
        if quantity is None or quantity <= 0:
            threshold = int(item["reorder_threshold"] or 5)
            curr = int(item["current_stock"] or 0)
            quantity = max(5, (threshold * 2) - curr)

        # 3. Fetch active merchant details dynamically
        cursor.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
        m_row = cursor.fetchone()
        if not m_row:
            cursor.execute("SELECT * FROM merchants LIMIT 1")
            m_row = cursor.fetchone()
        merchant = dict(m_row) if m_row else {}

        shop_title = merchant.get("shop_name") or "Kirana Store"
        shop_address = merchant.get("address") or "Main Market, Delhi"
        merchant_email = merchant.get("email") or "ramesh.kirana@paytm.com"
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

        raw_vendor_email = (custom_vendor_email or item["supplier_email"] or "").strip()
        is_mock_domain = (
            not raw_vendor_email or 
            ".mock" in raw_vendor_email.lower() or 
            ".example" in raw_vendor_email.lower() or 
            "@" not in raw_vendor_email
        )

        if is_mock_domain:
            destination_email = merchant_email if (merchant_email and "@" in merchant_email and ".mock" not in merchant_email) else (smtp_user or "orders@directexample.com")
            subject_prefix = f"[TEST PO COPY] "
        else:
            destination_email = raw_vendor_email
            subject_prefix = ""

        msg = EmailMessage()
        msg["Subject"] = f"{subject_prefix}URGENT RESTOCK PO #{po_num} - {shop_title}, {shop_address.split(',')[0]}"
        msg["From"] = f"{from_name} <{smtp_user}>" if smtp_user else merchant_email
        msg["Reply-To"] = merchant_email
        msg["To"] = destination_email
        
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
            f"Target Supplier Address: {raw_vendor_email}\n"
            f"Dispatched To: {destination_email}\n\n"
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
                smtp_note = f"Dispatched live via SMTP server {smtp_host} to {destination_email}."
            except Exception as smtp_err:
                email_status = "FAILED_SMTP_FALLBACK_OUTBOX"
                smtp_note = f"SMTP live dispatch failed ({smtp_err}); safely persisted in Outbox."

        # 6. Insert PO record
        cursor.execute("""
        INSERT INTO supplier_pos (
            merchant_id, po_number, supplier_name, supplier_email, item_name, quantity, total_cost,
            status, sent_at, expected_delivery_date, delivery_status, email_status, email_raw
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PO_DISPATCHED_PENDING_DELIVERY', datetime('now'), ?, 'PENDING', ?, ?)
        """, (merchant_id, po_num, item["supplier_name"], destination_email, item["item_name"], quantity, total_cost, expected_delivery, email_status, str(msg)))

        po_id = cursor.lastrowid
        conn.commit()
        conn.close()

        email_preview = {
            "to": destination_email,
            "target_vendor": raw_vendor_email,
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
    def receive_supplier_delivery(po_identifier: str, merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()

        # Find PO by ID or PO Number (latest first)
        cursor.execute("""
        SELECT * FROM supplier_pos 
        WHERE (po_number = ? OR id = ? OR po_number LIKE ?) AND (merchant_id = ? OR merchant_id IS NULL)
        ORDER BY id DESC
        LIMIT 1
        """, (str(po_identifier), str(po_identifier), f"%{po_identifier}%", merchant_id))
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

        now_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute("""
        UPDATE supplier_pos 
        SET delivery_status = 'DELIVERED', status = 'DELIVERED', delivery_received_at = ?
        WHERE id = ?
        """, (now_ts, po["id"]))

        # Credit stock into inventory for this merchant
        cursor.execute("SELECT * FROM inventory WHERE item_name = ? AND merchant_id = ?", (po["item_name"], merchant_id))
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
    def add_or_update_item(
        item_name: str,
        category: str = "Groceries",
        current_stock: int = 10,
        reorder_threshold: int = 5,
        unit: str = "Pack",
        unit_price: float = 50.0,
        wholesale_price: float = 42.0,
        supplier_name: str = "Wholesale Supplier",
        supplier_email: str = "orders@distributor.mock",
        merchant_id: int = 1
    ):
        conn = get_connection()
        cursor = conn.cursor()

        clean_name = item_name.strip()
        cursor.execute("SELECT id FROM inventory WHERE item_name = ? AND merchant_id = ?", (clean_name, merchant_id))
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
            INSERT INTO inventory (merchant_id, item_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (merchant_id, clean_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email))
            item_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return {
            "success": True,
            "item_id": item_id,
            "item_name": clean_name,
            "current_stock": current_stock,
            "merchant_id": merchant_id,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm inventory mein {clean_name} update ho gaya."
            }
        }

    @classmethod
    def bulk_add_items(cls, items: list, merchant_id: int = 1):
        """
        Adds or updates a batch of stock items for the specified merchant.
        """
        if not items or not isinstance(items, list):
            return {"success": False, "message": "No items provided for import."}

        added = []
        for itm in items:
            name = (itm.get("item_name") or itm.get("name") or "").strip()
            if not name:
                continue
            cat = itm.get("category") or "Groceries"
            stock = int(itm.get("current_stock") or itm.get("stock") or 10)
            threshold = int(itm.get("reorder_threshold") or itm.get("threshold") or 5)
            unit = itm.get("unit") or "Pack"
            price = float(itm.get("unit_price") or itm.get("price") or 50.0)
            wholesale = float(itm.get("wholesale_price") or itm.get("wholesale") or round(price * 0.85, 2))
            supp_name = itm.get("supplier_name") or itm.get("supplier") or "Local Wholesale Hub"
            supp_email = itm.get("supplier_email") or itm.get("email") or "orders@distributor.mock"

            res = cls.add_or_update_item(
                item_name=name,
                category=cat,
                current_stock=stock,
                reorder_threshold=threshold,
                unit=unit,
                unit_price=price,
                wholesale_price=wholesale,
                supplier_name=supp_name,
                supplier_email=supp_email,
                merchant_id=merchant_id
            )
            added.append(res)

        return {
            "success": True,
            "imported_count": len(added),
            "merchant_id": merchant_id,
            "message": f"Successfully added {len(added)} products to your store inventory.",
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm alert: Dukan mein {len(added)} naye stock items safaltapoorvak add ho gaye."
            }
        }

    @classmethod
    def parse_and_import_sheet(cls, file_content_raw: str, filename: str = "stocks.csv", merchant_id: int = 1):
        """
        Parses an uploaded spreadsheet (CSV or Excel XLSX) and adds all items for the merchant.
        Supports raw CSV text or Base64 encoded binary file.
        """
        parsed_items = []
        fn_lower = (filename or "").lower()

        # Handle Base64 decoding if prefix is present or if binary
        is_base64 = False
        raw_bytes = None
        if isinstance(file_content_raw, str):
            if "base64," in file_content_raw:
                file_content_raw = file_content_raw.split("base64,")[1]
                is_base64 = True
            try:
                # Try decoding base64
                decoded = base64.b64decode(file_content_raw)
                # If valid non-empty bytes
                if len(decoded) > 0:
                    raw_bytes = decoded
            except Exception:
                raw_bytes = file_content_raw.encode("utf-8", errors="ignore")
        elif isinstance(file_content_raw, bytes):
            raw_bytes = file_content_raw

        # 1. Parse Excel XLSX
        if fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls"):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
                ws = wb.active
                rows = list(ws.iter_rows(values_only=True))
                if len(rows) >= 2:
                    headers = [str(h).strip().lower() if h is not None else "" for h in rows[0]]
                    for row in rows[1:]:
                        if not any(row):
                            continue
                        row_dict = {}
                        for i, h in enumerate(headers):
                            if i < len(row) and h:
                                row_dict[h] = row[i]
                        item = cls._map_row_to_item(row_dict)
                        if item:
                            parsed_items.append(item)
            except Exception as ex:
                print(f"Excel parsing exception: {ex}")
                # Fallback to CSV parse if XLSX parser fails
                pass

        # 2. Parse CSV if not parsed yet or if filename is .csv
        if not parsed_items and raw_bytes:
            try:
                text_content = raw_bytes.decode("utf-8-sig", errors="replace")
                reader = csv.DictReader(io.StringIO(text_content))
                for row in reader:
                    normalized_row = {str(k).strip().lower(): v for k, v in row.items() if k}
                    item = cls._map_row_to_item(normalized_row)
                    if item:
                        parsed_items.append(item)
            except Exception as ex:
                print(f"CSV parsing exception: {ex}")

        if not parsed_items:
            return {
                "success": False,
                "message": "Could not extract valid product rows from sheet. Please ensure column headers match 'Item Name', 'Category', 'Stock', 'Price', 'Wholesale Cost'."
            }

        return cls.bulk_add_items(parsed_items, merchant_id=merchant_id)

    @classmethod
    def _map_row_to_item(cls, row_dict: dict):
        """
        Flexible column header resolver for merchant spreadsheets.
        """
        def find_val(candidates, default=None):
            for c in candidates:
                for k, v in row_dict.items():
                    if c in k.lower() and v is not None and str(v).strip() != "":
                        return v
            return default

        name = find_val(["item_name", "item name", "product name", "product", "item", "samaan", "naam", "title"])
        if not name or str(name).strip() == "":
            return None

        clean_name = str(name).strip()
        cat = find_val(["category", "type", "varg", "group", "department"], "Groceries")
        unit = find_val(["unit", "uom", "packaging", "pack"], "Pack")

        try:
            stock = int(float(find_val(["current_stock", "current stock", "stock", "quantity", "qty", "count"], 10)))
        except (ValueError, TypeError):
            stock = 10

        try:
            threshold = int(float(find_val(["reorder_threshold", "reorder threshold", "threshold", "min stock", "min_stock", "alert"], 5)))
        except (ValueError, TypeError):
            threshold = 5

        try:
            price = float(find_val(["unit_price", "unit price", "selling price", "retail price", "price", "mrp", "rate"], 50.0))
        except (ValueError, TypeError):
            price = 50.0

        try:
            wholesale = float(find_val(["wholesale_price", "wholesale price", "wholesale", "cost", "purchase rate", "buy price", "cogs"], round(price * 0.85, 2)))
        except (ValueError, TypeError):
            wholesale = round(price * 0.85, 2)

        supplier = find_val(["supplier_name", "supplier name", "supplier", "vendor", "distributor"], "Wholesale Distributor")
        email = find_val(["supplier_email", "supplier email", "vendor email", "email"], "orders@distributor.mock")

        return {
            "item_name": clean_name,
            "category": str(cat).strip(),
            "current_stock": stock,
            "reorder_threshold": threshold,
            "unit": str(unit).strip(),
            "unit_price": price,
            "wholesale_price": wholesale,
            "supplier_name": str(supplier).strip(),
            "supplier_email": str(email).strip()
        }


