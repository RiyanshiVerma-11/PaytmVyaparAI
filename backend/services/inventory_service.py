from datetime import datetime
from database import get_connection

class InventoryService:
    @staticmethod
    def get_inventory():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory ORDER BY current_stock ASC")
        items = [dict(r) for r in cursor.fetchall()]
        conn.close()

        low_stock = [i for i in items if i["current_stock"] <= i["reorder_threshold"]]
        return {
            "items": items,
            "low_stock_items": low_stock,
            "low_stock_count": len(low_stock)
        }

    @staticmethod
    def create_supplier_po(item_name: str, quantity: int = 15):
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inventory WHERE item_name LIKE ?", (f"%{item_name}%",))
        item = cursor.fetchone()

        if not item:
            conn.close()
            return {"success": False, "message": f"Item '{item_name}' not found."}

        po_num = f"PO-PAYTM-{int(datetime.now().timestamp()) % 100000}"
        total_cost = item["wholesale_price"] * quantity

        cursor.execute("""
        INSERT INTO supplier_pos (po_number, supplier_name, supplier_email, item_name, quantity, total_cost, status, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, 'Sent_via_Email', datetime('now'))
        """, (po_num, item["supplier_name"], item["supplier_email"], item["item_name"], quantity, total_cost))

        # Restock
        cursor.execute("UPDATE inventory SET current_stock = current_stock + ? WHERE id = ?", (quantity, item["id"]))
        conn.commit()
        conn.close()

        email_preview = {
            "to": item["supplier_email"],
            "subject": f"URGENT RESTOCK PO #{po_num} - Sharma Kirana, Chandni Chowk",
            "body": f"Dear {item['supplier_name']},\n\nPlease dispatch {quantity} units of {item['item_name']} at wholesale rate Rs.{item['wholesale_price']}/unit.\nTotal Value: Rs.{total_cost}\nBilled via Paytm Merchant B2B Procurement Rail."
        }

        return {
            "success": True,
            "po_number": po_num,
            "item_name": item["item_name"],
            "quantity": quantity,
            "supplier_name": item["supplier_name"],
            "supplier_email": item["supplier_email"],
            "total_cost": total_cost,
            "email_preview": email_preview,
            "soundbox_payload": {
                "chime": True,
                "speech_text": f"Paytm supplier restock order bhej diya gaya hai. {quantity} packet {item['item_name']} dispatch ho rahe hain."
            }
        }
