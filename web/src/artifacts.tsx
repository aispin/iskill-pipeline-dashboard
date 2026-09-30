import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { fetchFileText, sendDecision } from "./api";
import type { Artifact, Ev } from "./types";

function fileUrl(p: string) {
  return "/api/file?p=" + encodeURIComponent(p);
}

export function ArtifactViewer({ artifacts }: { artifacts: Artifact[] }) {
  const [sel, setSel] = useState<Artifact | null>(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!sel && artifacts.length > 0) setSel(artifacts[artifacts.length - 1]);
  }, [artifacts, sel]);

  useEffect(() => {
    if (!sel || !["markdown", "json", "text"].includes(sel.kind)) {
      setContent("");
      return;
    }
    let alive = true;
    fetchFileText(sel.path)
      .then((t) => alive && setContent(t))
      .catch(() => alive && setContent("（读取失败）"));
    return () => {
      alive = false;
    };
  }, [sel]);

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-700">产物展示</div>
        <div className="text-xs text-zinc-400">{artifacts.length} 个产物</div>
      </div>

      {artifacts.length === 0 ? (
        <div className="py-10 text-center text-sm text-zinc-400">
          产物落盘后会自动出现在这里
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {artifacts.map((a) => {
            const name = a.path.split("/").pop() ?? a.path;
            return (
              <button
                key={a.path}
                onClick={() => setSel(a)}
                className={
                  "max-w-[220px] truncate rounded-full px-3 py-1 text-xs transition " +
                  (sel?.path === a.path
                    ? "bg-brand-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-brand-100 hover:text-brand-700")
                }
                title={a.path}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {sel && (
        <motion.div
          key={sel.path}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-h-[560px] overflow-y-auto rounded-xl bg-zinc-50/60 p-4 ring-1 ring-zinc-100"
        >
          <div className="mb-2 font-mono text-xs text-zinc-400">{sel.path}</div>
          {sel.kind === "markdown" && (
            <div className="prose prose-sm prose-zinc max-w-none prose-headings:font-bold prose-a:text-brand-600">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
          {sel.kind === "video" && (
            <video controls className="w-full rounded-xl" src={fileUrl(sel.path)} />
          )}
          {sel.kind === "image" && (
            <img className="max-w-full rounded-xl" src={fileUrl(sel.path)} alt={sel.path} />
          )}
          {(sel.kind === "json" || sel.kind === "text") && (
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-relaxed text-zinc-700">
              {content}
            </pre>
          )}
        </motion.div>
      )}
    </div>
  );
}

export function DecisionPanel({ events }: { events: Ev[] }) {
  const [chosen, setChosen] = useState<string | null>(null);

  const resolved = new Set(
    events.filter((e) => e.type === "decision_resolved").map((e) => e.id)
  );
  const pending = [...events]
    .reverse()
    .find((e) => e.type === "decision_request" && e.id && !resolved.has(e.id));

  useEffect(() => {
    setChosen(null);
  }, [pending?.id]);

  if (!pending || !pending.options || pending.options.length === 0) return null;

  const choose = async (opt: { id: string; label: string }) => {
    if (chosen) return;
    setChosen(opt.id);
    try {
      await sendDecision(pending.id!, opt.id, opt.label);
    } catch {
      setChosen(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200"
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-500">
          团队请求你的决定
        </div>
        <div className="mb-4 text-lg font-bold text-zinc-900">
          {pending.title ?? "请选择"}
        </div>
        <div className="space-y-2">
          {pending.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => choose(opt)}
              disabled={!!chosen}
              className={
                "w-full rounded-2xl border p-4 text-left transition disabled:opacity-60 " +
                (chosen === opt.id
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-400"
                  : "border-zinc-200 bg-white hover:border-brand-300 hover:bg-brand-50/50")
              }
            >
              <div className="font-semibold text-zinc-900">{opt.label}</div>
              {opt.detail && (
                <div className="mt-0.5 text-sm text-zinc-500">{opt.detail}</div>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 text-center text-xs text-zinc-400">
          {chosen ? "已回传给团队，正在继续…" : "点击卡片即完成选择，团队会立即继续"}
        </div>
      </motion.div>
    </div>
  );
}
