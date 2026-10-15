#!/usr/bin/env bash
# Whole end-to-end suite against a running dev stack:
#   docker compose up -d --build && bash tests/e2e/run-all.sh
# Exit code: number of failed scripts (0 = all green).
cd "$(dirname "$0")"
failed=0
for script in security.sh accounts.sh documents.sh precheck.sh; do
  echo
  echo "################ $script"
  bash "$script" || failed=$((failed + 1))
done
echo
echo "################ $([ $failed -eq 0 ] && echo 'TOUT EST VERT' || echo "$failed script(s) en échec")"
exit $failed
