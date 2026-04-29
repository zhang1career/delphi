#!/bin/bash

# Xcode Archive 上传脚本
# 将 .xcarchive 文件导出为 .ipa 并上传到 App Store Connect
#
# 使用方法:
#   ./xcode-upload.sh <archive_path> [export_method] [--use-xcode-options <path>]
#   或通过 npm: npm run upload:ios
#
# 参数:
#   archive_path: .xcarchive 文件的路径（可选，不提供则自动查找最新的）
#   export_method: 导出方法，可选值: app-store-connect (默认), ad-hoc, enterprise, development
#                  注意: app-store 已弃用，会自动转换为 app-store-connect
#   --use-xcode-options <path>: 使用 Xcode 生成的 ExportOptions.plist（可选）
#                               如果脚本导出失败，可以在 Xcode Organizer 中导出一次，
#                               然后使用此选项指定 ExportOptions.plist 的路径
#
# 示例:
#   ./xcode-upload.sh
#   ./xcode-upload.sh ~/Library/Developer/Xcode/Archives/2026-01-27/ClockwatcherNative-2026-01-27-120000.xcarchive
#   ./xcode-upload.sh <archive> app-store-connect --use-xcode-options ~/Desktop/ExportOptions.plist

set -e
set -o pipefail

# 加载公共函数
source "$(dirname "$0")/common.sh"

ensure_ios_dir

# 检查参数
# 如果没有提供 archive_path，尝试自动查找最新的 archive
if [ $# -lt 1 ] || [[ "$1" == app-store* ]] || [[ "$1" == ad-hoc ]] || [[ "$1" == enterprise ]] || [[ "$1" == development ]] || [[ "$1" == --use-xcode-options ]]; then
    log_info "未提供 archive 路径，尝试自动查找最新的 archive..."
    echo ""
    
    # 查找最新的 archive
    ARCHIVES_DIR="$HOME/Library/Developer/Xcode/Archives"
    if [ -d "$ARCHIVES_DIR" ]; then
        # Xcode 的目录结构: Archives/YYYY-MM-DD/AppName-YYYY-MM-DD-HHMMSS.xcarchive
        LATEST_DATE_DIR=$(ls -d "$ARCHIVES_DIR"/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] 2>/dev/null | sort -r | head -1)
        
        if [ -n "$LATEST_DATE_DIR" ] && [ -d "$LATEST_DATE_DIR" ]; then
            echo "📅 找到最新的日期目录: $(basename "$LATEST_DATE_DIR")"
            
            # 在该日期目录下查找最新的 .xcarchive 文件
            LATEST_ARCHIVE=$(find "$LATEST_DATE_DIR" -name "*$PROJECT_NAME*.xcarchive" -type d -maxdepth 1 | sort -r | head -1)
            
            if [ -n "$LATEST_ARCHIVE" ] && [ -d "$LATEST_ARCHIVE" ]; then
                ARCHIVE_PATH="$LATEST_ARCHIVE"
                log_success "找到最新的 archive: $ARCHIVE_PATH"
                echo ""
            else
                log_error "在日期目录中未找到 archive 文件"
                echo "   目录: $LATEST_DATE_DIR"
                echo ""
                log_info "使用方法:"
                echo "  $0 <archive_path> [export_method] [--use-xcode-options <path>]"
                echo ""
                echo "或者先运行打包命令:"
                echo "  npm run archive:ios"
                echo ""
                exit 1
            fi
        else
            log_error "未找到日期目录（格式: YYYY-MM-DD）"
            echo "   在目录: $ARCHIVES_DIR"
            echo ""
            log_info "使用方法:"
            echo "  $0 <archive_path> [export_method] [--use-xcode-options <path>]"
            echo ""
            echo "或者先运行打包命令:"
            echo "  npm run archive:ios"
            echo ""
            exit 1
        fi
    else
        log_error "未找到 Xcode Archives 目录"
        echo "   期望路径: $ARCHIVES_DIR"
        echo ""
        log_info "使用方法:"
        echo "  $0 <archive_path> [export_method] [--use-xcode-options <path>]"
        echo ""
        exit 1
    fi
