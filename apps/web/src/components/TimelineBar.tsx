import { Clock3 } from "lucide-react";
import type { Scene } from "../lib/types";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";

interface TimelineBarProps {
  scenes: Scene[];
  activeSceneIndex: number;
  isGenerating: boolean;
  onSelect: (sceneIndex: number) => void;
}

export function TimelineBar({ scenes, activeSceneIndex, isGenerating, onSelect }: TimelineBarProps) {
  return (
    <section className="rounded-lg bg-[#181818] p-4 shadow-[0_0_24px_rgba(0,0,0,0.5)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
            <Clock3 className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">时间轴</h3>
            <p className="text-xs text-muted">按分镜时长生成可读的粗剪结构</p>
          </div>
        </div>
        {isGenerating ? <Badge variant="outline">持续更新</Badge> : null}
      </div>

      <div className="rounded-lg bg-[#1f1f1f] p-4 shadow-[inset_0_0_0_1px_#4d4d4d]">
        <div className="mb-3 flex items-center gap-8 px-2 text-[11px] text-muted">
          <span className="w-10">视频</span>
          <span>00:00</span>
          <span>00:10</span>
          <span>00:20</span>
          <span>00:30</span>
          <span>00:40</span>
          <span>00:50</span>
          <span>01:00</span>
        </div>

        <ScrollArea className="w-full">
          <div className="min-w-max space-y-4 pb-2">
            <div className="flex items-center gap-3">
              <span className="w-10 text-xs text-muted">视频</span>
              <div className="relative flex items-center gap-1">
                {scenes.length === 0 ? <div className="text-sm text-muted">{isGenerating ? "时间轴会随着分镜生成逐步展开。" : "暂无时间轴。"}</div> : null}
                {scenes.map((scene) => (
                  <button
                    key={scene.index}
                    type="button"
                    className={cn(
                      "flex h-8 items-center rounded-md border px-3 text-xs transition",
                      scene.index === activeSceneIndex
                        ? "border-[#1ed760] bg-[#1ed760] text-black"
                        : "border-[#4d4d4d] bg-[#252525] text-[#cbcbcb]",
                    )}
                    style={{ width: `${Math.max(scene.duration_ms / 40, 170)}px` }}
                    onClick={() => onSelect(scene.index)}
                  >
                    分镜_{scene.index + 1}.mp4
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 text-xs text-muted">字幕</span>
              <div className="flex items-center gap-1">
                {scenes.map((scene) => (
                  <div
                    key={`subtitle-${scene.index}`}
                    className="h-5 rounded-md bg-[#252525] shadow-[inset_0_0_0_1px_#4d4d4d]"
                    style={{ width: `${Math.max(scene.duration_ms / 45, 130)}px` }}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="w-10 text-xs text-muted">音频</span>
              <div className="flex h-8 items-center gap-1 rounded-md bg-[#252525] px-2 shadow-[inset_0_0_0_1px_#4d4d4d]">
                {Array.from({ length: Math.max(scenes.length * 3, 12) }).map((_, index) => (
                  <div key={index} className="w-5 border-r border-[#1ed760]/70" style={{ height: `${8 + (index % 4) * 4}px` }} />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}
