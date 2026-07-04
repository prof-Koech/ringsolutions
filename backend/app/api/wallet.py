from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.user import User
from ..models.wallet import Wallet, Transaction
from ..services.mpesa import mpesa_service
from ..utils.decorators import verified_required

wallet_bp = Blueprint("wallet", __name__)


@wallet_bp.route("/", methods=["GET"])
@jwt_required()
def get_wallet():
    user_id = get_jwt_identity()
    wallet = Wallet.query.filter_by(user_id=user_id).first()
    if not wallet:
        return jsonify({"error": "Wallet not found"}), 404
    return jsonify({"wallet": wallet.to_dict()})


@wallet_bp.route("/transactions", methods=["GET"])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    wallet = Wallet.query.filter_by(user_id=user_id).first()
    if not wallet:
        return jsonify({"transactions": []})

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated = (
        Transaction.query.filter_by(wallet_id=wallet.id)
        .order_by(Transaction.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        "transactions": [t.to_dict() for t in paginated.items],
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    })


@wallet_bp.route("/topup", methods=["POST"])
@verified_required
def initiate_topup():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    amount = data.get("amount")
    phone = data.get("phone", user.phone or "")

    if not amount or float(amount) < current_app.config["MINIMUM_TOPUP"]:
        return jsonify({"error": f"Minimum top-up is KES {current_app.config['MINIMUM_TOPUP']}"}), 400

    if not phone:
        return jsonify({"error": "M-Pesa phone number is required"}), 400

    amount = float(amount)
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    try:
        result = mpesa_service.stk_push(
            phone=phone,
            amount=amount,
            account_ref=f"RS{user_id[:8].upper()}",
            description="Wallet Topup",
        )
    except Exception as e:
        return jsonify({"error": f"M-Pesa error: {str(e)}"}), 502

    if result.get("ResponseCode") != "0":
        return jsonify({"error": result.get("CustomerMessage", "STK push failed")}), 400

    transaction = Transaction(
        wallet_id=wallet.id,
        transaction_type=Transaction.TOPUP,
        amount=amount,
        status=Transaction.PENDING,
        description=f"Wallet top-up via M-Pesa",
        mpesa_checkout_request_id=result.get("CheckoutRequestID"),
        mpesa_merchant_request_id=result.get("MerchantRequestID"),
        mpesa_phone=phone,
    )
    db.session.add(transaction)
    db.session.commit()

    return jsonify({
        "message": "STK Push sent. Enter your M-Pesa PIN on your phone.",
        "transaction_id": transaction.id,
        "checkout_request_id": result.get("CheckoutRequestID"),
        "customer_message": result.get("CustomerMessage"),
    })


@wallet_bp.route("/topup/status/<transaction_id>", methods=["GET"])
@jwt_required()
def check_topup_status(transaction_id):
    user_id = get_jwt_identity()
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    transaction = Transaction.query.filter_by(
        id=transaction_id, wallet_id=wallet.id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    # If still pending and callback hasn't arrived yet, query Safaricom directly
    # and resolve the transaction — important for sandbox where callbacks may not fire
    if transaction.status == Transaction.PENDING and transaction.mpesa_checkout_request_id:
        try:
            result = mpesa_service.query_stk_status(transaction.mpesa_checkout_request_id)
            result_code = str(result.get("ResultCode", ""))
            if result_code == "0":
                amount = float(transaction.amount)
                balance_before = float(wallet.balance)
                wallet.balance = balance_before + amount
                transaction.status = Transaction.COMPLETED
                transaction.balance_before = balance_before
                transaction.balance_after = float(wallet.balance)
                from datetime import datetime as _dt
                transaction.completed_at = _dt.utcnow()
                db.session.commit()
            elif result_code not in ("", "1032"):
                # 1032 = request cancelled by user; other non-zero = failure
                transaction.status = Transaction.FAILED
                transaction.failure_reason = result.get("ResultDesc", "Payment failed")
                db.session.commit()
        except Exception:
            pass  # Network error — let polling retry

    return jsonify({"transaction": transaction.to_dict()})


@wallet_bp.route("/topup/cancel/<transaction_id>", methods=["POST"])
@jwt_required()
def cancel_topup(transaction_id):
    user_id = get_jwt_identity()
    wallet = Wallet.query.filter_by(user_id=user_id).first()

    transaction = Transaction.query.filter_by(
        id=transaction_id, wallet_id=wallet.id
    ).first()

    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404

    if transaction.status != Transaction.PENDING:
        return jsonify({"error": "Only pending transactions can be cancelled"}), 400

    transaction.status = Transaction.CANCELLED
    transaction.failure_reason = "Cancelled by user"
    db.session.commit()

    return jsonify({"message": "Transaction cancelled"})


@wallet_bp.route("/pricing", methods=["GET"])
@jwt_required()
def get_pricing():
    return jsonify({
        "sms_per_message": current_app.config["SMS_PRICE_PER_MESSAGE"],
        "whatsapp_per_message": current_app.config["WHATSAPP_PRICE_PER_MESSAGE"],
        "custom_sender_id_fee": current_app.config["CUSTOM_SENDER_ID_FEE"],
        "minimum_topup": current_app.config["MINIMUM_TOPUP"],
        "currency": "KES",
    })


@wallet_bp.route("/estimate", methods=["POST"])
@jwt_required()
def estimate_cost():
    data = request.get_json()
    channel = data.get("channel", "sms")
    contact_count = int(data.get("contact_count", 0))
    use_custom_sender = data.get("use_custom_sender_id", False)

    sms_cost = 0
    wa_cost = 0
    sender_fee = 0

    if channel in ("sms", "both"):
        sms_cost = contact_count * current_app.config["SMS_PRICE_PER_MESSAGE"]
    if channel in ("whatsapp", "both"):
        wa_cost = contact_count * current_app.config["WHATSAPP_PRICE_PER_MESSAGE"]
    if use_custom_sender:
        sender_fee = current_app.config["CUSTOM_SENDER_ID_FEE"]

    total = sms_cost + wa_cost + sender_fee

    return jsonify({
        "sms_cost": round(sms_cost, 2),
        "whatsapp_cost": round(wa_cost, 2),
        "custom_sender_id_fee": round(sender_fee, 2),
        "total": round(total, 2),
        "currency": "KES",
    })
