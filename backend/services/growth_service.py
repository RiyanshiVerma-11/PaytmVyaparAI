import os
from datetime import datetime
from database import get_connection

class GrowthService:
    @staticmethod
    def get_campaigns(merchant_id: int = 1):
        conn = get_connection()
        cursor = conn.cursor()

        # 1. Fetch dynamic merchant details
        cursor.execute("SELECT shop_name, phone FROM merchants WHERE id = ? OR id = 1 LIMIT 1", (merchant_id,))
        m_row = cursor.fetchone()
        shop_title = m_row["shop_name"] if m_row and m_row["shop_name"] else "Paytm Kirana Store"

        # 2. Fetch customers evaluated by visit recency
        cursor.execute("SELECT * FROM customers ORDER BY last_visit_date ASC")
        customers = [dict(r) for r in cursor.fetchall()]

        # 3. Fetch top inventory items for seasonal recommendations
        cursor.execute("SELECT item_name, category FROM inventory ORDER BY current_stock ASC LIMIT 4")
        inv_items = [r["item_name"] for r in cursor.fetchall()]

        conn.close()

        campaigns = []
        for c in customers:
            if c["churn_risk"] in ["At-Risk", "Dormant"]:
                discount = 25 if c["churn_risk"] == "At-Risk" else 50
                msg = f"Namaste {c['name']} ji! {shop_title} me aapka swagat hai. Aaj visit karein aur paayein Flat Rs.{discount} OFF on pure grocery bill. Code: PAYTMVYAPAR"
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

        # 4. Dynamic seasonal intelligence based on current calendar month
        month = datetime.now().month
        if month in [10, 11]:
            fest_name = "Diwali & Festive Season Rush"
            surge = "3.2x Demand Spike"
        elif month in [12, 1]:
            fest_name = "New Year & Winter Provisions Surge"
            surge = "2.4x Demand Spike"
        elif month in [2, 3]:
            fest_name = "Holi & Harvest Festival Rush"
            surge = "2.8x Demand Spike"
        elif month in [4, 5]:
            fest_name = "Summer Essentials & Wedding Season"
            surge = "2.6x Demand Spike"
        elif month in [8, 9]:
            fest_name = "Raksha Bandhan & Ganesh Utsav Demand"
            surge = "2.9x Demand Spike"
        else:
            fest_name = "Monthly Kirana Restock Cycle"
            surge = "2.1x Grocery Demand"

        recommended_items = inv_items if inv_items else ["Fortune Refined Oil", "Aashirvaad Atta", "Taj Mahal Tea", "Tata Salt"]

        return {
            "total_at_risk": len(campaigns),
            "campaigns": campaigns,
            "festive_alert": {
                "festival": fest_name,
                "surge_multiplier": surge,
                "high_demand_items": recommended_items,
                "recommendation": f"Advance wholesale procurement via Paytm B2B recommended to protect {shop_title} margins."
            }
        }
