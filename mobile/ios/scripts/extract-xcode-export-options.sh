#!/bin/bash

# 从 Xcode Organizer 导出的 IPA 中提取 ExportOptions.plist
# 
# 使用方法：
#   1. 在 Xcode Organizer 中导出一次 IPA（选择 "Export" 而不是 "Upload"）
#   2. 选择导出目录
#   3. 运行此脚本：./extract-xcode-export-options.sh <导出目录>
#
# 脚本会找到 Xcode 生成的 ExportOptions.plist 并显示内容

set -e

# 加载公共函数
source "$(dirname "$0")/common.sh"

if [ $# -lt 1 ]; then
    log_error "缺少参数"
    echo ""
    log_info "使用方法:"
    echo "  $0 <Xcode导出目录>"
    echo ""
    log_info "步骤:"
    echo "   1. 在 Xcode Organizer 中: Window → Organizer → Archives"
    echo "   2. 选择 Archive → Distribute App → Export"
    echo "   3. 选择导出目录（不要选择 Upload）"
    echo "   4. 运行此脚本: $0 <导出目录>"
    echo ""
    exit 1
fi

EXPORT_DIR="$1"

if [ ! -d "$EXPORT_DIR" ]; then
    log_error "目录不存在: $EXPORT_DIR"
    exit 1
fi

# 查找 ExportOptions.plist
EXPORT_OPTIONS=$(find "$EXPORT_DIR" -name "ExportOptions.plist" | head -1)

if [ -z "$EXPORT_OPTIONS" ]; then
    log_error "在 $EXPORT_DIR 中未找到 ExportOptions.plist"
    echo ""
    log_info "提示: 确保你选择的是 'Export' 而不是 'Upload'"
    exit 1
fi

log_success "找到 ExportOptions.plist: $EXPORT_OPTIONS"
echo ""
log_info "ExportOptions.plist 内容:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v plutil &> /dev/null; then
    plutil -p "$EXPORT_OPTIONS"
else
    cat "$EXPORT_OPTIONS"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_info "你可以复制这个配置到 xcode-upload.sh 脚本中使用"
