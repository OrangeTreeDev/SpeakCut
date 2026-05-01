import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, Download, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { InspectorPanel } from "../components/InspectorPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { SceneList } from "../components/SceneList";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useProjectStore } from "../store/projectStore";

export function EditorPage() {
  const { projectId = "" } = useParams();
  const {
    project,
    activeSceneIndex,
    error,
    exportUrl,
    exportProject,
    isExporting,
    isLoading,
    isRefreshing,
    loadProject,
    saveSceneText,
    setActiveSceneIndex,
    switchVideo,
    switchVoice,
    updateSubtitleStyle,
  } = useProjectStore();

  useEffect(() => {
    if (projectId) {
      void loadProject(projectId);
    }
  }, [loadProject, projectId]);

  useEffect(() => {
    if (!projectId || !project || !["generating", "regenerating", "regenerating_all"].includes(project.status)) {
      return;
    }
    const timer = window.setInterval(() => {
      void loadProject(projectId, { silent: true });
    }, 2500);
    return () => window.clearInterval(timer);
  }, [loadProject, project, projectId]);

  const activeScene = useMemo(
    () => project?.scenes.find((scene) => scene.index === activeSceneIndex),
    [activeSceneIndex, project],
  );
  const activeScenePosition = useMemo(
    () => project?.scenes.findIndex((scene) => scene.index === activeSceneIndex) ?? -1,
    [activeSceneIndex, project],
  );

  if (isLoading || !project) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">{error ?? "加载中..."}</main>;
  }

  const isGenerating = ["generating", "regenerating", "regenerating_all"].includes(project.status);
  const generatedSceneCount = project.scenes.length;
  const statusLabel =
    project.status === "ready"
      ? "已完成"
      : project.status === "failed"
        ? "生成失败"
        : project.status === "regenerating"
          ? "分镜更新中"
          : project.status === "regenerating_all"
            ? "全局重建中"
            : "生成中";
  const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

  return (
    <main className="h-[100svh] overflow-hidden px-3 py-3 md:px-5 md:py-5">
      <div className="mx-auto flex h-full max-w-[1760px] flex-col">
        <header className="workspace-shell mb-4 flex flex-wrap items-center justify-between gap-4 rounded-[1.85rem] border border-white/[0.07] px-5 py-4 md:px-6">
          <div className="flex items-center gap-8">
            <div>
              <div className="text-glow text-[2rem] font-semibold tracking-[-0.05em] text-[#d7bcff]">SpeakCut</div>
            </div>
            <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
              <Link to="/" className="transition hover:text-foreground">
                首页
              </Link>
              <span className="font-medium text-foreground">项目</span>
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="outline" className="border-white/[0.07] bg-white/[0.04] text-white/80">
              项目 {project.project_id}
            </Badge>
            <Badge
              variant={project.status === "failed" ? "destructive" : project.status === "ready" ? "secondary" : "default"}
              className="gap-2 border border-white/[0.06]"
            >
              <span className="status-dot size-2 rounded-full bg-current opacity-80" />
              {statusLabel}
            </Badge>
            {isRefreshing ? (
              <Badge variant="outline" className="border-white/[0.07] bg-white/[0.04] text-white/80">
                <RefreshCw className="mr-1 size-3 animate-spin" />
                刷新中
              </Badge>
            ) : null}
            {exportUrl ? (
              <Button asChild variant="outline" size="sm" className="border-white/[0.08] bg-white/[0.04]">
                <a href={`${apiOrigin}${exportUrl}`} target="_blank" rel="noreferrer">
                  下载成片
                </a>
              </Button>
            ) : null}
            <Button size="sm" disabled={isGenerating || isExporting} className="min-w-[112px]" onClick={() => void exportProject(project.project_id)}>
              {isExporting ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isExporting ? "导出中" : "导出项目"}
            </Button>
          </div>
        </header>

        {error ? (
          <Card className="mb-4 border-red-400/20 bg-red-500/8">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-red-100">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>{error}</div>
            </CardContent>
          </Card>
        ) : null}

        <section className="workspace-shell grid min-h-0 flex-1 gap-3 overflow-hidden rounded-[2rem] border border-white/[0.07] p-3 xl:grid-cols-[300px_minmax(0,1fr)_332px]">
          <SceneList
            scenes={project.scenes}
            activeSceneIndex={activeSceneIndex}
            isGenerating={isGenerating}
            onSelect={setActiveSceneIndex}
            onSaveText={(sceneIndex, text) => saveSceneText(project.project_id, sceneIndex, text)}
          />
          <div className="flex h-full min-h-0 flex-col gap-3">
            <Card className="surface-divider overflow-hidden rounded-[1.6rem] border-white/[0.06] bg-transparent">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-primary/12 text-primary">
                    {project.status === "failed" ? <AlertTriangle className="size-4" /> : <Wand2 className="size-4" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {project.status === "failed" ? "生成被中断" : isGenerating ? "渐进式生成中" : "项目已可编辑"}
                      </p>
                      <span className="text-xs uppercase tracking-[0.22em] text-white/35">Workspace</span>
                    </div>
                    <p className="max-w-2xl text-sm text-muted">
                      {generatedSceneCount} 个分镜已装载，当前画布比例为 {project.aspect_ratio}。
                    </p>
                    <p className="max-w-2xl text-sm text-muted">
                      {project.status === "failed"
                        ? "保留当前项目状态，便于排查失败镜头和局部重试。"
                        : isGenerating
                          ? "页面会自动刷新，左侧分镜和中央预览会持续更新。"
                          : "当前项目已稳定，可直接替换素材、调整字幕样式并导出。"}
                    </p>
                    {project.status === "failed" && project.error_message ? (
                      <p className="max-w-2xl text-sm text-red-200">失败原因：{project.error_message}</p>
                    ) : null}
                  </div>
                </div>
                {!isGenerating ? (
                  <Badge variant="secondary" className="bg-white/[0.06] text-white">
                    <Sparkles className="mr-1 size-3" />
                    Ready
                  </Badge>
                ) : null}
              </CardContent>
            </Card>

            <PreviewPanel
              scene={activeScene}
              aspectRatio={project.aspect_ratio}
              isGenerating={isGenerating}
              subtitleStyle={project.subtitle_style}
              canGoPrevious={activeScenePosition > 0}
              canGoNext={activeScenePosition >= 0 && activeScenePosition < project.scenes.length - 1}
              onPreviousScene={() => {
                const previousScene = project.scenes[activeScenePosition - 1];
                if (previousScene) {
                  setActiveSceneIndex(previousScene.index);
                }
              }}
              onNextScene={() => {
                const nextScene = project.scenes[activeScenePosition + 1];
                if (nextScene) {
                  setActiveSceneIndex(nextScene.index);
                }
              }}
            />
          </div>
          <InspectorPanel
            project={project}
            scene={activeScene}
            isGenerating={isGenerating}
            onSwitchVideo={(sceneIndex, videoId) => switchVideo(project.project_id, sceneIndex, videoId)}
            onUpdateSubtitle={(style) => updateSubtitleStyle(project.project_id, style)}
            onSwitchVoice={(voiceId) => switchVoice(project.project_id, voiceId)}
          />
        </section>
      </div>
    </main>
  );
}
