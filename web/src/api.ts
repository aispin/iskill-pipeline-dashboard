import type { Artifact, Ev } from "./types";

export async function fetchState(): Promise<{
  workspace: string;
  events: Ev[];
  artifacts: Artifact[];
}> {
  const r = await fetch("/api/state");
  if (!r.ok) throw new Error("state fetch failed");
  return r.json();
}

export async function fetchFileText(p: string): Promise<string> {
  const r = await fetch("/api/file?p=" + encodeURIComponent(p));
  if (!r.ok) throw new Error("file fetch failed");
  return r.text();
}

export async function sendDecision(
  id: string,
  choice: string,
  label?: string
): Promise<{ ok: boolean }> {
  const r = await fetch("/api/decision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, choice, label }),
  });
  if (!r.ok) throw new Error("decision failed");
  return r.json();
}
