import http from "node:http";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { WebSocketServer, type WebSocket } from "ws";
import { watch } from "chokidar";

interface Ev {
  ts: string;
  type: string;
  [k: string]: unknown;
}

const KINDS: Record<string, string> = {
  ".md": "markdown",
  ".mp4": "video",
  ".mov": "video",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".webp": "image",
  ".gif": "image",
  ".json": "json",
  ".srt": "text",
  ".txt": "text",
};

const CONTENT_DIRS = ["选题", "拆解", "文案", "成片", "素材"];

function parseArgs(): { workspace: string; port: number } {
  let workspace = process.cwd();
  let port = 5188;
  const a = process.argv;
  for (let i = 2; i < a.length; i++) {
    if (a[i] === "--workspace") workspace = a[++i] ?? workspace;
    else if (a[i] === "--port") port = Number(a[++i]) || port;
  }
  return { workspace: resolve(workspace), port };
}

export async function run(): Promise<void> {
  const { workspace, port: wantPort } = parseArgs();
  const pipeDir = join(workspace, ".pipeline");
  const eventsFile = join(pipeDir, "events.jsonl");
  const decisionsDir = join(pipeDir, "decisions");
  mkdirSync(pipeDir, { recursive: true });
  mkdirSync(decisionsDir, { recursive: true });
  for (const d of CONTENT_DIRS) mkdirSync(join(workspace, d), { recursive: true });
  if (!existsSync(eventsFile)) writeFileSync(eventsFile, "");

  // ---------- state ----------
  let events: Ev[] = [];
  try {
    events = readFileSync(eventsFile, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l) as Ev;
        } catch {
          return null;
        }
      })
      .filter((x): x is Ev => !!x);
  } catch {
    /* no history */
  }
  let offset = existsSync(eventsFile) ? statSync(eventsFile).size : 0;

  const clients = new Set<WebSocket>();

  function broadcast(msg: unknown): void {
    const s = JSON.stringify(msg);
    for (const ws of clients) {
      try {
        ws.send(s);
      } catch {
        /* ignore dead client */
      }
    }
  }

  function listArtifacts(): { path: string; kind: string; mtime: number }[] {
    const out: { path: string; kind: string; mtime: number }[] = [];
    for (const d of CONTENT_DIRS) {
      const base = join(workspace, d);
      if (!existsSync(base)) continue;
      const walk = (dir: string): void => {
        let names: string[] = [];
        try {
          names = readdirSync(dir);
        } catch {
          return;
        }
        for (const name of names) {
          if (name.startsWith(".")) continue; // 跳过隐藏文件/目录（.build-*、.DS_Store 等）
          const full = join(dir, name);
          let st;
          try {
            st = statSync(full);
          } catch {
            continue;
          }
          if (st.isDirectory()) walk(full);
          else
            out.push({
              path: relative(workspace, full),
              kind: KINDS[extname(full).toLowerCase()] ?? "file",
              mtime: st.mtimeMs,
            });
        }
      };
      walk(base);
    }
    out.sort((a, b) => a.mtime - b.mtime);
    return out;
  }

  // events.jsonl 是唯一事实源：agent 追加 → 这里读取 → WS 广播
  function readNewEvents(): void {
    try {
      const buf = readFileSync(eventsFile);
      if (buf.length < offset) {
        offset = 0; // 文件被截断/重置 → 从头读
        events = []; // 内存历史同步清空（前端会收到全新 snapshot）
        broadcast({ type: "snapshot", events, artifacts: listArtifacts() });
      }
      if (buf.length <= offset) return;
      const chunk = buf.subarray(offset).toString("utf8");
      offset = buf.length;
      for (const line of chunk.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
          const ev = JSON.parse(t) as Ev;
          events.push(ev);
          broadcast({ type: "event", event: ev });
        } catch {
          /* skip broken line */
        }
      }
    } catch {
      /* file gone */
    }
  }

  // ---------- http api ----------
  const app = express();
  app.use(express.json());

  app.get("/api/state", (_req: Request, res: Response) => {
    res.json({ workspace, events, artifacts: listArtifacts() });
  });

  app.get("/api/file", (req: Request, res: Response) => {
    const p = String(req.query.p ?? "");
    if (!p) return res.status(400).json({ error: "missing p" });
    const full = resolve(workspace, p);
    if (full !== workspace && !full.startsWith(workspace + sep))
      return res.status(403).json({ error: "forbidden" });
    if (!existsSync(full) || !statSync(full).isFile())
      return res.status(404).json({ error: "not found" });
    res.sendFile(full);
  });

  app.post("/api/decision", (req: Request, res: Response) => {
    const { id, choice, label } = (req.body ?? {}) as {
      id?: string;
      choice?: string;
      label?: string;
    };
    if (!id || choice == null)
      return res.status(400).json({ error: "missing id/choice" });
    const safe = String(id).replace(/[^\w-]/g, "");
    writeFileSync(
      join(decisionsDir, `${safe}.json`),
      JSON.stringify(
        { id, choice, label, resolvedAt: new Date().toISOString() },
        null,
        2
      )
    );
    res.json({ ok: true });
  });

  // ---------- 静态托管（web/dist） ----------
  const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../web/dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.use((req: Request, res: Response, next: () => void) => {
      if (
        req.method === "GET" &&
        !req.path.startsWith("/api") &&
        !req.path.startsWith("/ws")
      ) {
        return res.sendFile(join(dist, "index.html"));
      }
      next();
    });
  } else {
    app.get("/", (_req: Request, res: Response) => {
      res
        .status(503)
        .send("[dashboard] web/dist 不存在——请先在 web/ 下执行构建（npm run build）");
    });
  }

  // ---------- ws ----------
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  wss.on("connection", (ws: WebSocket) => {
    clients.add(ws);
    ws.send(
      JSON.stringify({ type: "snapshot", events, artifacts: listArtifacts() })
    );
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // ---------- watchers ----------
  // 产物目录有新文件 → 服务端代写 artifact 事件进 events.jsonl（agent 无需上报产物）
  // 决策文件出现 → 代写 decision_resolved 事件
  const watcher = watch(
    [eventsFile, decisionsDir, ...CONTENT_DIRS.map((d) => join(workspace, d))],
    {
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
    }
  );
  watcher.on("all", (action: string, full: string) => {
    if (action !== "add" && action !== "change") return;
    if (resolve(full) === resolve(eventsFile)) {
      readNewEvents();
      return;
    }
    const rel = relative(workspace, full);
    if (rel.startsWith(".pipeline")) {
      if (rel.includes("decisions") && rel.endsWith(".json") && action === "add") {
        try {
          const d = JSON.parse(readFileSync(full, "utf8"));
          appendFileSync(
            eventsFile,
            JSON.stringify({
              ts: d.resolvedAt ?? new Date().toISOString(),
              type: "decision_resolved",
              id: d.id,
              choice: d.choice,
              label: d.label,
            }) + "\n"
          );
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const kind = KINDS[extname(full).toLowerCase()] ?? "file";
    appendFileSync(
      eventsFile,
      JSON.stringify({ ts: new Date().toISOString(), type: "artifact", path: rel, kind }) +
        "\n"
    );
  });

  // 兜底轮询（chokidar 万一漏事件）
  const poll = setInterval(readNewEvents, 1500);
  poll.unref();

  // ---------- listen（端口冲突自动 +1） ----------
  async function listenOn(port: number): Promise<void> {
    return new Promise((res, rej) => {
      const onError = (err: NodeJS.ErrnoException): void => {
        rej(err);
      };
      server.once("error", onError);
      server.listen(port, () => {
        server.off("error", onError);
        res();
      });
    });
  }

  let port = wantPort;
  let bound = false;
  for (let i = 0; i < 10 && !bound; i++) {
    try {
      await listenOn(port);
      bound = true;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code === "EADDRINUSE") port++;
      else throw e;
    }
  }
  if (!bound) throw new Error("找不到可用端口（5188-5197 均被占用）");

  const url = `http://localhost:${port}`;
  writeFileSync(
    join(pipeDir, "dashboard.json"),
    JSON.stringify(
      { url, pid: process.pid, workspace, startedAt: new Date().toISOString() },
      null,
      2
    )
  );
  console.log(`[dashboard] 已启动: ${url}  (workspace: ${workspace})`);
}
