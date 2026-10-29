"""Compliance rules, by kind of document.

Each rule returns a check with a fixed message: results are explainable,
testable, and the same for everyone. "unknown" means the rule could not be
applied (nothing readable) — it is never reported as a pass.
"""

import unicodedata
from dataclasses import dataclass
from datetime import date, timedelta
from typing import List, Literal, Optional

from app.documents import text as doc_text
from app.documents.mrz import MrzResult

Status = Literal["ok", "warning", "error", "unknown"]

# A proof of address must be under three months old (préfecture, CAF, CPAM).
ADDRESS_PROOF_MAX_AGE = timedelta(days=92)
# An identity document expiring within this delay will not last the procedure.
EXPIRY_SOON = timedelta(days=90)


@dataclass(frozen=True)
class Check:
    id: str
    status: Status
    message: str


def _norm(label: str) -> str:
    stripped = unicodedata.normalize("NFKD", label.lower())
    return "".join(c for c in stripped if not unicodedata.combining(c))


def category(document_type: str) -> str:
    """Kind of document behind a pack's label (« Passeport », « [CAF] RIB »…)."""
    label = _norm(document_type)
    if any(w in label for w in ("passeport", "carte d'identite", "piece d'identite", "titre de sejour",
                                "visa", "carte de resident")):
        return "identity"
    if "justificatif de domicile" in label or "attestation de domicile" in label:
        return "address"
    if "rib" in label.split() or "releve d'identite bancaire" in label:
        return "bank"
    return "other"


def identity_checks(mrz: Optional[MrzResult], dates: list[doc_text.FoundDate], today: date) -> list[Check]:
    checks: list[Check] = []
    expiry: Optional[date] = None

    if mrz is not None:
        if mrz.checks_valid:
            checks.append(Check("mrz", "ok", "Bande de lecture automatique (MRZ) lue et cohérente."))
        else:
            checks.append(Check("mrz", "warning",
                                "La bande de lecture automatique (MRZ) est mal lue ou incohérente : "
                                "reprenez la photo bien à plat, sans reflet."))
        expiry = mrz.expiry
    if expiry is None:
        labelled = doc_text.labelled(dates, doc_text.EXPIRY_WORDS)
        expiry = max(labelled) if labelled else None

    if expiry is None:
        checks.append(Check("expiry", "unknown", "Date de fin de validité non lue : vérifiez-la vous-même."))
    elif expiry < today:
        checks.append(Check("expiry", "error",
                            f"Document expiré depuis le {expiry:%d/%m/%Y} : il sera refusé."))
    elif expiry - today <= EXPIRY_SOON:
        checks.append(Check("expiry", "warning",
                            f"Document valable jusqu'au {expiry:%d/%m/%Y} seulement : "
                            "il risque d'expirer avant la fin de la démarche."))
    else:
        checks.append(Check("expiry", "ok", f"Document valable jusqu'au {expiry:%d/%m/%Y}."))
    return checks


def address_checks(dates: list[doc_text.FoundDate], today: date) -> list[Check]:
    past = [d for d in doc_text.labelled(dates, doc_text.ISSUE_WORDS) if d <= today]
    if not past:
        # No labelled issue date: the most recent past date is the best guess.
        past = [d.value for d in dates if d.value <= today]
    if not past:
        return [Check("recency", "unknown", "Date d'émission non lue : le justificatif doit dater de moins de 3 mois.")]
    issued = max(past)
    if today - issued > ADDRESS_PROOF_MAX_AGE:
        return [Check("recency", "error",
                      f"Justificatif du {issued:%d/%m/%Y} : il doit dater de moins de 3 mois.")]
    return [Check("recency", "ok", f"Justificatif du {issued:%d/%m/%Y}, de moins de 3 mois.")]


def bank_checks(content_text: str) -> list[Check]:
    iban = doc_text.find_iban(content_text)
    if iban is None:
        return [Check("iban", "unknown", "IBAN non lu : vérifiez qu'il figure bien sur le RIB.")]
    if doc_text.iban_is_valid(iban):
        return [Check("iban", "ok", "IBAN présent et valide (clé de contrôle correcte).")]
    return [Check("iban", "error", "L'IBAN lu est invalide (clé de contrôle fausse) : vérifiez le RIB.")]


_ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}


def file_format_checks(filename: Optional[str]) -> List[Check]:
    """Accept common admin upload formats only."""
    if not filename:
        return [Check("format", "unknown", "Nom de fichier absent : formats attendus PDF/JPEG/PNG/WebP.")]
    lower = filename.lower().strip()
    dot = lower.rfind(".")
    suffix = lower[dot:] if dot >= 0 else ""
    if suffix in _ALLOWED_SUFFIXES:
        return [Check("format", "ok", f"Format {suffix} accepté pour dépôt.")]
    return [Check("format", "error",
                  f"Format « {suffix or 'inconnu'} » non accepté : utilisez PDF, JPEG, PNG ou WebP.")]


def type_coherence_checks(document_type: str, content_text: str) -> List[Check]:
    """Heuristic: uploaded label vs obvious wrong document signals in text."""
    cat = category(document_type)
    blob = _norm(content_text or "")
    if not blob:
        return [Check("type_coherence", "unknown", "Contenu texte insuffisant pour vérifier le type de pièce.")]

    if cat == "address" and any(w in blob for w in ("vitale", "ameli", "securite sociale")):
        if not any(w in blob for w in ("loyer", "quittance", "edf", "engie", "facture", "domicile", "heberg")):
            return [Check("type_coherence", "error",
                          "Le contenu ressemble à une pièce santé, pas à un justificatif de domicile.")]
    if cat == "bank" and "iban" not in blob and "fr76" not in blob.replace(" ", ""):
        if any(w in blob for w in ("passeport", "mrz", "republique francaise")):
            return [Check("type_coherence", "warning",
                          "Le fichier ne semble pas contenir d'IBAN : vérifiez que c'est bien un RIB.")]
    if cat == "identity" and any(w in blob for w in ("quittance de loyer", "facture d'electricite")):
        return [Check("type_coherence", "warning",
                      "Le contenu évoque un justificatif de domicile plutôt qu'une pièce d'identité.")]
    return [Check("type_coherence", "ok", "Cohérence apparente entre le type déclaré et le contenu lu.")]


def siret_checks(content_text: str) -> List[Check]:
    """Optional SIRET (14 digits) Luhn-like INSEE check when present (Pro / entreprise)."""
    digits = "".join(c for c in (content_text or "") if c.isdigit())
    candidates = []
    for i in range(0, max(0, len(digits) - 13)):
        chunk = digits[i : i + 14]
        if chunk.startswith("000"):
            continue
        candidates.append(chunk)
    if not candidates:
        return []
    for siret in candidates[:5]:
        if _siret_valid(siret):
            return [Check("siret", "ok", f"SIRET {siret[:3]}***{siret[-3:]} : clé de contrôle valide.")]
    return [Check("siret", "warning", "Un numéro type SIRET a été lu mais la clé de contrôle est invalide.")]


def _siret_valid(siret: str) -> bool:
    if len(siret) != 14 or not siret.isdigit():
        return False
    total = 0
    for idx, ch in enumerate(reversed(siret)):
        n = int(ch)
        if idx % 2 == 1:
            n *= 2
            if n > 9:
                n -= 9
        total += n
    return total % 10 == 0


def chemin_label_checks(document_type: str, allowed_labels: Optional[List[str]]) -> List[Check]:
    """Warn when the uploaded slot is not in the chemin checklist."""
    if not allowed_labels:
        return []
    norm_allowed = {_norm(x) for x in allowed_labels}
    label = _norm(document_type)
    if label in norm_allowed or any(label in a or a in label for a in norm_allowed):
        return [Check("chemin_slot", "ok", "Pièce attendue dans ce parcours.")]
    return [Check("chemin_slot", "warning",
                  "Cette pièce n'est pas dans la checklist du parcours : vérifiez le type déposé.")]
