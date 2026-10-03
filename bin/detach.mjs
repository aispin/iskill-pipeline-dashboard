// 真脱离进程组启动子进程（等价 setsid），父进程立即退出并打印子进程 pid。
// 用法：node bin/detach.mjs <logFile> <cmd> [args...]
//
// ⚠️ 为什么需要这个文件（2026-10-02 实测，别删）：
//   普通 shell 后台任务（`cmd &` / `nohup cmd &`）会在**那次 Bash 调用结束时被连带杀掉**，
//   而且死得极早——早到 server 还没绑定端口、`dashboard.json` 都没写出来。
//   调用方随后按契约轮询 dashboard.json 必然超时 → 静默降级 → 操盘台全程不出现、且无痕迹。
//   用 `child_process.spawn({detached:true})`（内部即 setsid）才能真正脱离，实测可存活。
//   （宿主内建 run_in_background 机制同样有效，二者都是「脱离当前 Bash 调用生命周期」。）
import { spawn } from "node:child_process";
import fs from "node:fs";

const [logFile, cmd, ...args] = process.argv.slice(2);
if (!logFile || !cmd) {
  console.error("用法: node detach.mjs <logFile> <cmd> [args...]");
  process.exit(2);
}

const fd = fs.openSync(logFile, "a");
const child = spawn(cmd, args, { detached: true, stdio: ["ignore", fd, fd] });
child.unref();
process.stdout.write(String(child.pid));
