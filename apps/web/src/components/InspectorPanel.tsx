import { ImageIcon, Search, Type, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project, Scene } from "../lib/types";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";

interface InspectorPanelProps {
  project: Project;
  scene: Scene | undefined;
  isGenerating: boolean;
  onSwitchVideo: (sceneIndex: number, videoId: number) => Promise<void>;
  onUpdateSubtitle: (style: Project["subtitle_style"]) => Promise<void>;
  onSwitchVoice: (voiceId: string) => Promise<void>;
}

type TabKey = "materials" | "subtitle" | "voice";

const voiceOptions = [
  { label: "清朗青年", value: "zh-CN-YunxiNeural" },
  { label: "温柔女声", value: "zh-CN-XiaoxiaoNeural" },
  { label: "磁性男声", value: "zh-CN-YunjianNeural" },
  { label: "新闻播报", value: "zh-CN-YunyangNeural" },
  { label: "活泼少女", value: "zh-CN-XiaoyiNeural" },
];

const tabs: Array<{ key: TabKey; label: string; icon: typeof ImageIcon }> = [
  { key: "materials", label: "素材", icon: ImageIcon },
  { key: "subtitle", label: "字幕", icon: Type },
  { key: "voice", label: "音色", icon: Wand2 },
];

export function InspectorPanel({ project, scene, isGenerating, onSwitchVideo, onUpdateSubtitle, onSwitchVoice }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("materials");
  const [materialQuery, setMaterialQuery] = useState("");

  const filteredVideos = useMemo(() => {
    if (!scene) {
      return [];
    }

    const query = materialQuery.trim().toLowerCase();
    if (!query) {
      return scene.candidate_videos;
    }

    return scene.candidate_videos.filter((video) => {
      const orientation = video.height >= video.width ? "竖屏 portrait vertical" : "横屏 landscape horizontal";
      const searchable = [`素材 ${video.id}`, `${video.id}`, `${video.duration}s`, orientation].join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [materialQuery, scene]);

  return (
    <aside className="panel-surface flex h-full min-h-0 flex-col rounded-[1.65rem] border border-white/[0.05] p-4">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.02em] text-white">检查器</h2>
          <p className="text-sm text-muted">当前分镜的素材、字幕和音色都在这里切换</p>
        </div>
        {isGenerating ? <Badge className="border border-white/[0.06]">生成中</Badge> : null}
      </div>

      <div className="mb-4 grid grid-cols-3 gap-1.5 rounded-[1.2rem] border border-white/[0.06] bg-black/16 p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-[0.95rem] px-2 py-2.5 text-[11px] font-medium transition",
                activeTab === tab.key
                  ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.04))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  : "text-muted hover:bg-white/[0.04] hover:text-white",
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        {activeTab === "materials" ? (
          <section className="space-y-4">
            <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.02] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={materialQuery}
                  onChange={(event) => setMaterialQuery(event.currentTarget.value)}
                  placeholder="搜索素材编号、时长、横竖屏"
                  className="border-white/[0.08] bg-white/[0.03] pl-9"
                />
              </div>
            </div>

            {!scene ? <p className="text-sm text-muted">等待分镜生成后即可查看和替换素材。</p> : null}
            {scene && filteredVideos.length === 0 ? <p className="text-sm text-muted">没有匹配的候选素材。</p> : null}

            <div className="grid grid-cols-2 gap-3">
              {filteredVideos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  disabled={isGenerating}
                  className="overflow-hidden rounded-[1.2rem] border border-white/[0.06] bg-white/[0.02] text-left transition duration-200 hover:border-white/[0.1] hover:bg-white/[0.04] disabled:cursor-not-allowed"
                  onClick={() => scene && void onSwitchVideo(scene.index, video.id)}
                >
                  <img src={video.thumbnail} alt="" className="aspect-[4/3] w-full object-cover" />
                  <div className="space-y-1.5 px-3 py-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white">素材 #{video.id}</span>
                      <span className="text-muted">{video.duration}s</span>
                    </div>
                    <div className="text-[11px] text-muted">{video.height >= video.width ? "竖屏素材" : "横屏素材"}</div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "subtitle" ? (
          <section className="space-y-4">
            <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">字号</span>
                <span className="text-white">{project.subtitle_style.font_size}px</span>
              </div>
              <Slider
                min={24}
                max={72}
                disabled={isGenerating}
                value={project.subtitle_style.font_size}
                onChange={(event) =>
                  void onUpdateSubtitle({
                    ...project.subtitle_style,
                    font_size: Number(event.currentTarget.value),
                  })
                }
                className="mt-3"
              />
            </div>

            <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">字幕颜色</span>
                <span className="font-mono text-xs text-white">{project.subtitle_style.color}</span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="color"
                  value={project.subtitle_style.color}
                  disabled={isGenerating}
                  onChange={(event) =>
                    void onUpdateSubtitle({
                      ...project.subtitle_style,
                      color: event.currentTarget.value,
                    })
                  }
                  className="h-11 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
                />
                <Input
                  value={project.subtitle_style.color}
                  disabled={isGenerating}
                  onChange={(event) =>
                    void onUpdateSubtitle({
                      ...project.subtitle_style,
                      color: event.currentTarget.value,
                    })
                  }
                  className="border-white/[0.08] bg-white/[0.03]"
                />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">描边宽度</span>
                <span className="text-white">{project.subtitle_style.stroke_width}px</span>
              </div>
              <Slider
                min={0}
                max={5}
                disabled={isGenerating}
                value={project.subtitle_style.stroke_width}
                onChange={(event) =>
                  void onUpdateSubtitle({
                    ...project.subtitle_style,
                    stroke_width: Number(event.currentTarget.value),
                  })
                }
                className="mt-3"
              />
            </div>
          </section>
        ) : null}

        {activeTab === "voice" ? (
          <section className="space-y-3">
            <div className="rounded-[1.25rem] border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="mb-3 text-sm text-muted">切换后会对当前项目重新生成配音。</p>
              <Select disabled={isGenerating} value={project.voice_id} onValueChange={(value) => void onSwitchVoice(value)}>
                <SelectTrigger aria-label="编辑器音色选择" className="border-white/[0.08] bg-white/[0.03]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {voiceOptions.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>
        ) : null}
      </ScrollArea>
    </aside>
  );
}
