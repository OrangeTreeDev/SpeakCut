import { Maximize, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Scene } from "../lib/types";

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
      <section className="grid h-full min-h-0 place-items-center overflow-hidden bg-[#121212] p-6">
        <div className="grid aspect-[9/16] h-full max-h-[716px] min-h-[360px] place-items-center rounded-lg bg-[#0b0b0b] p-8 text-center shadow-[inset_0_0_0_1px_#4d4d4d,0_0_24px_rgba(0,0,0,0.5)]">
          <div className="space-y-4">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#1ed760] text-black">
              <Play className="ml-1 size-8" />
            </div>
            <div>
              <strong className="block text-lg font-bold text-white">{isGenerating ? "素材和音频生成后会立即出现在这里" : "没有可预览的分镜"}</strong>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-400">
                {isGenerating ? "系统会逐镜补全封面、字幕和旁白。" : "先创建或选择一个分镜。"}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#121212] p-4 md:p-6">
      <div
        className={`relative overflow-hidden rounded-lg bg-black shadow-[0_0_24px_rgba(0,0,0,0.5)] ${
          aspectRatio === "9:16" ? "aspect-[9/16] h-full max-h-[716px] min-h-[400px] w-auto max-w-full" : "aspect-video w-full max-w-[960px]"
        }`}
      >
        {scene.selected_video ? (
          <video ref={videoRef} src={scene.selected_video.video_url} poster={scene.selected_video.thumbnail} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#0b0b0b] text-sm text-zinc-400">当前分镜暂无素材</div>
        )}

        <div
          className="absolute inset-x-6 bottom-[15%] z-10 text-center font-bold leading-[1.25] drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]"
          style={{
            color: subtitleStyle.color,
            WebkitTextStroke: `${subtitleStyle.stroke_width}px ${subtitleStyle.stroke_color}`,
            fontSize: `${Math.min(subtitleStyle.font_size, 32)}px`,
          }}
        >
          <span className="inline-block rounded-lg bg-black/60 px-4 py-2 backdrop-blur-sm">{scene.timeline?.subtitles?.[0]?.text ?? scene.text}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-4">
          <div className="mb-3 h-1 rounded-full bg-white/20">
            <div className="h-full w-[35%] rounded-full bg-[#1ed760]" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="w-20 font-mono text-xs text-zinc-300">00:03 / 00:45</span>
            <div className="flex items-center gap-5">
              <button type="button" disabled={!canGoPrevious} onClick={onPreviousScene} className="text-white transition hover:text-[#1ed760] disabled:opacity-35">
                <SkipBack className="size-5" />
              </button>
              <button
                type="button"
                disabled={!scene.selected_video}
                onClick={() => void togglePlayback()}
                className="grid size-14 place-items-center rounded-full bg-[#1ed760] text-black shadow-[0_0_24px_rgba(30,215,96,0.28)] transition hover:scale-105 disabled:opacity-50"
              >
                {isPlaying ? <Pause className="size-7" /> : <Play className="ml-1 size-7" />}
              </button>
              <button type="button" disabled={!canGoNext} onClick={onNextScene} className="text-white transition hover:text-[#1ed760] disabled:opacity-35">
                <SkipForward className="size-5" />
              </button>
            </div>
            <button type="button" className="grid w-20 justify-end text-white transition hover:text-[#1ed760]">
              <Maximize className="size-5" />
            </button>
          </div>
        </div>

        {scene.audio_url ? <audio ref={audioRef} className="hidden" src={`${API_ORIGIN}${scene.audio_url}`} /> : null}
      </div>
    </section>
  );
}
