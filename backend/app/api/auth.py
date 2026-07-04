import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity,
)
from ..extensions import db
from ..models.user import User
from ..models.wallet import Wallet
from ..models.notification import Notification
from ..services.email_service import send_verification_email, send_password_reset_email
from ..utils.validators import validate_email

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    required = ["email", "password", "first_name", "last_name"]
    for field in required:
        if not data.get(field, "").strip():
            return jsonify({"error": f"{field} is required"}), 400

    email = data["email"].lower().strip()
    if not validate_email(email):
        return jsonify({"error": "Invalid email address"}), 400

    if len(data["password"]) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        email=email,
        first_name=data["first_name"].strip(),
        last_name=data["last_name"].strip(),
        phone=data.get("phone", "").strip() or None,
        company=data.get("company", "").strip() or None,
    )
    user.set_password(data["password"])

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)

    db.session.add(user)
    db.session.flush()  # get user.id

    wallet = Wallet(user_id=user.id, balance=0.00)
    db.session.add(wallet)

    notif = Notification(
        user_id=user.id,
        title="Welcome to RingSolutions!",
        message="Your account is ready. Verify your email and top up your wallet to start sending messages.",
        notification_type="system",
    )
    db.session.add(notif)
    db.session.commit()

    send_verification_email(user.email, user.first_name, token)

    return jsonify({
        "message": "Registration successful. Please check your email to verify your account.",
        "user_id": user.id,
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is suspended. Contact support."}), 403

    user.last_login = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=user.id)
    refresh_token = create_refresh_token(identity=user.id)

    return jsonify({
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user.to_dict(),
    })


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return jsonify({"access_token": access_token})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()})


@auth_bp.route("/verify-email", methods=["POST"])
def verify_email():
    data = request.get_json()
    token = data.get("token", "").strip()

    user = User.query.filter_by(verification_token=token).first()
    if not user:
        return jsonify({"error": "Invalid verification token"}), 400

    if user.verification_token_expires < datetime.utcnow():
        return jsonify({"error": "Verification token has expired. Request a new one."}), 400

    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    db.session.commit()

    return jsonify({"message": "Email verified successfully. You can now log in."})


@auth_bp.route("/resend-verification", methods=["POST"])
def resend_verification():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    user = User.query.filter_by(email=email).first()

    if not user or user.is_verified:
        return jsonify({"message": "If the email exists and is unverified, a link has been sent."}), 200

    token = secrets.token_urlsafe(32)
    user.verification_token = token
    user.verification_token_expires = datetime.utcnow() + timedelta(hours=24)
    db.session.commit()

    send_verification_email(user.email, user.first_name, token)
    return jsonify({"message": "Verification email sent."})


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json()
    email = data.get("email", "").lower().strip()
    user = User.query.filter_by(email=email).first()

    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()
        send_password_reset_email(user.email, user.first_name, token)

    return jsonify({"message": "If the email is registered, a reset link has been sent."})


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    data = request.get_json()
    token = data.get("token", "").strip()
    new_password = data.get("password", "")

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user or user.reset_token_expires < datetime.utcnow():
        return jsonify({"error": "Invalid or expired reset token"}), 400

    user.set_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({"message": "Password reset successfully."})


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.get_json()

    updatable = ["first_name", "last_name", "phone", "company", "theme_color", "timezone"]
    for field in updatable:
        if field in data:
            setattr(user, field, data[field])

    if "current_password" in data and "new_password" in data:
        if not user.check_password(data["current_password"]):
            return jsonify({"error": "Current password is incorrect"}), 400
        if len(data["new_password"]) < 8:
            return jsonify({"error": "New password must be at least 8 characters"}), 400
        user.set_password(data["new_password"])

    db.session.commit()
    return jsonify({"user": user.to_dict()})
