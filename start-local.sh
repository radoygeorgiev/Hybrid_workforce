#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python3 server.py --port 8080 --open
