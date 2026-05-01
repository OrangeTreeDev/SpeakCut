import { ImageIcon, Search, Type, Upload, Wand2 } from "lucide-react";
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
  { key: "voice", label: "音频", icon: Wand2 },
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
    <aside className="hidden h-full min-h-0 flex-col border-l border-white/[0.05] bg-[#121212] xl:flex">
      <div className="grid h-20 shrink-0 grid-cols-3 border-b border-white/[0.05] bg-[#181818]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              className={cn(
                "relative flex items-center justify-center gap-2 px-3 text-base transition",
                activeTab === tab.key
                  ? "font-bold text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#1ed760]"
                  : "text-zinc-400 hover:text-white",
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="hidden size-4 2xl:block" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {activeTab === "materials" ? (
          <section className="space-y-7 p-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={materialQuery}
                onChange={(event) => setMaterialQuery(event.currentTarget.value)}
                placeholder="搜索素材..."
                className="h-11 rounded-full border-white/30 bg-[#1f1f1f] pl-12 text-base text-white placeholder:text-zinc-400 focus-visible:ring-[#1ed760]"
              />
            </div>

            <div>
              <div className="mb-4 flex justify-between">
                <h3 className="text-lg font-semibold text-white">近期素材</h3>
                {isGenerating ? <Badge className="border border-white/[0.06] bg-[#1f1f1f] text-zinc-300">生成中</Badge> : null}
              </div>

              {!scene ? <p className="text-sm text-zinc-400">等待分镜生成后即可查看和替换素材。</p> : null}
              {scene && filteredVideos.length === 0 ? <p className="text-sm text-zinc-400">没有匹配的候选素材。</p> : null}

              <div className="grid grid-cols-2 gap-3">
                {filteredVideos.slice(0, 8).map((video) => (
                  <button
                    key={video.id}
                    type="button"
                    disabled={isGenerating}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-[#272727] text-left transition disabled:cursor-not-allowed"
                    onClick={() => scene && void onSwitchVideo(scene.index, video.id)}
                  >
                    <img src={video.thumbnail} alt="" className="h-full w-full object-cover opacity-70 transition group-hover:scale-[1.03] group-hover:opacity-100" />
                    <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">{video.duration}s</span>
                  </button>
                ))}

                <button type="button" className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/20 bg-[#1f1f1f] text-zinc-400 transition hover:border-white/45 hover:text-white">
                  <span className="grid justify-items-center gap-2 text-xs">
                    <Upload className="size-6" />
                    上传
                  </span>
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "subtitle" ? (
          <section className="space-y-4 p-5">
            <div className="rounded-lg border border-white/[0.06] bg-[#181818] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">字号</span>
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

            <div className="rounded-lg border border-white/[0.06] bg-[#181818] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">字幕颜色</span>
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
                  className="border-white/[0.08] bg-[#1f1f1f]"
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-[#181818] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">描边宽度</span>
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
          <section className="space-y-3 p-5">
            <div className="rounded-lg border border-white/[0.06] bg-[#181818] p-4">
              <p className="mb-3 text-sm text-zinc-400">切换后会对当前项目重新生成配音。</p>
              <Select disabled={isGenerating} value={project.voice_id} onValueChange={(value) => void onSwitchVoice(value)}>
                <SelectTrigger aria-label="编辑器音色选择" className="border-white/[0.08] bg-[#1f1f1f]">
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
