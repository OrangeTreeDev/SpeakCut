import { ArrowRight, FolderOpenDot, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { ProjectSummary } from "../../lib/types";
import { ProjectCard } from "../project/ProjectCard";

interface ProjectShowcaseGridProps {
  projects: ProjectSummary[];
  isLoading: boolean;
}

export function ProjectShowcaseGrid({ projects, isLoading }: ProjectShowcaseGridProps) {
  const visibleProjects = projects.slice(0, 4);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-white">我的项目</h2>
        <Link
          to="/projects"
          className="inline-flex items-center gap-1 text-sm font-medium text-zinc-400 transition hover:text-white"
        >
          查看全部
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex min-h-64 items-center justify-center gap-3 rounded-lg bg-[#181818] text-sm text-zinc-400">
            <Loader2 className="size-5 animate-spin text-[#1ed760]" />
            正在加载项目...
          </div>
        ) : null}

        {!isLoading && visibleProjects.length === 0 ? (
          <div className="col-span-full flex min-h-64 flex-col items-center justify-center gap-3 rounded-lg bg-[#181818] text-center">
            <span className="grid size-14 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
              <FolderOpenDot className="size-7" />
            </span>
            <div>
              <p className="text-base font-bold text-white">暂无项目</p>
              <p className="mt-2 text-sm text-zinc-400">创建第一个项目后，会显示在这里。</p>
            </div>
          </div>
        ) : null}

        {!isLoading
          ? visibleProjects.map((project) => (
              <ProjectCard key={project.project_id} project={project} />
            ))
          : null}
      </div>
    </section>
  );
}
