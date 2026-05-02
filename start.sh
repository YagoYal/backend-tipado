#!/bin/sh
set -e
node dist/migrate.js
node dist/server.js
