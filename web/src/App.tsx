import { useCallback, useEffect, useRef, useState } from "react";
import { fetchState } from "./api";
import { EventFeed, TeamBar, Timeline } from "./components";
import { ArtifactViewer, DecisionPanel } from "./artifacts";
import { applyTheme } from "./themes";
import type { Artifact, Ev, Manifest } from "./types";

export default function App() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [workspace, setWorkspace] = useState("");
  const [manifest, setManifest] = useState<Manifest>({ name: "操盘台" });
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await fetchState();
      setEvents(s.events);
      setArtifacts(s.artifacts);
      setWorkspace(s.workspace);
      setManifest(s.manifest ?? { name: "操盘台" });
    } catch {
      /* server not ready yet */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    applyTheme(manifest.theme);
  }, [manifest.theme]);

  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(`${proto}://${location.host}/ws`);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (m) => {
      let msg: any;
      try {
        msg = JSON.parse(m.data);
      } catch {
        return;
      }
      if (msg.type === "snapshot") {
        setEvents(msg.events ?? []);
        setArtifacts(msg.artifacts ?? []);
        if (msg.manifest) setManifest(msg.manifest);
      } else if (msg.type === "event") {
        const ev = msg.event as Ev;
        setEvents((prev) =>
          prev.some((x) => x.ts === ev.ts && x.type === ev.type && x.path === ev.path)
            ? prev
            : [...prev, ev]
        );
      } else if (msg.type === "artifact") {
        setArtifacts((prev) =>
          prev.some((x) => x.path === msg.path)
            ? prev
            : [...prev, { path: msg.path, kind: msg.kind }]
        );
      }
    };
    const retry = setInterval(() => {
      if (ws.readyState > 1) load();
    }, 5000);
    return () => {
      clearInterval(retry);
      ws.close();
    };
  }, [load]);

  const wsName = workspace.split("/").filter(Boolean).pop() || "工作区";

  return (
    <div className="min-h-screen">
      <header
        className="pb-16 pt-8 text-white shadow-lg"
        style={{
          background: "linear-gradient(to right, var(--color-brand-600), var(--color-brand-500), var(--color-brand-400))",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {manifest.logo && (
              <img src={manifest.logo} alt="logo" className="h-11 w-11 rounded-2xl ring-2 ring-white/40" />
            )}
            <div>
              <h1 className="text-xl font-bold">{manifest.name}</h1>
              <div className="text-xs text-white/80">
                {manifest.subtitle && <span className="mr-2">{manifest.subtitle}</span>}
                工作区：{wsName}
                {workspace && <span className="ml-2 hidden font-mono text-[10px] text-white/50 sm:inline">{workspace}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">
            <span
              className={
                "h-2 w-2 rounded-full " +
                (connected ? "bg-emerald-300" : "bg-red-300")
              }
            />
            {connected ? "实时连接" : "连接中…"}
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-10 max-w-6xl space-y-5 px-4 pb-16">
        <TeamBar events={events} manifest={manifest} />
        <Timeline events={events} manifest={manifest} />
        <div className="grid gap-5 lg:grid-cols-2">
          <EventFeed events={events} />
          <ArtifactViewer artifacts={artifacts} />
        </div>
      </main>

      <DecisionPanel events={events} manifest={manifest} />
    </div>
  );
}
