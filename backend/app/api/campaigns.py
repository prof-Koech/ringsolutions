from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.campaign import Campaign
from ..models.contact import ContactList, Contact, Blacklist
from ..models.wallet import Wallet, Transaction
from ..models.notification import Notification
from ..utils.decorators import verified_required

campaigns_bp = Blueprint("campaigns", __name__)


def _calculate_campaign_cost(channel, contact_count, use_custom_sender, config):
    sms_cost = wa_cost = sender_fee = 0
    if channel in ("sms", "both"):
        sms_cost = contact_count * config["SMS_PRICE_PER_MESSAGE"]
    if channel in ("whatsapp", "both"):
        wa_cost = contact_count * config["WHATSAPP_PRICE_PER_MESSAGE"]
    if use_custom_sender:
        sender_fee = config["CUSTOM_SENDER_ID_FEE"]
    return round(sms_cost + wa_cost + sender_fee, 2)


@campaigns_bp.route("/", methods=["GET"])
@jwt_required()
def list_campaigns():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status = request.args.get("status")

    q = Campaign.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)

    paginated = q.order_by(Campaign.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return jsonify({
        "campaigns": [c.to_dict() for c in paginated.items],
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    })


@campaigns_bp.route("/", methods=["POST"])
@verified_required
def create_campaign():
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ["name", "message", "channel", "contact_list_id"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    channel = data["channel"]
    if channel not in ("sms", "whatsapp", "both"):
        return jsonify({"error": "channel must be sms, whatsapp, or both"}), 400

    contact_list = ContactList.query.filter_by(
        id=data["contact_list_id"], user_id=user_id
    ).first()
    if not contact_list:
        return jsonify({"error": "Contact list not found"}), 404

    valid_count = Contact.query.filter_by(
        contact_list_id=contact_list.id, is_valid=True, is_opted_out=False
    ).count()

    if valid_count == 0:
        return jsonify({"error": "Contact list has no valid contacts"}), 400

    use_custom_sender = bool(data.get("use_custom_sender_id", False))
    cost = _calculate_campaign_cost(
        channel, valid_count, use_custom_sender, current_app.config
    )

    scheduled_at = None
    is_scheduled = False
    if data.get("scheduled_at"):
        try:
            scheduled_at = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
            is_scheduled = True
        except ValueError:
            return jsonify({"error": "Invalid scheduled_at format. Use ISO 8601."}), 400

    campaign = Campaign(
        user_id=user_id,
        contact_list_id=contact_list.id,
        name=data["name"].strip(),
        message=data["message"],
        channel=channel,
        sender_id=data.get("sender_id", "").strip() or None,
        use_custom_sender_id=use_custom_sender,
        template_id=data.get("template_id"),
        template_variables=data.get("template_variables", {}),
        scheduled_at=scheduled_at,
        is_scheduled=is_scheduled,
        status=Campaign.STATUS_DRAFT,
        total_contacts=valid_count,
        estimated_cost=cost,
        report_color=data.get("report_color", "#1890ff"),
    )
    if use_custom_sender:
        campaign.custom_sender_id_fee = current_app.config["CUSTOM_SENDER_ID_FEE"]

    db.session.add(campaign)
    db.session.commit()

    return jsonify({"campaign": campaign.to_dict()}), 201


@campaigns_bp.route("/<campaign_id>", methods=["GET"])
@jwt_required()
def get_campaign(campaign_id):
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()
    return jsonify({"campaign": campaign.to_dict()})


@campaigns_bp.route("/<campaign_id>", methods=["PUT"])
@jwt_required()
def update_campaign(campaign_id):
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()

    if campaign.status not in (Campaign.STATUS_DRAFT, Campaign.STATUS_SCHEDULED):
        return jsonify({"error": "Only draft or scheduled campaigns can be edited"}), 400

    data = request.get_json()
    updatable = ["name", "message", "sender_id", "report_color", "template_variables"]
    for field in updatable:
        if field in data:
            setattr(campaign, field, data[field])

    if "scheduled_at" in data:
        if data["scheduled_at"]:
            try:
                campaign.scheduled_at = datetime.fromisoformat(data["scheduled_at"].replace("Z", "+00:00"))
                campaign.is_scheduled = True
            except ValueError:
                return jsonify({"error": "Invalid scheduled_at format"}), 400
        else:
            campaign.scheduled_at = None
            campaign.is_scheduled = False

    db.session.commit()
    return jsonify({"campaign": campaign.to_dict()})


@campaigns_bp.route("/<campaign_id>/pay", methods=["POST"])
@verified_required
def pay_campaign(campaign_id):
    """Debit wallet and queue campaign for sending."""
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()

    if campaign.status != Campaign.STATUS_DRAFT:
        return jsonify({"error": "Campaign is not in draft status"}), 400

    wallet = Wallet.query.filter_by(user_id=user_id).first()
    cost = float(campaign.estimated_cost)

    if float(wallet.balance) < cost:
        shortage = round(cost - float(wallet.balance), 2)
        return jsonify({
            "error": f"Insufficient wallet balance. You need KES {shortage:.2f} more.",
            "required": cost,
            "balance": float(wallet.balance),
            "shortage": shortage,
        }), 402

    # Debit wallet
    balance_before = float(wallet.balance)
    wallet.balance = float(wallet.balance) - cost

    tx = Transaction(
        wallet_id=wallet.id,
        campaign_id=campaign.id,
        transaction_type=Transaction.DEBIT,
        amount=cost,
        balance_before=balance_before,
        balance_after=float(wallet.balance),
        status=Transaction.COMPLETED,
        description=f"Campaign payment: {campaign.name}",
    )
    db.session.add(tx)
    campaign.status = Campaign.STATUS_QUEUED
    campaign.actual_cost = cost
    db.session.commit()

    # Queue the campaign
    from ..tasks.campaign_tasks import process_campaign
    if campaign.is_scheduled and campaign.scheduled_at:
        task = process_campaign.apply_async(
            args=[campaign.id], eta=campaign.scheduled_at
        )
        campaign.status = Campaign.STATUS_SCHEDULED
    else:
        task = process_campaign.delay(campaign.id)

    campaign.celery_task_id = task.id
    db.session.commit()

    notif = Notification(
        user_id=user_id,
        title="Campaign Queued",
        message=f'Your campaign "{campaign.name}" has been queued and will start sending shortly.',
        notification_type="campaign",
        link=f"/campaigns/{campaign.id}",
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({
        "message": "Payment successful. Campaign queued for sending.",
        "campaign": campaign.to_dict(),
    })


@campaigns_bp.route("/<campaign_id>/cancel", methods=["POST"])
@jwt_required()
def cancel_campaign(campaign_id):
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()

    if campaign.status not in (Campaign.STATUS_DRAFT, Campaign.STATUS_SCHEDULED, Campaign.STATUS_QUEUED):
        return jsonify({"error": "Cannot cancel a campaign that is already sending or completed"}), 400

    # Refund if paid
    if campaign.status in (Campaign.STATUS_SCHEDULED, Campaign.STATUS_QUEUED):
        wallet = Wallet.query.filter_by(user_id=user_id).first()
        refund_amount = float(campaign.actual_cost)
        if refund_amount > 0:
            balance_before = float(wallet.balance)
            wallet.balance = float(wallet.balance) + refund_amount
            refund_tx = Transaction(
                wallet_id=wallet.id,
                campaign_id=campaign.id,
                transaction_type=Transaction.REFUND,
                amount=refund_amount,
                balance_before=balance_before,
                balance_after=float(wallet.balance),
                status=Transaction.COMPLETED,
                description=f"Refund for cancelled campaign: {campaign.name}",
            )
            db.session.add(refund_tx)

        if campaign.celery_task_id:
            from ..extensions import celery
            celery.control.revoke(campaign.celery_task_id, terminate=True)

    campaign.status = Campaign.STATUS_CANCELLED
    db.session.commit()
    return jsonify({"message": "Campaign cancelled", "campaign": campaign.to_dict()})


@campaigns_bp.route("/<campaign_id>/messages", methods=["GET"])
@jwt_required()
def campaign_messages(campaign_id):
    from ..models.message import Message
    user_id = get_jwt_identity()
    campaign = Campaign.query.filter_by(id=campaign_id, user_id=user_id).first_or_404()

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    status_filter = request.args.get("status")

    q = Message.query.filter_by(campaign_id=campaign_id)
    if status_filter:
        q = q.filter_by(status=status_filter)

    paginated = q.order_by(Message.queued_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "messages": [m.to_dict() for m in paginated.items],
        "total": paginated.total,
        "page": page,
        "pages": paginated.pages,
    })
