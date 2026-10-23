import os
import sys
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Add current directory to path
sys.path.append(os.path.dirname(__file__))

from database import init_db
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService
from agent.react_agent import ReactAgent

# Initialize DB
init_db()

app = FastAPI(title="Paytm Vyapar Saathi", version="1.0.0")

# Request Models
class ChatQuery(BaseModel):
    query: str

class KhataEntryRequest(BaseModel):
    customer_name: str
    amount: float
    item_description: str = "General Kirana Items"
    entry_type: str = "udhaar"
    phone: str = None

class PORequest(BaseModel):
    item_name: str
    quantity: int = 15

# Routes
@app.post("/api/agent/chat")
async def chat_with_agent(req: ChatQuery):
    response = ReactAgent.process_query(req.query)
    return JSONResponse(content=response)

@app.get("/api/khata")
async def get_khata():
    return JSONResponse(content=KhataService.get_all_entries())

@app.post("/api/khata/entry")
async def add_khata_entry(req: KhataEntryRequest):
    res = KhataService.record_entry(req.customer_name, req.amount, req.item_description, req.entry_type, req.phone)
    return JSONResponse(content=res)

@app.get("/api/inventory")
async def get_inventory():
    return JSONResponse(content=InventoryService.get_inventory())

@app.post("/api/inventory/po")
async def create_po(req: PORequest):
    res = InventoryService.create_supplier_po(req.item_name, req.quantity)
    return JSONResponse(content=res)

@app.get("/api/growth")
async def get_growth():
    return JSONResponse(content=GrowthService.get_campaigns())

@app.get("/api/credit")
async def get_credit():
    return JSONResponse(content=CreditService.get_merchant_credit_health())

# Static files & Frontend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
ASSETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets"))

if os.path.exists(ASSETS_DIR):
    app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
