#!/bin/bash

# iOS 构建前预处理：从仓库根 .env 同步版本号、构建号等到 Xcode

set -e

source "$(dirname "$0")/common.sh"

cd "$IOS_DIR"

bash "$SCRIPTS_DIR/sync-ios-metadata-from-env.sh"
