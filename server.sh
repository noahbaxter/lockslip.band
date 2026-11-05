#!/bin/bash
# Dev server on http://localhost:8000, run with the repo venv
cd "$(dirname "$0")" || exit 1
[ -x .venv/bin/python ] || { echo "no .venv, run 'venv' in the repo root first" >&2; exit 1; }
exec .venv/bin/python server.py
