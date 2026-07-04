import logging
from datetime import datetime
from ..extensions import celery, db
from ..models.campaign import Campaign
from ..models.contact import Contact, Blacklist
from ..models.message import Message
from ..models.notification import Notification
from ..services.africas_talking import at_service
from ..services.whatsapp import wa_service

logger = logging.getLogger(__name__)

BATCH_SIZE = 50  # Send in batches to avoid rate limits


@celery.task(bind=True, max_retries=3, name="tasks.process_campaign")
def process_campaign(self, campaign_id: str):
    """Main task: orchestrate sending a campaign."""
    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        logger.error(f"Campaign {campaign_id} not found")
        return

    if campaign.status == Campaign.STATUS_CANCELLED:
        return

    campaign.status = Campaign.STATUS_SENDING
    campaign.started_at = datetime.utcnow()
    db.session.commit()

    try:
        contacts = Contact.query.filter_by(
            contact_list_id=campaign.contact_list_id,
            is_valid=True,
            is_opted_out=False,
        ).all()

        blacklisted_phones = {
            b.phone for b in Blacklist.query.filter_by(user_id=campaign.user_id).all()
        }

        valid_contacts = [c for c in contacts if c.phone not in blacklisted_phones]
        campaign.total_contacts = len(valid_contacts)
        db.session.commit()

        # Split into batches
        batches = [valid_contacts[i:i+BATCH_SIZE] for i in range(0, len(valid_contacts), BATCH_SIZE)]

        for batch in batches:
            if campaign.channel in ("sms", "both"):
                _send_sms_batch.delay(campaign_id, [c.id for c in batch])
            if campaign.channel in ("whatsapp", "both"):
                _send_whatsapp_batch.delay(campaign_id, [c.id for c in batch])

        # Schedule completion check
        _finalize_campaign.apply_async(args=[campaign_id], countdown=300)

    except Exception as exc:
        logger.error(f"Campaign {campaign_id} processing error: {exc}")
        campaign.status = Campaign.STATUS_FAILED
        db.session.commit()
        raise self.retry(exc=exc, countdown=60)


@celery.task(name="tasks.send_sms_batch")
def _send_sms_batch(campaign_id: str, contact_ids: list):
    """Send SMS to a batch of contacts."""
    campaign = Campaign.query.get(campaign_id)
    if not campaign or campaign.status == Campaign.STATUS_CANCELLED:
        return

    contacts = Contact.query.filter(Contact.id.in_(contact_ids)).all()
    phones = [c.phone for c in contacts]
    contact_map = {c.phone: c for c in contacts}

    sender_id = campaign.sender_id if campaign.use_custom_sender_id else None

    result = at_service.send_bulk(
        recipients=phones,
        message=campaign.message,
        sender_id=sender_id,
    )

    messages_to_add = []
    sms_sent_count = 0
    sms_failed_count = 0

    if result["success"]:
        for phone, details in result.get("results", {}).items():
            contact = contact_map.get(phone)
            status = Message.STATUS_SENT if details["status"] == "Success" else Message.STATUS_FAILED

            if status == Message.STATUS_SENT:
                sms_sent_count += 1
            else:
                sms_failed_count += 1

            msg = Message(
                campaign_id=campaign_id,
                contact_id=contact.id if contact else None,
                channel=Message.CHANNEL_SMS,
                phone=phone,
                message_body=campaign.message,
                status=status,
                provider_message_id=details.get("message_id"),
                provider_status=details.get("status"),
                sent_at=datetime.utcnow() if status == Message.STATUS_SENT else None,
            )
            messages_to_add.append(msg)
    else:
        # Mark all as failed
        for phone in phones:
            contact = contact_map.get(phone)
            msg = Message(
                campaign_id=campaign_id,
                contact_id=contact.id if contact else None,
                channel=Message.CHANNEL_SMS,
                phone=phone,
                message_body=campaign.message,
                status=Message.STATUS_FAILED,
                failure_reason=result.get("error", "Bulk send failed"),
                failed_at=datetime.utcnow(),
            )
            messages_to_add.append(msg)
        sms_failed_count = len(phones)

    db.session.bulk_save_objects(messages_to_add)

    # Update campaign counters atomically
    Campaign.query.filter_by(id=campaign_id).update({
        "sms_sent": Campaign.sms_sent + sms_sent_count,
        "sms_failed": Campaign.sms_failed + sms_failed_count,
    })
    db.session.commit()


