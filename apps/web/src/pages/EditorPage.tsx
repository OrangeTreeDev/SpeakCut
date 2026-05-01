import { useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { EditorStatusStrip } from "../components/editor/EditorStatusStrip";
import { EditorTopBar } from "../components/editor/EditorTopBar";
import { InspectorPanel } from "../components/InspectorPanel";
import { PreviewPanel } from "../components/PreviewPanel";
import { SceneList } from "../components/SceneList";
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
  const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

  return (
    <main className="h-[100svh] overflow-hidden bg-[#121212] text-white">
      <div className="flex h-full min-w-0">
        <EditorSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <EditorTopBar
            apiOrigin={apiOrigin}
            exportUrl={exportUrl}
            isExporting={isExporting}
            isGenerating={isGenerating}
            onExport={() => void exportProject(project.project_id)}
          />
          <EditorStatusStrip project={project} isGenerating={isGenerating} isRefreshing={isRefreshing} />

          {error ? (
            <Card className="m-3 shrink-0 rounded-lg border-red-400/20 bg-red-500/8">
              <CardContent className="flex items-start gap-3 p-4 text-sm text-red-100">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>{error}</div>
              </CardContent>
            </Card>
          ) : null}

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
      </div>
    </main>
  );
}
