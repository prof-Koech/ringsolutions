from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models.wallet import Wallet, Transaction
from ..models.message import Message
from ..models.notification import Notification
from ..services.mpesa import mpesa_service
from ..services.africas_talking import at_service
from ..services.whatsapp import wa_service

webhooks_bp = Blueprint("webhooks", __name__)


@webhooks_bp.route("/mpesa/callback", methods=["POST"])
def mpesa_callback():
    """Handle M-Pesa STK Push callback."""
    data = request.get_json(silent=True) or {}
    parsed = mpesa_service.parse_callback(data)

    checkout_id = parsed.get("checkout_request_id")
    if not checkout_id:
        return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

    transaction = Transaction.query.filter_by(
        mpesa_checkout_request_id=checkout_id
    ).first()

    if not transaction:
        return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200

    if parsed["success"]:
        amount = float(parsed.get("amount") or transaction.amount)
        wallet = transaction.wallet
        balance_before = float(wallet.balance)
        wallet.balance = float(wallet.balance) + amount

        transaction.status = Transaction.COMPLETED
        transaction.amount = amount
        transaction.balance_before = balance_before
        transaction.balance_after = float(wallet.balance)
        transaction.mpesa_receipt_number = parsed.get("mpesa_receipt_number")
        transaction.completed_at = datetime.utcnow()

        notif = Notification(
            user_id=wallet.user_id,
            title="Wallet Topped Up",
            message=f"KES {amount:,.2f} has been added to your wallet. Receipt: {parsed.get('mpesa_receipt_number')}",
            notification_type="payment",
        )
        db.session.add(notif)
    else:
        transaction.status = Transaction.FAILED
        transaction.failure_reason = parsed.get("result_desc", "Payment failed")

        notif = Notification(
            user_id=transaction.wallet.user_id,
            title="Top-Up Failed",
            message=f"M-Pesa payment failed: {parsed.get('result_desc', 'Unknown error')}",
            notification_type="payment",
        )
        db.session.add(notif)

    db.session.commit()
    return jsonify({"ResultCode": 0, "ResultDesc": "Accepted"}), 200


@webhooks_bp.route("/africas-talking/delivery", methods=["POST"])
def at_delivery_report():
    """Africa's Talking SMS delivery report webhook."""
    data = request.form.to_dict() or request.get_json(silent=True) or {}
    parsed = at_service.parse_delivery_callback(data)

    message_id = parsed.get("message_id")
    if not message_id:
        return jsonify({"ok": True}), 200

    message = Message.query.filter_by(provider_message_id=message_id).first()
    if not message:
        return jsonify({"ok": True}), 200

    status_map = {
        "Success": Message.STATUS_DELIVERED,
        "Sent": Message.STATUS_SENT,
        "Failed": Message.STATUS_FAILED,
        "Rejected": Message.STATUS_REJECTED,
    }

    new_status = status_map.get(parsed.get("status"), message.status)
    message.status = new_status
    message.provider_status = parsed.get("status")
    message.failure_reason = parsed.get("failure_reason")

    if new_status == Message.STATUS_DELIVERED:
        message.delivered_at = datetime.utcnow()
        message.campaign.sms_delivered += 1
    elif new_status == Message.STATUS_FAILED:
        message.failed_at = datetime.utcnow()

    db.session.commit()
    return jsonify({"ok": True}), 200


@webhooks_bp.route("/whatsapp", methods=["GET"])
def whatsapp_verify():
    """WhatsApp webhook verification."""
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == current_app.config["WHATSAPP_VERIFY_TOKEN"]:
        return challenge, 200
    return "Forbidden", 403


@webhooks_bp.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    """Handle WhatsApp status update webhooks."""
    data = request.get_json(silent=True) or {}
    updates = wa_service.parse_webhook(data)

    for update in updates:
        message_id = update.get("message_id")
        status = update.get("status")

        if not message_id:
            continue

        message = Message.query.filter_by(provider_message_id=message_id).first()
        if not message:
            continue

        status_map = {
            "sent": Message.STATUS_SENT,
            "delivered": Message.STATUS_DELIVERED,
            "read": Message.STATUS_READ,
            "failed": Message.STATUS_FAILED,
        }
        new_status = status_map.get(status, message.status)
        message.status = new_status

        campaign = message.campaign
        if status == "delivered":
            message.delivered_at = datetime.utcnow()
            campaign.whatsapp_delivered += 1
        elif status == "read":
            message.read_at = datetime.utcnow()
            campaign.whatsapp_read += 1
        elif status == "failed":
            message.failed_at = datetime.utcnow()
            campaign.whatsapp_failed += 1

    db.session.commit()
    return jsonify({"ok": True}), 200


@webhooks_bp.route("/africas-talking/inbound", methods=["POST"])
def at_inbound():
    """Handle inbound SMS (opt-outs like STOP)."""
    from ..models.contact import Blacklist
    data = request.form.to_dict()
    phone = data.get("from", "")
    message_text = data.get("text", "").strip().upper()

    # Auto opt-out on STOP/UNSUBSCRIBE
    opt_out_keywords = {"STOP", "UNSUBSCRIBE", "QUIT", "END", "CANCEL", "OPTOUT"}
    if message_text in opt_out_keywords and phone:
        from ..utils.validators import normalize_phone
        normalized = normalize_phone(phone)
        if normalized:
            from ..models.contact import Contact
            Contact.query.filter_by(phone=normalized).update({"is_opted_out": True})
            db.session.commit()

    return jsonify({"ok": True}), 200
