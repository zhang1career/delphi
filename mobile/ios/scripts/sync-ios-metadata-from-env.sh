#!/usr/bin/env bash
set -euo pipefail

IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MOBILE_DIR="$(cd "${IOS_DIR}/.." && pwd)"
ROOT_ENV="${MOBILE_DIR}/../.env"
PBXPROJ_PATH="${IOS_DIR}/Carnival.xcodeproj/project.pbxproj"

if [[ ! -f "${ROOT_ENV}" ]]; then
  echo "[.env] skip: ${ROOT_ENV} not found"
  exit 0
fi

if [[ ! -f "${PBXPROJ_PATH}" ]]; then
  echo "[.env] skip: ${PBXPROJ_PATH} not found"
  exit 0
fi

trim() {
  local value="$1"
  # shellcheck disable=SC2001
  value="$(echo "${value}" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//')"
  printf '%s' "${value}"
}

read_env() {
  local key="$1"
  local raw=""
  while IFS= read -r line; do
    [[ "${line}" =~ ^[[:space:]]*# ]] && continue
    if [[ "${line}" == "${key}="* ]]; then
      raw="${line#*=}"
      break
    fi
  done < "${ROOT_ENV}"

  if [[ -z "${raw}" ]]; then
    return 1
  fi

  raw="$(trim "${raw}")"
  raw="${raw%\"}"
  raw="${raw#\"}"
  raw="${raw%\'}"
  raw="${raw#\'}"

  printf '%s' "${raw}"
}

APP_VERSION="$(read_env "APP_VERSION" || true)"
APP_DISPLAY_NAME="$(read_env "APP_DISPLAY_NAME" || true)"
APP_MODULE_NAME="$(read_env "APP_MODULE_NAME" || true)"
BUNDLE_ID="$(read_env "BUNDLE_ID" || true)"
TEAM_ID="$(read_env "TEAM_ID" || true)"
IOS_BUILD_NUMBER="$(read_env "IOS_BUILD_NUMBER" || true)"

if [[ -z "${IOS_BUILD_NUMBER}" ]]; then
  IOS_BUILD_NUMBER="$(date +%Y%m%d%H%M%S)"
fi

PBXPROJ_BAK="${PBXPROJ_PATH}.bak"
cp "${PBXPROJ_PATH}" "${PBXPROJ_BAK}"

python3 - "${PBXPROJ_PATH}" \
  "${APP_VERSION}" \
  "${IOS_BUILD_NUMBER}" \
  "${APP_DISPLAY_NAME}" \
  "${APP_MODULE_NAME}" \
  "${BUNDLE_ID}" \
  "${TEAM_ID}" <<'PY'
import re
import sys
from pathlib import Path

pbxproj = Path(sys.argv[1])
app_version = sys.argv[2].strip()
build_number = sys.argv[3].strip()
display_name = sys.argv[4].strip()
module_name = sys.argv[5].strip()
bundle_id = sys.argv[6].strip()
team_id = sys.argv[7].strip()

text = pbxproj.read_text(encoding="utf-8")

def format_value(raw: str) -> str:
  if raw == "":
    return raw
  if re.fullmatch(r"[A-Za-z0-9_.$()/:-]+", raw):
    return raw
  escaped = raw.replace("\\", "\\\\").replace('"', '\\"')
  return f'"{escaped}"'

def replace_setting(source: str, key: str, value: str) -> str:
  if not value:
    return source
  value = format_value(value)
  pattern = re.compile(rf"(\b{re.escape(key)}\s*=\s*)([^;]+)(;)")
  return pattern.sub(lambda m: f"{m.group(1)}{value}{m.group(3)}", source)

updated = text
updated = replace_setting(updated, "MARKETING_VERSION", app_version)
updated = replace_setting(updated, "CURRENT_PROJECT_VERSION", build_number)
updated = replace_setting(updated, "PRODUCT_NAME", module_name or display_name)
updated = replace_setting(updated, "INFOPLIST_KEY_CFBundleDisplayName", display_name)
updated = replace_setting(updated, "PRODUCT_BUNDLE_IDENTIFIER", bundle_id)
updated = replace_setting(updated, "DEVELOPMENT_TEAM", team_id)

if display_name and "INFOPLIST_KEY_CFBundleDisplayName" not in updated:
  display_name_value = format_value(display_name)
  updated = re.sub(
      r"(^\s*PRODUCT_NAME\s*=\s*[^;]+;\n)",
      rf"\1\t\t\t\tINFOPLIST_KEY_CFBundleDisplayName = {display_name_value};\n",
      updated,
      flags=re.MULTILINE,
  )

if updated != text:
  pbxproj.write_text(updated, encoding="utf-8")
PY

if cmp -s "${PBXPROJ_PATH}" "${PBXPROJ_BAK}"; then
  echo "[.env] no iOS metadata changes"
else
  echo "[.env] synced iOS metadata from ${ROOT_ENV}"
fi

rm -f "${PBXPROJ_BAK}"

SYNC_ATS="${IOS_DIR}/scripts/sync-ios-ats-insecure-domains.sh"
if [[ -f "${SYNC_ATS}" ]]; then
  bash "${SYNC_ATS}" || {
    echo "[.env] sync-ios-ats-insecure-domains.sh failed" >&2
    exit 1
  }
fi