else
    ARCHIVE_PATH="$1"
    shift  # 移除 archive_path
fi

# 设置默认导出方法
EXPORT_METHOD="app-store-connect"
USE_XCODE_OPTIONS=""

# 处理剩余参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --use-xcode-options)
            USE_XCODE_OPTIONS="$2"
            shift 2
            ;;
        app-store|app-store-connect|ad-hoc|enterprise|development)
            EXPORT_METHOD="$1"
            # 兼容旧的 app-store 参数
            if [ "$EXPORT_METHOD" = "app-store" ]; then
                EXPORT_METHOD="app-store-connect"
                log_warning "'app-store' 已弃用，已自动转换为 'app-store-connect'"
            fi
            shift
            ;;
        *)
            log_warning "未知参数: $1"
            shift
            ;;
    esac
done

# 验证 archive 文件是否存在
if [ ! -d "$ARCHIVE_PATH" ]; then
    log_error "Archive 文件不存在: $ARCHIVE_PATH"
    exit 1
fi

# 验证是否是 .xcarchive 文件
if [[ ! "$ARCHIVE_PATH" =~ \.xcarchive$ ]]; then
    log_error "文件路径不是 .xcarchive 格式: $ARCHIVE_PATH"
    exit 1
fi

log_step "开始上传 Archive..."
echo "📦 Archive 路径: $ARCHIVE_PATH"
echo "📋 导出方法: $EXPORT_METHOD"
echo ""

# 创建临时目录用于导出
EXPORT_DIR=$(mktemp -d -t xcode-export-XXXXXX)

# 如果指定了使用 Xcode 生成的 ExportOptions.plist，直接使用
if [ -n "$USE_XCODE_OPTIONS" ] && [ -f "$USE_XCODE_OPTIONS" ]; then
    EXPORT_PLIST_PATH="$USE_XCODE_OPTIONS"
    log_info "使用 Xcode 生成的 ExportOptions.plist: $USE_XCODE_OPTIONS"
    echo ""
else
    EXPORT_PLIST_PATH="$EXPORT_DIR/ExportOptions.plist"
fi

# 函数：从 archive 中提取签名信息（含 bundle id、profile 名称）
extract_signing_info() {
    local archive_path="$1"
    local app_path=$(find "$archive_path/Products/Applications" -name "*.app" -type d | head -1)
    
    if [ -z "$app_path" ]; then
        return 1
    fi
    
    # 提取 Bundle ID（使用系统自带的 PlistBuddy）
    local bundle_id=""
    if [ -f "$app_path/Info.plist" ]; then
        bundle_id=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$app_path/Info.plist" 2>/dev/null || echo "")
    fi
    
    # 提取团队 ID、Profile UUID、Profile Name
    local team_id=""
    local profile_uuid=""
    local profile_name=""
    if [ -f "$app_path/embedded.mobileprovision" ]; then
        local prov_xml
        prov_xml=$(security cms -D -i "$app_path/embedded.mobileprovision" 2>/dev/null)
        team_id=$(echo "$prov_xml" | grep -A1 "TeamIdentifier" | grep "string" | sed 's/.*<string>\(.*\)<\/string>.*/\1/' | head -1 | xargs)
        profile_uuid=$(echo "$prov_xml" | grep -A1 "UUID" | grep "string" | sed 's/.*<string>\(.*\)<\/string>.*/\1/' | head -1 | xargs)
        # 取 ProvisioningProfile 的 Name（通常为第一个 <key>Name</key> 后的 string）
        profile_name=$(echo "$prov_xml" | grep -A1 "<key>Name</key>" | grep "string" | head -1 | sed 's/.*<string>\(.*\)<\/string>.*/\1/' | xargs)
    fi
    
    # 提取证书信息（从 codesign）
    local cert_info=""
    if command -v codesign &> /dev/null; then
        cert_info=$(codesign -d -vv "$app_path" 2>&1 | grep "Authority=" | head -1 | sed 's/.*Authority=\(.*\)/\1/' || echo "")
    fi
    
    echo "$team_id|$profile_uuid|$profile_name|$cert_info|$bundle_id"
}

