import requests
import logging
from flask import current_app

logger = logging.getLogger(__name__)


class WhatsAppService:

    @property
    def api_url(self):
        version = current_app.config["WHATSAPP_API_VERSION"]
        phone_id = current_app.config["WHATSAPP_PHONE_NUMBER_ID"]
        return f"https://graph.facebook.com/{version}/{phone_id}/messages"

    @property
    def headers(self):
        token = current_app.config["WHATSAPP_ACCESS_TOKEN"]
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _normalize_phone(self, phone: str) -> str:
        phone = phone.strip().replace(" ", "").replace("-", "").replace("+", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        return phone

    def send_template_message(self, phone: str, template_name: str, language: str, components: list = None) -> dict:
        """Send an approved WhatsApp template message."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._normalize_phone(phone),
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
            },
        }

        if components:
            payload["template"]["components"] = components

        try:
            resp = requests.post(self.api_url, json=payload, headers=self.headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            messages = data.get("messages", [])
            message_id = messages[0]["id"] if messages else None
            return {"success": True, "message_id": message_id, "raw": data}
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            logger.error(f"WhatsApp API error sending to {phone}: {error_data}")
            return {"success": False, "error": str(e), "details": error_data}
        except Exception as e:
            logger.error(f"WhatsApp send error: {e}")
            return {"success": False, "error": str(e)}

    def send_text_message(self, phone: str, text: str) -> dict:
        """Send a plain text WhatsApp message (within 24h window)."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": self._normalize_phone(phone),
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        try:
            resp = requests.post(self.api_url, json=payload, headers=self.headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            messages = data.get("messages", [])
            message_id = messages[0]["id"] if messages else None
            return {"success": True, "message_id": message_id, "raw": data}
        except requests.exceptions.HTTPError as e:
            error_data = e.response.json() if e.response else {}
            logger.error(f"WhatsApp API error: {error_data}")
            return {"success": False, "error": str(e), "details": error_data}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def build_template_components(self, template_variables: dict) -> list:
        """Build template components from variable dict."""
        if not template_variables:
            return []

        body_params = [
            {"type": "text", "text": str(v)}
            for v in template_variables.values()
        ]

        return [{"type": "body", "parameters": body_params}]

    def get_templates(self) -> dict:
        """Fetch all approved templates from WhatsApp Business Account."""
        waba_id = current_app.config["WHATSAPP_BUSINESS_ACCOUNT_ID"]
        version = current_app.config["WHATSAPP_API_VERSION"]
        url = f"https://graph.facebook.com/{version}/{waba_id}/message_templates"
        params = {"status": "APPROVED", "limit": 100}

        try:
            resp = requests.get(url, headers=self.headers, params=params, timeout=30)
            resp.raise_for_status()
            return {"success": True, "templates": resp.json().get("data", [])}
        except Exception as e:
            logger.error(f"WhatsApp get templates error: {e}")
            return {"success": False, "error": str(e), "templates": []}

    def parse_webhook(self, data: dict) -> list:
        """Parse incoming WhatsApp webhook for status updates."""
        results = []
        try:
            entries = data.get("entry", [])
            for entry in entries:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    statuses = value.get("statuses", [])
                    for status in statuses:
                        results.append({
                            "message_id": status.get("id"),
                            "status": status.get("status"),
                            "timestamp": status.get("timestamp"),
                            "phone": status.get("recipient_id"),
                            "errors": status.get("errors", []),
                        })
        except Exception as e:
            logger.error(f"WhatsApp webhook parse error: {e}")
        return results


wa_service = WhatsAppService()
