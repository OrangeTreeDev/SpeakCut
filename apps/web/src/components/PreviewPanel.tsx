import { Pause, Play, SkipBack, SkipForward, Type, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Scene } from "../lib/types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface PreviewPanelProps {
  scene: Scene | undefined;
  aspectRatio: "9:16" | "16:9";
  isGenerating: boolean;
  subtitleStyle: {
    font_size: number;
    color: string;
    stroke_color: string;
    stroke_width: number;
  };
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousScene: () => void;
  onNextScene: () => void;
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function PreviewPanel({
  scene,
  aspectRatio,
  isGenerating,
  subtitleStyle,
  canGoPrevious,
  canGoNext,
  onPreviousScene,
  onNextScene,
}: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsPlaying(false);
  }, [scene?.index]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) {
      return;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    audio?.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      audio?.removeEventListener("ended", handleEnded);
    };
  }, [scene?.audio_url, scene?.selected_video?.video_url]);

  async function togglePlayback() {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
      if (audio) {
        audio.currentTime = video.currentTime;
        await audio.play();
      }
      return;
    }

    video.pause();
    audio?.pause();
  }

  if (!scene) {
    return (
      <Card className="h-full rounded-[1.7rem] border-white/[0.06] bg-transparent">
        <CardContent className="grid h-full gap-5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">视频预览</h2>
              <p className="text-sm text-muted">等待首个分镜进入可视区域</p>
            </div>
            {isGenerating ? <Badge>等待首个分镜</Badge> : null}
          </div>

          <div className="editor-grid grid flex-1 place-items-center rounded-[1.75rem] border border-dashed border-white/10 bg-black/18 p-8">
            <div className="space-y-4 text-center">
              <div className="mx-auto grid size-24 place-items-center rounded-full border border-white/10 bg-white/5">
                <Play className="ml-1 size-9 text-[#c7adff]" />
              </div>
              <div className="space-y-2">
                <strong className="block text-lg font-medium text-white">{isGenerating ? "素材和音频生成后会立即出现在这里" : "没有可预览的分镜"}</strong>
                <p className="max-w-md text-sm leading-6 text-muted">
                  {isGenerating ? "系统会逐镜补全封面、字幕和旁白，无需等待整段项目全部完成。" : "先创建或选择一个分镜。"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full min-h-0 rounded-[1.7rem] border-white/[0.06] bg-transparent">
      <CardContent className="flex h-full min-h-0 flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-white/[0.06] bg-white/[0.02] px-4 py-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/38">
              <span>Preview Stage</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{aspectRatio}</span>
            </div>
            <h2 className="truncate text-base font-semibold tracking-[-0.02em] text-white">分镜 {String(scene.index + 1).padStart(2, "0")} 预览</h2>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-3 py-1.5 text-xs text-muted md:flex">
            <Type className="size-3.5 text-primary" />
            {scene.timeline?.subtitles?.length ? `${scene.timeline.subtitles.length} 条字幕` : "字幕待生成"}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="grid min-h-0 flex-1 place-items-center rounded-[1.85rem] border border-white/[0.06] bg-[radial-gradient(circle_at_top,rgba(183,140,255,0.07),transparent_30%),linear-gradient(180deg,#09070f_0%,#06050b_100%)] p-5 md:p-7">
            <div
              className={`relative overflow-hidden rounded-[1.85rem] border border-white/[0.07] bg-black shadow-[0_28px_80px_rgba(0,0,0,0.4)] ${
                aspectRatio === "9:16"
                  ? "aspect-[9/16] h-full max-h-full w-auto max-w-full"
                  : "aspect-video w-full max-w-full max-h-full"
              }`}
            >
              {scene.selected_video ? (
                <video
                  ref={videoRef}
                  src={scene.selected_video.video_url}
                  poster={scene.selected_video.thumbnail}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="editor-grid grid h-full place-items-center text-sm text-white/70">当前分镜暂无素材</div>
              )}

              <div
                className="absolute inset-x-[9%] bottom-[11%] text-center font-semibold leading-[1.3] drop-shadow-[0_8px_24px_rgba(0,0,0,0.75)]"
                style={{
                  color: subtitleStyle.color,
                  WebkitTextStroke: `${subtitleStyle.stroke_width}px ${subtitleStyle.stroke_color}`,
                  fontSize: `${subtitleStyle.font_size}px`,
                }}
              >
                {scene.timeline?.subtitles?.[0]?.text ?? scene.text}
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded-[1.45rem] border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" className="border-white/[0.08] bg-white/[0.03]" disabled={!canGoPrevious} onClick={onPreviousScene}>
                  <SkipBack className="size-4" />
                  上一镜
                </Button>
                <Button type="button" size="sm" className="min-w-[88px]" disabled={!scene.selected_video} onClick={() => void togglePlayback()}>
                  {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {isPlaying ? "暂停" : "播放"}
                </Button>
                <Button type="button" size="sm" variant="outline" className="border-white/[0.08] bg-white/[0.03]" disabled={!canGoNext} onClick={onNextScene}>
                  <SkipForward className="size-4" />
                  下一镜
                </Button>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted">
                <Volume2 className="size-4 text-[#c7adff]" />
                {scene.audio_url ? "音频已同步到自定义播控" : "配音生成中"}
              </div>
              {scene.audio_url ? <audio ref={audioRef} className="hidden" src={`${API_ORIGIN}${scene.audio_url}`} /> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
