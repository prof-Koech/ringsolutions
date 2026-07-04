from flask import Blueprint, jsonify, send_file, current_app, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from io import BytesIO
from ..models.campaign import Campaign
from ..models.user import User
from ..services.pdf_service import generate_campaign_report, render_campaign_report_html

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/campaign/<campaign_id>/pdf", methods=["GET"])
@jwt_required()
def download_campaign_report(campaign_id):
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()
    user = User.query.get(user_id)

    if campaign.status not in ("completed", "sending"):
        return jsonify({"error": "Report only available for completed campaigns"}), 400

    pdf_bytes = generate_campaign_report(campaign, user)

    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"ringsolutions_report_{campaign.name.replace(' ', '_')}.pdf",
    )


@reports_bp.route("/campaign/<campaign_id>/html", methods=["GET"])
@jwt_required()
def print_campaign_report(campaign_id):
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()
    user = User.query.get(user_id)

    if campaign.status not in ("completed", "sending"):
        return jsonify({"error": "Report only available for completed campaigns"}), 400

    html = render_campaign_report_html(campaign, user, auto_print=True)
    resp = make_response(html)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    resp.headers["Cache-Control"] = "no-store"
    return resp


@reports_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard_stats():
    from datetime import datetime, timedelta
    from ..extensions import db
    from sqlalchemy import func
    from ..models.wallet import Wallet, Transaction
    from ..models.message import Message

    user_id = get_jwt_identity()

    wallet = Wallet.query.filter_by(user_id=user_id).first()

    campaigns = Campaign.query.filter_by(user_id=user_id)
    total_campaigns = campaigns.count()
    completed = campaigns.filter_by(status="completed").count()
    active = campaigns.filter(Campaign.status.in_(["queued", "sending", "scheduled"])).count()

    # Last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    recent_campaigns = Campaign.query.filter(
        Campaign.user_id == user_id,
        Campaign.created_at >= thirty_days_ago,
    ).all()

    total_sent = sum(c.sms_sent + c.whatsapp_sent for c in recent_campaigns)
    total_delivered = sum(c.sms_delivered + c.whatsapp_delivered for c in recent_campaigns)
    delivery_rate = round((total_delivered / total_sent * 100), 1) if total_sent else 0

    # Spending over last 30 days
    total_spent = db.session.query(
        func.sum(Transaction.amount)
    ).filter(
        Transaction.wallet_id == wallet.id,
        Transaction.transaction_type == Transaction.DEBIT,
        Transaction.status == Transaction.COMPLETED,
        Transaction.created_at >= thirty_days_ago,
    ).scalar() or 0

    return jsonify({
        "wallet_balance": float(wallet.balance) if wallet else 0,
        "total_campaigns": total_campaigns,
        "completed_campaigns": completed,
        "active_campaigns": active,
        "messages_sent_30d": total_sent,
        "delivery_rate_30d": delivery_rate,
        "spent_30d": float(total_spent),
        "currency": "KES",
    })
