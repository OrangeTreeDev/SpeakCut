import { useEffect, useState } from "react";
import { FolderOpen, Video } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppSidebar } from "../components/AppSidebar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { CreateProjectComposer, type VoiceOption } from "../components/home/CreateProjectComposer";
import { ProjectShowcaseGrid } from "../components/home/ProjectShowcaseGrid";
import { api } from "../lib/api";
import type { ProjectSummary } from "../lib/types";

const voices: VoiceOption[] = [
  { label: "清朗青年", value: "zh-CN-YunxiNeural" },
  { label: "温柔女声", value: "zh-CN-XiaoxiaoNeural" },
  { label: "磁性男声", value: "zh-CN-YunjianNeural" },
];

export function CreateProjectPage() {
  const navigate = useNavigate();
  const [text, setText] = useState("在城市清晨，阳光穿过高楼的缝隙，街头的人们带着目的前行。");
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [voiceId, setVoiceId] = useState("zh-CN-YunxiNeural");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects() {
    setIsLoadingProjects(true);
    try {
      const response = await api.listProjects();
      setProjects(response.items.sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "项目加载失败");
    } finally {
      setIsLoadingProjects(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

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
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="flex min-h-screen">
        <AppSidebar activeItem="home" />

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between px-5 py-5 md:hidden">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
                <Video className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold">SpeakCut</div>
                <div className="text-xs text-zinc-500">视频工作台</div>
              </div>
            </div>
            <Link
              to="/projects"
              className="inline-flex size-10 items-center justify-center rounded-full bg-[#1f1f1f] text-zinc-300 transition hover:text-white"
              aria-label="打开项目库"
            >
              <FolderOpen className="size-5" />
            </Link>
          </header>

          <div className="mx-auto flex max-w-[1320px] flex-col gap-10 px-5 pb-24 pt-3 md:gap-12 md:px-10 md:py-10 lg:px-12">
            <CreateProjectComposer
              text={text}
              aspectRatio={aspectRatio}
              voiceId={voiceId}
              voices={voices}
              isSubmitting={isSubmitting}
              onTextChange={setText}
              onAspectRatioChange={setAspectRatio}
              onVoiceChange={setVoiceId}
              onCreate={() => void handleSubmit()}
            />

            {error ? (
              <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <ProjectShowcaseGrid projects={projects} isLoading={isLoadingProjects} />
          </div>
        </div>
      </div>
      <MobileBottomNav activeItem="home" />
    </main>
  );
}
