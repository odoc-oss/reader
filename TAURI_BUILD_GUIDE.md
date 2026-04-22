# Tauri 桌面应用构建指南

本指南说明如何构建包含 Golang 后端的 Tauri 桌面应用安装包。

## 项目架构

```
go-sea-web/
├── src/                          # 前端 Vue 代码
├── src-tauri/                    # Tauri 后端
│   ├── binaries/                 # Golang 后端二进制文件
│   │   ├── go-sea-aarch64-apple-darwin      # macOS ARM64
│   │   ├── go-sea-x86_64-apple-darwin       # macOS Intel
│   │   ├── go-sea-x86_64-pc-windows-msvc.exe # Windows x64
│   │   └── go-sea-x86_64-unknown-linux-gnu  # Linux x64
│   ├── resources/                # 资源文件（配置等）
│   │   └── config.develop.yaml   # Golang 后端配置文件
│   ├── Cargo.toml                # Rust 依赖
│   ├── tauri.conf.json           # Tauri 配置
│   └── src/
│       ├── main.rs               # 入口
│       └── lib.rs                # 启动逻辑（包含 Golang 后端启动）
└── scripts/
    └── build-sidecar.sh          # Golang 后端编译脚本
```

## 构建流程

### 1. 准备 Golang 后端二进制文件

#### 方式一：自动编译（推荐）

如果你有 Golang 后端源码在 `go-sea-backend` 目录：

```bash
# 编译当前平台的 Golang 后端
bun run tauri:sidecar

# 或者使用完整构建（包含前端 + 后端 + 打包）
bun run tauri:build:full
```

#### 方式二：手动编译

如果 Golang 后端在其他位置，手动编译并放置：

```bash
# 进入 Golang 后端目录
cd /path/to/go-sea-backend

# 编译不同平台的二进制文件
# macOS ARM64 (M1/M2/M3)
GOOS=darwin GOARCH=arm64 go build -o ../go-sea-web/src-tauri/binaries/go-sea-aarch64-apple-darwin -ldflags="-s -w" ./cmd/server

# macOS Intel
GOOS=darwin GOARCH=amd64 go build -o ../go-sea-web/src-tauri/binaries/go-sea-x86_64-apple-darwin -ldflags="-s -w" ./cmd/server

# Windows x64
GOOS=windows GOARCH=amd64 go build -o ../go-sea-web/src-tauri/binaries/go-sea-x86_64-pc-windows-msvc.exe -ldflags="-s -w" ./cmd/server

# Linux x64
GOOS=linux GOARCH=amd64 go build -o ../go-sea-web/src-tauri/binaries/go-sea-x86_64-unknown-linux-gnu -ldflags="-s -w" ./cmd/server
```

### 2. 构建 Tauri 应用

#### 开发模式

```bash
# 启动开发模式（前端 + Tauri 窗口）
bun run tauri:dev

# 如果需要本地 API 代理
bun run tauri:dev:local
```

#### 生产构建

```bash
# 仅构建 Tauri 应用（不编译 Golang 后端）
bun run tauri:build

# 完整构建（编译 Golang 后端 + 构建 Tauri 应用）
bun run tauri:build:full
```

### 3. 构建产物位置

构建完成后，安装包位于：

- **macOS**: `src-tauri/target/release/bundle/dmg/Sea Reader_0.1.0_*.dmg`
- **Windows**: `src-tauri/target/release/bundle/msi/Sea Reader_0.1.0_*.msi`
- **Linux**: `src-tauri/target/release/bundle/deb/sea-reader_0.1.0_*.deb`

## Golang 后端集成说明

### 启动机制

Tauri 应用启动时会自动启动 Golang 后端（仅在 Release 模式）。

### 配置文件

Golang 后端配置文件位于 `src-tauri/resources/config.develop.yaml`，会被打包进应用。

### 日志输出

Golang 后端的标准输出和错误输出会显示在 Tauri 控制台，前缀为 `[go-sea]`。

## 常见问题

### 1. 找不到 sidecar 二进制文件

检查二进制文件是否存在：
```bash
ls -lh src-tauri/binaries/
```

### 2. Golang 后端启动失败

检查二进制文件是否有执行权限：
```bash
chmod +x src-tauri/binaries/go-sea-*
```

### 3. 不同平台的二进制文件命名

| 平台 | 架构 | 命名格式 |
|------|------|----------|
| macOS | ARM64 | `go-sea-aarch64-apple-darwin` |
| macOS | Intel | `go-sea-x86_64-apple-darwin` |
| Windows | x64 | `go-sea-x86_64-pc-windows-msvc.exe` |
| Linux | x64 | `go-sea-x86_64-unknown-linux-gnu` |
