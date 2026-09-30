---
name: iskill-viral-dashboard
description: 底层技能（不暴露给用户直接调用）——短视频操盘可视化交互台。Node+React+Tailwind+Vite，实时展示专家团六步流水线进度、成员状态、产物精排（markdown/成片/图片），支持用户在页面上完成选卡等决策。仅由 viral-video-team 主理人按操盘台契约调用；触发词「启动操盘台」兜底。
---

# iskill-viral-dashboard 可视化操盘台

专家团「爆款短视频操盘团」的**底层可视化技能**：把六步流水线从聊天黑盒变成浏览器里的实时直播。**不是给用户直接用的技能**——由主理人在任务开始时自动拉起，用户只看到网页。

## 架构一句话

agent 侧**唯一动作是向 `<工作区>/.pipeline/events.jsonl` 追加一行 JSON**；服务端（express + ws + chokidar）监听该文件与产物目录（选题/拆解/文案/成片/素材），实时广播到 React 页面。产物落盘**无需上报**（自动监听）。

## 启动（主理人在任务开始时执行，后台）

```bash
cd /Users/lv/.workbuddy/skills/iskill-viral-dashboard/server
node --import tsx ../bin/dashboard.ts --workspace <工作区绝对路径>
```

- 启动成功后写 `<工作区>/.pipeline/dashboard.json`（含 `url`），把 url 告诉用户
- 默认端口 5188，占用自动 +1（最多到 5197）
- 首次使用前需构建前端一次：`cd web && npm install && npm run build`（本机已构建过则免）
- **启动失败 → 静默跳过，绝不影响主流程**

## 事件协议（agent 追加到 events.jsonl，每行一个 JSON）

```json
{"ts":"<ISO时间>","type":"phase_start","phase":"scout","member":"<成员agent-id>","title":"热点选题中"}
{"ts":"...","type":"phase_end","phase":"scout","member":"...","title":"热点选题","summary":"一句话结果"}
{"ts":"...","type":"decision_request","id":"pick-teardown","phase":"teardown","title":"选一条对标参考","options":[{"id":"1","label":"卡片名","detail":"一句说明"}]}
{"ts":"...","type":"pipeline_done","artifact":"成片/xxx.mp4"}
{"ts":"...","type":"note","title":"任意提示"}
```

- `phase` 固定枚举：intake / scout / teardown / copy / precheck / edit / deliver
- 产物（md/mp4/图片）落盘后**自动**出现在页面，不要手工报 artifact 事件
- **重置面板**：直接清空 events.jsonl（`> events.jsonl`），页面自动清零，无需重启

## 决策闭环（页面交互 → agent 消费）

1. 主理人写一条 `decision_request` 事件（id 全局唯一，如 `pick-teardown`）
2. 用户在页面点选 → 服务端写 `<工作区>/.pipeline/decisions/<id>.json`（内容 `{id,choice,label}`）→ 页面与事件流同步显示「已选择」
3. 主理人**轮询消费**：

```bash
for i in $(seq 1 100); do
  [ -f "<工作区>/.pipeline/decisions/<id>.json" ] && break
  sleep 3
done
cat "<工作区>/.pipeline/decisions/<id>.json"   # 读 choice 继续；100 次(约5分钟)未到 → 回聊天询问
```

4. 消费完可删除该决策文件

## 技术栈与目录

- 运行时：沙箱 node 22（绝对路径）；TS 经 **tsx** 直跑（免编译）
- web/：React 19 + Tailwind 4 + Vite 8（全部 @latest 安装），`npm run build` 出 dist 由服务端托管
- server/index.ts：express + ws + chokidar，单文件实现（事件读取/广播/产物扫描/决策落盘/静态托管）
- 本地 curl 测试记得 `--noproxy '*'`（沙箱代理会拦 localhost）

## 实测记录（2026-09-30）

- 决策往返 ✅：POST /api/decision → decisions/<id>.json → 自动生成 decision_resolved 事件
- 产物自动发现 ✅（隐藏目录已过滤）；事件流截断重置 ✅（内存历史同步清空）
- 页面：团队栏（头像=专家团真头像）+ 七段时间线 + 事件流 + markdown 精排/成片播放/图片预览 + 决策弹层
