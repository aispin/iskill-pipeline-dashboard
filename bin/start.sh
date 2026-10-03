#!/usr/bin/env bash
# 操盘台一键启动（自愈式 + 可选真脱离）
# 自动定位 node/npm → 缺依赖自动补装 → 启动 server（前台 / 脱离后台）
#
# 用法：
#   bash bin/start.sh --workspace <工作区绝对路径> [--instance <id>] [--port 5188]
#       前台运行（agent 用宿主内建的后台机制包一层，如 run_in_background）
#   bash bin/start.sh --workspace <工作区> --instance <id> --detach
#       真脱离进程组后台跑；等到就绪后打印 "OK <url>" 退出（退出码 0）
#   bash bin/start.sh --workspace <工作区> --instance <id> --wait [--timeout 40]
#       只做就绪校验（假定已在跑/刚启动）：打印 "OK <url>" 或 "FAIL <原因>"，退出码 0/1
#
# 输出契约：标准输出**最后一行**恒为 "OK <url>" 或 "FAIL <原因>"（便于 agent grep 判定）；
#          其余 [start] 诊断行一律走 stderr。
#
# ⚠️ 为什么需要 --detach（2026-10-02 实测，写死在注释里防止被"优化"掉）：
#   普通 `start.sh ... &` / `nohup start.sh ... &` 起的进程，会在**那次 Bash 调用结束时被
#   连带杀掉**——而且死在「绑定端口、写 dashboard.json 之前」，于是 dashboard.json 永不出现，
#   调用方按契约轮询必然超时 → 静默降级 → 操盘台全程不出现、且不留任何痕迹。
#   --detach 走 bin/detach.mjs 的 spawn({detached:true})（内部即 setsid）真脱离，实测可存活。
set -euo pipefail

SKILL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=""
WORKSPACE=""
INSTANCE=""
DETACH=0
WAIT=0
WAIT_SECS="${ISKILL_DASHBOARD_WAIT:-40}"
while [ $# -gt 0 ]; do
  case "$1" in
    --workspace)   WORKSPACE="${2:-}"; shift 2 ;;
    --port)        PORT="${2:-}"; shift 2 ;;
    --instance)    INSTANCE="${2:-}"; shift 2 ;;
    --detach)      DETACH=1; WAIT=1; shift ;;
    --wait)        WAIT=1; shift ;;
    --timeout)     WAIT_SECS="${2:-}"; shift 2 ;;
    *) echo "[start] 未知参数: $1" >&2; exit 1 ;;
  esac
done
[ -z "$WORKSPACE" ] && { echo "[start] 缺 --workspace <工作区绝对路径>" >&2; echo "FAIL 缺 --workspace"; exit 1; }

if [ -n "$INSTANCE" ]; then
  INST_DIR="$WORKSPACE/.pipeline/instances/$INSTANCE"
else
  INST_DIR="$WORKSPACE/.pipeline"
fi
DJ="$INST_DIR/dashboard.json"
LOGFILE="$INST_DIR/server.log"
SED=/usr/bin/sed

json_str() { # $1=file $2=key
  "$SED" -n "s/.*\"$2\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$1" 2>/dev/null | head -1
}
json_pid() {
  "$SED" -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$1" 2>/dev/null | head -1
}

# 存活即打印 url（pidfile + 进程双通道判定），否则返回非零
alive_url() {
  [ -f "$DJ" ] || return 1
  local pid ws url
  pid="$(json_pid "$DJ")"; ws="$(json_str "$DJ" workspace)"; url="$(json_str "$DJ" url)"
  [ -n "$pid" ] && [ -n "$url" ] && [ "$ws" = "$WORKSPACE" ] && kill -0 "$pid" 2>/dev/null && { echo "$url"; return 0; }
  return 1
}

wait_ready() {
  local i=0 url
  while [ "$i" -lt "$WAIT_SECS" ]; do
    if url="$(alive_url)"; then echo "OK $url"; return 0; fi
    i=$((i+1)); sleep 1
  done
  echo "FAIL 等待就绪超时（${WAIT_SECS}s）：$DJ 未出现有效 pid/url（服务可能已崩，日志：${LOGFILE}）"
  return 1
}

# ⓪ 幂等复用：同工作区同实例已有存活进程 → 直接报 url 退出
if url="$(alive_url)"; then
  P="$(json_pid "$DJ")"
  echo "[start] 工作区已有运行中的操盘台实例 (pid=$P)；重启请先 kill $P" >&2
  echo "OK $url"
  exit 0
fi

# ① 定位 node：PATH → WorkBuddy managed 目录兜底（非交互 shell 常无完整 PATH）
NODE="$(command -v node 2>/dev/null || true)"
if [ -z "$NODE" ]; then
  for c in /Users/lv/.workbuddy/binaries/node/versions/*/bin/node; do
    [ -x "$c" ] && NODE="$c" && break
  done
fi
[ -z "$NODE" ] && { echo "[start] 找不到 node（PATH 与 managed 目录均无）" >&2; echo "FAIL 找不到 node"; exit 1; }
NPM="$(dirname "$NODE")/npm"
[ -x "$NPM" ] || NPM="$(command -v npm 2>/dev/null || true)"

# ② --detach：以真脱离方式重新拉起自己（不带 --detach），再等服务就绪
if [ "$DETACH" = "1" ]; then
  mkdir -p "$INST_DIR"
  echo "[start] detach：真脱离后台启动，日志 $LOGFILE" >&2
  "$NODE" "$SKILL_ROOT/bin/detach.mjs" "$LOGFILE" /bin/bash "$SKILL_ROOT/bin/start.sh" \
      --workspace "$WORKSPACE" ${INSTANCE:+--instance "$INSTANCE"} ${PORT:+--port "$PORT"} >/dev/null
  wait_ready
  exit $?
fi

# ③ --wait：仅做就绪校验
if [ "$WAIT" = "1" ]; then
  wait_ready
  exit $?
fi

# ④ 依赖自检：server/node_modules（express/ws/chokidar/tsx）缺失则自动补装
cd "$SKILL_ROOT/server"
if [ ! -d node_modules ] || [ ! -d node_modules/tsx ] || [ ! -d node_modules/express ]; then
  echo "[start] 首次运行，安装 server 依赖…" >&2
  [ -n "$NPM" ] || { echo "[start] 找不到 npm，无法补装依赖" >&2; echo "FAIL 找不到 npm"; exit 1; }
  "$NPM" install --no-fund --no-audit
fi

# ⑤ 前台运行（调用方自行用宿主内建后台机制包一层；启动成功会写实例目录下的 dashboard.json）
echo "[start] node=$NODE" >&2
echo "[start] workspace=$WORKSPACE instance=${INSTANCE:-default(传统布局)} port=${PORT:-5188(占用自动+1)}" >&2
exec "$NODE" --import tsx "$SKILL_ROOT/bin/dashboard.ts" --workspace "$WORKSPACE" ${INSTANCE:+--instance "$INSTANCE"} ${PORT:+--port "$PORT"}
