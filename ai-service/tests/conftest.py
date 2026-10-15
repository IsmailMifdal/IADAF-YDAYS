"""Test configuration, applied before any application module is imported.

Tests that need PostgreSQL run only when TEST_DATABASE_URL points to a
disposable database (CI provides one); the others need nothing.
"""

import os

os.environ.setdefault("INTERNAL_JWT_SECRET", "test-secret-at-least-32-bytes-long-0123456789")
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
