export type EvType =
  | "phase_start"
  | "phase_end"
  | "artifact"
  | "decision_request"
  | "decision_resolved"
  | "pipeline_done"
  | "note";

export interface Ev {
  ts: string;
  type: EvType;
  phase?: string;
  member?: string;
  title?: string;
  summary?: string;
  path?: string;
  kind?: string;
  id?: string;
  options?: { id: string; label: string; detail?: string }[];
  [k: string]: unknown;
}

export interface Artifact {
  path: string;
  kind: string;
  mtime?: number;
}

export const PHASES = [
  { id: "intake", label: "需求收集" },
  { id: "scout", label: "热点选题" },
  { id: "teardown", label: "对标拆解" },
  { id: "copy", label: "文案打磨" },
  { id: "precheck", label: "合规预检" },
  { id: "edit", label: "成片剪辑" },
  { id: "deliver", label: "交付汇编" },
] as const;

export interface Member {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export const MEMBERS: Member[] = [
  {
    id: "viral-video-team-team-lead",
    name: "闻热点",
    role: "内容操盘官 · 主理人",
    avatar: "/avatars/viral-video-team-team-lead.png",
  },
  {
    id: "gushunkou",
    name: "顾顺口",
    role: "爆款文案写手",
    avatar: "/avatars/gushunkou.png",
  },
  {
    id: "duweijin",
    name: "杜违禁",
    role: "合规质检官",
    avatar: "/avatars/duweijin.png",
  },
  {
    id: "jianchengpian",
    name: "简成片",
    role: "成片剪辑师",
    avatar: "/avatars/jianchengpian.png",
  },
];
