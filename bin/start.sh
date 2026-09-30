#!/usr/bin/env bash
# 操盘台一键启动（自愈式）：自动定位 node/npm → 缺依赖自动补装 → 前台运行 server
# 用法：bash <skill根>/bin/start.sh --workspace <工作区绝对路径> [--instance <实例id>] [--port 5188]
# agent 用 run_in_background 执行本脚本；启动成功后轮询实例目录下的 dashboard.json 拿 url
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=""
WORKSPACE=""
INSTANCE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --workspace) WORKSPACE="${2:-}"; shift 2 ;;
    --port) PORT="${2:-}"; shift 2 ;;
    --instance) INSTANCE="${2:-}"; shift 2 ;;
    *) echo "[start] 未知参数: $1"; exit 1 ;;
  esac
done
[ -z "$WORKSPACE" ] && { echo "[start] 缺 --workspace <工作区绝对路径>"; exit 1; }

# ⓪ 幂等复用：同工作区同实例已有存活进程 → 直接报 url 退出（防旧实例僵尸化导致新旧 URL 混淆）
if [ -n "$INSTANCE" ]; then
  DJ="$WORKSPACE/.pipeline/instances/$INSTANCE/dashboard.json"
else
  DJ="$WORKSPACE/.pipeline/dashboard.json"
fi
if [ -f "$DJ" ]; then
  PID="$(/usr/bin/sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$DJ" | head -1)"
  WS="$(/usr/bin/sed -n 's/.*"workspace"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$DJ" | head -1)"
  URL="$(/usr/bin/sed -n 's/.*"url"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$DJ" | head -1)"
  if [ -n "$PID" ] && [ "$WS" = "$WORKSPACE" ] && kill -0 "$PID" 2>/dev/null; then
    echo "[start] 工作区已有运行中的操盘台实例 (pid=$PID)：$URL"
    echo "[start] 如代码有更新需重启：kill $PID 后重新运行本脚本"
    exit 0
  fi
fi

# ① 定位 node：PATH → WorkBuddy managed 目录兜底（非交互 shell 常无完整 PATH）
NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ]; then
  for c in /Users/lv/.workbuddy/binaries/node/versions/*/bin/node; do
    [ -x "$c" ] && NODE="$c" && break
  done
fi
[ -z "$NODE" ] && { echo "[start] 找不到 node（PATH 与 managed 目录均无）"; exit 1; }
NPM="$(dirname "$NODE")/npm"
[ -x "$NPM" ] || NPM="$(command -v npm 2>/dev/null || true)"

# ② 依赖自检：server/node_modules（express/ws/chokidar/tsx）缺失则自动补装
cd "$SKILL_ROOT/server"
if [ ! -d node_modules ] || [ ! -d node_modules/tsx ] || [ ! -d node_modules/express ]; then
  echo "[start] 首次运行，安装 server 依赖…"
  [ -n "$NPM" ] || { echo "[start] 找不到 npm，无法补装依赖"; exit 1; }
  "$NPM" install --no-fund --no-audit
fi

# ③ 前台运行（agent 侧用 run_in_background 包一层；启动成功会写实例目录下的 dashboard.json）
echo "[start] node=$NODE"
echo "[start] workspace=$WORKSPACE instance=${INSTANCE:-default(传统布局)} port=${PORT:-5188(占用自动+1)}"
exec "$NODE" --import tsx "$SKILL_ROOT/bin/dashboard.ts" --workspace "$WORKSPACE" ${INSTANCE:+--instance "$INSTANCE"} ${PORT:+--port "$PORT"}
