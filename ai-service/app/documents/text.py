"""What the rules read in a document's text: labelled dates and IBANs.

French administrative wording only. A date is kept with the words just
before it, so a rule can tell an expiry date from an issue date.
"""

import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

_MONTHS = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5,
    "juin": 6, "juillet": 7, "août": 8, "aout": 8, "septembre": 9,
    "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12,
}

_NUMERIC = re.compile(r"\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\b")
_WRITTEN = re.compile(r"\b(\d{1,2})(?:er)?\s+(" + "|".join(_MONTHS) + r")\s+(\d{4})\b", re.IGNORECASE)

EXPIRY_WORDS = ("expir", "valable jusqu", "fin de validité", "date de fin", "valid until", "date limite")
ISSUE_WORDS = ("émis le", "emis le", "établi le", "etabli le", "date d'édition", "date d'edition",
               "date d'émission", "date d'emission", "fait le", "édité le", "edite le", "date de la facture")


@dataclass(frozen=True)
class FoundDate:
    value: date
    context: str  # lower-cased words just before the date


def find_dates(text: str) -> list[FoundDate]:
    """Dates in reading order, each with the words between it and the previous one."""
    matches = []
    for pattern, month_of in ((_NUMERIC, lambda m: int(m.group(2))),
                              (_WRITTEN, lambda m: _MONTHS[m.group(2).lower()])):
        for match in pattern.finditer(text):
            try:
                value = date(int(match.group(3)), month_of(match), int(match.group(1)))
            except ValueError:
                continue
            matches.append((match.start(), match.end(), value))

    found: list[FoundDate] = []
    previous_end = 0
    for start, end, value in sorted(matches):
        # The context stops at the previous date: in « valable jusqu'au X,
        # émis le Y », Y must not inherit X's label.
        context = text[max(previous_end, start - 40):start].lower()
        found.append(FoundDate(value, context))
        previous_end = end
    return found


def labelled(dates: list[FoundDate], words: tuple[str, ...]) -> list[date]:
    return [d.value for d in dates if any(w in d.context for w in words)]


_IBAN = re.compile(r"\b([A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?)\b")


def iban_is_valid(iban: str) -> bool:
    """ISO 13616 / ISO 7064 mod 97-10."""
    compact = iban.replace(" ", "").upper()
    if not 15 <= len(compact) <= 34:
        return False
    rearranged = compact[4:] + compact[:4]
    digits = "".join(str(int(c, 36)) for c in rearranged)
    return int(digits) % 97 == 1


def find_iban(text: str) -> Optional[str]:
    """First IBAN-shaped string, valid or not — validity is the rule's job."""
    match = _IBAN.search(text.upper())
    return match.group(1) if match else None
