"""MRZ parsing, checked against the specimens of ICAO Doc 9303 (fictional state UTO)."""

from datetime import date

from app.documents import mrz

TD3 = """
P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<
L898902C36UTO7408122F1204159ZE184226B<<<<<10
"""

TD1 = """
I<UTOD231458907<<<<<<<<<<<<<<<
7408122F1204159UTO<<<<<<<<<<<6
ERIKSSON<<ANNA<MARIA<<<<<<<<<<
"""

TD2 = """
I<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<
D231458907UTO7408122F1204159<<<<<<<6
"""


def test_check_digit_reference_values():
    assert mrz.check_digit("L898902C3") == 6
    assert mrz.check_digit("740812") == 2
    assert mrz.check_digit("120415") == 9
    assert mrz.check_digit("<<<<<") == 0


def test_passport_td3():
    result = mrz.parse(TD3)
    assert result is not None
    assert (result.format, result.document_code, result.checks_valid) == ("TD3", "P", True)
    assert result.expiry == date(2012, 4, 15)


def test_id_card_td1():
    result = mrz.parse(TD1)
    assert result is not None
    assert (result.format, result.document_code, result.checks_valid) == ("TD1", "I", True)
    assert result.expiry == date(2012, 4, 15)


def test_td2():
    result = mrz.parse(TD2)
    assert result is not None
    assert (result.format, result.checks_valid) == ("TD2", True)


def test_ocr_noise_spaces_and_lowercase_are_tolerated():
    noisy = TD3.replace("P<UTO", "p<uto").replace("L898902C36", "L898 902C36")
    result = mrz.parse(noisy)
    assert result is not None and result.checks_valid


def test_altered_mrz_is_detected():
    # Expiry pushed from 2012 to 2032 without fixing the check digits.
    forged = TD3.replace("F1204159", "F3204159")
    result = mrz.parse(forged)
    assert result is not None
    assert result.checks_valid is False


def test_no_mrz_in_ordinary_text():
    assert mrz.parse("Avis d'imposition 2026\nRevenu fiscal de référence : 23 450 €") is None


def test_result_carries_no_identity():
    result = mrz.parse(TD3)
    fields = set(vars(result))
    assert fields == {"format", "document_code", "checks_valid", "expiry"}
