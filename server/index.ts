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

// ---------- manifest（标准化接入层） ----------
// 接入方在工作区 .pipeline/manifest.json 声明：名称/主题/阶段/成员/产物目录。
// 无 manifest 时回落内置预设（viral-video-team），保持旧行为兼容。
export interface Manifest {
  name: string;
  subtitle?: string;
  logo?: string;
  theme?: string; // pink|purple|teal|blue|amber|green|coral，缺省 pink
  stages?: { id: string; label: string }[];
  members?: { id: string; name: string; role?: string; avatar?: string }[];
  artifactDirs?: string[];
  decisionTitle?: string;
}

const BUILTIN_MANIFEST: Manifest = {
  name: "爆款短视频操盘台",
  subtitle: "六步流水线 · 实时直播",
  theme: "pink",
  logo: "/avatars/team.png",
  stages: [
    { id: "intake", label: "需求收集" },
    { id: "scout", label: "热点选题" },
    { id: "teardown", label: "对标拆解" },
    { id: "copy", label: "文案打磨" },
    { id: "precheck", label: "合规预检" },
    { id: "edit", label: "成片剪辑" },
    { id: "deliver", label: "交付汇编" },
  ],
  members: [
    { id: "viral-video-team-team-lead", name: "闻热点", role: "内容操盘官 · 主理人", avatar: "/avatars/viral-video-team-team-lead.png" },
    { id: "gushunkou", name: "顾顺口", role: "爆款文案写手", avatar: "/avatars/gushunkou.png" },
    { id: "duweijin", name: "杜违禁", role: "合规质检官", avatar: "/avatars/duweijin.png" },
    { id: "jianchengpian", name: "简成片", role: "成片剪辑师", avatar: "/avatars/jianchengpian.png" },
  ],
  artifactDirs: [
    "viral-video-team-output/选题",
    "viral-video-team-output/拆解",
    "viral-video-team-output/文案",
    "viral-video-team-output/成片",
    "viral-video-team-output/素材",
  ],
  decisionTitle: "团队请求你的决定",
};

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
  const manifestFile = join(pipeDir, "manifest.json");

  function loadManifest(): Manifest {
    try {
      const raw = JSON.parse(readFileSync(manifestFile, "utf8")) as Partial<Manifest>;
      return {
        name: raw.name || BUILTIN_MANIFEST.name,
        subtitle: raw.subtitle,
        logo: raw.logo,
        theme: raw.theme || "pink",
        stages: Array.isArray(raw.stages) ? raw.stages : [],
        members: Array.isArray(raw.members) ? raw.members : [],
        artifactDirs: Array.isArray(raw.artifactDirs) && raw.artifactDirs.length
          ? raw.artifactDirs
          : BUILTIN_MANIFEST.artifactDirs,
        decisionTitle: raw.decisionTitle || "请求你的决定",
      };
    } catch {
      return BUILTIN_MANIFEST; // 无 manifest / 解析失败 → 内置预设（旧行为）
    }
  }

  let manifest = loadManifest();
  const contentDirs = (): string[] => manifest.artifactDirs ?? BUILTIN_MANIFEST.artifactDirs!;

  mkdirSync(pipeDir, { recursive: true });
  mkdirSync(decisionsDir, { recursive: true });
  for (const d of contentDirs()) mkdirSync(join(workspace, d), { recursive: true });
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
    for (const d of contentDirs()) {
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
        broadcast({ type: "snapshot", manifest, events, artifacts: listArtifacts() });
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
  // 团队静态资源（init 脚手架复制的头像/logo 等）：/team-assets/avatars/xxx.png
  app.use("/team-assets", express.static(join(pipeDir, "assets")));

  app.get("/api/state", (_req: Request, res: Response) => {
    res.json({ workspace, manifest, events, artifacts: listArtifacts() });
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
      JSON.stringify({ type: "snapshot", manifest, events, artifacts: listArtifacts() })
    );
    ws.on("close", () => clients.delete(ws));
    ws.on("error", () => clients.delete(ws));
  });

  // ---------- watchers ----------
  // 产物目录有新文件 → 服务端代写 artifact 事件进 events.jsonl（agent 无需上报产物）
  // 决策文件出现 → 代写 decision_resolved 事件
  const watcher = watch(
    [eventsFile, decisionsDir, manifestFile, ...contentDirs().map((d) => join(workspace, d))],
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
    // manifest 热更新：重载 → 追加监听新产物目录 → 全量快照广播
    if (resolve(full) === resolve(manifestFile)) {
      const oldDirs = new Set(contentDirs());
      manifest = loadManifest();
      const fresh = contentDirs().filter((d) => !oldDirs.has(d));
      for (const d of fresh) {
        mkdirSync(join(workspace, d), { recursive: true });
        watcher.add(join(workspace, d));
      }
      broadcast({ type: "snapshot", manifest, events, artifacts: listArtifacts() });
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
