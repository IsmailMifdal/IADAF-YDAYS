"""Machine-readable zone (ICAO Doc 9303) of passports, ID cards, residence permits.

Only what the rules need is returned — the kind of document, whether its
check digits hold, and its expiry date. Names, document number, nationality
and birth date are read to verify the check digits, then dropped
(data minimisation, RGPD art. 5.1.c).
"""

import re
from dataclasses import dataclass
from datetime import date
from typing import Optional

_MRZ_CHARS = re.compile(r"^[A-Z0-9<]+$")


@dataclass(frozen=True)
class MrzResult:
    format: str  # "TD1" (ID card, residence permit), "TD2", "TD3" (passport)
    document_code: str  # first letters, e.g. "P", "ID", "IR"
    checks_valid: bool
    expiry: Optional[date]


def check_digit(field: str) -> int:
    """ICAO 9303 check digit: weights 7-3-1, letters A=10…Z=35, filler '<'=0."""
    total = 0
    for i, char in enumerate(field):
        if char.isdigit():
            value = int(char)
        elif "A" <= char <= "Z":
            value = ord(char) - ord("A") + 10
        else:  # '<'
            value = 0
        total += value * (7, 3, 1)[i % 3]
    return total % 10


def _valid(field: str, digit: str) -> bool:
    return digit.isdigit() and check_digit(field) == int(digit)


def _expiry(yymmdd: str) -> Optional[date]:
    if not yymmdd.isdigit():
        return None
    yy, mm, dd = int(yymmdd[:2]), int(yymmdd[2:4]), int(yymmdd[4:])
    # Expiry dates are close to today: a two-digit year far in the future
    # belongs to the previous century.
    year = 2000 + yy if 2000 + yy <= date.today().year + 50 else 1900 + yy
    try:
        return date(year, mm, dd)
    except ValueError:
        return None


def _candidate_lines(text: str) -> list[str]:
    lines = []
    for raw in text.upper().splitlines():
        line = raw.replace(" ", "").replace("«", "<").strip()
        if len(line) in (30, 36, 44) and "<" in line and _MRZ_CHARS.match(line):
            lines.append(line)
    return lines


def parse(text: str) -> Optional[MrzResult]:
    """Find and parse an MRZ in ``text`` (OCR or PDF text), or return None."""
    lines = _candidate_lines(text)

    for i in range(len(lines)):
        # TD1: three lines of 30.
        if i + 2 < len(lines) and all(len(l) == 30 for l in lines[i:i + 3]):
            l1, l2 = lines[i], lines[i + 1]
            composite = l1[5:30] + l2[0:7] + l2[8:15] + l2[18:29]
            valid = (
                _valid(l1[5:14], l1[14])
                and _valid(l2[0:6], l2[6])
                and _valid(l2[8:14], l2[14])
                and _valid(composite, l2[29])
            )
            return MrzResult("TD1", l1[0:2].rstrip("<"), valid, _expiry(l2[8:14]))

        if i + 1 < len(lines) and len(lines[i]) == len(lines[i + 1]) and len(lines[i]) in (36, 44):
            l1, l2 = lines[i], lines[i + 1]
            width = len(l1)
            if width == 44:  # TD3, passport
                composite = l2[0:10] + l2[13:20] + l2[21:43]
                valid = (
                    _valid(l2[0:9], l2[9])
                    and _valid(l2[13:19], l2[19])
                    and _valid(l2[21:27], l2[27])
                    and _valid(l2[28:42], l2[42])
                    and _valid(composite, l2[43])
                )
                return MrzResult("TD3", l1[0:2].rstrip("<"), valid, _expiry(l2[21:27]))
            # TD2
            composite = l2[0:10] + l2[13:20] + l2[21:35]
            valid = (
                _valid(l2[0:9], l2[9])
                and _valid(l2[13:19], l2[19])
                and _valid(l2[21:27], l2[27])
                and _valid(composite, l2[35])
            )
            return MrzResult("TD2", l1[0:2].rstrip("<"), valid, _expiry(l2[21:27]))

    return None
