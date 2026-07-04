import uuid
from datetime import datetime
from ..extensions import db


class Campaign(db.Model):
    __tablename__ = "campaigns"

    # Channels
    CHANNEL_SMS = "sms"
    CHANNEL_WHATSAPP = "whatsapp"
    CHANNEL_BOTH = "both"

    # Statuses
    STATUS_DRAFT = "draft"
    STATUS_PENDING_PAYMENT = "pending_payment"
    STATUS_QUEUED = "queued"
    STATUS_SENDING = "sending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_SCHEDULED = "scheduled"
    STATUS_CANCELLED = "cancelled"
    STATUS_PAUSED = "paused"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    contact_list_id = db.Column(db.String(36), db.ForeignKey("contact_lists.id"), nullable=True)

    name = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    channel = db.Column(db.String(20), nullable=False)  # sms | whatsapp | both

    # SMS options
    sender_id = db.Column(db.String(20))
    use_custom_sender_id = db.Column(db.Boolean, default=False)

    # WhatsApp template
    template_id = db.Column(db.String(36), db.ForeignKey("whatsapp_templates.id"), nullable=True)
    template_variables = db.Column(db.JSON, default=dict)

    # Scheduling
    scheduled_at = db.Column(db.DateTime, nullable=True)
    is_scheduled = db.Column(db.Boolean, default=False)

    # Status
    status = db.Column(db.String(30), default="draft")
    celery_task_id = db.Column(db.String(255))

    # Stats
    total_contacts = db.Column(db.Integer, default=0)
    sms_sent = db.Column(db.Integer, default=0)
    sms_delivered = db.Column(db.Integer, default=0)
    sms_failed = db.Column(db.Integer, default=0)
    whatsapp_sent = db.Column(db.Integer, default=0)
    whatsapp_delivered = db.Column(db.Integer, default=0)
    whatsapp_read = db.Column(db.Integer, default=0)
    whatsapp_failed = db.Column(db.Integer, default=0)

    # Cost
    estimated_cost = db.Column(db.Numeric(12, 2), default=0.00)
    actual_cost = db.Column(db.Numeric(12, 2), default=0.00)
    custom_sender_id_fee = db.Column(db.Numeric(12, 2), default=0.00)

    # Report
    image_url = db.Column(db.String(500))          # optional WhatsApp image/poster

    report_color = db.Column(db.String(7), default="#1890ff")
    report_url = db.Column(db.String(500))
    report_generated_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = db.Column(db.DateTime)
    completed_at = db.Column(db.DateTime)

    # Relationships
    user = db.relationship("User", back_populates="campaigns")
    contact_list = db.relationship("ContactList", back_populates="campaigns")
    messages = db.relationship("Message", back_populates="campaign", cascade="all, delete-orphan")
    template = db.relationship("WhatsAppTemplate", back_populates="campaigns")
    transactions = db.relationship("Transaction", back_populates="campaign")

    @property
    def delivery_rate(self):
        total_sent = self.sms_sent + self.whatsapp_sent
        total_delivered = self.sms_delivered + self.whatsapp_delivered
        if total_sent == 0:
            return 0
        return round((total_delivered / total_sent) * 100, 1)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "message": self.message,
            "channel": self.channel,
            "sender_id": self.sender_id,
            "use_custom_sender_id": self.use_custom_sender_id,
            "scheduled_at": self.scheduled_at.isoformat() if self.scheduled_at else None,
            "is_scheduled": self.is_scheduled,
            "status": self.status,
            "total_contacts": self.total_contacts,
            "sms_sent": self.sms_sent,
            "sms_delivered": self.sms_delivered,
            "sms_failed": self.sms_failed,
            "whatsapp_sent": self.whatsapp_sent,
            "whatsapp_delivered": self.whatsapp_delivered,
            "whatsapp_read": self.whatsapp_read,
            "whatsapp_failed": self.whatsapp_failed,
            "delivery_rate": self.delivery_rate,
            "estimated_cost": float(self.estimated_cost),
            "actual_cost": float(self.actual_cost),
            "custom_sender_id_fee": float(self.custom_sender_id_fee),
            "image_url": self.image_url,
            "report_color": self.report_color,
            "report_url": self.report_url,
            "contact_list_id": self.contact_list_id,
            "template_id": self.template_id,
            "template_variables": self.template_variables,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
