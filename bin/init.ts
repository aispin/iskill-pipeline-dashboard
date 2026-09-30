// 脚手架：专家团插件目录 → 工作区 .pipeline/manifest.json + 契约注入
// 用法：cd <skill>/server && node --import tsx ../bin/init.ts --team <插件目录> --workspace <工作区> [--inject] [--force]
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

function parseArgs(): { team: string; workspace: string; inject: boolean; force: boolean; dirs?: string; instance?: string } {
  let team = "";
  let workspace = process.cwd();
  let inject = false;
  let force = false;
  let dirs: string | undefined;
  let instance: string | undefined;
  const a = process.argv;
  for (let i = 2; i < a.length; i++) {
    if (a[i] === "--team") team = a[++i] ?? team;
    else if (a[i] === "--workspace") workspace = a[++i] ?? workspace;
    else if (a[i] === "--inject") inject = true;
    else if (a[i] === "--force") force = true;
    else if (a[i] === "--dirs") dirs = a[++i] ?? dirs;
    else if (a[i] === "--instance") instance = a[++i] ?? instance;
  }
  if (!team) {
    console.error("用法：node --import tsx ../bin/init.ts --team <专家团插件目录> --workspace <工作区> [--instance <实例id>] [--inject] [--force] [--dirs 目录1,目录2]");
    process.exit(1);
  }
  return { team: resolve(team), workspace: resolve(workspace), inject, force, dirs, instance };
}

// 极简 frontmatter 解析：取 name / displayName.zh / profession.zh（逐行状态机，兼容嵌套 YAML）
function parseAgentMd(file: string): { id: string; name: string; role: string } | null {
  const text = readFileSync(file, "utf8");
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  let name = basename(file, ".md");
  let zhName: string | undefined;
  let professionZh: string | undefined;
  let section = "";
  for (const line of m[1].split(/\r?\n/)) {
    const top = line.match(/^([\w-]+):/);
    if (top) section = top[1];
    const nm = line.match(/^name:\s*(\S+)/);
    if (nm) name = nm[1];
    const nested = line.match(/^\s+([\w-]+):\s*(.*)$/);
    if (nested) {
      const val = nested[2].replace(/"/g, "").trim();
      if (section === "displayName" && nested[1] === "zh" && val) zhName = val;
      if (section === "profession" && nested[1] === "zh" && val) professionZh = val;
    }
  }
  return { id: name, name: zhName ?? name, role: professionZh ?? "" };
}

const CONTRACT = `## 操盘台契约（iskill-pipeline-dashboard）

1. 启动（按宿主能力二选一，尽力而为；<实例id> 惯例取本团队目录名）：
   - WorkBuddy/CodeBuddy 系：run_in_background 执行 bash /Users/lv/.workbuddy/skills/iskill-pipeline-dashboard/bin/start.sh --workspace <工作区> --instance <实例id>；轮询 <工作区>/.pipeline/instances/<实例id>/dashboard.json（每 2 秒最多 15 秒）拿 url，拿到后立刻用 present_files 打开该 url（内置浏览器零点击）
   - 其他宿主：nohup bash <dashboard 技能目录>/bin/start.sh --workspace <工作区> --instance <实例id> >/dev/null 2>&1 &；轮询拿 url 后用 open/xdg-open 打开系统浏览器，失败则把 url 打印给用户
2. 确保 <工作区>/.pipeline/instances/<实例id>/manifest.json 与本团队匹配（用 bin/init.ts --instance 生成或手工维护）
3. agent 唯一动作：向 <工作区>/.pipeline/instances/<实例id>/events.jsonl 追加一行 JSON；phase 取值 = manifest.stages[].id
4. 产物落 manifest.artifactDirs 声明的目录即自动上屏，无需上报；多实例共存时各实例 artifactDirs 不得重叠
5. 决策：写 decision_request 事件 → 轮询 .pipeline/instances/<实例id>/decisions/<id>.json（每 3 秒最多 5 分钟，超时回聊天询问）
6. 操盘台启动失败/不可用 → 静默降级为聊天内决策，绝不阻塞主流程
`;

export async function run(): Promise<void> {
  const { team, workspace, inject, force, dirs, instance } = parseArgs();
  const agentsDir = join(team, "agents");
  if (!existsSync(agentsDir)) {
    console.error(`[init] 未找到 agents 目录：${agentsDir}`);
    process.exit(1);
  }

  // 成员：agents/*.md → name/zh/role + 插件头像（--instance <id> → 数据落 .pipeline/instances/<id>/）
  const agentFiles = readdirSync(agentsDir).filter((f) => f.endsWith(".md"));
  const pipeDir = instance
    ? join(workspace, ".pipeline", "instances", instance)
    : join(workspace, ".pipeline");
  const assetsDir = join(pipeDir, "assets", "avatars");
  mkdirSync(assetsDir, { recursive: true });

  const members: { id: string; name: string; role?: string; avatar?: string }[] = [];
  for (const f of agentFiles) {
    const a = parseAgentMd(join(agentsDir, f));
    if (!a) continue;
    const png = join(team, "avatars", `${a.id}.png`);
    let avatar: string | undefined;
    if (existsSync(png)) {
      copyFileSync(png, join(assetsDir, `${a.id}.png`));
      avatar = `/team-assets/avatars/${a.id}.png`;
    }
    members.push({ id: a.id, name: a.name, role: a.role || undefined, avatar });
  }

  // 团队名：README 一级标题 → 目录名兜底
  let teamName = basename(team);
  try {
    const readme = readFileSync(join(team, "README.md"), "utf8");
    teamName = readme.match(/^#\s+(.+)$/m)?.[1]?.trim() || teamName;
  } catch { /* no readme */ }

  const manifest = {
    name: `${teamName} 操盘台`,
    subtitle: "工作流实时直播",
    theme: "pink",
    stages: [] as { id: string; label: string }[],
    members,
    artifactDirs: dirsOpt ? dirsOpt.split(",").map((s) => s.trim()).filter(Boolean) : ["产物"],
    decisionTitle: "团队请求你的决定",
  };

  const manifestFile = join(pipeDir, "manifest.json");
  if (existsSync(manifestFile) && !force) {
    console.log(`[init] manifest 已存在，跳过（--force 覆盖）：${manifestFile}`);
  } else {
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + "\n");
  }

  console.log(`[init] 已生成 manifest：${manifestFile}`);
  console.log(`[init] 成员 ${members.length} 人（头像已复制到 .pipeline/assets/avatars/）`);
  console.log(dirs ? "[init] artifactDirs 已按 --dirs 写入" : "[init] ⚠️ 待人工补全：stages（阶段流水线，事件 phase 取值须与之对应）；artifactDirs 可用 --dirs 目录1,目录2 指定（默认占位 产物/）");

  // 契约注入：找主理人 MD（文件名含 team-lead，否则第一个 agent）
  if (inject) {
    const lead = agentFiles.find((f) => f.includes("team-lead")) ?? agentFiles[0];
    const leadFile = join(agentsDir, lead);
    const md = readFileSync(leadFile, "utf8");
    if (md.includes("操盘台契约（iskill-pipeline-dashboard）")) {
      console.log(`[init] 契约已存在，跳过注入：${lead}`);
    } else {
      writeFileSync(leadFile, md.replace(/\s*$/, "\n\n") + CONTRACT);
      console.log(`[init] 契约已注入：${lead}`);
    }
  }
}

run().catch((e: unknown) => {
  console.error("[init] 失败:", e);
  process.exit(1);
});