@celery.task(name="tasks.send_whatsapp_batch")
def _send_whatsapp_batch(campaign_id: str, contact_ids: list):
    """Send WhatsApp messages to a batch of contacts."""
    campaign = Campaign.query.get(campaign_id)
    if not campaign or campaign.status == Campaign.STATUS_CANCELLED:
        return

    contacts = Contact.query.filter(Contact.id.in_(contact_ids)).all()

    wa_sent = 0
    wa_failed = 0
    messages_to_add = []

    for contact in contacts:
        if campaign.template_id and campaign.template:
            components = wa_service.build_template_components(
                {**campaign.template_variables, **(contact.variables or {})}
            )
            result = wa_service.send_template_message(
                phone=contact.phone,
                template_name=campaign.template.wa_template_name or campaign.template.name,
                language=campaign.template.language,
                components=components,
            )
        elif campaign.image_url:
            result = wa_service.send_image_message(
                phone=contact.phone,
                image_url=campaign.image_url,
                caption=campaign.message,
            )
        else:
            result = wa_service.send_text_message(
                phone=contact.phone,
                text=campaign.message,
            )

        status = Message.STATUS_SENT if result["success"] else Message.STATUS_FAILED
        if result["success"]:
            wa_sent += 1
        else:
            wa_failed += 1

        msg = Message(
            campaign_id=campaign_id,
            contact_id=contact.id,
            channel=Message.CHANNEL_WHATSAPP,
            phone=contact.phone,
            message_body=campaign.message,
            status=status,
            provider_message_id=result.get("message_id"),
            failure_reason=result.get("error") if not result["success"] else None,
            sent_at=datetime.utcnow() if result["success"] else None,
        )
        messages_to_add.append(msg)

    db.session.bulk_save_objects(messages_to_add)

    Campaign.query.filter_by(id=campaign_id).update({
        "whatsapp_sent": Campaign.whatsapp_sent + wa_sent,
        "whatsapp_failed": Campaign.whatsapp_failed + wa_failed,
    })
    db.session.commit()


@celery.task(name="tasks.finalize_campaign")
def _finalize_campaign(campaign_id: str):
    """Mark campaign as complete and generate report."""
    campaign = Campaign.query.get(campaign_id)
    if not campaign or campaign.status in (Campaign.STATUS_CANCELLED, Campaign.STATUS_COMPLETED):
        return

    # Check if all messages are done (simple heuristic)
    pending_count = Message.query.filter_by(
        campaign_id=campaign_id, status=Message.STATUS_QUEUED
    ).count()

    if pending_count > 0:
        # Re-schedule check
        _finalize_campaign.apply_async(args=[campaign_id], countdown=120)
        return

    campaign.status = Campaign.STATUS_COMPLETED
    campaign.completed_at = datetime.utcnow()
    db.session.commit()

    # Generate and email report
    generate_and_send_report.delay(campaign_id)


@celery.task(name="tasks.generate_and_send_report")
def generate_and_send_report(campaign_id: str):
    """Generate PDF report and email it."""
    from ..models.user import User
    from ..services.pdf_service import generate_campaign_report
    from ..services.email_service import send_campaign_report_email

    campaign = Campaign.query.get(campaign_id)
    if not campaign:
        return

    user = User.query.get(campaign.user_id)
    if not user:
        return

    try:
        pdf_bytes = generate_campaign_report(campaign, user)
        send_campaign_report_email(user.email, user.first_name, campaign, pdf_bytes)

        notif = Notification(
            user_id=user.id,
            title="Campaign Complete – Report Ready",
            message=f'Your campaign "{campaign.name}" is complete. The report has been emailed to you.',
            notification_type="report",
            link=f"/campaigns/{campaign_id}",
        )
        db.session.add(notif)
        db.session.commit()
        logger.info(f"Report sent for campaign {campaign_id}")

    except Exception as e:
        logger.error(f"Failed to generate report for campaign {campaign_id}: {e}")
