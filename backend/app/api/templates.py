from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.template import WhatsAppTemplate
from ..services.whatsapp import wa_service

templates_bp = Blueprint("templates", __name__)


@templates_bp.route("/", methods=["GET"])
@jwt_required()
def list_templates():
    user_id = get_jwt_identity()
    templates = WhatsAppTemplate.query.filter_by(
        user_id=user_id, is_active=True
    ).order_by(WhatsAppTemplate.created_at.desc()).all()
    return jsonify({"templates": [t.to_dict() for t in templates]})


@templates_bp.route("/", methods=["POST"])
@jwt_required()
def create_template():
    user_id = get_jwt_identity()
    data = request.get_json()

    required = ["name", "body_text"]
    for field in required:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    template = WhatsAppTemplate(
        user_id=user_id,
        name=data["name"].strip(),
        language=data.get("language", "en"),
        category=data.get("category", "UTILITY"),
        header_type=data.get("header_type", "NONE"),
        header_text=data.get("header_text", ""),
        body_text=data["body_text"],
        footer_text=data.get("footer_text", ""),
        variables=data.get("variables", []),
        wa_template_name=data.get("wa_template_name", ""),
        wa_template_id=data.get("wa_template_id", ""),
        status="approved",
    )
    db.session.add(template)
    db.session.commit()
    return jsonify({"template": template.to_dict()}), 201


@templates_bp.route("/<template_id>", methods=["GET"])
@jwt_required()
def get_template(template_id):
    user_id = get_jwt_identity()
    template = WhatsAppTemplate.query.filter_by(
        id=template_id, user_id=user_id
    ).first_or_404()
    return jsonify({"template": template.to_dict()})


@templates_bp.route("/<template_id>", methods=["PUT"])
@jwt_required()
def update_template(template_id):
    user_id = get_jwt_identity()
    template = WhatsAppTemplate.query.filter_by(
        id=template_id, user_id=user_id
    ).first_or_404()
    data = request.get_json()

    for field in ["name", "body_text", "header_text", "footer_text", "variables", "language", "category"]:
        if field in data:
            setattr(template, field, data[field])

    db.session.commit()
    return jsonify({"template": template.to_dict()})


@templates_bp.route("/<template_id>", methods=["DELETE"])
@jwt_required()
def delete_template(template_id):
    user_id = get_jwt_identity()
    template = WhatsAppTemplate.query.filter_by(
        id=template_id, user_id=user_id
    ).first_or_404()
    template.is_active = False
    db.session.commit()
    return jsonify({"message": "Template deleted"})


@templates_bp.route("/sync-whatsapp", methods=["POST"])
@jwt_required()
def sync_whatsapp_templates():
    """Sync approved templates from WhatsApp Business Account."""
    user_id = get_jwt_identity()
    result = wa_service.get_templates()

    if not result["success"]:
        return jsonify({"error": result.get("error", "Failed to fetch templates")}), 502

    synced = 0
    for tpl in result["templates"]:
        existing = WhatsAppTemplate.query.filter_by(
            user_id=user_id, wa_template_id=tpl.get("id", "")
        ).first()

        body_component = next(
            (c for c in tpl.get("components", []) if c["type"] == "BODY"), {}
        )
        body_text = body_component.get("text", "")

        if not existing:
            new_tpl = WhatsAppTemplate(
                user_id=user_id,
                name=tpl.get("name", ""),
                language=tpl.get("language", "en"),
                category=tpl.get("category", "UTILITY"),
                body_text=body_text,
                wa_template_name=tpl.get("name", ""),
                wa_template_id=tpl.get("id", ""),
                status=tpl.get("status", "approved").lower(),
            )
            db.session.add(new_tpl)
            synced += 1
        else:
            existing.body_text = body_text
            existing.status = tpl.get("status", "approved").lower()

    db.session.commit()
    return jsonify({"synced": synced, "total_from_wa": len(result["templates"])})
