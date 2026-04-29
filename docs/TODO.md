# TODO

面向「平台型端应用」（电商、内容流、直播等）的缺口清单，**按重要性排序**。实现程度以当前仓库 `mobile/` 为准。

## 1. 登录态持久化与安全存储

- **已实现**：`expo-secure-store` 持久化 access + refresh；`AuthHydrationGate` 冷启动水合；`sessionLifecycle`（`applySession` / `clearSession`）；刷新成功后写回新 token（随后端双 token 返回与 rotation）。

## 2. 真实交易闭环：下单 API、支付、订单状态

- `checkout` 仍为占位：需对接 **创建订单**、库存预占/释放、**支付渠道**（微信/支付宝/Apple Pay/卡等）、支付结果回调与 **订单状态机**。

## 3. 购物车与库存、价格的服务端一致

- 购物车目前仅本地 `zustand`；需与后端 **库存、促销价、锁价** 等对齐，处理结算失败与多端同步。

## 4. 鉴权韧性：401、静默刷新、后台刷新

- 订单等接口遇 401 会抛错，需 **全局策略**（如刷新 token、避免并发惊群、失败再登出）。
- **后台 token 刷新**（见下节）：仅前台 `setInterval` 不可靠，需原生侧或推送等方案。

## 5. Feed / 内容流后端化

- `listFeed` 仍走 mock；若产品包含发现页/社区流，需 **真实 Feed API**、分页、富媒体与审核等（按产品裁剪）。

## 6. 直播 / 实时音视频

- 仅有未接入页面的点播向 `VideoPlayer`（expo-av）；直播需 **推拉流、房间、信令、IM/礼物** 等，通常依赖 **第三方 SDK + 服务端**，单独立项。

## 7. 消息与触达

- **推送**（订单、支付、开播等）或应用内消息；与第 4 节「静默刷新触发」可协同设计。

## 8. 用户中心与履约

- Profile 较薄；按需补充 **地址簿**、售后/退款入口、优惠券、收藏、设置（语言、通知）等。

## 9. 工程与交付

- 环境说明、CI（lint/类型/构建）、关键路径 **E2E**、崩溃与性能监控等与现网运维衔接。

## 10. iOS App Store 上架前：收紧 ATS（明文 HTTP 例外）

开发/联调时设置 **`IOS_ATS_INSECURE_HTTP_DOMAINS`**（逗号分隔的主机名或 IP；与 `mobile/app.config.js` 一致：可放在仓库根 **`.env`**，或放在 **`.env.dev` / `.env.test` / `.env.prod`** 中覆盖；后者要求根目录 **`.env`** 里已有 **`RUN_ENV=dev|test|prod`**，否则不会合并环境文件）。由 `mobile/ios/scripts/sync-ios-ats-insecure-domains.sh` 写入 `NSAppTransportSecurity` → `NSExceptionDomains` → **`NSExceptionAllowsInsecureHTTPLoads`**，并由 `app.config.js` 中的 `withIosAtsInsecureHttp` 在 **`expo prebuild`** 时保持一致。

**发版到 App Store 前必须做：**

1. 在生产/发版用环境中 **删除或置空** `IOS_ATS_INSECURE_HTTP_DOMAINS`，然后执行 `pod install`（会跑 `sync-ios-metadata-from-env.sh` 链式同步）或单独运行 `mobile/ios/scripts/sync-ios-ats-insecure-domains.sh`，确认 **`Info.plist` 中不再包含** `NSExceptionDomains` 下的不安全 HTTP 例外（空变量会 **移除** 该节）。
2. 对外 API 与资源 **改走 HTTPS**（含网关、配置与 CDN 拉取等）；对不可信网络避免长期依赖例外域名。
3. 若确需对极少数域保留例外，在发版前 **复审** 每个 `NSExceptionDomain` 是否仍必要，并记录业务与安全评审结论；默认目标应为 **零** 或仅在受控内网 build 中启用。

## 11. Bet 聚合：体育赛事 banner（热门 / 推荐等 facet）

当前 `GET /api/bet/events` 在 OpenAPI 中仅列出 `page` 与 `per_page`，**不包含** 「近期热门」「营销推荐」等筛选或排序参数。

- **需要先扩展 bet-agg 契约与实现**（例如 `sort=`、`facet=`、或独立推荐端点），再在前端接真实筛选。
- 客户端在此之前仅使用事件列表分页作为 banner 数据源；勿在 UI 上暗示已支持未实现的 facet。

---

## Auth / session（已有说明）

- **Background token refresh**: The app refreshes access tokens on a timer (`TOKEN_REFRESH_INTERVAL_MS`) only while it is **foregrounded**; the OS may throttle or pause `setInterval` in the background. To renew tokens when the app is backgrounded or not running, plan **native** mechanisms (e.g. silent **push** to trigger refresh, **iOS** `BGAppRefreshTask` / `BGProcessingTask`, **Android** `WorkManager`), plus security and product review.