# 从 archive 中提取签名信息
SIGNING_INFO=$(extract_signing_info "$ARCHIVE_PATH" 2>/dev/null || echo "")
TEAM_ID=""
PROFILE_UUID=""
PROFILE_NAME=""
CERT_INFO=""
BUNDLE_ID=""

if [ -n "$SIGNING_INFO" ]; then
    IFS='|' read -r TEAM_ID PROFILE_UUID PROFILE_NAME CERT_INFO BUNDLE_ID <<< "$SIGNING_INFO"
fi

# 若未从 archive 取到 Bundle ID，从工程读取
if [ -z "$BUNDLE_ID" ] && [ -f "$PBXPROJ" ]; then
    BUNDLE_ID=$(grep -m1 "PRODUCT_BUNDLE_IDENTIFIER = " "$PBXPROJ" | sed 's/.*= *\(.*\);/\1/' | xargs)
fi

# 生成 ExportOptions.plist（如果未使用 Xcode 生成的）
if [ -z "$USE_XCODE_OPTIONS" ] || [ ! -f "$USE_XCODE_OPTIONS" ]; then
    cat > "$EXPORT_PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>$EXPORT_METHOD</string>
EOF

    if [ -n "$TEAM_ID" ]; then
        cat >> "$EXPORT_PLIST_PATH" << EOF
    <key>teamID</key>
    <string>$TEAM_ID</string>
EOF
    fi

    # 指定 Provisioning Profile，避免 "No profiles for 'bundle.id' were found"
    if [ -n "$BUNDLE_ID" ] && { [ -n "$PROFILE_NAME" ] || [ -n "$PROFILE_UUID" ]; }; then
        PROFILE_VALUE="${PROFILE_NAME:-$PROFILE_UUID}"
        cat >> "$EXPORT_PLIST_PATH" << EOF
    <key>provisioningProfiles</key>
    <dict>
        <key>$BUNDLE_ID</key>
        <string>$PROFILE_VALUE</string>
    </dict>
EOF
    fi

    cat >> "$EXPORT_PLIST_PATH" << EOF
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
    if [ -n "$TEAM_ID" ] || [ -n "$PROFILE_UUID" ]; then
        log_info "从 Archive 中提取的签名信息:"
        [ -n "$TEAM_ID" ] && echo "   Team ID: $TEAM_ID"
        [ -n "$PROFILE_UUID" ] && echo "   Profile UUID: $PROFILE_UUID"
        [ -n "$PROFILE_NAME" ] && echo "   Profile Name: $PROFILE_NAME"
        [ -n "$BUNDLE_ID" ] && echo "   Bundle ID: $BUNDLE_ID"
        [ -n "$CERT_INFO" ] && echo "   Certificate: $CERT_INFO"
        echo ""
    fi
else
    log_info "跳过生成 ExportOptions.plist，使用 Xcode 生成的版本"
    echo ""
fi

log_info "导出 IPA 文件..."
echo "📁 导出目录: $EXPORT_DIR"
echo ""

log_info "提示: 如果遇到证书错误，请确保："
echo "  1. 在 Xcode 中配置了正确的签名设置（Signing & Capabilities → Team）"
echo "  2. 有 iOS Distribution 证书（用于 App Store 分发）"
echo "  3. 有对应的 App Store Provisioning Profile"
echo ""

# 使用临时文件保存错误日志
LOG_FILE=$(mktemp /tmp/xcode-export-XXXXXX.log)

