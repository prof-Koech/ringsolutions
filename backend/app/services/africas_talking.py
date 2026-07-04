import africastalking
from flask import current_app
import logging

logger = logging.getLogger(__name__)


class AfricasTalkingService:

    def _init_sdk(self):
        africastalking.initialize(
            username=current_app.config["AT_USERNAME"],
            api_key=current_app.config["AT_API_KEY"],
        )
        return africastalking.SMS

    def send_bulk(self, recipients: list[str], message: str, sender_id: str = None) -> dict:
        """
        Send bulk SMS via Africa's Talking.
        recipients: list of E.164 phone numbers e.g. ['+254712345678']
        Returns dict with per-number results.
        """
        sms = self._init_sdk()

        # Normalize phones to E.164
        normalized = []
        for phone in recipients:
            phone = phone.strip().replace(" ", "").replace("-", "")
            if phone.startswith("0"):
                phone = "+254" + phone[1:]
            elif phone.startswith("254"):
                phone = "+" + phone
            elif not phone.startswith("+"):
                phone = "+254" + phone
            normalized.append(phone)

        kwargs = {
            "message": message,
            "recipients": normalized,
        }

        if sender_id:
            kwargs["sender_id"] = sender_id

        try:
            response = sms.send(**kwargs)
            results = {}
            for recipient in response.get("SMSMessageData", {}).get("Recipients", []):
                results[recipient["number"]] = {
                    "status": recipient["status"],
                    "message_id": recipient.get("messageId"),
                    "cost": recipient.get("cost"),
                    "status_code": recipient.get("statusCode"),
                }
            return {"success": True, "results": results, "raw": response}
        except Exception as e:
            logger.error(f"Africa's Talking SMS error: {e}")
            return {"success": False, "error": str(e), "results": {}}

    def get_delivery_report(self, message_id: str) -> dict:
        """Fetch delivery report for a specific message."""
        sms = self._init_sdk()
        try:
            response = sms.fetch_messages(last_received_id=0)
            return {"success": True, "data": response}
        except Exception as e:
            logger.error(f"Africa's Talking delivery report error: {e}")
            return {"success": False, "error": str(e)}

    def parse_delivery_callback(self, data: dict) -> dict:
        """Parse incoming delivery report webhook."""
        return {
            "message_id": data.get("id"),
            "status": data.get("status"),
            "phone": data.get("phoneNumber"),
            "network_code": data.get("networkCode"),
            "failure_reason": data.get("failureReason"),
        }

    def estimate_sms_units(self, message: str) -> int:
        """Calculate number of SMS units for a message."""
        length = len(message)
        if length <= 160:
            return 1
        return (length // 153) + (1 if length % 153 > 0 else 0)


at_service = AfricasTalkingService()
