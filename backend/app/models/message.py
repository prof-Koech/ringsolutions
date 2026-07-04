import uuid
from datetime import datetime
from ..extensions import db


class Message(db.Model):
    __tablename__ = "messages"

    # Channels
    CHANNEL_SMS = "sms"
    CHANNEL_WHATSAPP = "whatsapp"

    # Statuses
    STATUS_QUEUED = "queued"
    STATUS_SENT = "sent"
    STATUS_DELIVERED = "delivered"
    STATUS_READ = "read"
    STATUS_FAILED = "failed"
    STATUS_REJECTED = "rejected"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    campaign_id = db.Column(db.String(36), db.ForeignKey("campaigns.id"), nullable=False)
    contact_id = db.Column(db.String(36), db.ForeignKey("contacts.id"), nullable=True)

    channel = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(30), nullable=False, index=True)
    message_body = db.Column(db.Text)
    status = db.Column(db.String(20), default="queued")

    # Provider message IDs
    provider_message_id = db.Column(db.String(255), index=True)
    provider_status = db.Column(db.String(100))
    failure_reason = db.Column(db.String(500))

    # SMS specific
    sms_units = db.Column(db.Integer, default=1)

    cost = db.Column(db.Numeric(10, 4), default=0)

    queued_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    read_at = db.Column(db.DateTime)
    failed_at = db.Column(db.DateTime)

    campaign = db.relationship("Campaign", back_populates="messages")
    contact = db.relationship("Contact")

    def to_dict(self):
        return {
            "id": self.id,
            "channel": self.channel,
            "phone": self.phone,
            "status": self.status,
            "provider_message_id": self.provider_message_id,
            "failure_reason": self.failure_reason,
            "cost": float(self.cost) if self.cost else 0,
            "sent_at": self.sent_at.isoformat() if self.sent_at else None,
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
        }
