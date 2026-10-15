#!/bin/sh
# Starts the service as the unprivileged `app` user.
#
# Volumes created before the service ran unprivileged are owned by root:
# hand the vector store back to `app` first, then drop root for good.
set -e

if [ "$(id -u)" = 0 ]; then
  mkdir -p /data/vectorstore
  chown -R app:app /data/vectorstore
  # setpriv switches the user, not the environment: without this, HOME stays
  # /root, where `app` may not read (asyncpg looks for client certificates
  # there, Hugging Face caches models there).
  export HOME=/home/app
  exec setpriv --reuid=app --regid=app --init-groups "$@"
fi
exec "$@"
