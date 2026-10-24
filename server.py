import os
import sys
import json
import mimetypes
from urllib.parse import urlparse, parse_qs
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
ASSETS_DIR = os.path.join(ROOT_DIR, "assets")

sys.path.insert(0, BACKEND_DIR)

from database import init_db, get_connection, reset_demo_data
from services.khata_service import KhataService
from services.inventory_service import InventoryService
from services.growth_service import GrowthService
from services.credit_service import CreditService
from services.transaction_service import TransactionService
from services.chatbot_service import ChatbotService
from services.auth_service import AuthService
from agent.react_agent import ReactAgent

init_db()


class VyaparRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, data, status=200):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if path == "/api/merchant/profile":
                merchant_id = int(query.get("merchant_id", [1])[0])
                conn = get_connection()
                cur = conn.cursor()
                cur.execute("SELECT * FROM merchants WHERE id = ?", (merchant_id,))
                m = cur.fetchone()
                if not m:
                    cur.execute("SELECT * FROM merchants LIMIT 1")
                    m = cur.fetchone()
                conn.close()
                return self._send_json(dict(m) if m else {})
            elif path == "/api/chatbot/context":
                return self._send_json(ChatbotService.get_full_app_context())
            elif path == "/api/khata":
                return self._send_json(KhataService.get_all_entries())
            elif path == "/api/inventory":
                return self._send_json(InventoryService.get_inventory())
            elif path == "/api/growth":
                return self._send_json(GrowthService.get_campaigns())
            elif path == "/api/credit":
                merchant_id = int(query.get("merchant_id", [1])[0])
                return self._send_json(CreditService.get_merchant_credit_health(merchant_id))
            elif path == "/api/transactions":
                limit = int(query.get("limit", [100])[0])
                return self._send_json(TransactionService.get_all_transactions(limit))
            elif path == "/api/transactions/profit-trends":
                days = int(query.get("days", [7])[0])
                return self._send_json(TransactionService.get_daily_profit_trends(days))
            elif path == "/api/demo/status":
                return self._send_json({
                    "is_demo_account": True,
                    "demo_merchant_name": "Sharma Kirana Store",
                    "owner": "Ramesh Sharma",
                    "demo_notice": "A fully populated demo merchant is provided so judges can test the complete product without manual onboarding.",
                    "auth_credentials": {
                        "email": "ramesh.kirana@paytm.com",
                        "pin": "1234"
                    }
                })
            elif path == "/health":
                return self._send_json({"status": "ok"})
        except Exception as e:
            return self._send_json({"error": str(e)}, status=500)

        # Serve static files from /assets or /frontend
        if path.startswith("/assets/"):
            rel_path = path[len("/assets/"):]
            file_path = os.path.normpath(os.path.join(ASSETS_DIR, rel_path))
            if file_path.startswith(ASSETS_DIR) and os.path.isfile(file_path):
                return self._serve_file(file_path)

        if path == "/" or path == "":
            file_path = os.path.join(FRONTEND_DIR, "index.html")
            return self._serve_file(file_path)

        rel_path = path.lstrip("/")
        if rel_path.startswith("static/"):
            rel_path = rel_path[len("static/"):]
        file_path = os.path.normpath(os.path.join(FRONTEND_DIR, rel_path))
        if file_path.startswith(FRONTEND_DIR) and os.path.isfile(file_path):
            return self._serve_file(file_path)

        # SPA fallback to index.html
        return self._serve_file(os.path.join(FRONTEND_DIR, "index.html"))

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            body = self._read_json()
            if path == "/api/chatbot/message":
                res = ChatbotService.handle_message(
                    body.get("message", ""),
                    body.get("session_id", "default_merchant")
                )
                return self._send_json(res)
            elif path == "/api/chatbot/clear":
                res = ChatbotService.clear_session(body.get("session_id", "default_merchant"))
                return self._send_json(res)
            elif path == "/api/agent/chat":
                res = ReactAgent.process_query(body.get("query", ""))
                return self._send_json(res)
            elif path == "/api/khata/entry":
                res = KhataService.record_entry(
                    body.get("customer_name", ""),
                    float(body.get("amount", 0)),
                    body.get("item_description", "General Kirana Items"),
                    body.get("entry_type", "udhaar"),
                    body.get("phone")
                )
                return self._send_json(res)
            elif path == "/api/khata/settle":
                res = KhataService.settle_customer(int(body.get("customer_id", 0)))
                return self._send_json(res)
            elif path == "/api/inventory/po":
                qty = body.get("quantity")
                res = InventoryService.create_supplier_po(
                    body.get("item_name", ""),
                    int(qty) if qty is not None else None,
                    int(body.get("merchant_id", 1))
                )
                return self._send_json(res)
            elif path == "/api/inventory/po/receive":
                res = InventoryService.receive_supplier_delivery(body.get("po_identifier", ""))
                return self._send_json(res)
            elif path == "/api/inventory/item":
                res = InventoryService.add_or_update_item(
                    body.get("item_name", ""),
                    body.get("category", "Groceries"),
                    int(body.get("current_stock", 10)),
                    int(body.get("reorder_threshold", 5)),
                    body.get("unit", "Pack"),
                    float(body.get("unit_price", 50.0)),
                    float(body.get("wholesale_price", 42.0)),
                    body.get("supplier_name", "National FMCG Suppliers"),
                    body.get("supplier_email", "orders@nationalfmcg.mock")
                )
                return self._send_json(res)
            elif path == "/api/credit/disburse":
                res = CreditService.disburse_loan(
                    float(body.get("amount", 50000.0)),
                    int(body.get("merchant_id", 1))
                )
                return self._send_json(res)
            elif path == "/api/transactions/simulate":
                res = TransactionService.simulate_payment(
                    float(body.get("amount", 250.0)),
                    body.get("customer_phone", "+91 9810998877"),
                    body.get("payment_mode", "UPI_Soundbox"),
                    body.get("item_tag")
                )
                return self._send_json(res)
            elif path == "/api/auth/register":
                res = AuthService.register_merchant(
                    body.get("name", ""),
                    body.get("shop_name", ""),
                    body.get("email", ""),
                    body.get("phone", ""),
                    body.get("password", ""),
                    body.get("upi_id"),
                    body.get("address")
                )
                return self._send_json(res)
            elif path == "/api/auth/login":
                try:
                    res = AuthService.login_merchant(
                        body.get("login_id", ""),
                        body.get("password", "")
                    )
                    return self._send_json(res)
                except ValueError as ve:
                    return self._send_json({"success": False, "message": str(ve)}, status=401)
            elif path == "/api/auth/forgot-password/send-otp":
                try:
                    res = AuthService.send_login_otp(body.get("login_id", ""))
                    return self._send_json(res)
                except ValueError as ve:
                    return self._send_json({"success": False, "message": str(ve)}, status=404)
            elif path == "/api/auth/forgot-password/verify-otp":
                try:
                    res = AuthService.verify_login_otp(
                        body.get("login_id", ""),
                        body.get("otp", ""),
                        body.get("new_password")
                    )
                    return self._send_json(res)
                except ValueError as ve:
                    return self._send_json({"success": False, "message": str(ve)}, status=400)
            elif path in ["/api/demo/reset", "/api/merchant/reset-demo"]:
                reset_demo_data()
                return self._send_json({
                    "success": True,
                    "message": "Demo data reset successfully to Sharma Kirana baseline!",
                    "demo_merchant": "Ramesh Sharma - Sharma Kirana Store",
                    "mode": "DEMO_RESET_COMPLETE"
                })
            else:
                return self._send_json({"error": "Not found"}, status=404)
        except Exception as e:
            return self._send_json({"error": str(e)}, status=500)

    def _serve_file(self, file_path):
        if not os.path.isfile(file_path):
            self.send_error(404, "File not found")
            return
        ctype, _ = mimetypes.guess_type(file_path)
        if not ctype:
            ctype = "application/octet-stream"
        with open(file_path, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    server = ThreadingHTTPServer(("0.0.0.0", port), VyaparRequestHandler)
    print(f"Paytm Vyapar Saathi server listening on http://0.0.0.0:{port}", flush=True)
    server.serve_forever()
