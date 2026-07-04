import uuid
from datetime import datetime
from ..extensions import db


class WhatsAppTemplate(db.Model):
    __tablename__ = "whatsapp_templates"

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    name = db.Column(db.String(255), nullable=False)
    language = db.Column(db.String(10), default="en")
    category = db.Column(db.String(50))  # MARKETING | UTILITY | AUTHENTICATION
    status = db.Column(db.String(20), default="approved")

    # Template components
    header_type = db.Column(db.String(20))  # TEXT | IMAGE | VIDEO | DOCUMENT | NONE
    header_text = db.Column(db.String(60))
    body_text = db.Column(db.Text, nullable=False)
    footer_text = db.Column(db.String(60))

    # Variables in body: {{1}}, {{2}} etc.
    variables = db.Column(db.JSON, default=list)  # list of variable names/descriptions

    # WhatsApp template name (from Meta)
    wa_template_name = db.Column(db.String(255))
    wa_template_id = db.Column(db.String(255))

    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="templates")
    campaigns = db.relationship("Campaign", back_populates="template")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "language": self.language,
            "category": self.category,
            "status": self.status,
            "header_type": self.header_type,
            "header_text": self.header_text,
            "body_text": self.body_text,
            "footer_text": self.footer_text,
            "variables": self.variables,
            "wa_template_name": self.wa_template_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
