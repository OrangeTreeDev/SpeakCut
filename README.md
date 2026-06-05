# SpeakCut

SpeakCut 是一个面向短视频创作的 MVP：输入一段旁白，系统自动拆分分镜、检索真实视频素材、生成配音与字幕时间轴，并通过 FFmpeg 导出成片。它适合快速制作信息流短视频、口播解说、新闻摘要和知识类视频原型。

## 项目定位

SpeakCut 不是传统时间线剪辑软件，而是“文本到可编辑短视频”的生成式工作台。

- Token 用量小：LLM 主要负责旁白理解、分镜规划和素材检索词生成，视频渲染、字幕排布、素材缓存等确定性工作交给本地服务完成。
- 真实素材：优先使用 Pexels 等真实视频素材，避免纯生成画面带来的质感不稳定和事实表达风险。
- 轻松编辑：生成后仍保留分镜、素材、字幕、音频等结构化数据，用户可以逐镜替换素材、预览和导出。

## 产品界面

![首页：输入旁白并一键成片](assets/illustrate/screenshot/home.png)

![编辑器：分镜轨道、竖屏预览、素材替换](assets/illustrate/screenshot/editor1.png)

![项目库：查看生成状态、封面和时长](assets/illustrate/screenshot/project.png)

## 产品功能

- 文本成片：输入 narration text，选择比例和配音音色，创建生成任务。
- 自动分镜：LLM 将旁白拆成可剪辑场景，生成画面描述、素材关键词和场景时长。
- 素材匹配：按分镜检索真实视频候选，保留候选列表，支持在编辑器中替换。
- 配音生成：使用 `edge-tts` 生成逐场景音频，并读取词级边界用于字幕。
- 字幕时间轴：根据 TTS word boundary 构建场景字幕和全局 timeline。
- 可视化编辑：左侧分镜轨道，中间竖屏预览，右侧素材/字幕/音频检查面板。
- 后台导出：提交导出任务后立即返回 `export_id`，前端轮询导出状态。
- 静态文件服务：生成音频、下载素材、最终导出文件统一存放在 `storage` 并通过 `/static` 访问。

## 技术设计

![系统架构图](assets/illustrate/tech/architecture_diagram.png)

前端位于 `apps/web`，使用 React 18、TypeScript、Vite、Zustand、Radix UI primitives 和 lucide-react。页面保持轻量，主要负责编排路由、状态和组件；API 调用集中在 `apps/web/src/lib/api.ts`，项目状态集中在 `apps/web/src/store/projectStore.ts`。

后端位于 `apps/api`，使用 FastAPI、SQLAlchemy 和 SQLite。`api/routes.py` 提供项目、编辑、导出接口；`ProjectService` 管理项目生命周期；LLM、Pexels、TTS、timeline、renderer 等能力拆分在 `app/services` 下。

![生成与导出时序图](assets/illustrate/tech/video_generated_timing_diagram.png)

生成链路：

1. 前端提交文本、比例和音色，后端创建 `Project(status="generating")`。
2. 后台任务调用 LLM 生成分镜结构，并缓存分析结果。
3. 每个分镜并行完成素材候选检索、TTS 音频生成、字幕时间轴构建。
4. 项目写入 `Scene`、全局 timeline、音频路径、候选素材和状态。
5. 导出时创建 `ExportJob(status="queued")`，后台下载缺失素材。
6. renderer 使用 FFmpeg 逐场景渲染视频、音频和 ASS 字幕，再 concat 为最终 MP4。

核心原则：

- 长任务后台化：生成和导出不阻塞请求线程。
- 渲染 FFmpeg 化：避免一次性把所有场景视频载入内存。
- 数据结构化：项目、分镜、导出任务落库，媒体文件落盘。

## 启动方式

前置依赖：Python 3.11+、Node.js、npm、FFmpeg。

配置环境变量：

```bash
# 可放在 .env、.env.local、apps/api/.env* 或 apps/web/.env.local
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
PEXELS_API_KEY=
PIXABAY_API_KEY=
FFMPEG_BINARY=ffmpeg
SUBTITLE_FONT_PATH=
WEB_ORIGIN=http://127.0.0.1:5173
```

安装依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/api/requirements.txt
npm install
```

启动服务：

```bash
make api
make web
```

默认地址：

- 后端：`http://127.0.0.1:8000`
- 前端：`http://127.0.0.1:5173`

常用检查：

```bash
make test-api
make test-web
make lint-web
```

## Agent Skill 安装

SpeakCut skill 遵循 Agent Skills 标准目录结构：`skills/speakcut-video/SKILL.md`。推送到 GitHub 后，可以像 Vercel skills 一样安装：

```bash
npx skills add https://github.com/OrangeTreeDev/SpeakCut --skill speakcut-video
```

Skill 会调用 npm CLI：

```bash
npx speak-cut healthcheck
npx speak-cut generate --text "输入一段旁白文本" --export
```

要让外部用户安装后直接运行成功，需要先发布 `packages/speak-cut` 到 npm，使 `npx speak-cut` 可用。

## 迭代计划

- 生成级重构：把分镜规划、素材选择、字幕策略、失败恢复拆成可观测的生成阶段，支持局部重试。
- Vercel 部署：前端接入 Vercel，后端保持独立服务，补齐跨域、静态资源和导出下载配置。
- Skill 支持：为生成策略、素材检索、字幕样式、导出参数提供agent skill。
- 视频自动剪辑：基于镜头内容和脚本文案自动裁剪、排序、转场和重定时。
- 本地模型支持：桌面化，内置本地小模型，降低外部LLM服务依赖。
