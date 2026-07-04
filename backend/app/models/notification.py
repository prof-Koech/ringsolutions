import uuid
from datetime import datetime
from ..extensions import db


class Notification(db.Model):
    __tablename__ = "notifications"

    TYPE_CAMPAIGN = "campaign"
    TYPE_PAYMENT = "payment"
    TYPE_SYSTEM = "system"
    TYPE_REPORT = "report"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    notification_type = db.Column(db.String(30), default="system")
    is_read = db.Column(db.Boolean, default=False)
    link = db.Column(db.String(500))
    meta = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "notification_type": self.notification_type,
            "is_read": self.is_read,
            "link": self.link,
            "meta": self.meta,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
