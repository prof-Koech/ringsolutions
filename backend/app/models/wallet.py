import uuid
from datetime import datetime
from ..extensions import db


class Wallet(db.Model):
    __tablename__ = "wallets"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False, unique=True)
    balance = db.Column(db.Numeric(12, 2), default=0.00, nullable=False)
    currency = db.Column(db.String(3), default="KES")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", back_populates="wallet")
    transactions = db.relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "balance": float(self.balance),
            "currency": self.currency,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    # Types
    TOPUP = "topup"
    DEBIT = "debit"
    REFUND = "refund"

    # Statuses
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    wallet_id = db.Column(db.String(36), db.ForeignKey("wallets.id"), nullable=False)
    campaign_id = db.Column(db.String(36), db.ForeignKey("campaigns.id"), nullable=True)

    transaction_type = db.Column(db.String(20), nullable=False)  # topup | debit | refund
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    balance_before = db.Column(db.Numeric(12, 2))
    balance_after = db.Column(db.Numeric(12, 2))

    status = db.Column(db.String(20), default="pending")
    description = db.Column(db.String(500))

    # M-Pesa fields
    mpesa_checkout_request_id = db.Column(db.String(255), index=True)
    mpesa_merchant_request_id = db.Column(db.String(255))
    mpesa_transaction_code = db.Column(db.String(100))
    mpesa_phone = db.Column(db.String(20))
    mpesa_receipt_number = db.Column(db.String(100))

    reference = db.Column(db.String(255))
    failure_reason = db.Column(db.String(500))

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    wallet = db.relationship("Wallet", back_populates="transactions")
    campaign = db.relationship("Campaign", back_populates="transactions")

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_type": self.transaction_type,
            "amount": float(self.amount),
            "balance_before": float(self.balance_before) if self.balance_before else None,
            "balance_after": float(self.balance_after) if self.balance_after else None,
            "status": self.status,
            "description": self.description,
            "mpesa_receipt_number": self.mpesa_receipt_number,
            "mpesa_phone": self.mpesa_phone,
            "reference": self.reference,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }
