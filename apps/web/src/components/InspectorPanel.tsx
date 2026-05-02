import { ImageIcon, Loader2, Search, Type, Upload, Wand2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../lib/api";
import type { Project, Scene, VideoAsset } from "../lib/types";
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
  onSwitchVideoAsset: (sceneIndex: number, video: VideoAsset) => Promise<void>;
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

const subtitleFontOptions = [
  { name: "Noto Sans SC", sample: "清晰现代", stack: "'Noto Sans SC', 'Microsoft YaHei', sans-serif" },
  { name: "Source Han Sans SC", sample: "专业字幕", stack: "'Source Han Sans SC', 'Noto Sans SC', sans-serif" },
  { name: "Microsoft YaHei", sample: "稳重易读", stack: "'Microsoft YaHei', sans-serif" },
  { name: "PingFang SC", sample: "简洁精致", stack: "'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { name: "HarmonyOS Sans SC", sample: "科技清爽", stack: "'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif" },
  { name: "MiSans", sample: "干净利落", stack: "'MiSans', 'Microsoft YaHei', sans-serif" },
  { name: "Alibaba PuHuiTi", sample: "商务醒目", stack: "'Alibaba PuHuiTi', 'Microsoft YaHei', sans-serif" },
  { name: "Smiley Sans", sample: "标题活力", stack: "'Smiley Sans', 'Microsoft YaHei', sans-serif" },
  { name: "Arial", sample: "Clean Cut", stack: "Arial, sans-serif" },
  { name: "Helvetica Neue", sample: "Modern Edit", stack: "'Helvetica Neue', Arial, sans-serif" },
  { name: "Inter", sample: "Social Video", stack: "Inter, Arial, sans-serif" },
  { name: "Roboto", sample: "Creator Style", stack: "Roboto, Arial, sans-serif" },
  { name: "Montserrat", sample: "Bold Story", stack: "Montserrat, Arial, sans-serif" },
  { name: "Poppins", sample: "Vlog Energy", stack: "Poppins, Arial, sans-serif" },
  { name: "Oswald", sample: "Impact Title", stack: "Oswald, Arial, sans-serif" },
  { name: "Bebas Neue", sample: "TRENDING", stack: "'Bebas Neue', Impact, sans-serif" },
  { name: "DIN Alternate", sample: "Fast Pace", stack: "'DIN Alternate', Arial, sans-serif" },
  { name: "Avenir Next", sample: "Premium Look", stack: "'Avenir Next', Arial, sans-serif" },
  { name: "Futura", sample: "Cinematic", stack: "Futura, Arial, sans-serif" },
  { name: "Impact", sample: "爆款标题", stack: "Impact, 'Arial Black', sans-serif" },
];

const tabs: Array<{ key: TabKey; label: string; icon: typeof ImageIcon }> = [
  { key: "materials", label: "素材", icon: ImageIcon },
  { key: "subtitle", label: "字幕", icon: Type },
  { key: "voice", label: "音频", icon: Wand2 },
];

const commonColorPresets = [
  "#FFFFFF",
  "#000000",
  "#FFD700",
  "#FF4500",
  "#00CEFF",
  "#FF00FF",
  "#1ED760",
  "#52525B",
  "#27272A",
  "#EF4444",
  "#2563EB",
  "#16A34A",
  "#FACC15",
  "#9333EA",
  "#F97316",
  "#A855F7",
  "#22C55E",
  "#111827",
  "#0F172A",
  "#7F1D1D",
];

function colorOptionsWithCurrent(options: string[], current: string) {
  const normalized = current.toLowerCase();
  return options.some((option) => option.toLowerCase() === normalized) ? options : [current, ...options];
}

export function InspectorPanel({
  project,
  scene,
  isGenerating,
  onSwitchVideo,
  onSwitchVideoAsset,
  onUpdateSubtitle,
  onSwitchVoice,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("materials");
  const [materialQuery, setMaterialQuery] = useState("");
  const [searchedVideos, setSearchedVideos] = useState<VideoAsset[]>([]);
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false);
  const [isSwitchingVideo, setIsSwitchingVideo] = useState(false);
  const [isUpdatingSubtitle, setIsUpdatingSubtitle] = useState(false);
  const [isSwitchingVoice, setIsSwitchingVoice] = useState(false);
  const [inspectorError, setInspectorError] = useState<string | null>(null);
  const subtitleStyle = Object.assign({}, {
    font_family: "Noto Sans SC",
    font_size: 48,
    color: "#FFFFFF",
    stroke_color: "#000000",
    stroke_width: 2,
    background_color: "#000000",
  }, project.subtitle_style);
  const selectedSubtitleFont =
    subtitleFontOptions.find((font) => font.name === subtitleStyle.font_family || font.stack === subtitleStyle.font_family) ??
    subtitleFontOptions[0];

  const filteredCandidateVideos = useMemo(() => {
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
  const materialVideos = searchedVideos.length > 0 ? searchedVideos : filteredCandidateVideos;

  async function handleSearchMaterials() {
    if (!scene || isGenerating || isSearchingMaterials || !materialQuery.trim()) {
      setSearchedVideos([]);
      return;
    }
    setIsSearchingMaterials(true);
    setInspectorError(null);
    try {
      const orientation = project.aspect_ratio === "9:16" ? "portrait" : "landscape";
      const response = await api.searchMaterials(materialQuery.trim(), orientation);
      setSearchedVideos(response.videos);
    } catch (error) {
      setInspectorError(error instanceof Error ? error.message : "素材搜索失败");
    } finally {
      setIsSearchingMaterials(false);
    }
  }

  async function handleSwitchVideo(video: VideoAsset) {
    if (!scene) {
      return;
    }
    setIsSwitchingVideo(true);
    setInspectorError(null);
    try {
      const isCandidate = scene.candidate_videos.some((item) => item.id === video.id);
      if (isCandidate) {
        await onSwitchVideo(scene.index, video.id);
      } else {
        await onSwitchVideoAsset(scene.index, video);
      }
    } catch (error) {
      setInspectorError(error instanceof Error ? error.message : "素材切换失败");
    } finally {
      setIsSwitchingVideo(false);
    }
  }

  async function handleUpdateSubtitle(style: Project["subtitle_style"]) {
    setIsUpdatingSubtitle(true);
    setInspectorError(null);
    try {
      await onUpdateSubtitle(style);
    } catch (error) {
      setInspectorError(error instanceof Error ? error.message : "字幕更新失败");
    } finally {
      setIsUpdatingSubtitle(false);
    }
  }

  async function handleSwitchVoice(voiceId: string) {
    setIsSwitchingVoice(true);
    setInspectorError(null);
    try {
      await onSwitchVoice(voiceId);
    } catch (error) {
      setInspectorError(error instanceof Error ? error.message : "音色切换失败");
    } finally {
      setIsSwitchingVoice(false);
    }
  }

  function renderColorPresets(
    value: string,
    options: string[],
    onSelect: (color: string) => void,
    offOption?: { selected: boolean; onSelect: () => void; title: string },
  ) {
    return (
      <div className="w-[308px] max-w-full overflow-hidden rounded-full bg-[#1f1f1f]">
        <div className="w-full overflow-x-auto overflow-y-hidden p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max flex-nowrap gap-2 px-1">
            {offOption ? (
              <button
                type="button"
                disabled={isGenerating || isUpdatingSubtitle}
                className={cn(
                  "relative grid size-7 shrink-0 place-items-center rounded-full border bg-[#27272a] text-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-50",
                  offOption.selected ? "border-2 border-[#1ed760] ring-1 ring-black" : "border-white/10 hover:border-white/35",
                )}
                onClick={offOption.onSelect}
                title={offOption.title}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
            {colorOptionsWithCurrent(options, value).map((color) => {
              const isSelected = color.toLowerCase() === value.toLowerCase();
              return (
                <button
                  key={color}
                  type="button"
                disabled={isGenerating || isUpdatingSubtitle}
                className={cn(
                    "relative size-7 shrink-0 rounded-full border transition disabled:cursor-not-allowed disabled:opacity-50",
                    isSelected ? "border-2 border-[#1ed760] ring-1 ring-black" : "border-white/10 hover:border-white/35",
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onSelect(color)}
                  title={color}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

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
              onClick={() => {
                setActiveTab(tab.key);
                setInspectorError(null);
              }}
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
            <form
              className="relative"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSearchMaterials();
              }}
            >
              <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
              <Input
                value={materialQuery}
                disabled={!scene || isGenerating || isSearchingMaterials}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setMaterialQuery(value);
                  if (!value.trim()) {
                    setSearchedVideos([]);
                  }
                }}
                placeholder="搜索新素材，按回车搜索"
                className="h-11 rounded-full border-white/30 bg-[#1f1f1f] pl-12 pr-12 text-base text-white placeholder:text-zinc-400 focus-visible:ring-[#1ed760]"
              />
              {isSearchingMaterials ? <Loader2 className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-[#1ed760]" /> : null}
            </form>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{searchedVideos.length > 0 ? "搜索结果" : "近期素材"}</h3>
                {!scene && isGenerating ? <Badge className="border border-white/[0.06] bg-[#1f1f1f] text-zinc-300">生成中</Badge> : null}
              </div>

              {inspectorError ? (
                <div className="mb-3 rounded-lg border border-red-400/20 bg-red-500/8 px-3 py-2 text-sm text-red-100">{inspectorError}</div>
              ) : null}
              {!scene ? <p className="text-sm text-zinc-400">等待分镜生成后即可查看和替换素材。</p> : null}
              {scene && materialVideos.length === 0 ? <p className="text-sm text-zinc-400">没有匹配的候选素材。</p> : null}

              <div className="grid grid-cols-2 gap-3">
                {materialVideos.slice(0, 8).map((video) => {
                  const isSelected = scene?.selected_video?.id === video.id;
                  return (
                    <button
                      key={video.id}
                      type="button"
                      disabled={isGenerating || isSwitchingVideo}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-lg bg-[#272727] text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                        isSelected && "outline outline-2 outline-[#1ed760]",
                      )}
                      onClick={() => void handleSwitchVideo(video)}
                    >
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-full w-full object-cover opacity-70 transition group-hover:scale-[1.03] group-hover:opacity-100"
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">{video.duration}s</span>
                      {isSelected ? <span className="absolute left-1 top-1 rounded bg-[#1ed760] px-1.5 py-0.5 text-[10px] font-bold text-black">已选</span> : null}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled
                  className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/20 bg-[#1f1f1f] text-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
                  title="本地上传暂未接入"
                >
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
          <section className="relative min-w-0 space-y-6 overflow-hidden p-4">
            {isUpdatingSubtitle ? (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[#121212]/35 backdrop-blur-[1px]">
                <div className="grid size-10 place-items-center rounded-full bg-[#1f1f1f] shadow-[0_0_18px_rgba(0,0,0,0.35)]">
                  <Loader2 className="size-5 animate-spin text-[#1ed760]" />
                </div>
              </div>
            ) : null}
            {inspectorError ? (
              <div className="rounded-lg border border-red-400/20 bg-red-500/8 px-3 py-2 text-sm text-red-100">{inspectorError}</div>
            ) : null}

            <div className="min-w-0 space-y-4">
              <h3 className="text-sm font-semibold text-white">字体样式</h3>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400">字体名称</p>
                <Select
                  disabled={isGenerating || isUpdatingSubtitle}
                  value={selectedSubtitleFont.name}
                  onValueChange={(fontFamily) =>
                    void handleUpdateSubtitle({
                      ...subtitleStyle,
                      font_family: fontFamily,
                    })
                  }
                >
                  <SelectTrigger aria-label="字幕字体名称" className="h-11 max-w-full border-0 bg-[#1f1f1f] shadow-none">
                    <span className="truncate" style={{ fontFamily: selectedSubtitleFont.stack }}>
                      {selectedSubtitleFont.name}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-80 w-[var(--radix-select-trigger-width)]">
                    {subtitleFontOptions.map((font) => (
                      <SelectItem key={font.name} value={font.name} className="py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white" style={{ fontFamily: font.stack }}>
                            {font.sample}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-zinc-400">{font.name}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">字体大小</p>
                  <span className="text-[10px] text-zinc-400">{subtitleStyle.font_size}px</span>
                </div>
                <div className="rounded-full bg-[#1f1f1f] px-3 py-3">
                  <Slider
                    min={24}
                    max={72}
                    disabled={isGenerating || isUpdatingSubtitle}
                    value={subtitleStyle.font_size}
                    onChange={(event) =>
                      void handleUpdateSubtitle({
                        ...subtitleStyle,
                        font_size: Number(event.currentTarget.value),
                      })
                    }
                    className="block h-1 rounded-full bg-white/20 accent-[#1ed760]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">文字颜色</p>
                  <span className="font-mono text-[10px] text-zinc-400">{subtitleStyle.color}</span>
                </div>
                {renderColorPresets(subtitleStyle.color, commonColorPresets, (color) =>
                  void handleUpdateSubtitle({
                    ...subtitleStyle,
                    color,
                  }),
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">描边粗细</p>
                  <span className="text-[10px] text-zinc-400">{subtitleStyle.stroke_width}px</span>
                </div>
                <div className="rounded-full bg-[#1f1f1f] px-3 py-3">
                  <Slider
                    min={0}
                    max={5}
                    disabled={isGenerating || isUpdatingSubtitle}
                    value={subtitleStyle.stroke_width}
                    onChange={(event) =>
                      void handleUpdateSubtitle({
                        ...subtitleStyle,
                        stroke_width: Number(event.currentTarget.value),
                      })
                    }
                    className="block h-1 rounded-full bg-white/20 accent-[#1ed760]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">描边颜色</p>
                  <span className="font-mono text-[10px] text-zinc-400">{subtitleStyle.stroke_color}</span>
                </div>
                {renderColorPresets(
                  subtitleStyle.stroke_color,
                  commonColorPresets,
                  (color) =>
                    void handleUpdateSubtitle({
                      ...subtitleStyle,
                      stroke_color: color,
                      stroke_width: Math.max(subtitleStyle.stroke_width, 1),
                    }),
                  {
                    selected: subtitleStyle.stroke_width === 0,
                    title: "关闭描边",
                    onSelect: () =>
                      void handleUpdateSubtitle({
                        ...subtitleStyle,
                        stroke_width: 0,
                      }),
                  },
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">文字背景色</p>
                  <span className="font-mono text-[10px] text-zinc-400">{subtitleStyle.background_color}</span>
                </div>
                {renderColorPresets(subtitleStyle.background_color, commonColorPresets, (backgroundColor) =>
                  void handleUpdateSubtitle({
                    ...subtitleStyle,
                    background_color: backgroundColor,
                  }),
                {
                  selected: subtitleStyle.background_color === "transparent",
                  title: "关闭背景",
                  onSelect: () =>
                    void handleUpdateSubtitle({
                      ...subtitleStyle,
                      background_color: "transparent",
                    }),
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "voice" ? (
          <section className="space-y-3 p-5">
            {inspectorError ? (
              <div className="rounded-lg border border-red-400/20 bg-red-500/8 px-3 py-2 text-sm text-red-100">{inspectorError}</div>
            ) : null}
            <div className="rounded-lg border border-white/[0.06] bg-[#181818] p-4">
              <p className="mb-3 flex items-center gap-2 text-sm text-zinc-400">
                {isSwitchingVoice ? <Loader2 className="size-4 animate-spin text-[#1ed760]" /> : null}
                切换后会对当前项目重新生成配音。
              </p>
              <Select disabled={isGenerating || isSwitchingVoice} value={project.voice_id} onValueChange={(value) => void handleSwitchVoice(value)}>
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
