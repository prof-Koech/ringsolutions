from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..models.contact import ContactList, Contact, Blacklist
from ..utils.validators import parse_contacts_file, normalize_phone

contacts_bp = Blueprint("contacts", __name__)


@contacts_bp.route("/lists", methods=["GET"])
@jwt_required()
def get_contact_lists():
    user_id = get_jwt_identity()
    lists = ContactList.query.filter_by(user_id=user_id).order_by(ContactList.created_at.desc()).all()
    return jsonify({"contact_lists": [cl.to_dict() for cl in lists]})


@contacts_bp.route("/lists", methods=["POST"])
@jwt_required()
def create_contact_list():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data.get("name"):
        return jsonify({"error": "List name is required"}), 400

    contact_list = ContactList(
        user_id=user_id,
        name=data["name"].strip(),
        description=data.get("description", "").strip() or None,
    )
    db.session.add(contact_list)
    db.session.commit()
    return jsonify({"contact_list": contact_list.to_dict()}), 201


@contacts_bp.route("/lists/<list_id>", methods=["GET"])
@jwt_required()
def get_contact_list(list_id):
    user_id = get_jwt_identity()
    contact_list = ContactList.query.filter_by(id=list_id, user_id=user_id).first_or_404()

    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    contacts_page = Contact.query.filter_by(contact_list_id=list_id).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "contact_list": contact_list.to_dict(),
        "contacts": [c.to_dict() for c in contacts_page.items],
        "total": contacts_page.total,
        "page": page,
        "pages": contacts_page.pages,
    })


@contacts_bp.route("/lists/<list_id>", methods=["DELETE"])
@jwt_required()
def delete_contact_list(list_id):
    user_id = get_jwt_identity()
    contact_list = ContactList.query.filter_by(id=list_id, user_id=user_id).first_or_404()
    db.session.delete(contact_list)
    db.session.commit()
    return jsonify({"message": "Contact list deleted"})


@contacts_bp.route("/lists/<list_id>/upload", methods=["POST"])
@jwt_required()
def upload_contacts(list_id):
    user_id = get_jwt_identity()
    contact_list = ContactList.query.filter_by(id=list_id, user_id=user_id).first_or_404()

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename:
        return jsonify({"error": "No file selected"}), 400

    allowed_ext = (".csv", ".xlsx", ".xls")
    if not any(file.filename.lower().endswith(ext) for ext in allowed_ext):
        return jsonify({"error": "Only CSV and Excel files are accepted"}), 400

    file_bytes = file.read()
    result = parse_contacts_file(file_bytes, file.filename)

    if "error" in result:
        return jsonify({"error": result["error"]}), 400

    # Get existing phones for dedup against DB
    existing_phones = {
        c.phone for c in Contact.query.filter_by(contact_list_id=list_id).with_entities(Contact.phone)
    }

    # Get user's blacklist
    blacklisted = {
        b.phone for b in Blacklist.query.filter_by(user_id=user_id).with_entities(Blacklist.phone)
    }

    new_contacts = []
    db_duplicates = 0
    blacklist_skipped = 0

    for c in result["valid"]:
        if c["phone"] in existing_phones:
            db_duplicates += 1
            continue
        if c["phone"] in blacklisted:
            blacklist_skipped += 1
            continue
        new_contacts.append(Contact(
            contact_list_id=list_id,
            phone=c["phone"],
            name=c.get("name"),
            email=c.get("email"),
            variables=c.get("variables", {}),
            is_valid=True,
        ))
        existing_phones.add(c["phone"])

    if new_contacts:
        db.session.bulk_save_objects(new_contacts)

    contact_list.total_contacts = Contact.query.filter_by(contact_list_id=list_id).count()
    contact_list.valid_contacts = Contact.query.filter_by(contact_list_id=list_id, is_valid=True, is_opted_out=False).count()
    db.session.commit()

    return jsonify({
        "imported": len(new_contacts),
        "total_in_file": result["total"],
        "invalid_in_file": result["invalid_count"],
        "file_duplicates_removed": result["duplicates_removed"],
        "db_duplicates_skipped": db_duplicates,
        "blacklisted_skipped": blacklist_skipped,
        "invalid_samples": result["invalid"][:5],
        "contact_list": contact_list.to_dict(),
    })


@contacts_bp.route("/blacklist", methods=["GET"])
@jwt_required()
def get_blacklist():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    paginated = Blacklist.query.filter_by(user_id=user_id).order_by(
        Blacklist.created_at.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "blacklist": [b.to_dict() for b in paginated.items],
        "total": paginated.total,
        "page": page,
    })


@contacts_bp.route("/blacklist", methods=["POST"])
@jwt_required()
def add_to_blacklist():
    user_id = get_jwt_identity()
    data = request.get_json()
    phone = normalize_phone(data.get("phone", ""))

    if not phone:
        return jsonify({"error": "Invalid phone number"}), 400

    existing = Blacklist.query.filter_by(user_id=user_id, phone=phone).first()
    if existing:
        return jsonify({"error": "Phone number already in blacklist"}), 409

    entry = Blacklist(user_id=user_id, phone=phone, reason=data.get("reason", ""))
    db.session.add(entry)

    # Mark opted out in all contact lists
    Contact.query.filter_by(phone=phone).update({"is_opted_out": True})
    db.session.commit()

    return jsonify({"blacklist_entry": entry.to_dict()}), 201


@contacts_bp.route("/blacklist/<entry_id>", methods=["DELETE"])
@jwt_required()
def remove_from_blacklist(entry_id):
    user_id = get_jwt_identity()
    entry = Blacklist.query.filter_by(id=entry_id, user_id=user_id).first_or_404()
    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Removed from blacklist"})
