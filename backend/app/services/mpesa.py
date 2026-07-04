import base64
import requests
from datetime import datetime
from flask import current_app


class MpesaService:

    @property
    def base_url(self):
        env = current_app.config["MPESA_ENVIRONMENT"]
        if env == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    def get_access_token(self):
        consumer_key = current_app.config["MPESA_CONSUMER_KEY"]
        consumer_secret = current_app.config["MPESA_CONSUMER_SECRET"]
        credentials = base64.b64encode(f"{consumer_key}:{consumer_secret}".encode()).decode()

        resp = requests.get(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {credentials}"},
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()["access_token"]

    def generate_password(self):
        shortcode = current_app.config["MPESA_SHORTCODE"]
        passkey = current_app.config["MPESA_PASSKEY"]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        raw = f"{shortcode}{passkey}{timestamp}"
        password = base64.b64encode(raw.encode()).decode()
        return password, timestamp

    def stk_push(self, phone: str, amount: float, account_ref: str, description: str):
        """Initiate Lipa Na M-Pesa STK Push."""
        token = self.get_access_token()
        password, timestamp = self.generate_password()
        shortcode = current_app.config["MPESA_SHORTCODE"]
        callback_url = current_app.config["MPESA_CALLBACK_URL"]

        # Normalize phone: strip + and ensure 254 prefix
        phone = phone.replace("+", "").replace(" ", "").replace("-", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif not phone.startswith("254"):
            phone = "254" + phone

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": shortcode,
            "PhoneNumber": phone,
            "CallBackURL": callback_url,
            "AccountReference": account_ref[:12],
            "TransactionDesc": description[:13],
        }

        resp = requests.post(
            f"{self.base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def query_stk_status(self, checkout_request_id: str):
        """Check the status of an STK Push request."""
        token = self.get_access_token()
        password, timestamp = self.generate_password()
        shortcode = current_app.config["MPESA_SHORTCODE"]

        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }

        resp = requests.post(
            f"{self.base_url}/mpesa/stkpushquery/v1/query",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()
        return resp.json()

    def parse_callback(self, callback_data: dict):
        """Parse M-Pesa STK callback and extract key fields."""
        body = callback_data.get("Body", {})
        stk = body.get("stkCallback", {})
        result_code = stk.get("ResultCode")
        result_desc = stk.get("ResultDesc", "")
        checkout_request_id = stk.get("CheckoutRequestID")
        merchant_request_id = stk.get("MerchantRequestID")

        metadata = {}
        if result_code == 0:
            items = stk.get("CallbackMetadata", {}).get("Item", [])
            for item in items:
                name = item.get("Name")
                value = item.get("Value")
                metadata[name] = value

        return {
            "result_code": result_code,
            "result_desc": result_desc,
            "checkout_request_id": checkout_request_id,
            "merchant_request_id": merchant_request_id,
            "amount": metadata.get("Amount"),
            "mpesa_receipt_number": metadata.get("MpesaReceiptNumber"),
            "transaction_date": metadata.get("TransactionDate"),
            "phone": metadata.get("PhoneNumber"),
            "success": result_code == 0,
        }


mpesa_service = MpesaService()
