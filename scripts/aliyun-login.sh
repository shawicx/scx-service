#!/bin/bash

# Aliyun ACR Login Script
# 用于登录到阿里云容器镜像服务 (ACR)

set -e

# 默认参数
REGION="${ACR_REGION:-cn-hangzhou}"
USERNAME="${ACR_USERNAME}"
PASSWORD="${ACR_PASSWORD}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 打印帮助信息
print_help() {
  echo "Aliyun ACR Login Script"
  echo ""
  echo "用法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  -r, --region <region>     ACR 区域 (默认: cn-hangzhou)"
  echo "  -u, --username <user>     ACR 用户名"
  echo "  -p, --password <pass>     ACR 密码"
  echo "  -h, --help                显示帮助信息"
  echo ""
  echo "环境变量:"
  echo "  ACR_REGION                ACR 区域 (默认: cn-hangzhou)"
  echo "  ACR_USERNAME              ACR 用户名"
  echo "  ACR_PASSWORD              ACR 密码"
  echo ""
  echo "示例:"
  echo "  $0 -u myuser -p mypass"
  echo "  $0 -r cn-beijing -u myuser -p mypass"
  echo "  export ACR_USERNAME=myuser && export ACR_PASSWORD=mypass && $0"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--region)
      REGION="$2"
      shift 2
      ;;
    -u|--username)
      USERNAME="$2"
      shift 2
      ;;
    -p|--password)
      PASSWORD="$2"
      shift 2
      ;;
    -h|--help)
      print_help
      exit 0
      ;;
    *)
      echo -e "${RED}未知选项: $1${NC}"
      print_help
      exit 1
      ;;
  esac
done

# 验证必填参数
if [[ -z "$USERNAME" ]]; then
  echo -e "${RED}错误: ACR 用户名未指定${NC}"
  echo "请使用 -u 参数或设置 ACR_USERNAME 环境变量"
  exit 1
fi

if [[ -z "$PASSWORD" ]]; then
  echo -e "${RED}错误: ACR 密码未指定${NC}"
  echo "请使用 -p 参数或设置 ACR_PASSWORD 环境变量"
  exit 1
fi

# 构建 ACR 注册表地址
REGISTRY_URL="registry.${REGION}.aliyuncs.com"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Aliyun ACR 登录${NC}"
echo -e "${GREEN}========================================${NC}"
echo "区域: $REGION"
echo "注册表: $REGISTRY_URL"
echo "用户名: $USERNAME"
echo ""

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
  echo -e "${RED}错误: Docker 未安装或不在 PATH 中${NC}"
  echo "请先安装 Docker: https://docs.docker.com/get-docker/"
  exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
  echo -e "${RED}错误: Docker 未运行${NC}"
  echo "请先启动 Docker"
  exit 1
fi

# 登录到 ACR
echo -e "${YELLOW}正在登录到 $REGISTRY_URL ...${NC}"
if echo "$PASSWORD" | docker login --username="$USERNAME" --password-stdin "$REGISTRY_URL"; then
  echo ""
  echo -e "${GREEN}✓ 登录成功！${NC}"
  echo ""
  echo "您现在可以使用以下命令推送镜像:"
  echo "  docker tag my-image $REGISTRY_URL/<namespace>/my-image:latest"
  echo "  docker push $REGISTRY_URL/<namespace>/my-image:latest"
else
  echo ""
  echo -e "${RED}✗ 登录失败${NC}"
  echo "请检查您的用户名和密码是否正确"
  exit 1
fi
