#!/bin/sh
set -e

# A newly created Fly volume mounts as root-owned, which masks the build-time
# ownership of /app/data and leaves the unprivileged app user unable to write
# the SQLite database. Fix ownership as root, then drop privileges immediately.
if [ "$(id -u)" = "0" ]; then
	chown -R app:app /app/data
	exec su-exec app "$@"
fi

exec "$@"
