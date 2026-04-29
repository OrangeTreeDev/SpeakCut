import { useState } from "react";
import { Film, Layers3, Sparkles, Wand2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";

const voices = [
  { label: "清朗青年", value: "zh-CN-YunxiNeural" },
  { label: "温柔女声", value: "zh-CN-XiaoxiaoNeural" },
  { label: "磁性男声", value: "zh-CN-YunjianNeural" },
];

const projectCards = [
  {
    title: "未来城市探索之旅",
    meta: "2小时前编辑 · 1080P",
    duration: "01:45",
    image:
      "https://images.pexels.com/photos/3075993/pexels-photo-3075993.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    title: "健康早餐制作教程",
    meta: "昨天 18:22 · 4K",
    duration: "00:30",
    image:
      "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    title: "阿尔卑斯山风光短片",
    meta: "3天前 · 1080P",
    duration: "02:15",
    image:
      "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
];

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("在城市清晨，阳光穿过高楼的缝隙，街头的人们带着目的前行。");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [voiceId, setVoiceId] = useState("zh-CN-YunxiNeural");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.createProject({ text, aspect_ratio: aspectRatio, voice_id: voiceId });
      navigate(`/projects/${response.project_id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-10 flex items-center justify-between rounded-full border border-white/8 bg-black/10 px-5 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-10">
            <div className="text-3xl font-semibold tracking-tight text-[#c6a8ff]">SpeakCut</div>
            <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
              <Link className="font-medium text-foreground" to="/">
                首页
              </Link>
              <Link className="transition hover:text-foreground" to="/projects">
                项目
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm" className="border-white/10 bg-white/6">
              <Link to="/projects">全部项目</Link>
            </Button>
            <div className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-sm font-medium text-foreground">
              H
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl space-y-10">
          <div className="max-w-3xl space-y-5 pt-6">
            <Badge className="bg-white/6 text-[#c8adff]">NarraClip Studio</Badge>
            <div className="space-y-4">
              <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">把文字变成大片</h1>
              <p className="max-w-2xl text-base leading-7 text-muted md:text-lg">
                输入脚本后，SpeakCut 会自动完成拆镜、素材匹配、配音和字幕，直接生成可继续编辑的商业级视频项目。
              </p>
            </div>
          </div>

          <Card className="overflow-hidden">
            <CardContent className="relative space-y-6 p-0">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(169,112,255,0.18),transparent_34%),radial-gradient(circle_at_85%_25%,rgba(105,197,255,0.08),transparent_18%)]" />
              <div className="relative px-6 pt-6 md:px-8 md:pt-8">
                <Textarea
                  id="narration"
                  rows={9}
                  value={text}
                  onChange={(event) => setText(event.currentTarget.value)}
                  placeholder="在此输入或粘贴您的脚本。SpeakCut 将自动为您生成视频素材、配音和字幕..."
                  className="min-h-[260px] border-0 bg-white/4 px-6 py-6 text-base leading-8 placeholder:text-[#62558d]"
                />
              </div>

              <div className="relative flex flex-col gap-4 border-t border-white/8 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="aspect-ratio" className="sr-only">
                      视频比例
                    </Label>
                    <Select value={aspectRatio} onValueChange={(value) => setAspectRatio(value as "9:16" | "16:9")}>
                      <SelectTrigger id="aspect-ratio" aria-label="视频比例" className="min-w-36 border-white/8 bg-white/6">
                        <div className="flex items-center gap-2">
                          <Film className="size-4 text-[#c8adff]" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9:16">视频比例 9:16</SelectItem>
                        <SelectItem value="16:9">视频比例 16:9</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="voice-id" className="sr-only">
                      音色选择
                    </Label>
                    <Select value={voiceId} onValueChange={setVoiceId}>
                      <SelectTrigger id="voice-id" aria-label="音色选择" className="min-w-44 border-white/8 bg-white/6">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-[#c8adff]" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map((voice) => (
                          <SelectItem key={voice.value} value={voice.value}>
                            {voice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="button"
                  size="lg"
                  className="min-w-36"
                  disabled={isSubmitting}
                  onClick={() => void handleSubmit()}
                >
                  <Wand2 className="size-4" />
                  {isSubmitting ? "创建中" : "创建"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-white">我的项目</h2>
              <p className="mt-2 text-sm text-muted">提示: 脚本越详细，生成的画面越精准。</p>
            </div>
            <Link to="/projects" className="text-sm font-medium text-[#c8adff] transition hover:text-white">
              查看全部 →
            </Link>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {projectCards.map((project) => (
              <Card key={project.title} className="overflow-hidden bg-[#1e103c]/88">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={project.image} alt={project.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-xs text-white">{project.duration}</div>
                  </div>
                  <div className="space-y-2 px-4 py-4">
                    <h3 className="line-clamp-1 text-base font-medium text-white">{project.title}</h3>
                    <p className="text-xs text-muted">{project.meta}</p>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="border-dashed border-white/12 bg-transparent">
              <CardContent className="grid h-full min-h-72 place-items-center p-6 text-center">
                <div className="space-y-4">
                  <div className="mx-auto grid size-16 place-items-center rounded-full border border-white/10 bg-white/6">
                    <Layers3 className="size-7 text-[#c8adff]" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-white">新建项目</p>
                    <p className="mt-2 text-sm text-muted">从脚本、镜头语言和素材建议开始。</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {error ? <p className="rounded-[1.25rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
