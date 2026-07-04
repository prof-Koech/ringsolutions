from flask import current_app, render_template_string
from flask_mail import Message as MailMessage
from ..extensions import mail
import logging

logger = logging.getLogger(__name__)

VERIFICATION_EMAIL = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, #1890ff, #0050b3); padding: 40px 30px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 28px; }
  .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; }
  .body { padding: 40px 30px; }
  .btn { display: inline-block; background: #1890ff; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; margin: 20px 0; }
  .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 13px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>⭕ RingSolutions</h1>
    <p>Bulk Messaging Made Simple</p>
  </div>
  <div class="body">
    <h2>Verify Your Email Address</h2>
    <p>Hi {{ name }},</p>
    <p>Welcome to RingSolutions! Please verify your email address to activate your account and start sending bulk SMS and WhatsApp messages.</p>
    <a href="{{ verification_url }}" class="btn">Verify Email Address</a>
    <p style="color:#999;font-size:13px;">This link expires in 24 hours. If you didn't create an account, please ignore this email.</p>
  </div>
  <div class="footer">
    <p>© 2024 RingSolutions | support@ringsolutions.com</p>
  </div>
</div>
</body>
</html>
"""

CAMPAIGN_REPORT_EMAIL = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
  .header { background: linear-gradient(135deg, {{ color }}, #0050b3); padding: 40px 30px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 28px; }
  .body { padding: 40px 30px; }
  .stat-box { display: inline-block; background: #f0f7ff; border-radius: 8px; padding: 16px 24px; margin: 8px; text-align: center; }
  .stat-number { font-size: 28px; font-weight: bold; color: {{ color }}; }
  .stat-label { color: #666; font-size: 13px; }
  .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 13px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>⭕ RingSolutions</h1>
    <p>Campaign Report: {{ campaign_name }}</p>
  </div>
  <div class="body">
    <p>Hi {{ name }},</p>
    <p>Your campaign <strong>{{ campaign_name }}</strong> has completed. Here's a summary:</p>
    <div>
      <div class="stat-box"><div class="stat-number">{{ total_contacts }}</div><div class="stat-label">Total Contacts</div></div>
      <div class="stat-box"><div class="stat-number">{{ sent }}</div><div class="stat-label">Messages Sent</div></div>
      <div class="stat-box"><div class="stat-number">{{ delivered }}</div><div class="stat-label">Delivered</div></div>
      <div class="stat-box"><div class="stat-number">{{ delivery_rate }}%</div><div class="stat-label">Delivery Rate</div></div>
    </div>
    <p>The full PDF report is attached to this email.</p>
  </div>
  <div class="footer">
    <p>© 2024 RingSolutions | support@ringsolutions.com</p>
  </div>
</div>
</body>
</html>
"""

PASSWORD_RESET_EMAIL = """
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
  .header { background: linear-gradient(135deg, #1890ff, #0050b3); padding: 40px 30px; text-align: center; }
  .header h1 { color: white; margin: 0; font-size: 28px; }
  .body { padding: 40px 30px; }
  .btn { display: inline-block; background: #ff4d4f; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; }
  .footer { background: #f9f9f9; padding: 20px 30px; text-align: center; color: #999; font-size: 13px; }
</style></head>
<body>
<div class="container">
  <div class="header"><h1>⭕ RingSolutions</h1></div>
  <div class="body">
    <h2>Reset Your Password</h2>
    <p>Hi {{ name }}, you requested a password reset. Click below to set a new password:</p>
    <a href="{{ reset_url }}" class="btn">Reset Password</a>
    <p style="color:#999;font-size:13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
  </div>
  <div class="footer"><p>© 2024 RingSolutions</p></div>
</div>
</body>
</html>
"""


def _mail_configured():
    """Return True only if SMTP credentials are set."""
    return bool(current_app.config.get("MAIL_PASSWORD") and
                current_app.config.get("MAIL_PASSWORD") != "your-mail-password")


def send_verification_email(user_email: str, name: str, token: str):
    if not _mail_configured():
        frontend_url = current_app.config["FRONTEND_URL"]
        verification_url = f"{frontend_url}/verify-email?token={token}"
        logger.info(f"[DEV] Verification URL for {user_email}: {verification_url}")
        return True
    try:
        frontend_url = current_app.config["FRONTEND_URL"]
        verification_url = f"{frontend_url}/verify-email?token={token}"
        html = render_template_string(VERIFICATION_EMAIL, name=name, verification_url=verification_url)
        msg = MailMessage(
            subject="Verify your RingSolutions account",
            recipients=[user_email],
            html=html,
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send verification email to {user_email}: {e}")
        return False


def send_password_reset_email(user_email: str, name: str, token: str):
    if not _mail_configured():
        frontend_url = current_app.config["FRONTEND_URL"]
        reset_url = f"{frontend_url}/reset-password?token={token}"
        logger.info(f"[DEV] Password reset URL for {user_email}: {reset_url}")
        return True
    try:
        frontend_url = current_app.config["FRONTEND_URL"]
        reset_url = f"{frontend_url}/reset-password?token={token}"
        html = render_template_string(PASSWORD_RESET_EMAIL, name=name, reset_url=reset_url)
        msg = MailMessage(
            subject="Reset your RingSolutions password",
            recipients=[user_email],
            html=html,
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
        return False


def send_campaign_report_email(user_email: str, name: str, campaign, pdf_bytes: bytes):
    if not _mail_configured():
        logger.info(f"[DEV] Campaign report ready for {user_email}: campaign={campaign.name}")
        return True
    try:
        html = render_template_string(
            CAMPAIGN_REPORT_EMAIL,
            name=name,
            campaign_name=campaign.name,
            color=campaign.report_color,
            total_contacts=campaign.total_contacts,
            sent=campaign.sms_sent + campaign.whatsapp_sent,
            delivered=campaign.sms_delivered + campaign.whatsapp_delivered,
            delivery_rate=campaign.delivery_rate,
        )
        msg = MailMessage(
            subject=f"Campaign Report: {campaign.name}",
            recipients=[user_email],
            html=html,
        )
        msg.attach(
            filename=f"report_{campaign.id}.pdf",
            content_type="application/pdf",
            data=pdf_bytes,
        )
        mail.send(msg)
        return True
    except Exception as e:
        logger.error(f"Failed to send campaign report email: {e}")
        return False


  def send_subscription_email(user_email: str, name: str, frontend_url: str = ''):
    """Send a simple subscription confirmation email. Best-effort only."""
    try:
      if not _mail_configured():
        logger.info(f"[DEV] Subscription confirmation for {user_email}")
        return True

      confirm_url = frontend_url or current_app.config.get('FRONTEND_URL', '')
      html = f"""
      <div style='font-family: Arial, sans-serif; padding: 20px;'>
        <h2>Thanks for subscribing</h2>
        <p>Hi {name},</p>
        <p>Thanks for subscribing to RingSolutions updates. We'll send product news and release notes to {user_email}.</p>
        <p style='font-size:13px;color:#888;'>If you didn't sign up, ignore this email.</p>
      </div>
      """
      msg = MailMessage(subject="Thanks for subscribing to RingSolutions", recipients=[user_email], html=html)
      mail.send(msg)
      return True
    except Exception as e:
      logger.error(f"Failed to send subscription email to {user_email}: {e}")
      return False
