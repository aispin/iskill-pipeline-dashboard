---
name: iskill-pipeline-dashboard
description: 底层技能（不暴露给用户直接调用）——通用工作流可视化操盘台。Node+React+Tailwind+Vite，适用于任何专家团/专家/技能：manifest.json 声明名称/主题/阶段/成员/产物目录即可接入，实时展示流水线进度、成员状态、产物精排（markdown/视频/图片），支持用户在页面完成决策闭环。内置 viral-video-team 预设零配置可用；触发词「启动操盘台」兜底。
---

# iskill-pipeline-dashboard 通用可视化操盘台

把任何专家团/专家/技能的工作流从聊天黑盒变成浏览器里的实时直播。**不是给用户直接用的技能**——由主理人（或技能自身）在任务开始时自动拉起，用户只看到网页。

## 架构一句话

agent 侧**唯一动作是向 `<工作区>/.pipeline/events.jsonl` 追加一行 JSON**；服务端（express + ws + chokidar）监听该文件与 manifest 声明的产物目录，实时广播到 React 页面。产物落盘**无需上报**（自动监听）。**展示层全部由 manifest 驱动**——引擎与业务语义零耦合。

## 接入三层粒度

| 粒度 | manifest 写法 |
|---|---|
| 专家团 | members = 全体成员，stages = 团队流水线 |
| 单个专家 | members = 1 人，stages = 该专家自己的流程 |
| 单个技能 | members 可省略（隐藏团队栏），stages = 技能 Phase 列表；或都省略 → 极简模式（只显示事件流 + 产物） |

## manifest（`<工作区>/.pipeline/manifest.json`，可热更新）

```json
{
  "name": "XX 操盘台",
  "subtitle": "一句话副标题",
  "theme": "pink",
  "logo": "/avatars/team.png",
  "stages": [{"id": "scout", "label": "热点选题"}],
  "members": [{"id": "agent-id", "name": "成员名", "role": "角色", "avatar": "可选"}],
  "artifactDirs": ["viral-video-team-output/选题", "viral-video-team-output/文案"],
  "decisionTitle": "团队请求你的决定"
}
```

- **theme**：`pink|purple|teal|blue|amber|green|coral`，整站换肤（CSS 变量覆盖），缺省 pink
- **stages**：可选，省略则隐藏时间线；事件里的 `phase` 取值 = `stages[].id`
- **members**：可选，省略则隐藏团队栏；`avatar` 以 `/` 开头走前端静态资源，否则按**工作区相对路径**走 `/api/file`（无头像自动首字占位）
- **artifactDirs**：产物目录，自动创建+自动监听；manifest 修改保存后**热生效**（无需重启）
- **无 manifest**：回落内置 viral-video-team 预设（六阶段/四成员/粉品红），旧用法完全兼容

## 启动（任务开始时后台执行）

```bash
cd /Users/lv/.workbuddy/skills/iskill-pipeline-dashboard/server
node --import tsx ../bin/dashboard.ts --workspace <工作区绝对路径>
```

- 启动成功后写 `<工作区>/.pipeline/dashboard.json`（含 `url`），把 url 告诉用户
- 默认端口 5188，占用自动 +1（最多到 5197）
- 首次使用前需构建前端一次：`cd web && npm install && npm run build`（本机已构建过则免）
- **启动失败 → 静默跳过，绝不影响主流程**

## 脚手架（新团队一键接入）

```bash
cd /Users/lv/.workbuddy/skills/iskill-pipeline-dashboard/server
node --import tsx ../bin/init.ts --team <专家团插件目录> --workspace <工作区> --inject
```

解析 `plugin.json` + `agents/*.md` 生成 manifest 初稿（成员/角色自动提取，头像自动关联插件目录内的 avatar）；`--inject` 把「操盘台契约」片段追加进团队主理人 MD（已存在则跳过）。生成后人工微调 stages 与 artifactDirs 即可。

## 事件协议（agent 追加到 events.jsonl，每行一个 JSON）

```json
{"ts":"<ISO时间>","type":"phase_start","phase":"scout","member":"<成员agent-id>","title":"热点选题中"}
{"ts":"...","type":"phase_end","phase":"scout","member":"...","title":"热点选题","summary":"一句话结果"}
{"ts":"...","type":"decision_request","id":"pick-teardown","phase":"teardown","title":"选一条对标参考","options":[{"id":"1","label":"卡片名","detail":"一句说明"}]}
{"ts":"...","type":"pipeline_done","artifact":"viral-video-team-output/成片/xxx.mp4"}
{"ts":"...","type":"note","title":"任意提示"}
```

- 产物（md/mp4/图片）落盘后**自动**出现在页面，不要手工报 artifact 事件
- **重置面板**：直接清空 events.jsonl（`> events.jsonl`），页面自动清零，无需重启

## 决策闭环（页面交互 → agent 消费）

1. 写一条 `decision_request` 事件（id 全局唯一，如 `pick-teardown`）
2. 用户在页面点选 → 服务端写 `<工作区>/.pipeline/decisions/<id>.json`（内容 `{id,choice,label}`）→ 页面同步显示「已选择」
3. 轮询消费：

```bash
for i in $(seq 1 100); do
  [ -f "<工作区>/.pipeline/decisions/<id>.json" ] && break
  sleep 3
done
cat "<工作区>/.pipeline/decisions/<id>.json"   # 读 choice 继续；100 次(约5分钟)未到 → 回聊天询问
```

4. 消费完可删除该决策文件

## 操盘台契约（注入团队/技能 MD 的标准片段）

```
## 操盘台契约（iskill-pipeline-dashboard）
1. 任务开始后台启动操盘台：cd /Users/lv/.workbuddy/skills/iskill-pipeline-dashboard/server && node --import tsx ../bin/dashboard.ts --workspace <工作区>；成功后把 dashboard.json 里的 url 告诉用户
2. 确保 <工作区>/.pipeline/manifest.json 与本团队匹配（用 bin/init.ts 生成或手工维护）
3. agent 唯一动作：向 <工作区>/.pipeline/events.jsonl 追加一行 JSON；phase 取值 = manifest.stages[].id
4. 产物落 manifest.artifactDirs 声明的目录即自动上屏，无需上报
5. 决策：写 decision_request 事件 → 轮询 .pipeline/decisions/<id>.json（约5分钟超时回聊天询问）
6. 操盘台启动失败/不可用 → 静默降级为聊天内决策，绝不阻塞主流程
```

## 技术栈与目录

- 运行时：沙箱 node 22（绝对路径）；TS 经 **tsx** 直跑（免编译）
- web/：React 19 + Tailwind 4 + Vite 8（全部 @latest 安装），`npm run build` 出 dist 由服务端托管
- server/index.ts：express + ws + chokidar，单文件实现（manifest 加载/事件读取/广播/产物扫描/决策落盘/静态托管）
- bin/init.ts：脚手架（团队插件目录 → manifest + 契约注入）
- 本地 curl 测试记得 `--noproxy '*'`（沙箱代理会拦 localhost）

## 实测记录

- 2026-09-30 v1（viral-video-team 专用）：决策往返 ✅；产物自动发现 ✅（隐藏目录已过滤）；事件流截断重置 ✅
- 2026-09-30 v2 通用化：manifest 配置驱动（自定义名称/teal 主题/3 阶段/单成员/自定义产物目录 → /api/state 正确下发 ✅）；web 构建通过；无 manifest 回落内置预设
