import { Maximize, Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Scene } from "../lib/types";

interface PreviewPanelProps {
  scene: Scene | undefined;
  aspectRatio: "9:16" | "16:9";
  subtitleStyle: {
    font_family: string;
    font_size: number;
    color: string;
    stroke_color: string;
    stroke_width: number;
    background_color: string;
  };
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPreviousScene: () => void;
  onNextScene: () => void;
}

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function formatPlaybackTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "00:00";
  }
  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function resolveSubtitleFontFamily(fontFamily: string) {
  if (fontFamily.includes(",")) {
    return fontFamily;
  }
  return `"${fontFamily}", "Microsoft YaHei", Arial, sans-serif`;
}

function getActiveSubtitleText(scene: Scene, currentTime: number) {
  const subtitles = scene.timeline?.subtitles ?? [];
  if (subtitles.length === 0) {
    return scene.text;
  }

  const currentTimeMs = Math.max(0, Math.round(currentTime * 1000));
  const activeSubtitle = subtitles.find((subtitle) => currentTimeMs >= subtitle.start_ms && currentTimeMs < subtitle.end_ms);
  if (activeSubtitle) {
    return activeSubtitle.text;
  }

  const nextSubtitle = subtitles.find((subtitle) => currentTimeMs < subtitle.start_ms);
  return nextSubtitle?.text ?? subtitles[subtitles.length - 1].text;
}

export function PreviewPanel({
  scene,
  aspectRatio,
  subtitleStyle,
  canGoPrevious,
  canGoNext,
  onPreviousScene,
  onNextScene,
}: PreviewPanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const targetDuration = Math.max((scene?.duration_ms ?? 0) / 1000, 0);
  const resolvedSubtitleStyle = Object.assign({}, {
    font_family: "Noto Sans SC",
    font_size: 48,
    color: "#FFFFFF",
    stroke_color: "#000000",
    stroke_width: 2,
    background_color: "#000000",
  }, subtitleStyle);

  useEffect(() => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(targetDuration);
  }, [scene?.index, scene?.audio_url, scene?.duration_ms, scene?.selected_video?.video_url, targetDuration]);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) {
      return;
    }

    video.loop = Boolean(audio);

    const getPreviewDuration = () => targetDuration || video.duration || 0;
    const syncTime = () => {
      const nextDuration = getPreviewDuration();
      const nextTime = audio ? audio.currentTime || 0 : video.currentTime || 0;
      setCurrentTime(nextDuration > 0 ? Math.min(nextTime, nextDuration) : nextTime);
      setDuration(nextDuration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => syncTime();
    const handleTimeUpdate = () => {
      syncTime();
      if (!audio && targetDuration > 0 && video.currentTime >= targetDuration) {
        video.pause();
        setIsPlaying(false);
        setCurrentTime(targetDuration);
        if (canGoNext) {
          onNextScene();
        }
      }
    };
    const handleEnded = () => {
      if (audio) {
        video.currentTime = 0;
        if (!audio.paused) {
          void video.play();
        }
        return;
      }
      setIsPlaying(false);
      setCurrentTime(getPreviewDuration());
      if (canGoNext) {
        onNextScene();
      }
    };
    const handleAudioTimeUpdate = () => {
      syncTime();
    };
    const handleAudioEnded = () => {
      video.pause();
      setIsPlaying(false);
      setCurrentTime(getPreviewDuration());
      if (canGoNext) {
        onNextScene();
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    audio?.addEventListener("timeupdate", handleAudioTimeUpdate);
    audio?.addEventListener("ended", handleAudioEnded);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      audio?.removeEventListener("timeupdate", handleAudioTimeUpdate);
      audio?.removeEventListener("ended", handleAudioEnded);
    };
  }, [canGoNext, onNextScene, scene?.audio_url, scene?.duration_ms, scene?.selected_video?.video_url, targetDuration]);

  async function togglePlayback() {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      await video.play();
      if (audio) {
        audio.currentTime = Math.min(video.currentTime, targetDuration || video.currentTime);
        await audio.play();
      }
      return;
    }

    video.pause();
    audio?.pause();
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  if (!scene) {
    return (
      <section className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#121212] p-4 md:p-6">
        <div
          className={`relative overflow-hidden rounded-lg bg-[#0b0b0b] text-center shadow-[0_0_24px_rgba(0,0,0,0.5)] ${
            aspectRatio === "9:16" ? "aspect-[9/16] h-full max-h-[716px] min-h-[400px] w-auto max-w-full" : "aspect-video w-full max-w-[960px]"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,215,96,0.10),rgba(18,18,18,0)_42%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,215,96,0.08),rgba(0,0,0,0)_34%,rgba(0,0,0,0.28))]" />
          <div className="relative grid h-full place-items-center p-8">
            <div className="mx-auto grid max-w-sm justify-items-center">
              <div className="mb-6 grid size-20 place-items-center rounded-full bg-[#1ed760] text-black">
                <Play className="ml-1 size-8" />
              </div>
              <strong className="text-lg font-bold text-white">没有可预览的分镜</strong>
              <p className="mt-3 text-sm leading-6 text-zinc-400">先创建或选择一个分镜。</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const subtitleText = getActiveSubtitleText(scene, currentTime);

  return (
    <section className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-[#121212] p-4 md:p-6">
      <div
        className={`relative overflow-hidden rounded-lg bg-black shadow-[0_0_24px_rgba(0,0,0,0.5)] ${
          aspectRatio === "9:16" ? "aspect-[9/16] h-full max-h-[716px] min-h-[400px] w-auto max-w-full" : "aspect-video w-full max-w-[960px]"
        }`}
      >
        {scene.selected_video ? (
          <video
            key={scene.selected_video.video_url}
            ref={videoRef}
            src={scene.selected_video.video_url}
            poster={scene.selected_video.thumbnail}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[#0b0b0b] text-sm text-zinc-400">当前分镜暂无素材</div>
        )}

        <div
          className="absolute inset-x-6 bottom-[15%] z-10 text-center font-bold leading-[1.25] drop-shadow-[0_0_18px_rgba(0,0,0,0.85)]"
          style={{
            color: resolvedSubtitleStyle.color,
            WebkitTextStroke: `${resolvedSubtitleStyle.stroke_width}px ${resolvedSubtitleStyle.stroke_color}`,
            fontFamily: resolveSubtitleFontFamily(resolvedSubtitleStyle.font_family),
            fontSize: `${Math.min(resolvedSubtitleStyle.font_size, 32)}px`,
          }}
        >
          <span
            className="inline-block rounded-lg px-4 py-2 backdrop-blur-sm"
            style={{
              backgroundColor: resolvedSubtitleStyle.background_color === "transparent" ? "transparent" : resolvedSubtitleStyle.background_color,
            }}
          >
            {subtitleText}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 to-transparent p-4">
          <div className="mb-3 h-1 rounded-full bg-white/20">
            <div className="h-full rounded-full bg-[#1ed760]" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="w-24 font-mono text-xs text-zinc-300">
              {formatPlaybackTime(currentTime)} / {formatPlaybackTime(duration)}
            </span>
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

        {scene.audio_url ? <audio key={scene.audio_url} ref={audioRef} className="hidden" src={`${API_ORIGIN}${scene.audio_url}`} /> : null}
      </div>
    </section>
  );
}
