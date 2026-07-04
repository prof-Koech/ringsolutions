from flask import Blueprint, request, jsonify
from ..extensions import db
from ..models.subscriber import Subscriber
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

    sub = Subscriber(email=email, name=name)
    db.session.add(sub)
    db.session.commit()

    return jsonify({'message': 'Subscribed', 'subscriber': sub.to_dict()}), 201
