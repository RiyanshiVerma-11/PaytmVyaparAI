import sqlite3
from datetime import datetime, timedelta
from database import get_connection

class TransactionService:
    # Standard Kirana item margin lookup for micro-sales & category margins
    MICRO_ITEMS_CATALOG = {
        "dahi": {"label": "Amul Masti Dahi 200g", "margin_pct": 0.22, "category": "Dairy"},
        "doodh": {"label": "Amul Taaza Milk 500ml", "margin_pct": 0.14, "category": "Dairy"},
        "milk": {"label": "Amul Taaza Milk 500ml", "margin_pct": 0.14, "category": "Dairy"},
        "chai": {"label": "Taj Mahal / Loose Chai Pack", "margin_pct": 0.24, "category": "Beverages"},
        "biscuit": {"label": "Parle-G / Britannia Pack", "margin_pct": 0.20, "category": "Biscuits"},
        "maggi": {"label": "Maggi 2-Min Noodles", "margin_pct": 0.18, "category": "Snacks"},
        "bread": {"label": "Harvest Gold Bread", "margin_pct": 0.20, "category": "Bakery"},
        "chips": {"label": "Lays / Kurkure Pack", "margin_pct": 0.22, "category": "Snacks"},
        "anda": {"label": "Farm Eggs (Pair/Tray)", "margin_pct": 0.21, "category": "Dairy"},
        "namak": {"label": "Tata Salt 1kg", "margin_pct": 0.18, "category": "Groceries"},
        "tel": {"label": "Fortune Refined Oil 1L", "margin_pct": 0.12, "category": "Oil & Ghee"},
    }

    @classmethod
    def _ensure_recent_7day_seed(cls, conn):
        """
        Ensures the last 7 days have realistic Kirana transaction history
        (including ₹15 Dahi, ₹20 Doodh, ₹10 Parle-G micro-sales and UPI Soundbox scans)
        so the 7-day profit trend chart is always populated from the SQLite transactions table.
        """
        cursor = conn.cursor()
        today = datetime.now().date()
        inserted = False

        # Baseline daily templates (day_offset -> list of (amount, mode, phone_or_tag, hour))
        daily_templates = {
            6: [
                (15.0, "UPI_Soundbox", "Micro: Dahi ₹15", 8),
                (20.0, "Cash_Micro", "Micro: Doodh ₹20", 9),
                (145.0, "UPI_Soundbox", "+91 9810112233", 11),
                (340.0, "UPI_Soundbox", "+91 9876543210", 14),
                (25.0, "Cash_Micro", "Micro: Bread & Biscuit ₹25", 17),
                (520.0, "UPI_Soundbox", "+91 9911223344", 19),
                (410.0, "UPI_Soundbox", "+91 9818889900", 20),
            ],
            5: [
                (20.0, "UPI_Soundbox", "Micro: Dahi ₹20", 8),
                (15.0, "Cash_Micro", "Micro: Chai & Parle-G ₹15", 9),
                (280.0, "UPI_Soundbox", "+91 9810112233", 12),
                (490.0, "UPI_Soundbox", "+91 9899123456", 15),
                (30.0, "UPI_Soundbox", "Micro: Maggi & Dahi ₹30", 18),
                (640.0, "UPI_Soundbox", "+91 9911223344", 20),
                (380.0, "UPI_Soundbox", "+91 9876543210", 21),
            ],
            4: [
                (15.0, "Cash_Micro", "Micro: Dahi ₹15", 8),
                (40.0, "UPI_Soundbox", "Micro: Doodh 2x ₹40", 9),
                (310.0, "UPI_Soundbox", "+91 9818889900", 11),
                (220.0, "UPI_Soundbox", "+91 9711556677", 14),
                (18.0, "Cash_Micro", "Micro: Chips & Toffee ₹18", 16),
                (590.0, "UPI_Soundbox", "+91 9810112233", 19),
                (450.0, "UPI_Soundbox", "+91 9876543210", 21),
            ],
            3: [
                (15.0, "UPI_Soundbox", "Micro: Dahi ₹15", 7),
                (20.0, "UPI_Soundbox", "Micro: Dahi ₹20", 9),
                (35.0, "Cash_Micro", "Micro: Anda & Bread ₹35", 10),
                (420.0, "UPI_Soundbox", "+91 9911223344", 13),
                (680.0, "UPI_Soundbox", "+91 9810112233", 18),
                (510.0, "UPI_Soundbox", "+91 9818889900", 20),
                (490.0, "UPI_Soundbox", "+91 9876543210", 21),
            ],
            2: [
                (20.0, "Cash_Micro", "Micro: Dahi ₹20", 8),
                (15.0, "UPI_Soundbox", "Micro: Dahi ₹15", 9),
                (25.0, "Cash_Micro", "Micro: Biscuit & Chai ₹25", 11),
                (390.0, "UPI_Soundbox", "+91 9899123456", 14),
                (540.0, "UPI_Soundbox", "+91 9810112233", 17),
                (760.0, "UPI_Soundbox", "+91 9911223344", 19),
                (610.0, "UPI_Soundbox", "+91 9876543210", 21),
            ],
            1: [
                (15.0, "UPI_Soundbox", "Micro: Dahi ₹15", 8),
                (20.0, "Cash_Micro", "Micro: Doodh ₹20", 9),
                (30.0, "UPI_Soundbox", "Micro: Maggi 2x ₹30", 11),
                (480.0, "UPI_Soundbox", "+91 9810112233", 13),
                (620.0, "UPI_Soundbox", "+91 9876543210", 17),
                (840.0, "UPI_Soundbox", "+91 9911223344", 19),
                (590.0, "UPI_Soundbox", "+91 9818889900", 21),
            ],
            0: [
                (15.0, "UPI_Soundbox", "Micro: Dahi ₹15", 8),
                (20.0, "Cash_Micro", "Micro: Dahi ₹20", 9),
                (28.0, "UPI_Soundbox", "Micro: Tata Salt ₹28", 10),
                (540.0, "UPI_Soundbox", "+91 9810112233", 11),
                (720.0, "UPI_Soundbox", "+91 9876543210", 13),
                (890.0, "UPI_Soundbox", "+91 9911223344", 15),
            ],
        }

        for offset, tx_list in daily_templates.items():
            target_date = (today - timedelta(days=offset)).strftime("%Y-%m-%d")
            cursor.execute(
                "SELECT COUNT(*) as cnt FROM transactions WHERE timestamp LIKE ? AND customer_phone LIKE 'Micro:%'",
                (f"{target_date}%",)
            )
            row = cursor.fetchone()
            if not row or row["cnt"] == 0:
                for idx, (amt, mode, phone_tag, hr) in enumerate(tx_list):
                    txn_id = f"TXN_M_{target_date.replace('-', '')}_{idx+1}"
                    ts = f"{target_date} {hr:02d}:{(idx * 11) % 60:02d}:00"
                    cursor.execute(
                        """
                        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
                        VALUES (?, ?, ?, ?, ?, 'SUCCESS')
                        """,
                        (txn_id, float(amt), phone_tag, mode, ts)
                    )
                inserted = True

        if inserted:
            conn.commit()

    @classmethod
    def get_daily_profit_trends(cls, days: int = 7):
        conn = get_connection()
        cls._ensure_recent_7day_seed(conn)
        cursor = conn.cursor()

        # Calculate weighted average retail-to-wholesale margin from inventory table
        cursor.execute("SELECT unit_price, wholesale_price FROM inventory WHERE unit_price > 0")
        inv_rows = cursor.fetchall()
        if inv_rows:
            margins = [
                max(0.08, (float(r["unit_price"]) - float(r["wholesale_price"])) / float(r["unit_price"]))
                for r in inv_rows
            ]
            avg_store_margin = sum(margins) / len(margins)
        else:
            avg_store_margin = 0.165  # 16.5% default Kirana gross margin

        today = datetime.now().date()
        trend_days = []
        total_7d_revenue = 0.0
        total_7d_profit = 0.0
        total_7d_micro_sales = 0.0
        total_7d_micro_count = 0

        for offset in range(days - 1, -1, -1):
            d = today - timedelta(days=offset)
            date_str = d.strftime("%Y-%m-%d")
            day_short = d.strftime("%a")
            day_display = "Today" if offset == 0 else f"{day_short} ({d.strftime('%d %b')})"

            cursor.execute(
                """
                SELECT amount, payment_mode, customer_phone
                FROM transactions
                WHERE timestamp LIKE ? AND payment_mode != 'Loan_Disbursal'
                """,
                (f"{date_str}%",)
            )
            rows = cursor.fetchall()

            day_revenue = 0.0
            day_profit = 0.0
            upi_rev = 0.0
            cash_micro_rev = 0.0
            micro_count = 0

            for r in rows:
                amt = float(r["amount"] or 0.0)
                mode = (r["payment_mode"] or "UPI_Soundbox")
                phone_tag = (r["customer_phone"] or "").lower()

                day_revenue += amt

                # Determine item-specific or micro-sale margin
                item_margin = avg_store_margin
                if amt <= 60 or "micro:" in phone_tag or mode == "Cash_Micro":
                    micro_count += 1
                    cash_micro_rev += amt
                    item_margin = 0.21  # Dairy/curd/snacks carry ~21% counter margin
                    for k, meta in cls.MICRO_ITEMS_CATALOG.items():
                        if k in phone_tag:
                            item_margin = meta["margin_pct"]
                            break
                else:
                    upi_rev += amt

                day_profit += amt * item_margin

            day_cogs = max(0.0, day_revenue - day_profit)
            margin_pct = round((day_profit / day_revenue) * 100, 1) if day_revenue > 0 else round(avg_store_margin * 100, 1)

            total_7d_revenue += day_revenue
            total_7d_profit += day_profit
            total_7d_micro_sales += cash_micro_rev
            total_7d_micro_count += micro_count

            trend_days.append({
                "date": date_str,
                "day": day_short,
                "label": day_display,
                "revenue": round(day_revenue),
                "profit": round(day_profit),
                "cogs": round(day_cogs),
                "upi_revenue": round(upi_rev),
                "micro_revenue": round(cash_micro_rev),
                "micro_count": micro_count,
                "tx_count": len(rows),
                "margin_pct": margin_pct
            })

        conn.close()

        # Compute day-over-day profit growth
        if len(trend_days) >= 2 and trend_days[-2]["profit"] > 0:
            dod_growth = round(((trend_days[-1]["profit"] - trend_days[-2]["profit"]) / trend_days[-2]["profit"]) * 100, 1)
        else:
            dod_growth = 14.2

        return {
            "days": trend_days,
            "summary": {
                "total_7d_revenue": round(total_7d_revenue),
                "total_7d_profit": round(total_7d_profit),
                "avg_daily_profit": round(total_7d_profit / max(1, len(trend_days))),
                "avg_margin_pct": round((total_7d_profit / total_7d_revenue) * 100, 1) if total_7d_revenue > 0 else 17.2,
                "total_7d_micro_sales": round(total_7d_micro_sales),
                "total_7d_micro_count": total_7d_micro_count,
                "today_profit": trend_days[-1]["profit"] if trend_days else 0,
                "today_revenue": trend_days[-1]["revenue"] if trend_days else 0,
                "dod_growth_pct": dod_growth
            }
        }

    @staticmethod
    def get_all_transactions(limit: int = 100):
        conn = get_connection()
        TransactionService._ensure_recent_7day_seed(conn)
        cursor = conn.cursor()

        # Summary statistics (excluding Loan Disbursal principal from retail sales volume)
        cursor.execute("SELECT COUNT(*) as count, SUM(amount) as total_volume FROM transactions WHERE payment_mode != 'Loan_Disbursal'")
        total_row = cursor.fetchone()
        total_count = total_row["count"] if total_row and total_row["count"] else 0
        total_volume = total_row["total_volume"] if total_row and total_row["total_volume"] else 0.0

        # Today's volume
        today_str = datetime.now().strftime("%Y-%m-%d")
        cursor.execute(
            "SELECT SUM(amount) as today_vol, COUNT(*) as today_cnt FROM transactions WHERE timestamp LIKE ? AND payment_mode != 'Loan_Disbursal'",
            (f"{today_str}%",)
        )
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

        profit_trends = TransactionService.get_daily_profit_trends(7)

        return {
            "total_count": total_count,
            "total_volume": round(total_volume, 2),
            "today_volume": round(today_volume, 2),
            "today_count": today_count,
            "soundbox_count": soundbox_count,
            "soundbox_volume": round(soundbox_volume, 2),
            "transactions": transactions,
            "profit_trends": profit_trends
        }

    @staticmethod
    def simulate_payment(amount: float, customer_phone: str = "+91 9810998877", payment_mode: str = "UPI_Soundbox", item_tag: str = None):
        conn = get_connection()
        cursor = conn.cursor()

        txn_id = f"TXN_{int(datetime.now().timestamp() * 1000) % 100000000}"
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        phone_or_label = f"Micro: {item_tag} ₹{int(amount)}" if item_tag else customer_phone

        cursor.execute("""
        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, ?, ?, ?, 'SUCCESS')
        """, (txn_id, float(amount), phone_or_label, payment_mode, timestamp_str))

        conn.commit()
        conn.close()

        # Hindi pronunciation conversion for Soundbox Chime
        hindi_numbers = {
            10: "das", 14: "chaudah", 15: "pandrah", 20: "bees", 25: "pachhees",
            28: "atthaees", 30: "tees", 40: "chalees", 50: "pachaas", 100: "ek sau",
            150: "ek sau pachaas", 200: "do sau", 250: "dhai sau", 300: "teen sau",
            350: "saadhe teen sau", 400: "char sau", 450: "char sau pachaas",
            500: "paanch sau", 800: "aath sau", 1000: "ek hazaar", 1200: "baarah sau",
            1500: "pandrah sau", 2000: "do hazaar", 2500: "dhai hazaar", 5000: "paanch hazaar"
        }
        amt_spoken = hindi_numbers.get(int(amount), f"{int(amount)}")
        if item_tag:
            speech_text = f"Paytm galla mein {item_tag} ke {amt_spoken} rupaye darj ho gaye."
        else:
            speech_text = f"Paytm par {amt_spoken} rupaye prapt hue."

        return {
            "success": True,
            "transaction": {
                "txn_id": txn_id,
                "amount": amount,
                "customer_phone": phone_or_label,
                "payment_mode": payment_mode,
                "timestamp": timestamp_str,
                "status": "SUCCESS"
            },
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount,
                "currency": "INR"
            },
            "profit_trends": TransactionService.get_daily_profit_trends(7)
        }
