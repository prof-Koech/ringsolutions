import re
import phonenumbers
import pandas as pd
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

PHONE_RE = re.compile(r"^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$")


def normalize_phone(phone: str, default_region: str = "KE") -> str | None:
    """Return E.164 phone or None if invalid."""
    try:
        phone = str(phone).strip().replace(" ", "").replace("-", "")
        parsed = phonenumbers.parse(phone, default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        pass
    return None


def validate_email(email: str) -> bool:
    pattern = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
    return bool(pattern.match(email.strip()))


def parse_contacts_file(file_bytes: bytes, filename: str) -> dict:
    """
    Parse CSV or Excel file of contacts.
    Expected columns: phone (required), name (optional), email (optional), + any custom cols.
    Returns: {valid: [...], invalid: [...], total: int, duplicates_removed: int}
    """
    try:
        if filename.lower().endswith((".xlsx", ".xls")):
            df = pd.read_excel(BytesIO(file_bytes), dtype=str)
        else:
            df = pd.read_csv(BytesIO(file_bytes), dtype=str)

        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        if "phone" not in df.columns:
            phone_candidates = ["mobile", "phone_number", "telephone", "tel", "msisdn", "contact"]
            for candidate in phone_candidates:
                if candidate in df.columns:
                    df.rename(columns={candidate: "phone"}, inplace=True)
                    break

        if "phone" not in df.columns:
            return {"error": "No phone column found. Expected column named 'phone', 'mobile', or 'telephone'."}

        df = df.fillna("")
        total = len(df)
        valid = []
        invalid = []
        seen_phones = set()
        duplicates = 0

        for _, row in df.iterrows():
            raw_phone = str(row.get("phone", "")).strip()
            normalized = normalize_phone(raw_phone)

            if not normalized:
                invalid.append({"raw_phone": raw_phone, "reason": "Invalid phone number"})
                continue

            if normalized in seen_phones:
                duplicates += 1
                continue

            seen_phones.add(normalized)
            contact = {
                "phone": normalized,
                "name": str(row.get("name", "")).strip() or None,
                "email": str(row.get("email", "")).strip() or None,
                "variables": {},
            }

            # Capture extra columns as template variables
            for col in df.columns:
                if col not in ("phone", "name", "email"):
                    val = str(row.get(col, "")).strip()
                    if val:
                        contact["variables"][col] = val

            valid.append(contact)

        return {
            "valid": valid,
            "invalid": invalid,
            "total": total,
            "valid_count": len(valid),
            "invalid_count": len(invalid),
            "duplicates_removed": duplicates,
        }

    except Exception as e:
        logger.error(f"Error parsing contacts file: {e}")
        return {"error": f"Failed to parse file: {str(e)}"}


def validate_message(message: str) -> dict:
    """Validate and analyze a message body."""
    if not message or not message.strip():
        return {"valid": False, "error": "Message cannot be empty"}

    from app.services.africas_talking import at_service
    units = at_service.estimate_sms_units(message)

    return {
        "valid": True,
        "length": len(message),
        "sms_units": units,
        "characters_remaining": (units * 160) - len(message) if units == 1 else (units * 153) - len(message),
    }
