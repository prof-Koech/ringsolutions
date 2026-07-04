from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.notification import Notification

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/", methods=["GET"])
@jwt_required()
def list_notifications():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    paginated = Notification.query.filter_by(user_id=user_id).order_by(
        Notification.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    unread = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return jsonify({
        "notifications": [n.to_dict() for n in paginated.items],
        "total": paginated.total,
        "unread_count": unread,
        "page": page,
    })


@notifications_bp.route("/mark-read", methods=["POST"])
@jwt_required()
def mark_read():
    user_id = get_jwt_identity()
    data = request.get_json()
    notification_ids = data.get("ids", [])

    if notification_ids:
        Notification.query.filter(
            Notification.id.in_(notification_ids),
            Notification.user_id == user_id,
        ).update({"is_read": True}, synchronize_session=False)
    else:
        Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})

    db.session.commit()
    return jsonify({"message": "Notifications marked as read"})


@notifications_bp.route("/<notif_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notif_id):
    user_id = get_jwt_identity()
    notif = Notification.query.filter_by(id=notif_id, user_id=user_id).first_or_404()
    db.session.delete(notif)
    db.session.commit()
    return jsonify({"message": "Notification deleted"})
