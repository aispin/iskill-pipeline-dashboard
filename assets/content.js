/* ============================================================================
 * iskill-pipeline-dashboard · 落地页内容
 * 事实来源：本技能 SKILL.md / bin/start.sh / server/index.ts
 * ==========================================================================*/
window.PROMO = {
  name: "ISKILL-PIPELINE-DASHBOARD",
  brand: "#ec4899",
  brand2: "#8b5cf6",
  repo: "https://github.com/aispin/iskill-pipeline-dashboard",
  repoLabel: "aispin/iskill-pipeline-dashboard",
  license: "MIT",

  /* 入口 bin/start.sh 是 bash 且用 kill -0，并写死 /Users/lv/.workbuddy/binaries/node/... 作回退
     → 仅 macOS（核心 server/index.ts 本身是跨平台 Node） */
  platform: "macos",

  lang: {
    /* ── 中文 ───────────────────────────────────────────────────────── */
    zh: {
      meta: {
        title: "ISKILL-PIPELINE-DASHBOARD · 把专家团的工作流搬进浏览器",
        description: "底层技能（不暴露给用户直接调用）：通用工作流可视化操盘台。manifest.json 声明名称/阶段/成员/产物目录即可接入，实时展示流水线进度、成员状态与产物精排，并支持页面内完成决策闭环。"
      },
      a11y: { skip: "跳到主要内容" },
      ui: { copy: "复制", copied: "已复制", failed: "复制失败" },
      nav: { features: "能力", shots: "截图", how: "上手", faq: "问答" },

      hero: {
        badge: "AI 技能",
        titlePre: "把工作流从聊天黑盒，",
        titleAccent: "变成浏览器里的直播",
        titlePost: "",
        sub: "底层技能，<b>不暴露给用户直接调用</b> —— 由专家团 / 主理人在任务开始时自动拉起，用户只看到网页。任何专家团、单个专家或技能，只要用 manifest.json 声明名称、主题、阶段、成员与产物目录就能接入：进度、成员状态、产物精排实时刷新，决策也在页面里完成闭环。",
        ctaPrimary: "复制安装提示词",
        ctaSecondary: "看源码",
        meta1: "manifest 驱动",
        meta2: "被专家团调用",
        meta3: "MIT 许可"
      },
      chat: {
        title: "AI Agent · 对话现场",
        status: "在线",
        userLabel: "你",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "启动操盘台，把这个团队的流水线接进去" },
          { role: "agent", text: "读 manifest.json 拿名称 / 阶段 / 成员 / 产物目录，构建服务端并起服务，端口自动错开；实时展示进度、成员状态与产物精排。", tag: "manifest 已接入" },
          { role: "user", text: "我要在页面上改决策" },
          { role: "agent", text: "可以——页面交互写回 events.jsonl，我这边接着消费，决策闭环是内置的。" }
        ]
      },


      stats: [
        { value: "1 行", label: "agent 侧唯一动作", note: "向 events.jsonl 追加一行 JSON，其余全自动" },
        { value: "0", label: "手工产物上报", note: "产物落 manifest 声明的目录即自动上屏" },
        { value: "7", label: "整站主题", note: "pink / purple / teal / blue / amber / green / coral" },
        { value: "5188", label: "默认端口", note: "被占用自动 +1，最多到 5197" }
      ],

      compare: {
        eyebrow: "对比",
        title: "以前 vs 现在",
        sub: "",
        before: {
          title: "聊天里的黑盒",
          items: [
            "任务跑到哪了、谁在做，只能靠翻聊天记录",
            "产物散落在各个目录，不知道哪个是新的",
            "要用户拍板时，得在长对话里插一句问题、再等人回"
          ]
        },
        after: {
          title: "用这个操盘台",
          items: [
            "阶段时间线与成员状态实时直播，进度一眼看到",
            "产物落盘自动上屏，markdown / 视频 / 图片都能精排",
            "决策写一条事件 → 用户在页面点选 → agent 轮询消费"
          ]
        }
      },

      features: {
        eyebrow: "能力",
        title: "它能做什么",
        sub: "",
        items: [
          { icon: "monitor", title: "实时直播", desc: "服务端监听 events.jsonl 与产物目录，通过 WebSocket 广播到 React 页面，无需刷新。" },
          { icon: "layers", title: "manifest 驱动", desc: "名称、主题、阶段、成员、产物目录全写在 manifest.json 里，热更新生效，引擎与业务零耦合。" },
          { icon: "grid", title: "产物精排", desc: "声明 artifactDirs 后自动创建 + 监听；markdown / 视频 / 图片落盘即分类上屏。" },
          { icon: "users", title: "三层粒度接入", desc: "专家团（多成员 + 流水线）、单个专家（1 人）、单个技能（可隐藏团队栏）都能接。" },
          { icon: "branch", title: "决策闭环", desc: "写 decision_request 事件，用户在页面点选落成 decisions/<id>.json，agent 轮询读取继续。" },
          { icon: "shield", title: "静默降级", desc: "启动失败绝不影响主流程，自动降级为聊天内决策；实例隔离让多团队同工作区互不串台。" }
        ]
      },

      showcase: {
        eyebrow: "实拍",
        title: "看一眼真东西",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "上手",
        title: "三步跑起来",
        sub: "构建与起服务都由 agent 后台跑；只有决策必须你看。",
        items: [
          { title: "交给 AI 装", desc: "把这句话粘进对话框，agent 会自己拉代码、读文档，再告诉你用法。", codeKey: "install" },
          { title: "让它接上流水线", desc: "manifest 里声明名称 / 阶段 / 成员就行；构建、起服务、端口分配都是它的事。", codeName: "prompt", code: "启动操盘台，把这个团队的流水线接进去，实时看进度和产物。" },
          { title: "在页面上做决策", desc: "这一步只能你亲自看：进度、成员状态、产物精排都在页面上，你的决策会被 agent 接着消费。" }
        ]
      },


      faq: {
        eyebrow: "问答",
        title: "常见问题",
        items: [
          { q: "Windows 上能跑吗？", a: "目前<b>仅 macOS</b>。入口是 <code>bin/start.sh</code>（bash，且用 <code>kill -0</code> 判活），里面还写死了 <code>/Users/lv/.workbuddy/binaries/node/...</code> 作 node 回退路径，Windows 上跑不起来。核心的 <code>server/index.ts</code> 本身是跨平台 Node —— 替代方案是把 <code>start.sh</code> 换成 <code>.ps1</code> / node 启动脚本，并把 node 回退路径改成探测式查找。" },
          { q: "用户需要自己启动它吗？", a: "不需要。这是<b>底层技能</b>，不暴露给用户直接调用：由主理人或技能自身在任务开始时自动拉起，用户只看到浏览器里的页面。" },
          { q: "端口被占用怎么办？", a: "默认 5188，被占用会自动 +1，最多尝试到 5197。" },
          { q: "产物要手工上报给面板吗？", a: "不用。只要落在 <code>manifest.artifactDirs</code> 声明的目录里就会自动上屏；事件流里也不必写 artifact 事件。" },
          { q: "怎么重置面板？", a: "直接清空 <code>events.jsonl</code>（例如 <code>&gt; events.jsonl</code>），页面自动清零，不需要重启服务。" },
          { q: "没有 manifest 能用吗？", a: "可以。回落内置的 viral-video-team 预设（六阶段 / 四成员 / 粉品红主题），零配置即可用。" }
        ]
      },

      cta: { title: "把流水线亮出来", desc: "接进你的专家团，让用户亲眼看到任务在跑。", primary: "去 GitHub 看看", secondary: "复制安装提示词" },
      footer: { license: "MIT 许可", madeWith: "由 iskill-promo-page 生成" }
    },

    /* ── English ────────────────────────────────────────────────────── */
    en: {
      meta: {
        title: "ISKILL-PIPELINE-DASHBOARD · Put your expert team's workflow in the browser",
        description: "A bottom-layer skill (not meant to be invoked by users directly): a universal workflow dashboard. Declare name/stages/members/artifact dirs in manifest.json and watch progress, member status and artifacts live, with decisions closed in the page."
      },
      a11y: { skip: "Skip to content" },
      ui: { copy: "Copy", copied: "Copied", failed: "Copy failed" },
      nav: { features: "Features", shots: "Screens", how: "Get started", faq: "FAQ" },

      hero: {
        badge: "AI skill",
        titlePre: "Turn a workflow from a chat black box ",
        titleAccent: "into a live browser view",
        titlePost: "",
        sub: "A bottom-layer skill, <b>not exposed for users to call directly</b> — the expert team or its lead launches it automatically when a task starts, and the user only ever sees the web page. Any team, single expert, or skill can plug in by declaring a name, theme, stages, members and artifact dirs in manifest.json: progress, member status and artifacts update live, and decisions close right in the page.",
        ctaPrimary: "Copy install prompt",
        ctaSecondary: "View source",
        meta1: "manifest-driven",
        meta2: "launched by teams",
        meta3: "MIT licensed"
      },
      chat: {
        title: "AI Agent · live session",
        status: "online",
        userLabel: "You",
        agentLabel: "AI",
        messages: [
          { role: "user", text: "Start the dashboard and plug this team's pipeline into it" },
          { role: "agent", text: "I read manifest.json for name / stages / members / artifact dirs, build the server and serve it on an auto-assigned port. You get live progress, member status and polished artifacts.", tag: "manifest wired" },
          { role: "user", text: "I want to make decisions on the page" },
          { role: "agent", text: "That's built in — page interactions are written back to events.jsonl and I consume them on the next tick." }
        ]
      },


      stats: [
        { value: "1 line", label: "the agent's only action", note: "append one JSON line to events.jsonl; the rest is automatic" },
        { value: "0", label: "manual artifact reports", note: "artifacts land in declared dirs and appear by themselves" },
        { value: "7", label: "whole-site themes", note: "pink / purple / teal / blue / amber / green / coral" },
        { value: "5188", label: "default port", note: "auto-increments when taken, up to 5197" }
      ],

      compare: {
        eyebrow: "Comparison",
        title: "Before vs after",
        sub: "",
        before: {
          title: "A black box in chat",
          items: [
            "What stage it is on and who is doing what — only by scrolling chat",
            "Artifacts scattered across folders with no clue which is newest",
            "To get a decision, drop a question mid-conversation and wait"
          ]
        },
        after: {
          title: "With this dashboard",
          items: [
            "A live stage timeline and member status — progress at a glance",
            "Artifacts appear on landing, with markdown / video / images laid out",
            "Write one event → the user clicks in the page → the agent polls and continues"
          ]
        }
      },

      features: {
        eyebrow: "Features",
        title: "What it does",
        sub: "",
        items: [
          { icon: "monitor", title: "Live streaming", desc: "The server watches events.jsonl and artifact dirs and broadcasts over WebSocket to a React page — no refresh." },
          { icon: "layers", title: "manifest-driven", desc: "Name, theme, stages, members and artifact dirs all live in manifest.json, hot-reloaded; the engine is decoupled from your domain." },
          { icon: "grid", title: "Artifacts laid out", desc: "Declare artifactDirs and they are created and watched; markdown / video / images appear categorised as they land." },
          { icon: "users", title: "Three granularities", desc: "Expert team (many members + pipeline), a single expert (1 member), or a single skill (team bar can be hidden)." },
          { icon: "branch", title: "Closed decision loop", desc: "Write a decision_request event, the user picks in the page into decisions/<id>.json, and the agent polls it to continue." },
          { icon: "shield", title: "Silent degradation", desc: "A failed launch never blocks the main flow and degrades to in-chat decisions; instance isolation keeps co-located teams apart." }
        ]
      },

      showcase: {
        eyebrow: "Screens",
        title: "See the real thing",
        sub: "",
        items: []
      },

      steps: {
        eyebrow: "Get started",
        title: "Up and running in three steps",
        sub: "The agent builds and serves it in the background; only the decisions need you.",
        items: [
          { title: "Let your agent install it", desc: "Paste the line into the chat — it clones the repo, reads the docs, and tells you how to use it.", codeKey: "install" },
          { title: "Have it plug in the pipeline", desc: "Declare name / stages / members in the manifest; building, serving and port allocation are on it.", codeName: "prompt", code: "Start the dashboard and plug this team's pipeline into it — live progress and artifacts." },
          { title: "Make the calls on the page", desc: "This one needs your eyes: progress, member status and polished artifacts live on the page, and your decisions feed straight back to the agent." }
        ]
      },


      faq: {
        eyebrow: "FAQ",
        title: "Frequently asked",
        items: [
          { q: "Does it run on Windows?", a: "<b>macOS only</b> for now. The entry point is <code>bin/start.sh</code> (bash, using <code>kill -0</code> to probe liveness) and it hard-codes <code>/Users/lv/.workbuddy/binaries/node/...</code> as the node fallback, so it will not run on Windows. The core <code>server/index.ts</code> is cross-platform Node — the fix is to replace <code>start.sh</code> with a <code>.ps1</code> / node launcher and turn the node fallback into a probe." },
          { q: "Do users start it themselves?", a: "No. This is a <b>bottom-layer skill</b>, not exposed for direct user invocation: the lead or the skill itself launches it when a task begins, and the user only sees the browser page." },
          { q: "What if the port is taken?", a: "The default is 5188; when busy it auto-increments, trying up to 5197." },
          { q: "Must artifacts be reported to the panel?", a: "No. Anything landing in a directory declared by <code>manifest.artifactDirs</code> appears automatically, and no artifact events are needed in the stream." },
          { q: "How do I reset the panel?", a: "Just empty <code>events.jsonl</code> (e.g. <code>&gt; events.jsonl</code>) — the page zeroes out with no restart." },
          { q: "Can it work without a manifest?", a: "Yes. It falls back to the built-in viral-video-team preset (six stages / four members / a pink theme), usable with zero configuration." }
        ]
      },

      cta: { title: "Make the pipeline visible", desc: "Plug it into your expert team and let users watch the task run.", primary: "Open on GitHub", secondary: "Copy install prompt" },
      footer: { license: "MIT licensed", madeWith: "Built with iskill-promo-page" }
    }
  }
};
