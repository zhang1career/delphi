#!/usr/bin/env bash
# Syncs NSAppTransportSecurity/NSExceptionDomains in Carnival/Info.plist from repo-root env
# (same order as mobile/app.config.js):
#   1) .env
#   2) if RUN_ENV is dev|test|prod, .env.${RUN_ENV} (override; e.g. .env.prod)
#   IOS_ATS_INSECURE_HTTP_DOMAINS=comma,separated,hosts
# Empty (after merge) removes NSExceptionDomains. Invoked from sync-ios-metadata-from-env (pod post_install) and prebuild.

set -euo pipefail

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$(cd "${IOS_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${MOBILE_DIR}/.." && pwd)"
INFO_PLIST="${IOS_DIR}/Carnival/Info.plist"

if [[ ! -f "${INFO_PLIST}" ]]; then
  echo "[ATS] skip: ${INFO_PLIST} not found"
  exit 0
fi

python3 - "${REPO_ROOT}" "${INFO_PLIST}" <<'PY'
import sys
import plistlib
from pathlib import Path
from typing import Dict, List

repo_root = Path(sys.argv[1])
info_plist = Path(sys.argv[2])


def parse_env_file(path: Path) -> Dict[str, str]:
    out: Dict[str, str] = {}
    if not path.is_file():
        return out
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if "=" not in s:
            continue
        k, v = s.split("=", 1)
        k, v = k.strip(), v.strip()
        if v and v[0] in "\"'":
            q = v[0]
            v = v[1:].rstrip()
            if v.endswith(q):
                v = v[:-1]
        if k:
            out[k] = v
    return out


def load_merged_env(root: Path) -> Dict[str, str]:
    base = parse_env_file(root / ".env")
    run = base.get("RUN_ENV", "").strip()
    if run in ("dev", "test", "prod"):
        overlay = parse_env_file(root / f".env.{run}")
        return {**base, **overlay}
    return base


def domains_from_merged(merged: Dict[str, str]) -> List[str]:
    raw = (merged.get("IOS_ATS_INSECURE_HTTP_DOMAINS") or "").strip()
    if not raw:
        return []
    return [p.strip() for p in raw.split(",") if p.strip()]


merged = load_merged_env(repo_root)
domains = domains_from_merged(merged)
data = plistlib.loads(info_plist.read_bytes())
ats = dict(data.get("NSAppTransportSecurity") or {})

if not domains:
    ats.pop("NSExceptionDomains", None)
else:
    ats["NSExceptionDomains"] = {h: {"NSExceptionAllowsInsecureHTTPLoads": True} for h in domains}

data["NSAppTransportSecurity"] = ats
info_plist.write_bytes(plistlib.dumps(data))
if domains:
    print(f"[ATS] NSExceptionDomains set for: {', '.join(domains)}", file=sys.stderr)
else:
    print("[ATS] NSExceptionDomains removed (empty IOS_ATS_INSECURE_HTTP_DOMAINS)", file=sys.stderr)
PY
