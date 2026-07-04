try:
    from weasyprint import HTML as WeasyHTML
    WEASYPRINT_AVAILABLE = True
except ImportError:
    WeasyHTML = None
    WEASYPRINT_AVAILABLE = False

from flask import current_app
from datetime import datetime
import os
import logging

logger = logging.getLogger(__name__)

REPORT_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: white; font-size: 14px; }
  .page { padding: 40px; max-width: 800px; margin: 0 auto; }

  /* Header */
  .header { background: linear-gradient(135deg, {{ color }} 0%, #003580 100%); color: white; padding: 36px 40px; border-radius: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
  .logo-area { display: flex; align-items: center; gap: 16px; }
  .ring-logo { width: 52px; height: 52px; }
  .brand-name { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
  .brand-tagline { font-size: 12px; opacity: 0.8; margin-top: 2px; }
  .report-meta { text-align: right; }
  .report-title { font-size: 18px; font-weight: 600; }
  .report-date { font-size: 12px; opacity: 0.8; margin-top: 4px; }

  /* Campaign info */
  .campaign-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
  .campaign-name { font-size: 22px; font-weight: 700; color: {{ color }}; margin-bottom: 8px; }
  .campaign-meta { display: flex; gap: 24px; flex-wrap: wrap; }
  .meta-item { display: flex; flex-direction: column; }
  .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
  .meta-value { font-size: 14px; font-weight: 500; color: #1e293b; margin-top: 2px; }

  /* Stats grid */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; position: relative; overflow: hidden; }
  .stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: {{ color }}; }
  .stat-number { font-size: 32px; font-weight: 700; color: {{ color }}; line-height: 1; }
  .stat-label { font-size: 12px; color: #64748b; margin-top: 6px; font-weight: 500; }

  /* Channel breakdown */
  .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid {{ color }}; }
  .channel-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .channel-table th { background: {{ color }}; color: white; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .channel-table th:first-child { border-radius: 8px 0 0 0; }
  .channel-table th:last-child { border-radius: 0 8px 0 0; }
  .channel-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
  .channel-table tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-sms { background: #e0f2fe; color: #0284c7; }
  .badge-wa { background: #dcfce7; color: #16a34a; }

  /* Progress bar */
  .progress-section { margin-bottom: 28px; }
  .progress-item { margin-bottom: 16px; }
  .progress-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .progress-label { font-size: 13px; font-weight: 500; }
  .progress-value { font-size: 13px; color: {{ color }}; font-weight: 600; }
  .progress-bar { height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; background: {{ color }}; border-radius: 4px; }

  /* Footer */
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-size: 13px; color: #64748b; }
  .footer-page { font-size: 12px; color: #94a3b8; }
  .powered { color: {{ color }}; font-weight: 600; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <svg class="ring-logo" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="26" cy="26" r="24" stroke="white" stroke-width="3" fill="none"/>
        <circle cx="26" cy="26" r="14" stroke="rgba(255,255,255,0.5)" stroke-width="2" fill="none"/>
        <circle cx="26" cy="26" r="5" fill="white"/>
        <path d="M26 6 Q38 14 38 26" stroke="rgba(255,255,255,0.7)" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M26 6 Q14 14 14 26" stroke="rgba(255,255,255,0.4)" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>
      <div>
        <div class="brand-name">RingSolutions</div>
        <div class="brand-tagline">Bulk Messaging Platform</div>
      </div>
    </div>
    <div class="report-meta">
      <div class="report-title">Campaign Report</div>
      <div class="report-date">Generated: {{ generated_at }}</div>
    </div>
  </div>

  <!-- Campaign Info -->
  <div class="campaign-card">
    <div class="campaign-name">{{ campaign_name }}</div>
    <div class="campaign-meta">
      <div class="meta-item">
        <span class="meta-label">Channel</span>
        <span class="meta-value">{{ channel|upper }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Started</span>
        <span class="meta-value">{{ started_at }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Completed</span>
        <span class="meta-value">{{ completed_at }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Sender</span>
        <span class="meta-value">{{ sender_id or 'Default' }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Client</span>
        <span class="meta-value">{{ user_name }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Total Cost</span>
        <span class="meta-value">KES {{ actual_cost }}</span>
      </div>
    </div>
  </div>

  <!-- Key Stats -->
  <div class="stats-grid">
    <div class="stat-card">
      <div class="stat-number">{{ total_contacts }}</div>
      <div class="stat-label">Total Contacts</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">{{ total_sent }}</div>
      <div class="stat-label">Messages Sent</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">{{ total_delivered }}</div>
      <div class="stat-label">Delivered</div>
    </div>
    <div class="stat-card">
      <div class="stat-number">{{ delivery_rate }}%</div>
      <div class="stat-label">Delivery Rate</div>
    </div>
  </div>

  <!-- Delivery Progress -->
  <div class="progress-section">
    <div class="section-title">Delivery Performance</div>
    <div class="progress-item">
      <div class="progress-header">
        <span class="progress-label">Overall Delivery Rate</span>
        <span class="progress-value">{{ delivery_rate }}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: {{ delivery_rate }}%;"></div></div>
    </div>
    {% if show_sms %}
    <div class="progress-item">
      <div class="progress-header">
        <span class="progress-label">SMS Delivery</span>
        <span class="progress-value">{{ sms_delivery_rate }}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: {{ sms_delivery_rate }}%;"></div></div>
    </div>
    {% endif %}
    {% if show_wa %}
    <div class="progress-item">
      <div class="progress-header">
        <span class="progress-label">WhatsApp Delivery</span>
        <span class="progress-value">{{ wa_delivery_rate }}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width: {{ wa_delivery_rate }}%;"></div></div>
    </div>
    {% endif %}
  </div>

  <!-- Channel Breakdown Table -->
  <div class="section-title">Channel Breakdown</div>
  <table class="channel-table">
    <thead>
      <tr>
        <th>Channel</th>
        <th>Sent</th>
        <th>Delivered</th>
        <th>Failed</th>
        <th>Delivery Rate</th>
        <th>Cost (KES)</th>
      </tr>
    </thead>
    <tbody>
      {% if show_sms %}
      <tr>
        <td><span class="badge badge-sms">SMS</span></td>
        <td>{{ sms_sent }}</td>
        <td>{{ sms_delivered }}</td>
        <td>{{ sms_failed }}</td>
        <td>{{ sms_delivery_rate }}%</td>
        <td>{{ sms_cost }}</td>
      </tr>
      {% endif %}
      {% if show_wa %}
      <tr>
        <td><span class="badge badge-wa">WhatsApp</span></td>
        <td>{{ wa_sent }}</td>
        <td>{{ wa_delivered }}</td>
        <td>{{ wa_failed }}</td>
        <td>{{ wa_delivery_rate }}%</td>
        <td>{{ wa_cost }}</td>
      </tr>
      {% endif %}
      <tr style="font-weight:700; background:#f8fafc;">
        <td>Total</td>
        <td>{{ total_sent }}</td>
        <td>{{ total_delivered }}</td>
        <td>{{ total_failed }}</td>
        <td>{{ delivery_rate }}%</td>
        <td>{{ actual_cost }}</td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-brand">
      Powered by <span class="powered">RingSolutions</span> | ringsolutions.com
    </div>
    <div class="footer-page">Confidential Report</div>
  </div>

</div>
</body>
</html>
"""


def _build_context(campaign, user) -> dict:
    def safe_rate(sent, delivered):
        if not sent:
            return 0
        return round((delivered / sent) * 100, 1)

    show_sms = campaign.channel in ("sms", "both")
    show_wa = campaign.channel in ("whatsapp", "both")
    sms_cost = round(campaign.sms_sent * current_app.config["SMS_PRICE_PER_MESSAGE"], 2)
    wa_cost = round(campaign.whatsapp_sent * current_app.config["WHATSAPP_PRICE_PER_MESSAGE"], 2)

    return {
        "color": campaign.report_color or "#1890ff",
        "campaign_name": campaign.name,
        "channel": campaign.channel,
        "started_at": campaign.started_at.strftime("%d %b %Y %H:%M") if campaign.started_at else "—",
        "completed_at": campaign.completed_at.strftime("%d %b %Y %H:%M") if campaign.completed_at else "—",
        "generated_at": datetime.utcnow().strftime("%d %b %Y %H:%M UTC"),
        "user_name": user.full_name,
        "sender_id": campaign.sender_id,
        "actual_cost": f"{float(campaign.actual_cost):,.2f}",
        "total_contacts": campaign.total_contacts,
        "total_sent": campaign.sms_sent + campaign.whatsapp_sent,
        "total_delivered": campaign.sms_delivered + campaign.whatsapp_delivered,
        "total_failed": campaign.sms_failed + campaign.whatsapp_failed,
        "delivery_rate": campaign.delivery_rate,
        "show_sms": show_sms,
        "show_wa": show_wa,
        "sms_sent": campaign.sms_sent,
        "sms_delivered": campaign.sms_delivered,
        "sms_failed": campaign.sms_failed,
        "sms_delivery_rate": safe_rate(campaign.sms_sent, campaign.sms_delivered),
        "sms_cost": f"{sms_cost:,.2f}",
        "wa_sent": campaign.whatsapp_sent,
        "wa_delivered": campaign.whatsapp_delivered,
        "wa_failed": campaign.whatsapp_failed,
        "wa_delivery_rate": safe_rate(campaign.whatsapp_sent, campaign.whatsapp_delivered),
        "wa_cost": f"{wa_cost:,.2f}",
    }


_PRINT_SCRIPT = """
<script>
  window.onload = function () {
    window.print();
    window.onafterprint = function () { window.close(); };
  };
</script>
"""


def render_campaign_report_html(campaign, user, auto_print: bool = False) -> str:
    """Return the rendered HTML report string."""
    from jinja2 import Template
    html = Template(REPORT_TEMPLATE).render(**_build_context(campaign, user))
    if auto_print:
        html = html.replace("</head>", f"{_PRINT_SCRIPT}</head>", 1)
    return html


def generate_campaign_report(campaign, user) -> bytes:
    """Return PDF bytes (falls back to HTML bytes when WeasyPrint is unavailable)."""
    html_content = render_campaign_report_html(campaign, user)

    if not WEASYPRINT_AVAILABLE:
        logger.warning("WeasyPrint not available — returning HTML bytes instead of PDF")
        return html_content.encode("utf-8")

    return WeasyHTML(string=html_content).write_pdf()
