"""Refresh the assistant's official fiches from service-public.gouv.fr.

    python scripts/sync_service_public.py                  # download the daily feed
    python scripts/sync_service_public.py --archive f.zip  # or use a local copy

Rewrites app/data/knowledge_base/service_public.json from the fiches listed
in app/data/service_public_fiches.json. Run every week by
.github/workflows/kb-sync.yml, which opens a pull request when the text
changed: official content reaches users only once someone has read the diff.
The AI service reindexes by itself when it starts on a changed file.
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.knowledge.service_public import (  # noqa: E402
    ARCHIVE_URL,
    MAX_ARCHIVE_BYTES,
    fiche_to_entries,
    read_archive,
)

CONFIG = ROOT / "app" / "data" / "service_public_fiches.json"
OUTPUT = ROOT / "app" / "data" / "knowledge_base" / "service_public.json"


def download(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "IA-DAF knowledge-base sync"})
    with urllib.request.urlopen(request, timeout=120) as response:
        data = response.read(MAX_ARCHIVE_BYTES + 1)
    if len(data) > MAX_ARCHIVE_BYTES:
        raise SystemExit("Archive anormalement volumineuse : synchronisation interrompue.")
    return data


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--archive", type=Path, help="local copy of vosdroits-latest.zip")
    args = parser.parse_args()

    fiche_ids = [fiche["id"] for fiche in json.loads(CONFIG.read_text(encoding="utf-8"))["fiches"]]
    data = args.archive.read_bytes() if args.archive else download(ARCHIVE_URL)
    xml_by_id = read_archive(data, fiche_ids)

    # A fiche the DILA removed or renumbered must be noticed, not silently
    # dropped from what the assistant knows.
    missing = [fiche_id for fiche_id in fiche_ids if fiche_id not in xml_by_id]
    if missing:
        raise SystemExit(f"Fiches absentes du flux : {', '.join(missing)} — à corriger dans {CONFIG.name}.")

    entries = [entry for fiche_id in fiche_ids for entry in fiche_to_entries(xml_by_id[fiche_id])]
    OUTPUT.write_text(json.dumps(entries, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{len(fiche_ids)} fiches, {len(entries)} passages -> {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
