// 可视化操盘台启动入口（TS，经 tsx 直跑，免编译）
// 用法：cd <skill>/server && node --import tsx ../bin/dashboard.ts --workspace <工作区> [--port 5188]
import { run } from "../server/index.ts";

run().catch((e: unknown) => {
  console.error("[dashboard] 启动失败:", e);
  process.exit(1);
});
