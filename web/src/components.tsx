import { motion } from "framer-motion";
import { MEMBERS, PHASES, type Ev } from "./types";

const fmtTime = (ts: string) => {
  const d = new Date(ts);
  return isNaN(+d)
    ? ts
    : d.toLocaleTimeString("zh-CN", { hour12: false });
};

function memberStatus(events: Ev[]) {
  const open = new Map<string, { phase: string }>();
  for (const e of events) {
    if (e.type === "phase_start" && e.member) open.set(e.member, { phase: e.phase ?? "" });
    if (e.type === "phase_end" && e.member) open.delete(e.member);
    if (e.type === "pipeline_done") open.clear();
  }
  return open;
}

export function TeamBar({ events }: { events: Ev[] }) {
  const open = memberStatus(events);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MEMBERS.map((m) => {
        const cur = open.get(m.id);
        return (
          <motion.div
            key={m.id}
            layout
            className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200"
          >
            <img
              src={m.avatar}
              alt={m.name}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-200"
            />
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900">{m.name}</div>
              <div className="truncate text-xs text-zinc-500">{m.role}</div>
              <div
                className={
                  "mt-1 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs " +
                  (cur ? "bg-brand-100 text-brand-700" : "bg-zinc-100 text-zinc-500")
                }
              >
                {cur ? (
                  <>
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-brand-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    />
                    工作中{cur.phase ? ` · ${cur.phase}` : ""}
                  </>
                ) : (
                  "空闲"
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function Timeline({ events }: { events: Ev[] }) {
  const started = new Set<string>();
  const done = new Set<string>();
  for (const e of events) {
    if (e.type === "phase_start" && e.phase) started.add(e.phase);
    if (e.type === "phase_end" && e.phase) done.add(e.phase);
    if (e.type === "pipeline_done") PHASES.forEach((p) => done.add(p.id));
  }
  const activeIdx = PHASES.findIndex((p) => started.has(p.id) && !done.has(p.id));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <div className="flex items-start">
        {PHASES.map((p, i) => {
          const isDone = done.has(p.id);
          const isActive = i === activeIdx;
          return (
            <div key={p.id} className="flex flex-1 flex-col items-center last:flex-none">
              {i > 0 && (
                <div
                  className={
                    "-ml-full mr-auto h-0.5 w-full translate-y-[14px] " +
                    (isDone || isActive || started.has(p.id)
                      ? "bg-brand-400"
                      : "bg-zinc-200")
                  }
                />
              )}
              <div
                className={
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold " +
                  (isDone
                    ? "bg-brand-500 text-white"
                    : isActive
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400"
                      : "bg-zinc-100 text-zinc-400")
                }
              >
                {isDone ? "✓" : i + 1}
              </div>
              <div
                className={
                  "mt-1.5 whitespace-nowrap text-xs " +
                  (isActive ? "font-semibold text-brand-700" : "text-zinc-500")
                }
              >
                {p.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const EV_STYLE: Record<string, { dot: string; icon: string }> = {
  phase_start: { dot: "bg-brand-500", icon: "▶" },
  phase_end: { dot: "bg-emerald-500", icon: "✓" },
  artifact: { dot: "bg-sky-500", icon: "📄" },
  decision_request: { dot: "bg-amber-500", icon: "🗳️" },
  decision_resolved: { dot: "bg-amber-300", icon: "🗳️" },
  pipeline_done: { dot: "bg-brand-600", icon: "🎉" },
  note: { dot: "bg-zinc-400", icon: "📝" },
};

function evText(e: Ev): string {
  switch (e.type) {
    case "phase_start":
      return `${e.title ?? e.phase ?? "阶段"} 开始`;
    case "phase_end":
      return `${e.title ?? e.phase ?? "阶段"} 完成${e.summary ? ` — ${e.summary}` : ""}`;
    case "artifact":
      return `产出落盘：${e.path}`;
    case "decision_request":
      return `等待你的选择：${e.title ?? e.id}`;
    case "decision_resolved":
      return `已选择：${e.label ?? e.choice}`;
    case "pipeline_done":
      return `全流程完成${e.artifact ? ` — ${e.artifact}` : ""}`;
    default:
      return (e.title as string) ?? (e.summary as string) ?? "";
  }
}

export function EventFeed({ events }: { events: Ev[] }) {
  const list = [...events].reverse();
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200">
      <div className="mb-3 text-sm font-semibold text-zinc-700">实时动态</div>
      <div className="max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
        {list.length === 0 && (
          <div className="py-10 text-center text-sm text-zinc-400">
            等待团队开工…
          </div>
        )}
        {list.map((e, i) => {
          const st = EV_STYLE[e.type] ?? EV_STYLE.note;
          return (
            <motion.div
              key={(e.ts ?? "") + e.type + i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2.5 text-sm"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
              <div className="min-w-0">
                <span className="text-zinc-500">{fmtTime(e.ts)}</span>{" "}
                <span className="text-zinc-800">
                  {st.icon} {evText(e)}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
