#!/bin/bash

# Xcode Archive
#
# 使用：./xcode-archive.sh [configuration] [archive_path]
# 或: npm 脚本

set -e
set -o pipefail

source "$(dirname "$0")/common.sh"

ensure_ios_dir

WORKSPACE="$PROJECT_NAME.xcworkspace"
SCHEME="$PROJECT_NAME"
CONFIGURATION="${1:-Release}"

ARCHIVE_PATH="${2:-$HOME/Library/Developer/Xcode/Archives/$(date +%Y-%m-%d)/$PROJECT_NAME-$(date +%Y-%m-%d-%H%M%S).xcarchive}"

log_step "开始打包 Xcode 项目 (Configuration: $CONFIGURATION)..."
echo "📁 Archive 路径: $ARCHIVE_PATH"
echo ""
log_info "提示: 确保在 Xcode 中已配置代码签名（Signing & Capabilities → Team）"
echo ""

mkdir -p "$(dirname "$ARCHIVE_PATH")"

ARCHIVE_LOG="${TMPDIR:-/tmp}/$PROJECT_NAME-archive-$$.log"
if ! xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -archivePath "$ARCHIVE_PATH" \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates 2>&1 | tee "$ARCHIVE_LOG"; then
  echo ""
  log_error "Archive 失败"
  echo ""
  echo "📋 完整日志已保存到: $ARCHIVE_LOG"
  echo "   快速查找错误: grep -n -E 'error:|failed|FAILED' \"$ARCHIVE_LOG\""
  echo ""
  log_info "若 Xcode 里 Product → Archive 可成功、仅命令行失败，可尝试："
  echo "   1. 在终端执行: xcode-select -p 确认指向当前 Xcode"
  echo "   2. 钥匙串已解锁且含 Apple Distribution / Development 证书"
  echo ""
  log_info "其他常见原因:"
  echo "   1. 未配置代码签名（Xcode → Signing & Capabilities → Team）"
  echo "   2. 证书或 Provisioning Profile 无效"
  echo "   3. Bundle Identifier 冲突"
  echo ""
  echo "   解决: 打开 $IOS_DIR/$WORKSPACE → Target $PROJECT_NAME → Signing & Capabilities"
  exit 1
fi
rm -f "$ARCHIVE_LOG"

log_success "Xcode 打包完成！"
echo "📦 Archive 位置: $ARCHIVE_PATH"
