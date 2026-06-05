import { useMemo, useState } from "react";
import { Download, FileJson, Lock } from "lucide-react";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { PreviewPanel } from "../components/PreviewPanel";
import { SceneList } from "../components/SceneList";
import { Badge } from "../components/ui/badge";
import type { Project } from "../lib/types";

interface StaticPreviewPageProps {
  project: Project;
}

export function StaticPreviewPage({ project }: StaticPreviewPageProps) {
  const [activeSceneIndex, setActiveSceneIndex] = useState(project.scenes[0]?.index ?? 0);
  const activeScenePosition = useMemo(
    () => project.scenes.findIndex((scene) => scene.index === activeSceneIndex),
    [activeSceneIndex, project.scenes],
  );
  const activeScene = project.scenes[activeScenePosition];

  return (
    <main className="h-[100svh] overflow-hidden bg-[#121212] text-white">
      <div className="flex h-full min-w-0">
        <EditorSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#121212] px-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="truncate text-xl font-bold">SpeakCut 静态预览</h1>
                <Badge className="gap-1 rounded-full border-white/10 bg-white/8 text-zinc-200">
                  <Lock className="size-3" />
                  只读
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm text-zinc-400">
                {project.project_id} · {project.scenes.length} 个分镜 · {Math.round(project.total_duration_ms / 1000)}s
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-3 text-xs text-zinc-400">
              {project.project_file ? (
                <span className="hidden max-w-[260px] items-center gap-2 truncate rounded-full bg-[#1f1f1f] px-3 py-2 md:flex">
                  <FileJson className="size-3.5 shrink-0" />
                  <span className="truncate">{project.project_file}</span>
                </span>
              ) : null}
              {project.export_file ? (
                <span className="hidden max-w-[260px] items-center gap-2 truncate rounded-full bg-[#1f1f1f] px-3 py-2 lg:flex">
                  <Download className="size-3.5 shrink-0" />
                  <span className="truncate">{project.export_file}</span>
                </span>
              ) : null}
            </div>
          </header>
          <section className="grid min-h-0 flex-1 overflow-hidden bg-[#121212] md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            <SceneList
              scenes={project.scenes}
              activeSceneIndex={activeSceneIndex}
              isGenerating={false}
              readOnly
              onSelect={setActiveSceneIndex}
              onSaveText={async () => undefined}
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
            <aside className="hidden h-full min-h-0 border-l border-white/[0.05] bg-[#121212] xl:block">
              <div className="h-20 border-b border-white/[0.05] bg-[#181818] px-5 py-5">
                <h2 className="text-lg font-bold">项目信息</h2>
              </div>
              <div className="space-y-5 p-5 text-sm text-zinc-300">
                <section>
                  <strong className="mb-2 block text-white">修改方式</strong>
                  <p className="leading-6 text-zinc-400">此页面不写入本地文件。需要修改时，把调整建议告诉 agent，由 Skill 通过 CLI patch 更新项目并重新生成预览。</p>
                </section>
                <section>
                  <strong className="mb-2 block text-white">当前分镜</strong>
                  <p className="leading-6 text-zinc-400">{activeScene?.text ?? "无"}</p>
                </section>
                {activeScene?.timeline?.subtitles?.length ? (
                  <section>
                    <strong className="mb-2 block text-white">字幕片段</strong>
                    <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
                      {activeScene.timeline.subtitles.map((subtitle) => (
                        <div key={`${subtitle.start_ms}-${subtitle.end_ms}-${subtitle.text}`} className="rounded bg-[#1f1f1f] p-3">
                          <div className="mb-1 font-mono text-xs text-zinc-500">
                            {subtitle.start_ms}ms - {subtitle.end_ms}ms
                          </div>
                          <div className="leading-6">{subtitle.text}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
