from database import get_connection

class CreditService:
    @staticmethod
    def calculate_underwriting(merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch merchant profile dynamically
        cursor.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
        m_row = cursor.fetchone()
        if not m_row:
            cursor.execute("SELECT * FROM merchants LIMIT 1")
            m_row = cursor.fetchone()
        merchant = dict(m_row) if m_row else {
            "id": 1, "name": "Ramesh Sharma", "shop_name": "Sharma Kirana Store",
            "bank_name": "Paytm Payments Bank", "bank_account_masked": "•••• 4519", "ifsc_code": "PYTM0123456",
            "loan_runway_days": 45
        }

        # 2. Real QR Sales Volume (CRITICAL: payment_mode != 'Loan_Disbursal' prevents loan inflation!)
        cursor.execute("""
        SELECT COALESCE(SUM(amount), 0) as total_upi, COUNT(*) as count 
        FROM transactions 
        WHERE payment_mode != 'Loan_Disbursal' AND status = 'SUCCESS'
        """)
        tx_row = dict(cursor.fetchone() or {"total_upi": 0, "count": 0})
        total_upi = float(tx_row.get("total_upi") or 0.0)
        tx_count = int(tx_row.get("count") or 0)

        # 3. Real Khata Receivables & Recovery Disciplines
        cursor.execute("SELECT COALESCE(SUM(pending_udhaar), 0) as total_udhaar, COUNT(*) as total_customers FROM customers")
        cust_row = dict(cursor.fetchone() or {"total_udhaar": 0, "total_customers": 0})
        total_udhaar = float(cust_row.get("total_udhaar") or 0.0)
        total_customers = int(cust_row.get("total_customers") or 0)

        cursor.execute("SELECT COALESCE(SUM(amount), 0) FROM khata_entries WHERE entry_type = 'jama'")
        total_jama = float(cursor.fetchone()[0] or 0.0)

        cursor.execute("SELECT COUNT(*) FROM customers WHERE churn_risk = 'Normal'")
        active_customers = int(cursor.fetchone()[0] or 0)

        # Check for insufficient data
        if total_upi == 0 and tx_count == 0 and total_customers == 0 and total_udhaar == 0:
            return {
                "merchant_id": merchant["id"],
                "merchant_name": merchant["name"],
                "shop_name": merchant["shop_name"],
                "credit_health_score": 0,
                "rating": "Insufficient History",
                "status": "insufficient_data",
                "message": "Insufficient transaction history for underwriting.",
                "pre_approved_loan": 0,
                "tenure_months": 0,
                "monthly_emi": 0.0,
                "daily_edi": 0.0,
                "interest_rate": "N/A",
                "working_capital_runway_days": merchant.get("loan_runway_days", 45),
                "soundbox_30d_volume": 0.0,
                "soundbox_tx_count": 0,
                "pending_receivables": 0.0,
                "total_recovered": 0.0,
                "recovery_rate_pct": 0.0,
                "factors": {
                    "cashflow_volume": {"score": 0.0, "max": 30, "label": "₹0 30-day volume"},
                    "cashflow_frequency": {"score": 0.0, "max": 10, "label": "0 transactions"},
                    "repayment_recovery": {"score": 0.0, "max": 35, "label": "No ledger history"},
                    "customer_retention": {"score": 0.0, "max": 15, "label": "0 registered patrons"},
                    "store_stability": {"score": 0.0, "max": 10, "label": "New merchant profile"}
                },
                "prototype_assumptions": "Prototype assumptions: Loan limits and interest rates are illustrative sandbox modeling parameters for Paytm Lending Rails.",
                "bank_name": merchant.get("bank_name", "Paytm Payments Bank"),
                "bank_account": merchant.get("bank_account_masked", "•••• 4519"),
                "ifsc": merchant.get("ifsc_code", "PYTM0123456"),
                "instant_disbursement_ready": False
            }

        # -------------------------------------------------------------
        # 4. MATHEMATICAL UNDERWRITING FORMULA (0 - 100 Score Scale)
        # -------------------------------------------------------------
        # A. Cashflow Volume & Velocity (Max 40 points)
        vol_score = min(30.0, (total_upi / 40000.0) * 30.0) if total_upi > 0 else 0.0
        freq_score = min(10.0, (tx_count / 50.0) * 10.0) if tx_count > 0 else 0.0
        cashflow_points = vol_score + freq_score

        # B. Khata Recovery & Repayment Discipline (Max 35 points)
        total_book = total_jama + total_udhaar
        if total_book > 0:
            recovery_ratio = total_jama / total_book
        else:
            recovery_ratio = 0.0
        recovery_points = min(35.0, recovery_ratio * 35.0)

        # C. Customer Retention & Repeat Business (Max 15 points)
        if total_customers > 0:
            retention_ratio = active_customers / total_customers
        else:
            retention_ratio = 0.0
        retention_points = min(15.0, retention_ratio * 15.0)

        # D. Store Vintage & Breadth (Max 10 points)
        stability_points = min(10.0, total_customers * 1.25)

        computed_score = int(round(cashflow_points + recovery_points + retention_points + stability_points))
        # No artificial minimum score of 45! Mathematical scale from 0 to 99
        credit_score = max(0, min(99, computed_score))

        # -------------------------------------------------------------
        # 5. DYNAMIC RISK TIER, PRICING & PRE-APPROVED FACILITY
        # -------------------------------------------------------------
        if credit_score >= 82:
            tier = "Tier-1 Prime (Low Risk)"
            monthly_rate = 0.0095  # 0.95% / mo
            rate_label = "0.95% per month flat"
            tenure_months = 12
            loan_multiplier = 2.0
        elif credit_score >= 68:
            tier = "Tier-2 Standard (Moderate Risk)"
            monthly_rate = 0.0125  # 1.25% / mo
            rate_label = "1.25% per month flat"
            tenure_months = 9
            loan_multiplier = 1.3
        else:
            tier = "Tier-3 Growth (Building Credit)"
            monthly_rate = 0.0160  # 1.60% / mo
            rate_label = "1.60% per month flat"
            tenure_months = 6
            loan_multiplier = 0.75

        # Dynamic pre-approved amount scaled directly to monthly cashflow
        calculated_loan = int(round((total_upi * loan_multiplier) / 1000) * 1000) if total_upi > 0 else 0
        pre_approved_loan = max(0, min(150000, calculated_loan)) if credit_score >= 40 else 0

        total_repayable = pre_approved_loan * (1.0 + (monthly_rate * tenure_months))
        monthly_emi = round(total_repayable / tenure_months, 2) if tenure_months > 0 else 0.0
        daily_edi = round(total_repayable / (tenure_months * 30), 2) if tenure_months > 0 else 0.0

        # Sync computed metrics back to merchant record in DB
        cursor.execute("""
        UPDATE merchants 
        SET credit_health_score = ?, pre_approved_loan_amount = ?
        WHERE id = ?
        """, (credit_score, pre_approved_loan, merchant["id"]))
        conn.commit()
        conn.close()

        factors = {
            "cashflow_volume": {"score": round(vol_score, 1), "max": 30, "label": f"₹{int(total_upi):,} 30-day volume"},
            "cashflow_frequency": {"score": round(freq_score, 1), "max": 10, "label": f"{tx_count} successful payments"},
            "repayment_recovery": {"score": round(recovery_points, 1), "max": 35, "label": f"{round(recovery_ratio*100, 1)}% recovery rate"},
            "customer_retention": {"score": round(retention_points, 1), "max": 15, "label": f"{active_customers}/{total_customers} active patrons"},
            "store_stability": {"score": round(stability_points, 1), "max": 10, "label": f"{total_customers} registered patrons"}
        }

        return {
            "merchant_id": merchant["id"],
            "merchant_name": merchant["name"],
            "shop_name": merchant["shop_name"],
            "credit_health_score": credit_score,
            "rating": f"{tier} (Pre-Approved)" if pre_approved_loan > 0 else f"{tier}",
            "pre_approved_loan": pre_approved_loan,
            "tenure_months": tenure_months,
            "monthly_emi": monthly_emi,
            "daily_edi": daily_edi,
            "interest_rate": rate_label,
            "working_capital_runway_days": merchant.get("loan_runway_days", 45),
            "soundbox_30d_volume": round(total_upi, 2),
            "soundbox_tx_count": tx_count,
            "pending_receivables": round(total_udhaar, 2),
            "total_recovered": round(total_jama, 2),
            "recovery_rate_pct": round(recovery_ratio * 100, 1),
            "factors": factors,
            "prototype_assumptions": "Prototype assumptions: Loan limits (0.75x–2.0x 30d cashflow) and interest rates (0.95%–1.60%/mo) are illustrative sandbox modeling parameters for Paytm Lending Rails.",
            "bank_name": merchant.get("bank_name", "Paytm Payments Bank"),
            "bank_account": merchant.get("bank_account_masked", "•••• 4519"),
            "ifsc": merchant.get("ifsc_code", "PYTM0123456"),
            "instant_disbursement_ready": pre_approved_loan > 0
        }

    @classmethod
    def get_merchant_credit_health(cls, merchant_id: int = 1):
        return cls.calculate_underwriting(merchant_id)

    @classmethod
    def disburse_loan(cls, amount: float, merchant_id: int = 1):
        # 1. First get current live underwriting
        health = cls.calculate_underwriting(merchant_id)
        pre_approved = health["pre_approved_loan"]

        amount = float(amount)
        if amount <= 0:
            return {"success": False, "message": "Disbursal amount must be greater than zero."}

        # 2. Strict Limit Validation: Cannot exceed pre-approved facility!
        if amount > pre_approved:
            err_msg = f"Requested amount ₹{int(amount):,} exceeds your pre-approved credit limit of ₹{int(pre_approved):,}."
            return {
                "success": False,
                "error": err_msg,
                "message": err_msg
            }

        conn = get_connection()
        cursor = conn.cursor()

        # 3. Dynamic runway calculation based on average daily operating volume
        daily_burn = max(health["soundbox_30d_volume"] / 30.0, 500.0)
        added_runway_days = int(round(amount / daily_burn))
        current_runway = health["working_capital_runway_days"]
        new_runway = current_runway + added_runway_days
        new_limit = max(0, pre_approved - int(amount))

        # 4. Update merchant database record
        cursor.execute("""
        UPDATE merchants 
        SET loan_runway_days = ?, pre_approved_loan_amount = ?
        WHERE id = ?
        """, (new_runway, new_limit, merchant_id))

        # 5. Log transaction tagged as 'Loan_Disbursal' (Strictly excluded from merchant QR volume)
        txn_id = f"LN_DISB_{int(amount)}_{int(merchant_id)}"
        cursor.execute("""
        INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, '+91 Paytm Payments Bank', 'Loan_Disbursal', datetime('now'), 'SUCCESS')
        """, (txn_id, float(amount)))

        conn.commit()
        conn.close()

        speech_text = f"Badhaai ho! Aapka Paytm Vyapar Loan {int(amount)} rupaye simulation mein manzoor ho gaya hai aur store balance credit ho gaya hai."

        return {
            "success": True,
            "mode": "SIMULATION_SANDBOX",
            "simulation_notice": "Loan approved in simulation. No real funds disbursed.",
            "loan_amount": amount,
            "bank_name": health["bank_name"],
            "bank_account": f"{health['bank_name']} {health['bank_account']}",
            "ifsc": health["ifsc"],
            "txn_id": txn_id,
            "previous_runway_days": current_runway,
            "new_runway_days": new_runway,
            "daily_edi": health["daily_edi"],
            "soundbox_payload": {
                "chime": True,
                "speech_text": speech_text,
                "amount": amount
            }
        }

