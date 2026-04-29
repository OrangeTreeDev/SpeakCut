import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import type { Scene } from "../lib/types";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";

interface SceneListProps {
  scenes: Scene[];
  activeSceneIndex: number;
  isGenerating: boolean;
  onSelect: (sceneIndex: number) => void;
  onSaveText: (sceneIndex: number, text: string) => Promise<void>;
}

export function SceneList({ scenes, activeSceneIndex, isGenerating, onSelect, onSaveText }: SceneListProps) {
  const [editingSceneIndex, setEditingSceneIndex] = useState<number | null>(null);
  const [draftText, setDraftText] = useState("");

  useEffect(() => {
    if (editingSceneIndex === null) {
      return;
    }
    const editingScene = scenes.find((scene) => scene.index === editingSceneIndex);
    setDraftText(editingScene?.text ?? "");
  }, [editingSceneIndex, scenes]);

  async function commitEdit(sceneIndex: number) {
    const scene = scenes.find((item) => item.index === sceneIndex);
    if (!scene) {
      setEditingSceneIndex(null);
      return;
    }

    const nextText = draftText.trim();
    if (!nextText || nextText === scene.text) {
      setEditingSceneIndex(null);
      setDraftText(scene.text);
      return;
    }

    await onSaveText(sceneIndex, nextText);
    setEditingSceneIndex(null);
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
    <aside className="panel-surface flex h-full min-h-0 flex-col rounded-[1.65rem] border border-white/[0.05] p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-white">分镜轨道</h2>
          <p className="text-sm text-muted">双击文案即可编辑，当前镜头会同步到中央预览</p>
        </div>
        <Badge variant="outline" className="border-white/[0.07] bg-white/[0.04]">
          {scenes.length} 镜
        </Badge>
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="space-y-3">
          {scenes.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/10 p-5">
              <strong className="block text-sm font-medium text-white">{isGenerating ? "正在拆分分镜" : "还没有分镜"}</strong>
              <p className="mt-2 text-sm leading-6 text-muted">
                {isGenerating ? "分析脚本后，分镜会逐个出现。你可以先保持页面打开，状态会自动刷新。" : "创建项目后，分镜会显示在这里。"}
              </p>
            </div>
          ) : null}

          {scenes.map((scene) => {
            const isActive = activeSceneIndex === scene.index;
            const isEditing = editingSceneIndex === scene.index;

            return (
              <section
                key={scene.index}
                className={cn(
                  "rounded-[1.45rem] border p-4 transition duration-200",
                  isActive
                    ? "border-primary/28 bg-[linear-gradient(180deg,rgba(38,24,58,0.98),rgba(24,16,38,0.98))] shadow-[0_20px_40px_rgba(5,3,14,0.28)]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]",
                )}
              >
                <button type="button" className="mb-3 flex w-full items-center justify-between gap-3 text-left" onClick={() => onSelect(scene.index)}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted">Scene {String(scene.index + 1).padStart(2, "0")}</span>
                    {isActive ? <span className="rounded-full bg-primary/12 px-2 py-1 text-[10px] font-medium text-primary">当前</span> : null}
                  </div>
                  <span className="text-xs text-[#78d0ff]">{scene.duration_ms > 0 ? `00:${String(Math.ceil(scene.duration_ms / 1000)).padStart(2, "0")}` : "生成中"}</span>
                </button>

                {scene.selected_video ? (
                  <button type="button" className="mb-3 block w-full overflow-hidden rounded-[1.1rem] border border-white/[0.04]" onClick={() => onSelect(scene.index)}>
                    <img
                      src={scene.selected_video.thumbnail}
                      alt={`分镜 ${scene.index + 1} 封面`}
                      className="aspect-[16/10] w-full object-cover transition duration-300 hover:scale-[1.02]"
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="editor-grid mb-3 grid aspect-[16/10] w-full place-items-center rounded-[1rem] border border-dashed border-white/10 bg-black/12 text-xs text-muted"
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
                    className="min-h-32 resize-none border-white/10 bg-white/4 text-sm leading-7"
                  />
                ) : (
                  <button
                    type="button"
                    className="block w-full rounded-[1rem] text-left text-sm leading-7 text-white/92 outline-none transition hover:text-white"
                    onClick={() => onSelect(scene.index)}
                    onDoubleClick={() => {
                      setEditingSceneIndex(scene.index);
                      setDraftText(scene.text);
                    }}
                  >
                    {scene.text}
                  </button>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>{scene.audio_url ? "音频就绪" : "音频生成中"}</span>
                    {isActive && !isGenerating ? (
                      <span className="inline-flex items-center gap-1 text-[#d2b4ff]">
                        <Sparkles className="size-3" />
                        已锁定
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      title="当前版本暂未接入单分镜音色更新接口"
                      className="h-8 rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs"
                    >
                      更新音色
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      title="当前版本暂未接入删除分镜接口"
                      className="h-8 rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs"
                    >
                      删除分镜
                    </Button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </ScrollArea>
    </aside>
  );
}
