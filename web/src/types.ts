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

// ---------- manifest（标准化接入层，来自服务端 .pipeline/manifest.json） ----------
export interface ManifestStage {
  id: string;
  label: string;
}

export interface ManifestMember {
  id: string;
  name: string;
  role?: string;
  avatar?: string; // "/"开头=前端静态资源；其余=工作区相对路径（走 /api/file）
}

export interface Manifest {
  name: string;
  subtitle?: string;
  logo?: string;
  theme?: string;
  stages?: ManifestStage[];
  members?: ManifestMember[];
  artifactDirs?: string[];
  decisionTitle?: string;
}