# 执行导出
if ! xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_DIR" \
    -exportOptionsPlist "$EXPORT_PLIST_PATH" \
    > "$LOG_FILE" 2>&1; then
    
    cat "$LOG_FILE"
    echo ""
    log_error "导出 IPA 失败"
    echo ""
    
    # 分析错误日志
    if grep -q "No signing certificate" "$LOG_FILE"; then
        echo "🔍 诊断: 证书问题"
        echo ""
        log_info "解决方案 1: 使用 Xcode Organizer 导出（推荐）"
        echo "   1. 在 Xcode 中: Window → Organizer → Archives"
        echo "   2. 选择你的 Archive → Distribute App"
        echo "   3. 选择 App Store Connect → Upload"
        echo ""
        log_info "解决方案 2: 检查证书配置"
        echo "   运行: npm run sign:ios:check"
        echo ""
    elif grep -q "No profiles" "$LOG_FILE"; then
        echo "🔍 诊断: Provisioning Profile 问题${BUNDLE_ID:+（Bundle ID: $BUNDLE_ID）}"
        echo ""
        log_info "解决方案 1: 在 Apple Developer 创建并安装 App Store Profile"
        echo "   1. 打开 https://developer.apple.com/account/resources/profiles/list"
        echo "   2. 点击 + 创建 Profile，选择「App Store」"
        echo "   3. 选择与本应用一致的 App ID（若无则先在 Identifiers 中创建）"
        echo "   4. 选择证书与设备后生成，下载 .mobileprovision 并双击安装"
        echo ""
        log_info "解决方案 2: 用 Xcode Organizer 导出一次，再使用其 ExportOptions.plist"
        echo "   1. Xcode → Window → Organizer → Archives → 选中本 Archive"
        echo "   2. Distribute App → Export（先导出，不要选 Upload）"
        echo "   3. 在导出目录中得到 ExportOptions.plist，然后执行:"
        echo "      cd mobile && npm run upload:ios -- --use-xcode-options <导出目录>/ExportOptions.plist"
        echo ""
        log_info "解决方案 3: 在 Xcode 中确认签名"
        echo "   1. 打开工程 → Signing & Capabilities → 勾选 Automatically manage signing"
        echo "   2. 在 Signing & Capabilities 中选择正确的 Team"
        echo "   3. 重新 Archive 后再执行本脚本"
        echo ""
    fi
    
    log_info "提示: 如果你在 Xcode Organizer 中可以成功上传，"
    echo "   说明 Archive 本身是正确的，问题可能在于 ExportOptions.plist 的配置。"
    echo ""
    echo "   解决方案: 使用 Xcode 生成的 ExportOptions.plist"
    echo "   1. 在 Xcode Organizer 中: Window → Organizer → Archives"
    echo "   2. 选择 Archive → Distribute App → Export（不要选择 Upload）"
    echo "   3. 选择导出目录，Xcode 会生成 ExportOptions.plist"
    echo "   4. 运行脚本时使用 --use-xcode-options 参数:"
    echo "      $0 <archive_path> app-store-connect --use-xcode-options <导出目录>/ExportOptions.plist"
    echo ""
    echo "   或者使用辅助脚本提取配置:"
    echo "      bash $SCRIPTS_DIR/extract-xcode-export-options.sh <Xcode导出目录>"
    echo ""
    
    rm -rf "$EXPORT_DIR"
    rm -f "$LOG_FILE"
    exit 1
fi

rm -f "$LOG_FILE"

# 查找生成的 IPA 文件
IPA_FILE=$(find "$EXPORT_DIR" -name "*.ipa" | head -1)

if [ -z "$IPA_FILE" ]; then
    log_error "未找到生成的 IPA 文件"
    rm -rf "$EXPORT_DIR"
    exit 1
fi

log_success "IPA 文件已生成: $IPA_FILE"
echo ""

# 如果是 app-store-connect 方法，尝试上传到 App Store Connect
if [ "$EXPORT_METHOD" = "app-store-connect" ]; then
    log_info "准备上传到 App Store Connect..."
    echo ""
    
    # 与 mobile/app.config.js、sync-ios-ats-insecure-domains.sh 一致：
    # 1) 仓库根 .env
    # 2) 若 RUN_ENV 为 dev|test|prod，再合并 .env.${RUN_ENV}（覆盖同名键；RUN_ENV 只认 .env 里的值）
    # 当前 shell 已 export 的 APPLE_ID / APP_SPECIFIC_PASSWORD 优先，不覆盖
    if [ -z "$APPLE_ID" ] || [ -z "$APP_SPECIFIC_PASSWORD" ]; then
        eval "$(
            python3 - "$REPO_ROOT" <<'PY'
