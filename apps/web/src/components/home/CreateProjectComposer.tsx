import { Film, Mic2, Video, Wand2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";

export interface VoiceOption {
  label: string;
  value: string;
}

interface CreateProjectComposerProps {
  text: string;
  aspectRatio: "9:16" | "16:9";
  voiceId: string;
  voices: VoiceOption[];
  isSubmitting: boolean;
  onTextChange: (text: string) => void;
  onAspectRatioChange: (value: "9:16" | "16:9") => void;
  onVoiceChange: (value: string) => void;
  onCreate: () => void;
}

export function CreateProjectComposer({
  text,
  aspectRatio,
  voiceId,
  voices,
  isSubmitting,
  onTextChange,
  onAspectRatioChange,
  onVoiceChange,
  onCreate,
}: CreateProjectComposerProps) {
  return (
    <section className="w-full">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
          <Video className="size-5" />
        </div>
        <h1 className="text-2xl font-bold text-white">今天想创作点什么?</h1>
      </div>

      <div className="rounded-lg bg-[#181818] p-4 shadow-[0_0_24px_rgba(0,0,0,0.5)] md:p-6">
        <Label htmlFor="script-input" className="sr-only">
          输入脚本
        </Label>
        <Textarea
          id="script-input"
          rows={7}
          value={text}
          onChange={(event) => onTextChange(event.currentTarget.value)}
          placeholder="粘贴脚本，或直接输入要生成的视频旁白..."
          className="min-h-[230px] resize-none px-5 py-4 text-base leading-6"
        />

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={aspectRatio} onValueChange={(value) => onAspectRatioChange(value as "9:16" | "16:9")}>
              <SelectTrigger
                id="aspect-ratio"
                aria-label="视频比例"
                className="h-auto min-h-14 min-w-44 rounded-full border-0 bg-[#1f1f1f] px-5 py-3 text-left shadow-none"
              >
                <div className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">视频比例</span>
                  <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
                    <Film className="size-4 text-zinc-300" />
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-[#1f1f1f]">
                <SelectItem value="9:16">9:16</SelectItem>
                <SelectItem value="16:9">16:9</SelectItem>
              </SelectContent>
            </Select>

            <Select value={voiceId} onValueChange={onVoiceChange}>
              <SelectTrigger
                id="voice-id"
                aria-label="音色选择"
                className="h-auto min-h-14 min-w-48 rounded-full border-0 bg-[#1f1f1f] px-5 py-3 text-left shadow-none"
              >
                <div className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="text-[10px] font-bold uppercase text-zinc-400">配音音色</span>
                  <span className="mt-1 flex max-w-36 items-center gap-2 text-sm font-semibold text-white">
                    <Mic2 className="size-4 shrink-0 text-zinc-300" />
                    <span className="truncate">
                      <SelectValue />
                    </span>
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-[#1f1f1f]">
                {voices.map((voice) => (
                  <SelectItem key={voice.value} value={voice.value}>
                    {voice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            size="lg"
            disabled={isSubmitting || !text.trim()}
            onClick={onCreate}
            className="h-12 min-w-36 px-8 uppercase tracking-[1.5px]"
          >
            <Wand2 className="size-4" />
            {isSubmitting ? "创建中" : "一键成片"}
          </Button>
        </div>
      </div>
    </section>
  );
}
