import { CalendarDays, Play, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProjectSummary } from "../../lib/types";
import { formatDuration, formatProjectDate, statusMeta } from "./projectLibraryUtils";

interface ProjectCardProps {
  project: ProjectSummary;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const status = statusMeta(project.status);
  const duration = formatDuration(project.total_duration_ms);
  const projectPath = `/projects/${project.project_id}`;

  return (
    <article className="group flex h-64 min-h-0 flex-col overflow-hidden rounded-lg bg-[#181818] transition duration-300 hover:bg-[#272727] hover:shadow-[0_0_12px_rgba(0,0,0,0.32)]">
      <Link to={projectPath} className="relative block h-40 overflow-hidden bg-[#1f1f1f]">
        {project.cover_image ? (
          <img
            src={project.cover_image}
            alt={project.title}
            className="h-full w-full object-cover opacity-80 transition duration-300 group-hover:scale-105 group-hover:opacity-100"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(145deg,#202520,#0f120f)] text-sm text-zinc-500">
            暂无封面
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212]/85 to-transparent" />
        <div
          className={`absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-[#2e372e]/85 px-2 py-1 text-xs font-bold backdrop-blur-sm ${status.textClass}`}
        >
          <span className={`size-2 rounded-full ${status.dotClass}`} />
          {status.label}
        </div>
        <span className="absolute bottom-4 right-4 grid size-12 translate-y-2 place-items-center rounded-full bg-[#1ed760] text-black opacity-0 shadow-[0_0_18px_rgba(0,0,0,0.35)] transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Play className="ml-0.5 size-5 fill-current" />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <Link
            to={projectPath}
            className="min-w-0 truncate text-base font-bold tracking-normal text-white transition group-hover:text-[#1ed760]"
          >
            {project.title}
          </Link>
          {onDelete ? (
            <button
              type="button"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[#1f1f1f] text-zinc-400 transition hover:bg-[#2b2b2d] hover:text-white"
              onClick={() => onDelete(project.project_id)}
              aria-label={`删除 ${project.title}`}
              title="删除项目"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4" />
            {formatProjectDate(project.updated_at)}
          </span>
          <span aria-hidden="true">·</span>
          <span>{duration}</span>
        </div>
      </div>
    </article>
  );
}
