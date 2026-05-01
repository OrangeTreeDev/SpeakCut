import { useEffect, useMemo, useState } from "react";
import { FolderOpen, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { AppSidebar } from "../components/AppSidebar";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { ProjectGrid } from "../components/project/ProjectGrid";
import { ProjectLibraryHeader } from "../components/project/ProjectLibraryHeader";
import { statusMeta } from "../components/project/projectLibraryUtils";
import { api } from "../lib/api";
import type { ProjectSummary } from "../lib/types";

export function ProjectLibraryPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function loadProjects() {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.listProjects();
      setProjects(response.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "项目加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  async function handleDeleteProject(projectId: string) {
    const confirmed = window.confirm("删除后不可恢复，是否继续？");
    if (!confirmed) {
      return;
    }
    try {
      await api.deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.project_id !== projectId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  }

  const filteredProjects = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return projects
      .filter((project) => {
        if (!keyword) {
          return true;
        }
        return [
          project.title,
          project.project_id,
          project.status,
          statusMeta(project.status).label,
          statusMeta(project.status).searchLabel,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      })
      .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  }, [projects, query]);

  const completedCount = projects.filter((project) => project.status === "ready").length;

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <div className="flex min-h-screen">
        <AppSidebar activeItem="projects" />

        <div className="min-w-0 flex-1">
          <header className="flex items-center justify-between px-5 py-5 md:hidden">
            <Link to="/" className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
                <Video className="size-5" />
              </div>
              <div>
                <div className="text-xl font-bold">SpeakCut</div>
                <div className="text-xs text-zinc-500">视频工作台</div>
              </div>
            </Link>
            <Link
              to="/projects"
              className="inline-flex size-10 items-center justify-center rounded-full bg-[#1f1f1f] text-white"
              aria-label="当前项目库"
            >
              <FolderOpen className="size-5" />
            </Link>
          </header>

          <div className="px-5 pb-24 pt-3 md:px-10 md:py-10 lg:px-12">
            <ProjectLibraryHeader
              query={query}
              projectCount={projects.length}
              completedCount={completedCount}
              onQueryChange={setQuery}
            />

            <ProjectGrid
              projects={filteredProjects}
              isLoading={isLoading}
              hasQuery={query.trim().length > 0}
              onDeleteProject={(projectId) => void handleDeleteProject(projectId)}
            />
          </div>

          {error ? (
            <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-red-400/25 bg-red-500/15 px-4 py-2 text-sm text-red-100 shadow-[0_0_32px_rgba(30,0,0,0.3)]">
              {error}
            </div>
          ) : null}
        </div>
      </div>
      <MobileBottomNav activeItem="projects" />
    </main>
  );
}
