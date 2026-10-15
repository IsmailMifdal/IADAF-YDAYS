"""Compliance rules, by kind of document.

Each rule returns a check with a fixed message: results are explainable,
testable, and the same for everyone. "unknown" means the rule could not be
applied (nothing readable) — it is never reported as a pass.
"""

import unicodedata
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal, Optional

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
