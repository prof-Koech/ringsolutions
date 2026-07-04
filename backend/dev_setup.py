"""
Development helper: create admin user, verify email, and seed initial data.
Run once after first launch: python dev_setup.py
"""
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.wallet import Wallet

app = create_app()

with app.app_context():
    db.create_all()
    print("✓ Tables created")

    # Create or update admin user
    admin = User.query.filter_by(email="admin@ringsolutions.com").first()
    if not admin:
        admin = User(
            email="admin@ringsolutions.com",
            first_name="Admin",
            last_name="User",
            company="RingSolutions",
            is_verified=True,
            is_admin=True,
        )
        admin.set_password("admin1234")
        db.session.add(admin)
        db.session.flush()

        wallet = Wallet(user_id=admin.id, balance=500.00)
        db.session.add(wallet)
        db.session.commit()
        print("✓ Admin user created: admin@ringsolutions.com / admin1234 (wallet: KES 500)")
    else:
        admin.is_verified = True
        admin.is_admin = True
        db.session.commit()
        print(f"✓ Admin user updated: {admin.email} (verified, admin=True)")

    print("\nDev setup complete! You can now log in at http://localhost:5173")
    print("Email:    admin@ringsolutions.com")
    print("Password: admin1234")
