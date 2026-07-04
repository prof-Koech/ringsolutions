import uuid
from datetime import datetime
from ..extensions import db


class SenderID(db.Model):
    __tablename__ = "sender_ids"

    STATUS_PENDING = "pending"
    STATUS_ACTIVE = "active"
    STATUS_REJECTED = "rejected"
    STATUS_SUSPENDED = "suspended"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    sender_id = db.Column(db.String(20), nullable=False)
    purpose = db.Column(db.String(500))
    status = db.Column(db.String(20), default="pending")
    admin_notes = db.Column(db.String(500))
    fee_paid = db.Column(db.Boolean, default=False)
    monthly_fee = db.Column(db.Numeric(10, 2), default=500.00)
    expires_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="sender_ids")

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "purpose": self.purpose,
            "status": self.status,
            "fee_paid": self.fee_paid,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
