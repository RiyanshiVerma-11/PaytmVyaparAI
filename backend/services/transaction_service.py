import sqlite3
from datetime import datetime, timedelta
from database import get_connection

class TransactionService:
    @staticmethod
    def get_all_transactions(limit: int = 100):
        conn = get_connection()
        cursor = conn.cursor()

        # Summary statistics
        cursor.execute("SELECT COUNT(*) as count, SUM(amount) as total_volume FROM transactions")
        total_row = cursor.fetchone()
        total_count = total_row["count"] if total_row and total_row["count"] else 0
        total_volume = total_row["total_volume"] if total_row and total_row["total_volume"] else 0.0

        # Today's volume
        today_str = datetime.now().strftime("%Y-%m-%d")
        cursor.execute("SELECT SUM(amount) as today_vol, COUNT(*) as today_cnt FROM transactions WHERE timestamp LIKE ?", (f"{today_str}%",))
        today_row = cursor.fetchone()
        today_volume = today_row["today_vol"] if today_row and today_row["today_vol"] else 0.0
        today_count = today_row["today_cnt"] if today_row and today_row["today_cnt"] else 0

        # Soundbox UPI volume
        cursor.execute("SELECT COUNT(*) as soundbox_cnt, SUM(amount) as soundbox_vol FROM transactions WHERE payment_mode = 'UPI_Soundbox'")
        sb_row = cursor.fetchone()
        soundbox_count = sb_row["soundbox_cnt"] if sb_row and sb_row["soundbox_cnt"] else 0
        soundbox_volume = sb_row["soundbox_vol"] if sb_row and sb_row["soundbox_vol"] else 0.0

        # Recent transactions
        cursor.execute("SELECT * FROM transactions ORDER BY id DESC LIMIT ?", (limit,))
        transactions = [dict(r) for r in cursor.fetchall()]

        conn.close()

        return {
            "total_count": total_count,
            "total_volume": round(total_volume, 2),
            "today_volume": round(today_volume, 2),
            "today_count": today_count,
            "soundbox_count": soundbox_count,
            "soundbox_volume": round(soundbox_volume, 2),
            "transactions": transactions
        }

    @staticmethod
    def simulate_payment(amount: float, customer_phone: str = "+91 9810998877", payment_mode: str = "UPI_Soundbox"):
        conn = get_connection()
        cursor = conn.cursor()

        txn_id = f"TXN_{int(datetime.now().timestamp() * 1000) % 100000000}"
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, ?, ?, ?, 'SUCCESS')
        """, (txn_id, float(amount), customer_phone, payment_mode, timestamp_str))

        conn.commit()
        conn.close()

        # Hindi pronunciation conversion for Soundbox Chime
        hindi_numbers = {
            10: "das", 20: "bees", 50: "pachaas", 100: "ek sau", 150: "ek sau pachaas",
            200: "do sau", 250: "dhai sau", 300: "teen sau", 350: "saadhe teen sau",
            400: "char sau", 450: "char sau pachaas", 500: "paanch sau", 800: "aath sau",
            1000: "ek hazaar", 1200: "baarah sau", 1500: "pandrah sau", 2000: "do hazaar",
            2500: "dhai hazaar", 5000: "paanch hazaar"
        }
        amt_spoken = hindi_numbers.get(int(amount), f"{int(amount)}")
        speech_text = f"Paytm par {amt_spoken} rupaye prapt hue."

        return {
            "success": True,
            "transaction": {
                "txn_id": txn_id,
                "amount": amount,
                "customer_phone": customer_phone,
                "payment_mode": payment_mode,
                "timestamp": timestamp_str,
                "status": "SUCCESS"
            },
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount,
                "currency": "INR"
            }
        }
