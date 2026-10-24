import os
import sys
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

# Load environment variables (.env)
try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except Exception:
    pass

from database import init_db, reset_demo_data
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService
from services.transaction_service import TransactionService
from services.chatbot_service import ChatbotService
from services.auth_service import AuthService
from agent.react_agent import ReactAgent

from fastapi.middleware.cors import CORSMiddleware

# Initialize DB
init_db()

app = FastAPI(title="Paytm Vyapar Saathi", version="1.0.0")

# Enable CORS for external frontends (e.g. Vercel, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ChatQuery(BaseModel):
    query: str

class KhataEntryRequest(BaseModel):
    customer_name: str
    amount: float
    item_description: str = "General Kirana Items"
    entry_type: str = "udhaar"
    phone: str = None

class KhataSettleRequest(BaseModel):
    customer_id: int

class KhataUndoRequest(BaseModel):
    entry_id: int

class PORequest(BaseModel):
    item_name: str
    quantity: int = None
    merchant_id: int = 1
    custom_vendor_email: str = None

class UpdateMerchantEmailRequest(BaseModel):
    email: str
    merchant_id: int = 1

class DailyPulseEmailRequest(BaseModel):
    custom_email: str = None
    merchant_id: int = 1

class ReceivePORequest(BaseModel):
    po_identifier: str

class InventoryItemRequest(BaseModel):
    item_name: str
    category: str = "Groceries"
    current_stock: int = 10
    reorder_threshold: int = 5
    unit: str = "Pack"
    unit_price: float = 50.0
    wholesale_price: float = 42.0
    supplier_name: str = "National FMCG Suppliers"
    supplier_email: str = "orders@nationalfmcg.mock"

class SimulateTxnRequest(BaseModel):
    amount: float
    customer_phone: str = "+91 9810998877"
    payment_mode: str = "UPI_Soundbox"
    item_tag: str = None

class LoanDisburseRequest(BaseModel):
    amount: float = 50000.0
    merchant_id: int = 1

class ChatbotMessageRequest(BaseModel):
    message: str
    session_id: str = "default_merchant"

class RegisterMerchantRequest(BaseModel):
    name: str
    shop_name: str
    email: str
    phone: str
    password: str
    upi_id: str = None
    address: str = None

class LoginMerchantRequest(BaseModel):
    login_id: str
    password: str

class SendOtpRequest(BaseModel):
    login_id: str

class VerifyOtpRequest(BaseModel):
    login_id: str
    otp: str
    new_password: str = None

# Routes: Merchant Authentication & Multi-Tenant Access
@app.post("/api/auth/register")
async def register_merchant(req: RegisterMerchantRequest):
    try:
        res = AuthService.register_merchant(
            req.name, req.shop_name, req.email, req.phone, req.password, req.upi_id, req.address
        )
        return JSONResponse(content=res)
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Server error: {e}"})

@app.post("/api/auth/login")
async def login_merchant(req: LoginMerchantRequest):
    try:
        res = AuthService.login_merchant(req.login_id, req.password)
        return JSONResponse(content=res)
    except ValueError as ve:
        return JSONResponse(status_code=401, content={"success": False, "message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Server error: {e}"})

@app.post("/api/auth/forgot-password/send-otp")
async def send_forgot_password_otp(req: SendOtpRequest):
    try:
        res = AuthService.send_login_otp(req.login_id)
        return JSONResponse(content=res)
    except ValueError as ve:
        return JSONResponse(status_code=404, content={"success": False, "message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Server error: {e}"})

@app.post("/api/auth/forgot-password/verify-otp")
async def verify_forgot_password_otp(req: VerifyOtpRequest):
    try:
        res = AuthService.verify_login_otp(req.login_id, req.otp, req.new_password)
        return JSONResponse(content=res)
    except ValueError as ve:
        return JSONResponse(status_code=400, content={"success": False, "message": str(ve)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"success": False, "message": f"Server error: {e}"})

@app.get("/api/merchant/profile")
async def get_merchant_profile(merchant_id: int = 1):
    from database import get_connection
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
    m = cur.fetchone()
    if not m:
        cur.execute("SELECT * FROM merchants LIMIT 1")
        m = cur.fetchone()
    conn.close()
    return JSONResponse(content=dict(m) if m else {})

@app.post("/api/chatbot/message")
async def chatbot_message(req: ChatbotMessageRequest):
    res = ChatbotService.handle_message(req.message, req.session_id)
    return JSONResponse(content=res)

@app.get("/api/chatbot/context")
async def chatbot_context():
    return JSONResponse(content=ChatbotService.get_full_app_context())

@app.post("/api/chatbot/clear")
async def chatbot_clear(req: ChatbotMessageRequest):
    return JSONResponse(content=ChatbotService.clear_session(req.session_id))

@app.post("/api/agent/chat")
async def chat_with_agent(req: ChatQuery):
    response = ReactAgent.process_query(req.query)
    return JSONResponse(content=response)

@app.get("/api/khata")
async def get_khata():
    return JSONResponse(
        content=KhataService.get_all_entries(),
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache"
        }
    )

