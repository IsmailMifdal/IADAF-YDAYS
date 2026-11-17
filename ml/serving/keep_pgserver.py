"""Keep embedded Postgres (pgserver) alive for local ai-service eval.

Runtime data lives in ml/.tools/ (gitignored): pgdata_iadaf/, pg_uri.txt.
"""

from __future__ import annotations

import subprocess
import time
from pathlib import Path

import pgserver

ML = Path(__file__).resolve().parents[1]
TOOLS = ML / ".tools"
PGDATA = TOOLS / "pgdata_iadaf"
URI_FILE = TOOLS / "pg_uri.txt"


def main() -> None:
    TOOLS.mkdir(parents=True, exist_ok=True)
    srv = pgserver.get_server(PGDATA, cleanup_mode=None)
    info = srv.get_postmaster_info()
    port = info.port
    print(f"PORT {port}", flush=True)

    psql = str(next(Path(pgserver.__file__).parent.rglob("psql.exe")))
    base = [psql, "-h", "127.0.0.1", "-p", str(port), "-U", "postgres", "-d", "postgres"]

    subprocess.run(
        base
        + [
            "-c",
            "CREATE ROLE iadaf_user LOGIN PASSWORD 'iadaf_password'",
        ],
        check=False,
        capture_output=True,
    )
    exists = subprocess.run(
        base + ["-tAc", "SELECT 1 FROM pg_database WHERE datname='iadaf_db'"],
        capture_output=True,
        text=True,
        check=False,
    )
    if exists.stdout.strip() != "1":
        subprocess.run(
            base + ["-c", "CREATE DATABASE iadaf_db OWNER iadaf_user"],
            check=True,
            capture_output=True,
        )

    URI_FILE.write_text(
        f"postgresql+asyncpg://iadaf_user:iadaf_password@127.0.0.1:{port}/iadaf_db\n",
        encoding="utf-8",
    )
    print("READY", flush=True)
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
