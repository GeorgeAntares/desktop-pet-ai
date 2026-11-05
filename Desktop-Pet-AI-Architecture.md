# Desktop Pet AI — 项目架构与开发规划

> 一个以桌面宠物为交互入口、支持本地与云端模型的剪贴板快速总结/翻译工具。  
> 目标：在保持功能简单的同时，体现对 AI 模型接入、Prompt 工程、路由与体验的理解。

## 1. 项目定位

- **桌面宠物**：透明、可拖动、带创意动画的常驻助手。
- **核心场景**：复制文本后快速总结或翻译。
- **模型支持**：本地（Ollama）+ 云端 API（OpenAI 兼容，如 DeepSeek、Kimi 等）。
- **设计原则**：
  - 功能保持简单，动画与交互可发挥创意。
  - AI 核心层设计清晰，便于展示对模型、Prompt、路由的理解。
  - 全 TypeScript，降低开发门槛。

## 2. 整体架构

```text
┌─────────────────────────────────────────────┐
│                 Electron 主进程              │
│  ┌─────────────┐  ┌──────────────────────┐  │
│  │ 窗口管理     │  │ 剪贴板监听 + 热键     │  │
│  │ (透明桌宠)   │  │                      │  │
│  └─────────────┘  └──────────────────────┘  │
│  ┌─────────────────────────────────────────┐│
│  │           AI 核心层（重点）              ││
│  │  • Provider 抽象（Ollama / API）         ││
│  │  • Prompt 管理与版本                     ││
│  │  • 智能路由（本地/云端）                 ││
│  │  • 流式输出 + 记忆                       ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
                      │ IPC
┌─────────────────────────────────────────────┐
│              渲染进程（前端）                 │
│  • 桌宠动画（Lottie / CSS / Canvas）         │
│  • 操作菜单（总结 / 翻译 / 忽略）            │
│  • 结果气泡 / 小窗口                         │
│  • 设置面板（模型、Prompt、偏好）            │
└─────────────────────────────────────────────┘
```

## 3. 技术选型

| 层级 | 选择 | 原因 |
|------|------|------|
| 桌面框架 | Electron | 全 TypeScript，剪贴板、透明窗口、托盘成熟 |
| 前端 | React + TypeScript | 动画与交互开发效率高 |
| 动画 | Lottie（优先）或 CSS/Canvas | 创意空间大，易于替换素材 |
| 模型调用 | TypeScript 封装 | 统一 Ollama 与 OpenAI 兼容接口 |
| 状态管理 | Zustand 或 React Context | 轻量即可 |
| 构建 | electron-vite 或 electron-forge | 开发体验好 |

## 4. 目录结构

```text
desktop-pet-ai/
├── electron/                  # 主进程
│   ├── main.ts                # 入口、窗口创建
│   ├── clipboard.ts           # 剪贴板监听
│   ├── shortcut.ts            # 全局热键
│   └── ai/                    # AI 核心（重点）
│       ├── provider.ts        # Provider 抽象接口
│       ├── ollama.ts          # 本地实现
│       ├── openai-compat.ts   # 云端实现
│       ├── router.ts          # 智能路由
│       ├── prompt.ts          # Prompt 管理
│       └── memory.ts          # 轻量记忆
├── src/                       # 渲染进程（前端）
│   ├── components/
│   │   ├── Pet.tsx            # 桌宠主体 + 动画
│   │   ├── ActionMenu.tsx     # 总结/翻译菜单
│   │   ├── ResultBubble.tsx   # 结果展示
│   │   └── Settings.tsx       # 设置面板
│   ├── hooks/
│   └── App.tsx
├── prompts/                   # 可配置 Prompt 模板
│   ├── summarize.json
│   └── translate.json
├── assets/                    # 动画资源（Lottie 等）
├── package.json
└── README.md
```

## 5. 核心模块设计

### 5.1 Provider 抽象

统一本地与云端调用接口，便于切换和扩展。

```ts
interface AIProvider {
  id: string;
  name: string;
  chat(messages: Message[], options?: ChatOptions): AsyncIterable<string>;
  // 或返回 Promise + 流式回调
}
```

- `OllamaProvider`：调用 `http://localhost:11434/v1`
- `OpenAICompatProvider`：支持 DeepSeek、Kimi 等

### 5.2 智能路由

根据条件选择 Provider：

- 用户强制指定
- 文本长度（短文本优先本地）
- 网络状态
- 模型可用性

### 5.3 Prompt 管理

- Prompt 以 JSON 存储，支持编辑与版本。
- 支持变量插值（如 `{{text}}`、`{{target_lang}}`）。
- 可在设置面板中修改并即时生效。

示例结构：

```json
{
  "id": "summarize",
  "name": "总结",
  "version": 1,
  "template": "请用简洁的中文总结以下内容，保留关键信息：\n\n{{text}}"
}
```

### 5.4 流式输出与中断

- 主进程通过 IPC 将 token 流式推送到前端。
- 前端可随时发送中断信号。

### 5.5 轻量记忆

- 记住常用目标语言、偏好的总结风格等。
- 使用本地 JSON 或 electron-store 持久化。

### 5.6 桌宠状态与动画

建议状态机：

| 状态 | 触发 | 动画表现 |
|------|------|----------|
| idle | 默认 | 待机动画 |
| thinking | 正在调用模型 | 思考/加载动画 |
| success | 结果返回 | 完成反馈 |
| error | 调用失败 | 错误提示 |

## 6. 最小可行版本（MVP）

1. Electron 透明无边框窗口 + 基础桌宠形象。
2. 剪贴板监听，复制后弹出「总结 / 翻译 / 忽略」菜单。
3. Provider 抽象，先支持 Ollama + 一个云端模型。
4. 总结和翻译两个基础 Prompt。
5. 结果以气泡形式展示，支持流式输出。
6. 简单设置面板（切换模型、编辑 Prompt、常用语言）。

## 7. 后续可扩展方向

- 更多 Prompt 模板（润色、解释代码、提取要点等）。
- 用户反馈收集，用于 Prompt 迭代。
- 多角色/多皮肤桌宠。
- 简单的对话上下文（基于当前剪贴板内容追问）。
- 插件化 Prompt 或自定义动作。

## 8. 开发建议

- 优先完成 AI 核心层（Provider + Prompt + 路由），再完善桌宠动画。
- 动画素材可先用占位，后期替换为更有创意的 Lottie。
- 使用 AI 编程助手辅助实现 Electron 窗口、IPC 和流式处理等样板代码。
- 保持模块边界清晰，便于后续替换前端框架或增加新 Provider。

---

**文档版本**：v0.1  
**更新日期**：2026-11-05