import os
import shlex
import sys
from pathlib import Path
from typing import Dict, List


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


def need(name: str) -> bool:
    return not (os.environ.get(name, "") or "").strip()


repo_root = Path(sys.argv[1])
merged = load_merged_env(repo_root)
lines: List[str] = []
if need("APPLE_ID"):
    v = (merged.get("APPLE_ID") or "").strip()
    if v:
        lines.append("export APPLE_ID=" + shlex.quote(v))
if need("APP_SPECIFIC_PASSWORD"):
    v = (merged.get("APP_SPECIFIC_PASSWORD") or "").strip()
    if v:
        lines.append("export APP_SPECIFIC_PASSWORD=" + shlex.quote(v))
print("\n".join(lines))
PY
        )"
        if [ -n "$APPLE_ID" ] && [ -n "$APP_SPECIFIC_PASSWORD" ]; then
            log_info "已从仓库根 .env 与 .env.<RUN_ENV> 合并凭据（与 app.config.js 一致）"
        fi
    fi
    
    # 如果仍然缺少，尝试交互式输入
    if [ -z "$APPLE_ID" ] || [ -z "$APP_SPECIFIC_PASSWORD" ]; then
        if [ -t 0 ] && [ -t 1 ]; then
            log_info "未找到凭据，使用交互式输入（最安全）"
            echo ""
            if [ -z "$APPLE_ID" ]; then
                echo -n "请输入 Apple ID: "
                read -r APPLE_ID
            fi
            if [ -z "$APP_SPECIFIC_PASSWORD" ]; then
                echo -n "请输入 App-Specific Password: "
                read -rs APP_SPECIFIC_PASSWORD
                echo ""
            fi
        fi
    fi
    
    # 验证凭据并上传
    if [ -n "$APPLE_ID" ] && [ -n "$APP_SPECIFIC_PASSWORD" ]; then
        echo ""
        log_info "使用 xcrun altool 自动上传..."
        echo ""
        
        if command -v xcrun &> /dev/null && xcrun altool --help &> /dev/null; then
            if xcrun altool --upload-app \
                --type ios \
                --file "$IPA_FILE" \
                --username "$APPLE_ID" \
                --password "$APP_SPECIFIC_PASSWORD"; then
                echo ""
                log_success "上传成功！"
            else
                log_error "上传失败"
                echo ""
                log_info "提示:"
                echo "  - 检查 Apple ID 和 App-Specific Password 是否正确"
                echo "  - App-Specific Password 需要在 https://appleid.apple.com 生成"
                echo "  - 确保 Apple ID 有上传权限"
                rm -rf "$EXPORT_DIR"
                exit 1
            fi
        else
            log_error "未找到 xcrun altool"
            echo ""
            log_info "请使用以下方式上传:"
            echo "  1. 使用 Transporter 应用（App Store 下载）"
            echo "  2. 使用 Xcode Organizer: Window → Organizer → Archives"
            echo ""
            echo "📦 IPA 文件位置: $IPA_FILE"
        fi
    else
        log_info "未提供凭据，跳过自动上传"
        echo ""
        echo "📦 IPA 文件位置: $IPA_FILE"
        echo ""
        log_info "上传方式:"
        echo "  1. 使用 Transporter 应用（App Store 下载）"
        echo "  2. 使用 Xcode Organizer: Window → Organizer → Archives"
        echo ""
        log_info "配置自动上传（按优先级）:"
        echo "  1. 环境变量（用于 CI/CD）"
        echo "  2. 仓库根 .env 与 RUN_ENV 对应的 .env.dev|.env.test|.env.prod（合并方式同 app.config.js）"
        echo "  3. 交互式输入（仅终端为 TTY 时）"
    fi
else
    log_success "导出完成（导出方法: $EXPORT_METHOD）"
    echo ""
    echo "📦 IPA 文件位置: $IPA_FILE"
    echo ""
    log_info "注意: 非 app-store 导出方法不需要上传到 App Store Connect"
fi

echo ""
log_success "上传脚本执行完成！"
echo "📦 IPA 文件: $IPA_FILE"
