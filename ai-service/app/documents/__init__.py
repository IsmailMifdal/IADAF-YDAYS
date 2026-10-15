"""Automated pre-check of the documents filed in a pack (Phase 4).

Deterministic by design: quality measures, text read from the file, MRZ and
IBAN checksums, and dated rules. No language model takes part, so no identity
data leaves the server, and every result can be explained and tested.

The result is an indicative pre-check, never a decision: only the
administration rules on a file.
"""
