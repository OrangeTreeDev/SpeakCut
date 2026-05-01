import { AlertTriangle, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import type { Project } from "../../lib/types";
import { Badge } from "../ui/badge";

interface EditorStatusStripProps {
  project: Project;
  isGenerating: boolean;
  isRefreshing: boolean;
}

export function EditorStatusStrip({ project, isGenerating, isRefreshing }: EditorStatusStripProps) {
  const statusLabel =
    project.status === "ready"
      ? "已就绪"
      : project.status === "failed"
        ? "失败"
        : project.status === "regenerating"
          ? "更新中"
          : project.status === "regenerating_all"
            ? "重建中"
            : "生成中";

  return (
    <section className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.05] bg-[#121212] px-4 py-3 xl:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
          {project.status === "failed" ? <AlertTriangle className="size-4" /> : <Wand2 className="size-4" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{project.project_id}</div>
          <div className="text-xs text-zinc-400">
            {project.scenes.length} 个分镜 · {project.aspect_ratio}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isRefreshing ? (
          <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300">
            <RefreshCw className="mr-1 size-3 animate-spin" />
            刷新中
          </Badge>
        ) : null}
        <Badge className="border border-white/[0.06] bg-[#1f1f1f] text-white">
          <Sparkles className="mr-1 size-3 text-[#1ed760]" />
          {isGenerating ? statusLabel : "已就绪"}
        </Badge>
      </div>

      {project.status === "failed" && project.error_message ? <p className="basis-full text-sm text-red-200">失败原因：{project.error_message}</p> : null}
    </section>
  );
}
