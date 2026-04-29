#!/bin/bash

# 公共函数库
# 提供所有脚本共享的常量和函数

PROJECT_NAME="Carnival"
IOS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MOBILE_DIR="$(cd "$IOS_DIR/.." && pwd)"
REPO_ROOT="$(cd "$MOBILE_DIR/.." && pwd)"
PBXPROJ="$IOS_DIR/Carnival.xcodeproj/project.pbxproj"
DERIVED_DATA_DIR="$HOME/Library/Developer/Xcode/DerivedData"
MODULE_CACHE_DIR="$DERIVED_DATA_DIR/ModuleCache.noindex"

log_info() {
    echo "📋 $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1" >&2
}

log_warning() {
    echo "⚠️  $1"
}

log_step() {
    echo ""
    echo "📋 $1"
}

check_pods_exists() {
    if [ ! -d "$IOS_DIR/Pods" ]; then
        log_error "Pods 目录不存在"
        log_info "请先运行: cd $IOS_DIR && pod install"
        return 1
    fi
    return 0
}

check_xcode_closed() {
    if pgrep -x "Xcode" > /dev/null; then
        log_warning "检测到 Xcode 仍在运行"
        return 1
    fi
    return 0
}

get_project_name() {
    local pbxproj="$IOS_DIR/$PROJECT_NAME.xcodeproj/project.pbxproj"
    if [ -f "$pbxproj" ]; then
        local detected
        detected=$(grep -o 'PRODUCT_NAME = [^;]*' "$pbxproj" | head -1 | sed 's/PRODUCT_NAME = //' | xargs)
        if [ -n "$detected" ] && [ "$detected" != "\$(TARGET_NAME)" ]; then
            echo "$detected"
            return
        fi
    fi
    echo "$PROJECT_NAME"
}

ensure_ios_dir() {
    cd "$IOS_DIR" || {
        log_error "无法切换到 iOS 目录: $IOS_DIR"
        exit 1
    }
}
