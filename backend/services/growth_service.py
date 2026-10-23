from database import get_connection

class GrowthService:
    @staticmethod
    def get_campaigns():
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers ORDER BY last_visit_date ASC")
        customers = [dict(r) for r in cursor.fetchall()]
        conn.close()

        campaigns = []
        for c in customers:
            if c["churn_risk"] in ["At-Risk", "Dormant"]:
                discount = 25 if c["churn_risk"] == "At-Risk" else 50
                msg = f"Namaste {c['name']} ji! Sharma Kirana me aapka swagat hai. Aaj visit karein aur paayein Flat Rs.{discount} OFF on pure grocery bill. Code: PAYTMVYAPAR"
                sms_uri = f"sms:{c['phone']}?body={msg.replace(' ', '%20')}"
                campaigns.append({
                    "customer_name": c["name"],
                    "phone": c["phone"],
                    "churn_risk": c["churn_risk"],
                    "last_visit": c["last_visit_date"],
                    "suggested_discount": f"₹{discount} OFF",
                    "sms_uri": sms_uri,
                    "sms_preview": msg
                })

        return {
            "total_at_risk": len(campaigns),
            "campaigns": campaigns,
            "festive_alert": {
                "festival": "Navratri & Festive Spike",
                "days_left": 6,
                "surge_multiplier": "3.4x Demand Spike",
                "high_demand_items": ["Fortune Refined Oil", "Aashirvaad Atta", "Taj Mahal Tea", "Dry Fruits Pack"],
                "recommendation": "Advance wholesale booking recommended to lock in 4% higher merchant margins."
            }
        }
