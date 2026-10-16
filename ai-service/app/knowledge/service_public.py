"""Official fiches of service-public.gouv.fr, turned into knowledge-base entries.

The DILA publishes every "fiche pratique" as XML, updated daily, under the
Licence Ouverte 2.0: reuse is free provided the source and the date of last
update are cited — both are kept on every entry. The hand-written entries of
demarches.json drift as fees, forms and procedures change; these follow the
administration's own text.

Each fiche is split into short passages (one per chapter, cut further when
long): the embedding model only reads the first ~128 tokens of a passage, so
one entry per fiche would index its first paragraph and nothing else.

Standard library only, and the archive is untrusted input: sizes are capped
and DTDs refused (entity expansion).
"""

from __future__ import annotations

import io
import re
import xml.etree.ElementTree as ET
import zipfile
from typing import Dict, Iterable, Iterator, List, Optional, Tuple
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ARCHIVE_URL = "https://lecomarquage.service-public.gouv.fr/vdd/3.5/part/zip/vosdroits-latest.zip"
ATTRIBUTION = (
    "Service-Public.gouv.fr — Direction de l'information légale et administrative "
    "(DILA), Licence Ouverte 2.0"
)

MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_FICHE_BYTES = 2 * 1024 * 1024
# ~128 tokens of French, with the title prepended by the indexer.
MAX_PASSAGE_CHARS = 700
# A long query string is tracking or a sign-in redirect, not a useful link.
MAX_URL_CHARS = 160

_DC = "{http://purl.org/dc/elements/1.1/}"
_NOTES = {"ASavoir": "À savoir", "ANoter": "À noter", "Attention": "Attention"}
_FICHE_ID = re.compile(r"^F\d+$")


class FicheError(ValueError):
    """A fiche that cannot be read safely."""


def read_archive(data: bytes, fiche_ids: Iterable[str]) -> Dict[str, bytes]:
    """The XML of each requested fiche, from the zip archive's bytes."""
    if len(data) > MAX_ARCHIVE_BYTES:
        raise FicheError("archive too large")
    wanted = set(fiche_ids)
    found: Dict[str, bytes] = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for info in archive.infolist():
            fiche_id = info.filename.removesuffix(".xml")
            if fiche_id not in wanted:
                continue
            if info.file_size > MAX_FICHE_BYTES:
                raise FicheError(f"{info.filename}: too large")
            found[fiche_id] = archive.read(info)
    return found


def fiche_to_entries(xml: bytes) -> List[Dict[str, str]]:
    """Knowledge-base entries of one fiche, in reading order."""
    if b"<!DOCTYPE" in xml[:2048] or b"<!ENTITY" in xml:
        raise FicheError("DTD or entity declaration refused")
    root = ET.fromstring(xml)
    fiche_id = root.get("ID", "")
    if not _FICHE_ID.match(fiche_id):
        raise FicheError(f"not a fiche: {fiche_id!r}")

    title = _clean(root.findtext(_DC + "title") or fiche_id)
    url = root.get("spUrl") or f"https://www.service-public.gouv.fr/particuliers/vosdroits/{fiche_id}"
    updated = (root.get("dateDerniereModificationImportante") or "")[:10] or _dc_date(root)

    sections: List[Tuple[str, str]] = []
    intro = "\n".join(
        part for part in [_clean(root.findtext(_DC + "description") or ""), _text_of(root.find("Introduction"))] if part
    )
    if intro:
        sections.append(("Présentation", intro))
    sections.extend(_sections(root.find("Texte")))
    # "Fiches conditionnées": the text depends on the reader's situation
    # (living alone or as a couple, in France or abroad…), one Texte each.
    for situation in root.findall("ListeSituations/Situation"):
        label = _text_of(situation.find("Titre"))
        for heading, body in _sections(situation.find("Texte")):
            sections.append((" — ".join(part for part in (label, heading) if part), body))
    services = _online_services(root)
    if services:
        sections.append(("Services en ligne et formulaires", services))

    entries: List[Dict[str, str]] = []
    for heading, body in sections:
        for passage in _passages(body):
            entries.append(
                {
                    "id": f"sp-{fiche_id}-{len(entries) + 1}",
                    "title": f"{title} — {heading}" if heading else title,
                    "contenu": passage,
                    "lien_officiel": url,
                    "mis_a_jour": updated,
                    "source": ATTRIBUTION,
                }
            )
    return entries


