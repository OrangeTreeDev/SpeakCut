import { Filter } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import type { Scene } from "../lib/types";
import { cn } from "../lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";

interface SceneListProps {
  scenes: Scene[];
  activeSceneIndex: number;
  isGenerating: boolean;
  readOnly?: boolean;
  onSelect: (sceneIndex: number) => void;
  onSaveText: (sceneIndex: number, text: string) => Promise<void>;
}

export function SceneList({ scenes, activeSceneIndex, isGenerating, readOnly = false, onSelect, onSaveText }: SceneListProps) {
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");
  const [showFailedOnly, setShowFailedOnly] = useState(false);
  const failedSceneCount = scenes.filter((scene) => !scene.selected_video || !scene.audio_url).length;
  const visibleScenes = showFailedOnly ? scenes.filter((scene) => !scene.selected_video || !scene.audio_url) : scenes;

  async function persistSceneText(sceneIndex: number, text: string) {
    const scene = scenes.find((item) => item.index === sceneIndex);
    if (!scene) {
      return;
    }

    const nextText = text.trim();
    if (!nextText || nextText === scene.text) {
      return;
    }

    await onSaveText(sceneIndex, nextText);
  }

  async function commitEdit(sceneIndex: number) {
    try {
      await persistSceneText(sceneIndex, draftText);
    } catch {
      const scene = scenes.find((item) => item.index === sceneIndex);
      setDraftText(scene?.text ?? "");
    }
    setEditingSceneIndex(null);
  }

  function beginEdit(scene: Scene) {
    if (readOnly) {
      return;
    }
    setEditingSceneIndex(scene.index);
    setDraftText(scene.text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, sceneIndex: number) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void commitEdit(sceneIndex);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      const scene = scenes.find((item) => item.index === sceneIndex);
      setDraftText(scene?.text ?? "");
      setEditingSceneIndex(null);
    }
  }

  return (
    <aside className="hidden h-full min-h-0 flex-col border-r border-white/[0.05] bg-[#121212] md:flex">
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#181818] px-5">
        <h2 className="text-xl font-bold text-white">分镜轨道</h2>
        <button
          type="button"
          className={cn(
            "grid size-10 place-items-center rounded-full bg-[#1f1f1f] transition hover:bg-zinc-800 hover:text-white",
            showFailedOnly ? "text-[#1ed760]" : "text-zinc-400",
          )}
          onClick={() => setShowFailedOnly((current) => !current)}
          title={showFailedOnly ? "显示全部分镜" : `筛选失败分镜${failedSceneCount ? `（${failedSceneCount}）` : ""}`}
          aria-label={showFailedOnly ? "显示全部分镜" : "筛选失败分镜"}
        >
          <Filter className="size-4" />
        </button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {scenes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 bg-[#181818] p-5">
              <strong className="block text-sm font-medium text-white">{isGenerating ? "正在拆分分镜" : "还没有分镜"}</strong>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isGenerating ? "分析脚本后，分镜会逐个出现。你可以先保持页面打开，状态会自动刷新。" : "创建项目后，分镜会显示在这里。"}
              </p>
            </div>
          ) : null}

          {showFailedOnly && scenes.length > 0 && visibleScenes.length === 0 ? (
            <div className="rounded-lg bg-[#181818] p-5 text-sm text-zinc-400">当前没有失败分镜。</div>
          ) : null}

          {visibleScenes.map((scene) => {
            const isActive = activeSceneIndex === scene.index;
            const isEditing = editingSceneIndex === scene.index;
            const isFailed = !scene.selected_video || !scene.audio_url;

            return (
              <section
                key={scene.index}
                className={cn(
                  "rounded-lg border-l-2 p-3 transition duration-200",
                  isActive
                    ? "border-l-[#1ed760] border-y-transparent border-r-transparent bg-[#181818] shadow-[0_0_18px_rgba(0,0,0,0.28)]"
                    : "border-l-transparent border-y-transparent border-r-transparent bg-[#181818] hover:bg-[#252525]",
                )}
              >
                <button type="button" className="mb-3 flex w-full items-center justify-between gap-3 text-left" onClick={() => onSelect(scene.index)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-[1.5px] text-zinc-400">分镜 {String(scene.index + 1).padStart(2, "0")}</span>
                    {isActive ? <span className="rounded-full bg-[#1ed760]/12 px-2 py-0.5 text-[10px] font-bold text-[#1ed760]">当前</span> : null}
                    {isFailed ? <span className="rounded-full bg-[#f3727f]/12 px-2 py-0.5 text-[10px] font-bold text-[#f3727f]">失败</span> : null}
                  </div>
                  <span className="rounded-full bg-[#1f1f1f] px-2 py-0.5 font-mono text-[11px] text-zinc-300">
                    {scene.duration_ms > 0 ? `00:00 - 00:${String(Math.ceil(scene.duration_ms / 1000)).padStart(2, "0")}` : "生成中"}
                  </span>
                </button>

                {scene.selected_video ? (
                  <button type="button" className="mb-3 block w-full overflow-hidden rounded border border-white/[0.04]" onClick={() => onSelect(scene.index)}>
                    <img
                      src={scene.selected_video.thumbnail}
                      alt={`分镜 ${scene.index + 1} 封面`}
                      className={cn("aspect-video w-full object-cover transition duration-300 hover:scale-[1.02]", isActive ? "opacity-85 hover:opacity-100" : "opacity-65 hover:opacity-100")}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="mb-3 grid aspect-video w-full place-items-center rounded border border-dashed border-white/10 bg-[#1f1f1f] text-xs text-zinc-500"
                    onClick={() => onSelect(scene.index)}
                  >
                    素材封面生成中
                  </button>
                )}

                {isEditing ? (
                  <Textarea
                    id={`scene-text-${scene.index}`}
                    name={`scene-text-${scene.index}`}
                    aria-label={`分镜 ${scene.index + 1} 文案`}
                    value={draftText}
                    disabled={isGenerating}
                    onChange={(event) => setDraftText(event.currentTarget.value)}
                    onBlur={() => void commitEdit(scene.index)}
                    onKeyDown={(event) => handleKeyDown(event, scene.index)}
                    rows={5}
                    autoFocus
                    className="min-h-32 resize-none rounded border-white/10 bg-[#1f1f1f] text-sm leading-7 text-white"
                  />
                ) : (
                  <button
                    type="button"
                    className={cn("block w-full rounded text-left text-sm leading-6 outline-none transition hover:text-white", isActive ? "text-zinc-100" : "text-zinc-400")}
                    onClick={() => onSelect(scene.index)}
                    onDoubleClick={() => {
                      if (!readOnly) {
                        beginEdit(scene);
                      }
                    }}
                  >
                    {scene.text}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
