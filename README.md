# iskill-pipeline-dashboard

底层技能（不暴露给用户直接调用）——通用工作流可视化操盘台。Node+React+Tailwind+Vite，适用于任何专家团/专家/技能：manifest.json 声明名称/主题/阶段/成员/产物目录即可接入，实时展示流水线进度、成员状态、产物精排（markdown/视频/图片），支持用户在页面完成决策闭环。内置 viral-video-team 预设零配置可用；触发词「启动操盘台」兜底。

完整用法见 [SKILL.md](SKILL.md)。

> 依赖同步：本仓库含 iskill 共享真源的 vendored 副本（清单见 `package.json` 的 `iskillDeps`），**不要手改**。使用前请同时安装 iskill-utils：对 agent 说「请帮我安装 Skill：aispin/iskill-utils」；用法见 SKILL.md「依赖同步」节。
