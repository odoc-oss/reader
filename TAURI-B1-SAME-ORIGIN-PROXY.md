# Tauri 打包后 Windows Cookie 丢失问题整改方案（B1）

## 1. 目标

### 1.1 业务目标

在 **Windows 打包后的 Tauri 应用**中，解决 API 请求 **不携带 Cookie** 导致的「认证令牌丢失 / 未登录」问题，使会员信息、用户信息等接口稳定可用。

### 1.2 约束条件

- **不改后端鉴权形态**：仍沿用现有 Cookie（例如 `go-sea-token` 等）机制。
- **不影响当前开发方式**：
  - Dev 仍使用 `tauri dev` 加载 `devUrl`（`http://localhost:3000`）。
  - Dev 仍使用 Vite dev server 的 `proxy` 规则转发 `/api`。
  - B1 仅在 Release（打包/生产）生效。

### 1.3 最终状态（Release）

- **页面 Origin**：`http://127.0.0.1:<gateway_port>`
- **前端 API 请求**：`http://127.0.0.1:<gateway_port>/api/...`（同源）
- **Go 后端**：`http://127.0.0.1:8081`（保持不变）

---

## 2. 原理说明

### 2.1 为什么 Dev 可以、打包后不行

- Dev 模式下，Tauri 加载的是 `tauri.conf.json` 中的：
  - `build.devUrl = http://localhost:3000`
- `/api` 的转发由 **Vite dev server 的 proxy** 完成。

打包后（Release），页面不再来自 Vite dev server，而是来自 Tauri 内置资源协议（Windows 常见为 `https://tauri.localhost`）。

此时如果前端直接请求 `http://localhost:8081/api/...`：

- **页面 Origin**：`https://tauri.localhost`
- **API Origin**：`http://localhost:8081`

在 Windows / WebView2 环境中，这会被视为 **cross-site** 请求，浏览器会按照 SameSite/Secure 等策略 **阻止 Cookie 发送**。

现象即为：Network 中请求头 **没有 Cookie** → 后端判断未登录/令牌丢失。

### 2.2 B1 方案的核心思想

在 Release 环境中，在 App 内部启动一个本地 HTTP Server（下称 **Gateway**），它同时承担两件事：

1. **静态资源服务**：将前端构建产物 `dist` 作为静态网站提供。
2. **API 反向代理**：将 `GET/POST/... /api/*` 转发到 `http://127.0.0.1:8081/api/*`。

于是前端在 Release 中会变成：

- 页面来自 `http://127.0.0.1:<gateway_port>`
- API 请求也是 `http://127.0.0.1:<gateway_port>/api/...`

浏览器视角为 **同源**，Cookie 会稳定自动携带。

### 2.3 新增端口（gateway_port）起什么作用

`gateway_port` 是本地 Gateway 的监听端口，用于：

- 作为 **页面的真实 Origin**（解决跨站 Cookie 被拦问题）。
- 作为 **统一 API 入口**（`/api`）并在内部转发到 Go 后端 `8081`。

它类似于「生产版的 Vite dev server」，但由 Rust 在 Release 环境中启动并托管。

---

## 3. 实施步骤

> 本方案要求 **仅在 Release 生效**，确保不影响 Dev。

### 3.1 前端调整（统一使用相对路径 `/api`）

文件：`src/api/axios.ts`

- 将 Tauri 环境下的 `baseURL` 从 `http://localhost:8081/api` 调整为 `'/api'`。
- 目的：
  - Dev：`http://localhost:3000/api` → Vite proxy → `8081`
  - Release：`http://127.0.0.1:<gateway_port>/api` → Gateway → `8081`

### 3.2 Tauri 打包资源调整（让 Gateway 能读到 dist）

文件：`src-tauri/tauri.conf.json`

- 在 `bundle.resources` 中加入 `../dist`（或等价路径），确保 Release 包内可读取静态文件。

### 3.3 Rust：Release 启动 Gateway + 导航窗口

文件：`src-tauri/src/lib.rs`

在 `setup` 中的 `if !cfg!(debug_assertions)` 分支内（Release-only）：

1. **启动 Go sidecar**（你当前已有，保持不变，监听 `8081`）。
2. **启动 Gateway HTTP Server**：
   - bind `127.0.0.1:0` 让系统分配空闲端口
   - 获取实际端口 `gateway_port`
3. **窗口导航**：
   - 将 `main` 窗口导航到 `http://127.0.0.1:<gateway_port>/`

> 关键：所有 Gateway 逻辑必须在 `!cfg!(debug_assertions)` 内，确保 Dev 完全不变。

### 3.4 Gateway 的代理转发要求（必须满足）

Gateway 对 `/api/*` 的转发必须：

- 透传 **HTTP 方法**（GET/POST/PUT/PATCH/DELETE/OPTIONS）
- 透传 **路径与 query**
- 透传 **请求头**（尤其 `Cookie`、`Content-Type`、`Accept-Language`）
- 透传 **请求体**（POST/PUT 等）
- 透传 **响应头**（尤其 `Set-Cookie`）
- 原样返回 **响应体**

---

## 4. 验收与验证

### 4.1 Release（Windows）验收标准

- 页面 Origin：`http://127.0.0.1:<gateway_port>`
- API 请求 URL：`http://127.0.0.1:<gateway_port>/api/...`
- Request Headers 中出现 Cookie（如 `go-sea-token=...`）
- `membership/user/profile` 等接口稳定返回，不再出现令牌丢失

### 4.2 Dev 验收标准（必须不变）

- 仍然由 `devUrl = http://localhost:3000` 提供页面
- 仍然通过 Vite proxy 转发 `/api`
- 不需要开发者额外启动/关闭 Gateway

---

## 5. 风险与对策

- **端口占用/冲突**：Gateway 绑定 `127.0.0.1:0`（随机空闲端口）避免冲突。
- **生命周期管理**：App 退出时确保 Gateway 一并退出（与 Tauri 生命周期绑定）。
- **静态资源路径**：需要确认 `dist` 在 Release 包中的实际位置，优先通过 `bundle.resources` 固定。
- **代理正确性**：必须完整透传 `Cookie`/`Set-Cookie`，否则仍会出现登录状态异常。

---

## 6. 实施清单（文件级）

- **前端**：`src/api/axios.ts`（Tauri 下 baseURL → `'/api'`）
- **Tauri 配置**：`src-tauri/tauri.conf.json`（`bundle.resources` 增加 `../dist`）
- **Rust**：`src-tauri/src/lib.rs`（Release-only 启动 Gateway + 导航窗口）
- **Rust 依赖**：`src-tauri/Cargo.toml`（增加 HTTP server 与 proxy 所需依赖）

---

## 7. 结论

B1 通过在 Release 环境中引入本地 Gateway，使页面与 `/api` 同源，从根源上解决 Windows/WebView2 下跨站请求不携带 Cookie 的问题；同时通过 `cfg!(debug_assertions)` 将影响严格限制在 Release，保证现有开发流程不受影响。
