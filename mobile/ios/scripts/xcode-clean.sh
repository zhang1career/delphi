#!/bin/bash

# Xcode Clean：xcodebuild clean
#
# 使用：./xcode-clean.sh
# 或: npm 脚本

set -e

source "$(dirname "$0")/common.sh"

ensure_ios_dir

WORKSPACE="$PROJECT_NAME.xcworkspace"
SCHEME="$PROJECT_NAME"

log_step "开始清理 Xcode 项目..."

xcodebuild clean \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -quiet

xcodebuild clean \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration Release \
  -quiet

log_success "Xcode 清理完成！"
