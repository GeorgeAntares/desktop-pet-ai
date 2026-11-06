# 桌宠

一个常驻在 Windows 桌面上的透明桌宠。复制文字后，它可以总结或翻译，并把结果流式写在气泡里。

AI 部分分成四块，方便看出模型是怎么接进来的：

- **Provider**：同一套 Chat Completions 流，本地走 Ollama，云端走任何 OpenAI 兼容接口。默认云端是 xAI，`https://api.x.ai/v1`，模型 `grok-4.7`。
- **Prompt**：`prompts/*.json` 里用 `{{text}}`、`{{style}}`、`{{target_lang}}`。设置里改过的模板保存在本机，不覆盖默认文件。
- **路由**：自动模式下，Ollama 可达且文本不超过 500 字走本地，否则走云端。指定的一侧不可用时换另一侧。
- **记忆**：记住翻译目标语言、总结风格，以及最近 5 次成功请求。

## 开发

```bash
npm install
npm run dev
```

窗口出现在右下角，可以拖动。托盘图标可以显示、隐藏或退出。复制一段文字会弹出「总结 / 翻译 / 忽略」。`Ctrl+Shift+Space` 会用当前剪贴板再打开一次菜单。

```bash
npm test
npm run typecheck
npm run build
```

## 配置模型

第一次打开、并且本地和云端都还没接上时，会直接弹出配置。本地显示「可达」或「不可达」，云端显示「已配置」「未配置」「密钥无效」或「未连通」。点「重新检测」会按当前表单再查一次，不必先保存。

云端密钥可以写在设置里，也可以放在 `.env`：

```bash
XAI_API_KEY=你的密钥
```

程序会按这个顺序查找 `.env`：当前工作目录、安装目录、`%APPDATA%\desktop-pet-ai\.env`。从 `release\win-unpacked\桌宠.exe` 启动时，还会再看项目根目录。设置里保存的密钥优先于环境变量，并且只留在本机，不会打包进仓库。把 Base URL 改成别的服务，就可以换成 DeepSeek、Kimi 或其他 OpenAI 兼容接口。

本地模型需要先启动 [Ollama](https://ollama.com/)，并拉好设置里填写的模型，默认是 `qwen2.5:7b`：

```bash
ollama pull qwen2.5:7b
```

没有密钥、也没有 Ollama 时，桌宠会进入错误状态，并说明该怎么配置。

## 打包

```bash
npm run dist
```

安装包在 `release/桌宠 Setup 0.1.0.exe`，免安装目录在 `release/win-unpacked/`。包没有代码签名，Windows 可能会提示未知发布者。
