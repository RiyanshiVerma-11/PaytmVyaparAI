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
        email TEXT DEFAULT 'ramesh.kirana@paytm.com',
        password TEXT DEFAULT '1234',
        otp TEXT,
        otp_expiry TEXT,
        upi_id TEXT DEFAULT '8171008964@ptaxis',
        address TEXT,
        bank_name TEXT DEFAULT 'Paytm Payments Bank',
        bank_account_masked TEXT DEFAULT '•••• 4519',
        ifsc_code TEXT DEFAULT 'PYTM0123456',
        auth_token TEXT DEFAULT 'merchant_sec_9811223344',
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

    # 5. Supplier Purchase Orders (Email POs & Real Delivery Tracking)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS supplier_pos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT,
        supplier_name TEXT,
        supplier_email TEXT,
        item_name TEXT,
        quantity INTEGER,
        total_cost REAL,
        status TEXT DEFAULT 'PO_DISPATCHED_PENDING_DELIVERY',
        sent_at TEXT,
        expected_delivery_date TEXT,
        delivery_received_at TEXT,
        delivery_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'DELIVERED', 'CANCELLED'
        email_status TEXT DEFAULT 'DISPATCHED_TO_OUTBOX', -- 'SENT_VIA_SMTP', 'DISPATCHED_TO_OUTBOX'
        email_raw TEXT
    )
    """)

    # 6. UPI Soundbox Transactions (Telemetry for Credit Scoring)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        txn_id TEXT,
        amount REAL,
        customer_phone TEXT,
        payment_mode TEXT, -- 'UPI_Soundbox', 'Cash', 'Loan_Disbursal'
        timestamp TEXT,
        status TEXT DEFAULT 'SUCCESS'
    )
    """)

    # Safe Schema Migrations for existing database
    def add_col_if_missing(table, col, col_def):
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [c["name"] for c in cursor.fetchall()]
        if col not in cols:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
            except Exception as e:
                print(f"Migration notice ({table}.{col}): {e}")

    add_col_if_missing("merchants", "email", "TEXT DEFAULT 'ramesh.kirana@paytm.com'")
    add_col_if_missing("merchants", "password", "TEXT DEFAULT '1234'")
    add_col_if_missing("merchants", "otp", "TEXT")
    add_col_if_missing("merchants", "otp_expiry", "TEXT")
    add_col_if_missing("merchants", "bank_name", "TEXT DEFAULT 'Paytm Payments Bank'")
    add_col_if_missing("merchants", "bank_account_masked", "TEXT DEFAULT '•••• 4519'")
    add_col_if_missing("merchants", "ifsc_code", "TEXT DEFAULT 'PYTM0123456'")
    add_col_if_missing("merchants", "auth_token", "TEXT DEFAULT 'merchant_sec_9811223344'")

    add_col_if_missing("customers", "merchant_id", "INTEGER DEFAULT 1")
    add_col_if_missing("khata_entries", "merchant_id", "INTEGER DEFAULT 1")
    add_col_if_missing("inventory", "merchant_id", "INTEGER DEFAULT 1")
    add_col_if_missing("transactions", "merchant_id", "INTEGER DEFAULT 1")
    add_col_if_missing("supplier_pos", "merchant_id", "INTEGER DEFAULT 1")

    add_col_if_missing("supplier_pos", "expected_delivery_date", "TEXT")
    add_col_if_missing("supplier_pos", "delivery_received_at", "TEXT")
    add_col_if_missing("supplier_pos", "delivery_status", "TEXT DEFAULT 'PENDING'")
    add_col_if_missing("supplier_pos", "email_status", "TEXT DEFAULT 'DISPATCHED_TO_OUTBOX'")
    add_col_if_missing("supplier_pos", "email_raw", "TEXT")

    # Update any existing records where merchant_id is null to 1 (Ramesh Kirana Demo)
    for tbl in ["customers", "khata_entries", "inventory", "transactions", "supplier_pos"]:
        try:
            cursor.execute(f"UPDATE {tbl} SET merchant_id = 1 WHERE merchant_id IS NULL OR merchant_id = 0")
        except Exception:
            pass

    conn.commit()

    # Seed data if empty
    cursor.execute("SELECT COUNT(*) FROM merchants WHERE id = 1")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # Seed Merchant (Ramesh Sharma - Demo Merchant)
    cursor.execute("""
    INSERT OR REPLACE INTO merchants (id, name, shop_name, phone, email, password, upi_id, address, bank_name, bank_account_masked, ifsc_code, auth_token, credit_health_score, pre_approved_loan_amount, loan_runway_days)
    VALUES (1, 'Ramesh Sharma', 'Sharma Kirana Store', '+91 9811223344', 'ramesh.kirana@paytm.com', '1234', '8171008964@ptaxis', 'Shop #14, Sector 18 Market, Noida', 'Paytm Payments Bank', '•••• 4519', 'PYTM0123456', 'merchant_sec_9811223344', 88, 75000, 45)
    """)

    # Check if demo customer data exists for merchant 1
    cursor.execute("SELECT COUNT(*) FROM customers WHERE merchant_id = 1")
    if cursor.fetchone()[0] == 0:
        today = datetime.now()
        customers_data = [
            (1, 'Ramesh Kumar', '+91 9810112233', 14200, 450, today.strftime("%Y-%m-%d"), 24, 'Normal'),
            (1, 'Pooja Gupta', '+91 9876543210', 8900, 800, today.strftime("%Y-%m-%d"), 18, 'Normal'),
            (1, 'Manoj Verma', '+91 9899123456', 5600, 1200, (today - timedelta(days=34)).strftime("%Y-%m-%d"), 12, 'At-Risk'),
            (1, 'Ananya Singh', '+91 9911223344', 19500, 0, today.strftime("%Y-%m-%d"), 32, 'Normal'),
            (1, 'Rajesh Chawla', '+91 9711556677', 3400, 650, (today - timedelta(days=48)).strftime("%Y-%m-%d"), 7, 'Dormant'),
            (1, 'Sunil Yadav', '+91 9818889900', 7100, 0, (today - timedelta(days=2)).strftime("%Y-%m-%d"), 15, 'Normal')
        ]
        cursor.executemany("""
        INSERT INTO customers (merchant_id, name, phone, total_spent, pending_udhaar, last_visit_date, visit_count, churn_risk)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, customers_data)

        # Seed Khata Entries for Demo Merchant
        cursor.execute("""
        INSERT INTO khata_entries (merchant_id, customer_id, customer_name, amount, item_description, entry_type, created_at, status)
        VALUES 
        (1, 1, 'Ramesh Kumar', 450, '1L Fortune Refine Tel + 1kg Salt', 'udhaar', datetime('now', '-2 hours'), 'pending'),
        (1, 2, 'Pooja Gupta', 800, 'Aashirvaad Atta 5kg + Surf Excel', 'udhaar', datetime('now', '-1 day'), 'pending'),
        (1, 3, 'Manoj Verma', 1200, 'Monthly Provisions Balance', 'udhaar', datetime('now', '-34 days'), 'pending'),
        (1, 5, 'Rajesh Chawla', 650, 'Masala & Ghee', 'udhaar', datetime('now', '-48 days'), 'pending')
        """)

    # Seed Inventory for Demo Merchant
    cursor.execute("SELECT COUNT(*) FROM inventory WHERE merchant_id = 1")
    if cursor.fetchone()[0] == 0:
        inventory_data = [
            (1, 'Amul Butter 100g', 'Dairy', 3, 10, 'Pack', 58.0, 51.0, 'Delhi Dairy Wholesale Hub', 'orders@delhidairy.mock'),
            (1, 'Fortune Refined Oil 1L', 'Oil & Ghee', 2, 8, 'Pouch', 145.0, 130.0, 'Gupta Oil & Grains Traders', 'orders@guptatraders.mock'),
            (1, 'Maggi 2-Minute Noodles', 'Snacks', 6, 24, 'Pack', 14.0, 11.5, 'Nestle Regional Distributor', 'restock@nestledistributor.mock'),
            (1, 'Tata Salt 1kg', 'Groceries', 19, 10, 'Pouch', 28.0, 23.0, 'National FMCG Suppliers', 'orders@nationalfmcg.mock'),
            (1, 'Parle-G Biscuits', 'Biscuits', 8, 15, 'Pack', 10.0, 8.2, 'National FMCG Suppliers', 'orders@nationalfmcg.mock'),
            (1, 'Aashirvaad Shudh Chakki Atta 5kg', 'Flour', 2, 6, 'Bag', 240.0, 215.0, 'Gupta Oil & Grains Traders', 'orders@guptatraders.mock'),
            (1, 'Surf Excel Quick Wash 1kg', 'Detergent', 7, 5, 'Pack', 135.0, 118.0, 'Delhi FMCG Depot', 'orders@delhifmcg.mock'),
            (1, 'Taj Mahal Tea 250g', 'Beverages', 14, 8, 'Box', 160.0, 138.0, 'National FMCG Suppliers', 'orders@nationalfmcg.mock')
        ]
        cursor.executemany("""
        INSERT INTO inventory (merchant_id, item_name, category, current_stock, reorder_threshold, unit, unit_price, wholesale_price, supplier_name, supplier_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, inventory_data)

    # Seed 30 Days of Soundbox UPI Transactions for Demo Merchant
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE merchant_id = 1")
    if cursor.fetchone()[0] == 0:
        transactions_seed = []
        base_time = datetime.now() - timedelta(days=30)
        for i in range(75):
            t_time = base_time + timedelta(hours=i * 9.5)
            t_amount = 30 + (i * 17) % 650
            transactions_seed.append((
                1,
                f"TXN_{100000 + i}",
                float(t_amount),
                f"+91 9810{100000 + i}",
                'UPI_Soundbox',
                t_time.strftime("%Y-%m-%d %H:%M:%S"),
                'SUCCESS'
            ))
        cursor.executemany("""
        INSERT INTO transactions (merchant_id, txn_id, amount, customer_phone, payment_mode, timestamp, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, transactions_seed)

    conn.commit()

def reset_demo_data(conn=None):
    """
    Reset Demo Merchant 1 database tables to pristine baseline demo state for Hackathon judges & evaluations.
    Does NOT wipe out real newly registered merchant accounts or their stocks.
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True
    
    cursor = conn.cursor()
    tables = ["customers", "khata_entries", "inventory", "supplier_pos", "transactions"]
    for tbl in tables:
        cursor.execute(f"DELETE FROM {tbl} WHERE merchant_id = 1")
    cursor.execute("DELETE FROM merchants WHERE id = 1")
    conn.commit()
    seed_data(conn)
    if should_close:
        conn.close()
    return True

if __name__ == "__main__":
    init_db()
    print("Vyapar Database Initialized and Seeded Successfully!")
