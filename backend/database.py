import sqlite3
import os
import json
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "vyapar.db")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Merchant Profile
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS merchants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        shop_name TEXT,
        phone TEXT,
        upi_id TEXT,
        address TEXT,
        credit_health_score INTEGER DEFAULT 88,
        pre_approved_loan_amount INTEGER DEFAULT 75000,
        loan_runway_days INTEGER DEFAULT 45
    )
    """)

    # 2. Customers
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        total_spent REAL DEFAULT 0,
        pending_udhaar REAL DEFAULT 0,
        last_visit_date TEXT,
        visit_count INTEGER DEFAULT 1,
        churn_risk TEXT DEFAULT 'Normal' -- 'Normal', 'At-Risk', 'Dormant'
    )
    """)

    # 3. Khata (Udhaar Ledger)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS khata_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        customer_name TEXT,
        amount REAL,
        item_description TEXT,
        entry_type TEXT, -- 'udhaar' or 'jama'
        created_at TEXT,
        status TEXT DEFAULT 'pending', -- 'pending' or 'settled'
        FOREIGN KEY (customer_id) REFERENCES customers (id)
    )
    """)

    # 4. Inventory
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT UNIQUE,
        category TEXT,
        current_stock INTEGER,
        reorder_threshold INTEGER,
        unit TEXT,
        unit_price REAL,
        wholesale_price REAL,
        supplier_name TEXT,
        supplier_email TEXT
    )
    """)

    # 5. Supplier Purchase Orders (Email POs)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS supplier_pos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT,
        supplier_name TEXT,
        supplier_email TEXT,
        item_name TEXT,
        quantity INTEGER,
        total_cost REAL,
        status TEXT, -- 'Drafted', 'Sent_via_Email', 'Delivered'
        sent_at TEXT
    )
    """)

    # 6. UPI Soundbox Transactions (Telemetry for Credit Scoring)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        txn_id TEXT,
        amount REAL,
        customer_phone TEXT,
        payment_mode TEXT, -- 'UPI_Soundbox', 'Cash'
        timestamp TEXT,
        status TEXT DEFAULT 'SUCCESS'
    )
    """)

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM merchants")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # Seed Merchant
    cursor.execute("""
    INSERT INTO merchants (name, shop_name, phone, upi_id, address, credit_health_score, pre_approved_loan_amount, loan_runway_days)
    VALUES ('Ramesh Sharma', 'Sharma Kirana & General Store', '+91 9811223344', 'paytm@sharmakirana', 'Shop #14, Main Market, Chandni Chowk, Delhi', 88, 75000, 45)
    """)

    # Seed Customers
    today = datetime.now()
    customers_data = [
        ('Ramesh Kumar', '+91 9810112233', 14200, 450, today.strftime("%Y-%m-%d"), 24, 'Normal'),
        ('Pooja Gupta', '+91 9876543210', 8900, 800, today.strftime("%Y-%m-%d"), 18, 'Normal'),
        ('Manoj Verma', '+91 9899123456', 5600, 1200, (today - timedelta(days=34)).strftime("%Y-%m-%d"), 12, 'At-Risk'),
        ('Ananya Singh', '+91 9911223344', 19500, 0, today.strftime("%Y-%m-%d"), 32, 'Normal'),
        ('Rajesh Chawla', '+91 9711556677', 3400, 650, (today - timedelta(days=48)).strftime("%Y-%m-%d"), 7, 'Dormant'),
        ('Sunil Yadav', '+91 9818889900', 7100, 0, (today - timedelta(days=2)).strftime("%Y-%m-%d"), 15, 'Normal')
    ]
    cursor.executemany("""
    INSERT INTO customers (name, phone, total_spent, pending_udhaar, last_visit_date, visit_count, churn_risk)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, customers_data)

    # Seed Khata Entries
    cursor.execute("""
    INSERT INTO khata_entries (customer_id, customer_name, amount, item_description, entry_type, created_at, status)
    VALUES 
    (1, 'Ramesh Kumar', 450, '1L Fortune Refine Tel + 1kg Salt', 'udhaar', datetime('now', '-2 hours'), 'pending'),
    (2, 'Pooja Gupta', 800, 'Aashirvaad Atta 5kg + Surf Excel', 'udhaar', datetime('now', '-1 day'), 'pending'),
    (3, 'Manoj Verma', 1200, 'Monthly Provisions Balance', 'udhaar', datetime('now', '-34 days'), 'pending'),
    (5, 'Rajesh Chawla', 650, 'Masala & Ghee', 'udhaar', datetime('now', '-48 days'), 'pending')
    """)

    # Seed Inventory (Top FMCG items in Indian Kirana)
    inventory_data = [
        ('Amul Butter 100g', 'Dairy', 3, 10, 'Pack', 58.0, 51.0, 'Delhi Dairy Wholesale Hub', 'orders@delhidairy.mock'),
        ('Fortune Refined Oil 1L', 'Oil & Ghee', 2, 8, 'Pouch', 145.0, 130.0, 'Gupta Oil & Grains Traders', 'orders@guptatraders.mock'),
        ('Maggi 2-Minute Noodles', 'Snacks', 6, 24, 'Pack', 14.0, 11.5, 'Nestle Regional Distributor', 'restock@nestledistributor.mock'),
        ('Tata Salt 1kg', 'Groceries', 19, 10, 'Pouch', 28.0, 23.0, 'National FMCG Suppliers', 'orders@nationalfmcg.mock'),
        ('Parle-G Biscuits', 'Biscuits', 8, 15, 'Pack', 10.0, 8.2, 'National FMCG Suppliers', 'orders@nationalfmcg.mock'),
        ('Aashirvaad Shudh Chakki Atta 5kg', 'Flour', 2, 6, 'Bag', 240.0, 215.0, 'Gupta Oil & Grains Traders', 'orders@guptatraders.mock'),
        ('Surf Excel Quick Wash 1kg', 'Detergent', 7, 5, 'Pack', 135.0, 118.0, 'Delhi FMCG Depot', 'orders@delhifmcg.mock'),
        ('Taj Mahal Tea 250g', 'Beverages', 14, 8, 'Box', 160.0, 138.0, 'National FMCG Suppliers', 'orders@nationalfmcg.mock')
    ]
    cursor.executemany("""
    INSERT INTO inventory (item_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, inventory_data)

    # Seed 30 Days of Soundbox UPI Transactions for Credit Scoring
    transactions_seed = []
    base_time = datetime.now() - timedelta(days=30)
    for i in range(75):
        t_time = base_time + timedelta(hours=i * 9.5)
        t_amount = 30 + (i * 17) % 650
        transactions_seed.append((
            f"TXN_{100000 + i}",
            float(t_amount),
            f"+91 9810{100000 + i}",
            'UPI_Soundbox',
            t_time.strftime("%Y-%m-%d %H:%M:%S"),
            'SUCCESS'
        ))
    cursor.executemany("""
    INSERT INTO transactions (txn_id, amount, customer_phone, payment_mode, timestamp, status)
    VALUES (?, ?, ?, ?, ?, ?)
    """, transactions_seed)

    conn.commit()

if __name__ == "__main__":
    init_db()
    print("Vyapar Database Initialized and Seeded Successfully!")
