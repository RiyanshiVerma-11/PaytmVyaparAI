from database import get_connection

class CreditService:
    @staticmethod
    def get_merchant_credit_health():
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM merchants LIMIT 1")
        merchant = dict(cursor.fetchone())

        cursor.execute("SELECT SUM(amount) as total_upi, COUNT(*) as count FROM transactions")
        tx_row = cursor.fetchone()
        total_upi = tx_row["total_upi"] if tx_row and tx_row["total_upi"] else 38400.0
        tx_count = tx_row["count"] if tx_row and tx_row["count"] else 75

        cursor.execute("SELECT SUM(pending_udhaar) as total_udhaar FROM customers")
        udhaar_row = cursor.fetchone()
        total_udhaar = udhaar_row["total_udhaar"] if udhaar_row and udhaar_row["total_udhaar"] else 3100.0

        conn.close()

        score = merchant.get("credit_health_score", 88)
        loan_amount = merchant.get("pre_approved_loan_amount", 75000)

        return {
            "merchant_name": merchant["name"],
            "shop_name": merchant["shop_name"],
            "credit_health_score": score,
            "rating": "Tier-1 Low Risk (Pre-Approved)",
            "pre_approved_loan": loan_amount,
            "tenure_months": 12,
            "monthly_emi": round((loan_amount * 1.11) / 12, 2),
            "interest_rate": "1.1% per month flat",
            "working_capital_runway_days": merchant.get("loan_runway_days", 45),
            "soundbox_30d_volume": round(total_upi, 2),
            "soundbox_tx_count": tx_count,
            "pending_receivables": round(total_udhaar, 2),
            "instant_disbursement_ready": True
        }

    @staticmethod
    def disburse_loan(amount: float):
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM merchants LIMIT 1")
        merchant = cursor.fetchone()
        merchant_id = merchant["id"] if merchant else 1

        # Update merchant runway & reduce pre_approved_loan_amount
        cursor.execute("""
        UPDATE merchants 
        SET loan_runway_days = loan_runway_days + 60,
            pre_approved_loan_amount = MAX(0, pre_approved_loan_amount - ?)
        WHERE id = ?
        """, (int(amount), merchant_id))

        # Log credit transaction
        txn_id = f"LN_DISB_{int(amount)}_{merchant_id}"
        cursor.execute("""
        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, '+91 Paytm Payments Bank', 'Loan_Disbursal', datetime('now'), 'SUCCESS')
        """, (txn_id, float(amount)))

        conn.commit()
        conn.close()

        speech_text = f"Badhaai ho! Aapka Paytm Vyapar Loan {int(amount)} rupaye safalta-purvak aapke bank khate mein transfer kar diya gaya hai."

        return {
            "success": True,
            "loan_amount": amount,
            "bank_account": "Paytm Payments Bank •••• 4519",
            "ifsc": "PYTM0123456",
            "txn_id": txn_id,
            "new_runway_days": 105,
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount
            }
        }

