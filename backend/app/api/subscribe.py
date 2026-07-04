from flask import Blueprint, request, jsonify, current_app
from ..extensions import db
from ..models.subscriber import Subscriber
from ..services import email_service
from sqlalchemy.exc import SQLAlchemyError
import re

subscribe_bp = Blueprint('subscribe', __name__)


def valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


@subscribe_bp.route('/', methods=['POST'])
def subscribe():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip()
    name = (data.get('name') or '').strip() or None

    if not email or not valid_email(email):
        return jsonify({'error': 'Provide a valid email address'}), 400

    existing = Subscriber.query.filter_by(email=email).first()
    if existing:
        return jsonify({'message': 'Already subscribed'}), 200

    try:
        sub = Subscriber(email=email, name=name)
        db.session.add(sub)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify({'error': 'Failed to save subscriber'}), 500

    # Send a confirmation email (best-effort)
    try:
        frontend = current_app.config.get('FRONTEND_URL', '')
        email_service.send_subscription_email(email, name or 'Subscriber', frontend)
    except Exception:
        # don't fail the request if email sending fails
        current_app.logger.exception('Failed to send subscription email')

    return jsonify({'message': 'Subscribed', 'subscriber': sub.to_dict()}), 201
