import uuid
from datetime import datetime
from ..extensions import db


class ContactList(db.Model):
    __tablename__ = "contact_lists"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(500))
    total_contacts = db.Column(db.Integer, default=0)
    valid_contacts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="contact_lists")
    contacts = db.relationship("Contact", back_populates="contact_list", cascade="all, delete-orphan")
    campaigns = db.relationship("Campaign", back_populates="contact_list")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "total_contacts": self.total_contacts,
            "valid_contacts": self.valid_contacts,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Contact(db.Model):
    __tablename__ = "contacts"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    contact_list_id = db.Column(db.String(36), db.ForeignKey("contact_lists.id"), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    name = db.Column(db.String(200))
    email = db.Column(db.String(255))
    variables = db.Column(db.JSON, default=dict)  # custom fields for template interpolation
    is_valid = db.Column(db.Boolean, default=True)
    is_opted_out = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contact_list = db.relationship("ContactList", back_populates="contacts")

    __table_args__ = (
        db.UniqueConstraint("contact_list_id", "phone", name="uq_contact_list_phone"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "name": self.name,
            "email": self.email,
            "variables": self.variables,
            "is_valid": self.is_valid,
            "is_opted_out": self.is_opted_out,
        }


class Blacklist(db.Model):
    __tablename__ = "blacklist"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    reason = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("user_id", "phone", name="uq_blacklist_user_phone"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "reason": self.reason,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
