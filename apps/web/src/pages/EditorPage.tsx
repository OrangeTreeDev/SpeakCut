import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AlertTriangle, X } from "lucide-react";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { GenerationInProgressState } from "../components/editor/GenerationInProgressState";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { GenerationFailedState } from "../components/editor/GenerationFailedState";
import { ProjectLoadingState } from "../components/editor/ProjectLoadingState";
import { InspectorPanel } from "../components/InspectorPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { SceneList } from "../components/SceneList";
import { Card, CardContent } from "../components/ui/card";
import { useProjectStore } from "../store/projectStore";

export function EditorPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const [isErrorBannerVisible, setIsErrorBannerVisible] = useState(false);
  const {
    project,
    activeSceneIndex,
    error,
    exportUrl,
    exportProject,
    isExporting,
    isLoading,
    loadProject,
    regenerateProject,
    saveSceneText,
    setActiveSceneIndex,
    switchVideo,
    switchVideoAsset,
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

  useEffect(() => {
    if (!error) {
      setIsErrorBannerVisible(false);
      return;
    }
    setIsErrorBannerVisible(true);
    const timer = window.setTimeout(() => setIsErrorBannerVisible(false), 1000);
    return () => window.clearTimeout(timer);
  }, [error]);

  const activeScene = useMemo(
    () => project?.scenes.find((scene) => scene.index === activeSceneIndex),
    [activeSceneIndex, project],
  );
  const activeScenePosition = useMemo(
    () => project?.scenes.findIndex((scene) => scene.index === activeSceneIndex) ?? -1,
    [activeSceneIndex, project],
  );
  const locationState = (location.state as { entryMode?: string; projectStatus?: string } | null) ?? null;
  const isCreateEntry = locationState?.entryMode === "create";
  const initialProjectStatus = locationState?.projectStatus;
  const isInitialGenerating =
    !project &&
    !error &&
    (isCreateEntry || ["generating", "regenerating", "regenerating_all"].includes(initialProjectStatus ?? ""));

  if (isLoading || !project) {
    return error ? (
      <main className="grid min-h-screen place-items-center text-sm text-muted">{error}</main>
    ) : isInitialGenerating ? (
      <GenerationInProgressState />
    ) : (
      <ProjectLoadingState />
    );
  }

  const isGenerating = ["generating", "regenerating", "regenerating_all"].includes(project.status);
  const isProjectFailed = project.status === "failed";
  const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
  return (
    <main className="h-[100svh] overflow-hidden bg-[#121212] text-white">
      <div className="flex h-full min-w-0">
        <EditorSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorTopBar
            apiOrigin={apiOrigin}
            exportUrl={exportUrl}
            projectStatus={project.status}
            isExporting={isExporting}
            isGenerating={isGenerating}
            onExport={() => void exportProject(project.project_id)}
          />

          {error && isErrorBannerVisible ? (
            <Card className="shadow-[0_0_24px_rgba(0,0,0,0.5)] m-3 shrink-0 rounded-lg border-red-400/20 bg-red-500/8">
              <CardContent className="flex items-start gap-3 p-4 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">{error}</div>
                <button
                  type="button"
                  className="-m-1 grid size-7 shrink-0 place-items-center rounded text-red-100 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setIsErrorBannerVisible(false)}
                  aria-label="关闭错误提示"
                >
                  <X className="size-4" />
                </button>
              </CardContent>
            </Card>
          ) : null}

          {isProjectFailed ? (
            <GenerationFailedState errorMessage={project.error_message} onRetry={() => void regenerateProject(project.project_id)} />
          ) : isGenerating ? (
            <GenerationInProgressState />
          ) : (
            <section className="grid min-h-0 flex-1 overflow-hidden bg-[#121212] md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
              <SceneList
                scenes={project.scenes}
                activeSceneIndex={activeSceneIndex}
                isGenerating={isGenerating}
                onSelect={setActiveSceneIndex}
                onSaveText={(sceneIndex, text) => saveSceneText(project.project_id, sceneIndex, text)}
              />
              <PreviewPanel
                scene={activeScene}
                aspectRatio={project.aspect_ratio}
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
              <InspectorPanel
                project={project}
                scene={activeScene}
                isGenerating={isGenerating}
                onSwitchVideo={(sceneIndex, videoId) => switchVideo(project.project_id, sceneIndex, videoId)}
                onSwitchVideoAsset={(sceneIndex, video) => switchVideoAsset(project.project_id, sceneIndex, video)}
                onUpdateSubtitle={(style) => updateSubtitleStyle(project.project_id, style)}
                onSwitchVoice={(voiceId) => switchVoice(project.project_id, voiceId)}
              />
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