@app.post("/api/khata/entry")
async def add_khata_entry(req: KhataEntryRequest):
    res = KhataService.record_entry(req.customer_name, req.amount, req.item_description, req.entry_type, req.phone)
    return JSONResponse(content=res)

@app.post("/api/khata/settle")
async def settle_khata_customer(req: KhataSettleRequest):
    res = KhataService.settle_customer(req.customer_id)
    return JSONResponse(content=res)

@app.post("/api/khata/entry/undo")
async def undo_khata_entry(req: KhataUndoRequest):
    res = KhataService.undo_entry(req.entry_id)
    return JSONResponse(content=res)

@app.post("/api/merchant/update-email")
async def update_merchant_email(req: UpdateMerchantEmailRequest):
    from database import get_connection
    clean_email = req.email.strip()
    if not clean_email or "@" not in clean_email:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid email address."})
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("UPDATE merchants SET email = ? WHERE id = ?", (clean_email, req.merchant_id))
    if cur.rowcount == 0:
        cur.execute("UPDATE merchants SET email = ?", (clean_email,))
    conn.commit()
    cur.execute("SELECT * FROM merchants WHERE id = ?", (req.merchant_id,))
    m = cur.fetchone()
    if not m:
        cur.execute("SELECT * FROM merchants LIMIT 1")
        m = cur.fetchone()
    conn.close()
    return JSONResponse(content={
        "success": True,
        "email": clean_email,
        "merchant": dict(m) if m else {},
        "message": f"Merchant email updated to {clean_email}."
    })

@app.get("/api/inventory")
async def get_inventory():
    return JSONResponse(content=InventoryService.get_inventory())

@app.post("/api/inventory/po")
async def create_po(req: PORequest):
    res = InventoryService.create_supplier_po(req.item_name, req.quantity, req.merchant_id, req.custom_vendor_email)
    return JSONResponse(content=res)

@app.post("/api/transactions/daily-pulse-email")
async def send_daily_pulse_email(req: DailyPulseEmailRequest):
    res = TransactionService.send_daily_profit_pulse_email(req.merchant_id, req.custom_email)
    return JSONResponse(content=res)

@app.post("/api/inventory/po/receive")
async def receive_po(req: ReceivePORequest):
    res = InventoryService.receive_supplier_delivery(req.po_identifier)
    return JSONResponse(content=res)

@app.post("/api/inventory/item")
async def add_inventory_item(req: InventoryItemRequest):
    res = InventoryService.add_or_update_item(
        req.item_name, req.category, req.current_stock, req.reorder_threshold,
        req.unit, req.unit_price, req.wholesale_price, req.supplier_name, req.supplier_email
    )
    return JSONResponse(content=res)

@app.get("/api/growth")
async def get_growth():
    return JSONResponse(content=GrowthService.get_campaigns())

@app.get("/api/credit")
async def get_credit(merchant_id: int = 1):
    return JSONResponse(content=CreditService.get_merchant_credit_health(merchant_id))

@app.post("/api/credit/disburse")
async def disburse_credit_loan(req: LoanDisburseRequest):
    res = CreditService.disburse_loan(req.amount, req.merchant_id)
    return JSONResponse(content=res)

@app.get("/api/transactions")
async def get_transactions(limit: int = 100):
    return JSONResponse(content=TransactionService.get_all_transactions(limit))

@app.get("/api/transactions/profit-trends")
async def get_profit_trends(days: int = 7):
    return JSONResponse(content=TransactionService.get_daily_profit_trends(days))

@app.post("/api/transactions/simulate")
async def simulate_transaction(req: SimulateTxnRequest):
    res = TransactionService.simulate_payment(req.amount, req.customer_phone, req.payment_mode, req.item_tag)
    return JSONResponse(content=res)

# Demo Management Endpoints for Hackathon Judges
@app.post("/api/demo/reset")
@app.post("/api/merchant/reset-demo")
async def reset_demo():
    reset_demo_data()
    return JSONResponse(content={
        "success": True,
        "message": "Demo data reset successfully to Sharma Kirana baseline! / डेमो डेटा रीसेट हो गया।",
        "demo_merchant": "Ramesh Sharma - Sharma Kirana Store",
        "mode": "DEMO_RESET_COMPLETE",
        "notice": "A fully populated demo merchant is provided so judges can test the complete product without manual onboarding."
    })

@app.get("/api/demo/status")
async def get_demo_status():
    return JSONResponse(content={
        "is_demo_account": True,
        "demo_merchant_name": "Sharma Kirana Store",
        "owner": "Ramesh Sharma",
        "demo_notice": "A fully populated demo merchant is provided so judges can test the complete product without manual onboarding.",
        "auth_credentials": {
            "email": "ramesh.kirana@paytm.com",
            "pin": "1234"
        }
    })


# Static files & Frontend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
    
    css_dir = os.path.join(FRONTEND_DIR, "css")
    if os.path.exists(css_dir):
        app.mount("/css", StaticFiles(directory=css_dir), name="css")
        
    js_dir = os.path.join(FRONTEND_DIR, "js")
    if os.path.exists(js_dir):
        app.mount("/js", StaticFiles(directory=js_dir), name="js")

    @app.get("/")
    @app.get("/index.html")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
