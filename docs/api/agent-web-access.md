# AI Agent 访问 Web 端（Expo Web / Metro 开发服）的校验要求

本文说明 **自动化 / AI agent** 如何从本仓库的 **Web 开发宿主** 获取 OpenAPI 文档，与真实用户通过浏览器使用应用时的接口鉴权是两件事：后者走业务网关（登录态、Bearer、`X-User-Access-Token` 等），见 `mobile/agent-docs/openapi.json`。

## 适用范围

- **仅**在运行 **Expo Web 且由 Metro 提供开发服务器** 时，下列 URL 由 `mobile/metro.config.js` 拦截处理。
- 静态托管或生产网关需 **自行实现同等策略**（同一 URL 或内网专用路径 + 密钥校验），本文描述的是 **本仓库 dev 服行为**。

## 获取 OpenAPI（机器可读契约）

| URL | 说明 |
|-----|------|
| `GET /api/openapi.json` | 完整 OpenAPI JSON |
| `GET /api/agent/openapi.json` | 与上行 **相同内容**，仅为别名 |

必须使用与 Web 开发页面 **同源** 的地址，例如 `http://localhost:8081/api/openapi.json`（端口以实际 Expo 输出为准）。

## 环境变量（宿主侧）

在 **仓库根目录** `.env`（或经 `RUN_ENV` 合并的 `.env.dev` / `.env.test` / `.env.prod`，与现有 Metro 加载方式一致）中配置：

| 变量 | 必填 | 含义 |
|------|------|------|
| `WEB_AGENT_OPENAPI_SECRET` | 是（若希望开启文档 URL） | 与 agent 请求中的凭证 **逐字一致** 的共享密钥；**未设置或为空则不开放文档**（见下节 HTTP 行为）。 |

- 密钥勿提交到 Git；在 CI/本机用私密方式注入。
- 生产或共享网络下应使用 **足够长且随机的字符串**。

## Agent 请求校验

对 `GET /api/openapi.json` 或 `GET /api/agent/openapi.json`，宿主按顺序判定：

1. **未配置密钥**（`WEB_AGENT_OPENAPI_SECRET` 未设或 Trim 后为空）  
   - 返回 **404**，响应体为空。  
   - 不向路人暴露「是否存在 OpenAPI」以外的信息。

2. **已配置密钥**  
   - 从请求中读取候选凭证 **唯一有效来源**（二选一，任选其一）：  
     - 请求头 **`X-Agent-OpenAPI-Secret`**：值为完整密钥字符串（Trim 后与 `.env` 中配置完全一致）。  
     - 请求头 **`Authorization`**：格式 **`Bearer <密钥>`**，其中 `<密钥>` 与 `.env` 完全一致。  
   - 候选值与配置的密钥不一致，或未提供上述任一方式：返回 **403**，`Content-Type: application/json`，主体为 `{"error":"Forbidden"}`。  

3. **校验通过且磁盘上存在** `mobile/agent-docs/openapi.json`  
   - 返回 **200**，`Content-Type: application/json; charset=utf-8`，`Cache-Control: no-store`，正文为完整 OpenAPI 文件内容。

其它 HTTP 方法访问上述路径：返回 **405**。

## Agent 示例（curl）

将 `ORIGIN`、`SECRET` 换成实际开发与密钥：

```bash
curl -fsS "${ORIGIN}/api/openapi.json" \
  -H "X-Agent-OpenAPI-Secret: ${SECRET}"
```

或：

```bash
curl -fsS "${ORIGIN}/api/openapi.json" \
  -H "Authorization: Bearer ${SECRET}"
```

## 文档开启后的业务调用

OpenAPI **只描述**网关上的业务路由与鉴权；agent 在完成「拉取 openapi」之后，调用登录、下注、下单等接口时，仍需按契约使用 **用户 access token**（如 `Authorization: Bearer`（mall-agg）或 `X-User-Access-Token`（bet 订单类））。这部分 **不在** `WEB_AGENT_OPENAPI_SECRET` 的范围内。

## 与产品/UI 的建议关系

- 勿在自然人可见的帮助页、App 内 WebView、或公开爬虫可抓取的链接中放置带密钥的文档 URL。
- Agent 运行时由运维/开发者配置 **`ORIGIN` + `SECRET`**，或由受控密钥托管下发。
