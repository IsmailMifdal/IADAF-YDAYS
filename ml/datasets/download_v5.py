#!/usr/bin/env python3
"""Télécharge les datasets ML v5 — pour l'instant = delta v4 (réutilisé).

v5A/v5B changent la base (Ministral 8B/14B). Le mix SFT réutilise raw/v4.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOWNLOAD_V4 = ROOT / "datasets" / "download_v4.py"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max rows par dataset HF (transmis à download_v4.py)",
    )
    args, unknown = parser.parse_known_args()

    if not DOWNLOAD_V4.is_file():
        print(f"Manquant: {DOWNLOAD_V4}", file=sys.stderr)
        return 1

    print(
        "v5 datasets: réutilise download_v4.py → raw/v4/ "
        "(pas de nouveau corpus tant que BRIEF-V5 n'ajoute pas de delta).",
        flush=True,
    )
    cmd = [sys.executable, str(DOWNLOAD_V4), *unknown]
    if args.limit is not None and "--limit" not in unknown:
        cmd.extend(["--limit", str(args.limit)])
    return subprocess.run(cmd, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
