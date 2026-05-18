#!/bin/bash

# 构建 Golang 后端 sidecar 二进制文件
# 此脚本会为不同平台编译 Golang 后端

set -e

echo "开始构建 Golang 后端 sidecar..."

# 获取当前平台
CURRENT_OS=$(uname -s | tr '[:upper:]' '[:lower:]')
CURRENT_ARCH=$(uname -m)

# 转换架构名称
case "$CURRENT_ARCH" in
  x86_64)
    CURRENT_ARCH="x86_64"
    ;;
  arm64|aarch64)
    CURRENT_ARCH="aarch64"
    ;;
  *)
    echo "不支持的架构: $CURRENT_ARCH"
    exit 1
    ;;
esac

# 转换操作系统名称
case "$CURRENT_OS" in
  darwin)
    CURRENT_OS="apple-darwin"
    ;;
  linux)
    CURRENT_OS="unknown-linux-gnu"
    ;;
  mingw*|msys*|cygwin*)
    CURRENT_OS="pc-windows-msvc"
    ;;
  *)
    echo "不支持的操作系统: $CURRENT_OS"
    exit 1
    ;;
esac

TARGET_TRIPLE="${CURRENT_ARCH}-${CURRENT_OS}"
BINARY_DIR="src-tauri/binaries"
BINARY_NAME="go-sea-${TARGET_TRIPLE}"

# 如果是 Windows，添加 .exe 扩展名
if [[ "$CURRENT_OS" == *"windows"* ]]; then
  BINARY_NAME="${BINARY_NAME}.exe"
fi

echo "目标平台: ${TARGET_TRIPLE}"
echo "二进制文件: ${BINARY_NAME}"

# 检查是否存在 Golang 后端源码
if [ ! -d "go-sea-backend" ]; then
  echo "警告: 未找到 go-sea-backend 目录"
  echo "请确保 Golang 后端源码在 go-sea-backend 目录中"
  echo "或者手动将编译好的二进制文件放到 ${BINARY_DIR}/ 目录"
  
  # 检查是否已有二进制文件
  if [ -f "${BINARY_DIR}/${BINARY_NAME}" ]; then
    echo "找到现有的二进制文件: ${BINARY_DIR}/${BINARY_NAME}"
    echo "跳过编译步骤"
    exit 0
  fi
  
  echo "错误: 没有找到二进制文件，也无法编译"
  exit 1
fi

# 创建 binaries 目录
mkdir -p "${BINARY_DIR}"

# 编译 Golang 后端
echo "编译 Golang 后端..."
cd go-sea-backend

# 设置 Go 编译环境变量
#export CGO_ENABLED=0

# 根据目标平台设置 GOOS 和 GOARCH
case "$CURRENT_OS" in
  *darwin*)
    export GOOS=darwin
    ;;
  *linux*)
    export GOOS=linux
    ;;
  *windows*)
    export GOOS=windows
    ;;
esac

case "$CURRENT_ARCH" in
  x86_64)
    export GOARCH=amd64
    ;;
  aarch64)
    export GOARCH=arm64
    ;;
esac

# 编译
go build -o "../${BINARY_DIR}/${BINARY_NAME}" -ldflags="-s -w" .

cd ..

echo "✅ Golang 后端编译完成: ${BINARY_DIR}/${BINARY_NAME}"
echo "文件大小: $(du -h ${BINARY_DIR}/${BINARY_NAME} | cut -f1)"