# ---------------------------------------------------------------------------
# XML → text
# ---------------------------------------------------------------------------


def _sections(texte: Optional[ET.Element]) -> Iterator[Tuple[str, str]]:
    """(heading, text) per chapter; what precedes the first chapter is kept too."""
    if texte is None:
        return
    loose: List[str] = []
    for child in texte:
        if child.tag == "Chapitre":
            heading = _text_of(child.find("Titre"))
            body = "\n".join(_lines(child, skip_title=True))
            if body:
                yield heading, body
        else:
            # _lines reads an element's children: wrap this one to read it.
            wrapper = ET.Element("Bloc")
            wrapper.append(child)
            loose.extend(_lines(wrapper))
    if loose:
        yield "", "\n".join(loose)


def _lines(element: ET.Element, skip_title: bool = False) -> Iterator[str]:
    """Readable lines of a block: lists as dashes, cases and notes labelled."""
    for child in element:
        tag = child.tag
        if tag == "Titre" and skip_title:
            continue
        if tag in ("Paragraphe", "Titre"):
            text = _text_of(child)
            if text:
                yield text
        elif tag == "Liste":
            for item in child.findall("Item"):
                text = " ".join(_lines(item)) or _text_of(item)
                if text:
                    yield f"- {text}"
        elif tag == "BlocCas":
            for case in child.findall("Cas"):
                label = _text_of(case.find("Titre"))
                # One line per element: table rows run together would make
                # amounts ambiguous.
                body = list(_lines(case, skip_title=True))
                if body:
                    yield (f"Cas « {label} » : " if label else "") + body[0]
                    yield from body[1:]
        elif tag in _NOTES:
            body = " ".join(_lines(child, skip_title=True))
            if body:
                yield f"{_NOTES[tag]} : {body}"
        elif tag == "Tableau":
            # Amounts and thresholds live in tables: one line per row.
            caption = _text_of(child.find("TitreRiche"))
            if caption:
                yield caption
            for row in child.findall("Rangée"):
                cells = [_text_of(cell) for cell in row.findall("Cellule")]
                if any(cells):
                    yield " | ".join(cells)
        elif tag in ("SousChapitre", "Complement"):
            yield from _lines(child)
        # Anything else (links lists, references, local offices) is navigation.


def _online_services(root: ET.Element) -> str:
    lines = []
    for service in root.findall("ServiceEnLigne"):
        name = _text_of(service.find("Titre"))
        if not name:
            continue
        kind = service.get("type", "")
        cerfa = service.get("numerocerfa")
        label = f"{name} ({kind}{f', cerfa n° {cerfa}' if cerfa else ''})" if kind else name
        url = _useful_url(service.get("URL", ""))
        lines.append(f"- {label} : {url}" if url else f"- {label}")
    return "\n".join(lines)


def _useful_url(url: str) -> str:
    """Without tracking parameters; without its query if it is still long
    (a sign-in redirect or a session, useless to anyone else)."""
    parts = urlsplit(url)
    query = urlencode([(key, value) for key, value in parse_qsl(parts.query) if not key.startswith("utm_")])
    url = urlunsplit(parts._replace(query=query))
    return url if len(url) <= MAX_URL_CHARS else urlunsplit(parts._replace(query=""))


def _text_of(element: Optional[ET.Element]) -> str:
    return _clean("".join(element.itertext())) if element is not None else ""


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _dc_date(root: ET.Element) -> str:
    match = re.search(r"\d{4}-\d{2}-\d{2}", root.findtext(_DC + "date") or "")
    return match.group(0) if match else ""


def _passages(body: str) -> Iterator[str]:
    """Cut at line boundaries into passages of at most MAX_PASSAGE_CHARS."""
    current = ""
    for line in body.split("\n"):
        while len(line) > MAX_PASSAGE_CHARS:  # one very long paragraph
            cut = line.rfind(" ", 0, MAX_PASSAGE_CHARS)
            cut = cut if cut > 0 else MAX_PASSAGE_CHARS
            if current:
                yield current
                current = ""
            yield line[:cut].strip()
            line = line[cut:].strip()
        if current and len(current) + 1 + len(line) > MAX_PASSAGE_CHARS:
            yield current
            current = line
        else:
            current = f"{current}\n{line}" if current else line
    if current:
        yield current
