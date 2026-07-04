from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from ..extensions import db
from ..models.user import User
from ..models.campaign import Campaign
from ..models.wallet import Wallet, Transaction
from ..models.sender_id import SenderID
from ..utils.decorators import admin_required

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def platform_stats():
    from sqlalchemy import func
    total_users = User.query.count()
    verified_users = User.query.filter_by(is_verified=True).count()
    total_campaigns = Campaign.query.count()
    completed_campaigns = Campaign.query.filter_by(status="completed").count()
    total_revenue = db.session.query(func.sum(Transaction.amount)).filter_by(
        transaction_type="debit", status="completed"
    ).scalar() or 0

    return jsonify({
        "total_users": total_users,
        "verified_users": verified_users,
        "total_campaigns": total_campaigns,
        "completed_campaigns": completed_campaigns,
        "total_revenue_kes": float(total_revenue),
    })


@admin_bp.route("/users", methods=["GET"])
@admin_required
def list_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    search = request.args.get("search", "")

    q = User.query
    if search:
        q = q.filter(
            User.email.ilike(f"%{search}%") |
            User.first_name.ilike(f"%{search}%") |
            User.last_name.ilike(f"%{search}%")
        )

    paginated = q.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    users_data = []
    for user in paginated.items:
        wallet = Wallet.query.filter_by(user_id=user.id).first()
        u = user.to_dict()
        u["wallet_balance"] = float(wallet.balance) if wallet else 0
        u["campaign_count"] = Campaign.query.filter_by(user_id=user.id).count()
        users_data.append(u)

    return jsonify({
        "users": users_data,
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    })


@admin_bp.route("/users/<user_id>/suspend", methods=["POST"])
@admin_required
def suspend_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = False
    db.session.commit()
    return jsonify({"message": f"User {user.email} suspended"})


@admin_bp.route("/users/<user_id>/activate", methods=["POST"])
@admin_required
def activate_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = True
    if not user.is_verified:
        user.is_verified = True
    db.session.commit()
    return jsonify({"message": f"User {user.email} activated"})


@admin_bp.route("/users/<user_id>/wallet/credit", methods=["POST"])
@admin_required
def credit_user_wallet(user_id):
    data = request.get_json()
    amount = float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Amount must be positive"}), 400

    wallet = Wallet.query.filter_by(user_id=user_id).first_or_404()
    balance_before = float(wallet.balance)
    wallet.balance = float(wallet.balance) + amount

    tx = Transaction(
        wallet_id=wallet.id,
        transaction_type=Transaction.TOPUP,
        amount=amount,
        balance_before=balance_before,
        balance_after=float(wallet.balance),
        status=Transaction.COMPLETED,
        description=f"Admin credit: {data.get('reason', 'Manual credit')}",
    )
    db.session.add(tx)
    db.session.commit()

    return jsonify({"message": f"KES {amount} credited", "new_balance": float(wallet.balance)})


@admin_bp.route("/sender-ids", methods=["GET"])
@admin_required
def list_sender_ids():
    status = request.args.get("status", "pending")
    sender_ids = SenderID.query.filter_by(status=status).all()
    result = []
    for s in sender_ids:
        d = s.to_dict()
        d["user"] = s.user.to_dict() if s.user else None
        result.append(d)
    return jsonify({"sender_ids": result})


@admin_bp.route("/sender-ids/<sid_id>/approve", methods=["POST"])
@admin_required
def approve_sender_id(sid_id):
    from datetime import datetime, timedelta
    sender_id = SenderID.query.get_or_404(sid_id)
    sender_id.status = SenderID.STATUS_ACTIVE
    sender_id.expires_at = datetime.utcnow() + timedelta(days=30)
    db.session.commit()
    return jsonify({"message": "Sender ID approved"})


@admin_bp.route("/sender-ids/<sid_id>/reject", methods=["POST"])
@admin_required
def reject_sender_id(sid_id):
    data = request.get_json()
    sender_id = SenderID.query.get_or_404(sid_id)
    sender_id.status = SenderID.STATUS_REJECTED
    sender_id.admin_notes = data.get("reason", "")
    db.session.commit()
    return jsonify({"message": "Sender ID rejected"})


@admin_bp.route("/campaigns", methods=["GET"])
@admin_required
def list_all_campaigns():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated = Campaign.query.order_by(Campaign.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    campaigns_data = []
    for c in paginated.items:
        d = c.to_dict()
        d["user_email"] = c.user.email if c.user else None
        campaigns_data.append(d)

    return jsonify({
        "campaigns": campaigns_data,
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    })
