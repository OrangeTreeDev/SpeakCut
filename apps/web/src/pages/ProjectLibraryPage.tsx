import { useEffect, useMemo, useState } from "react";
import { Clock3, FolderOpenDot, Loader2, MoreHorizontal, Search, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { api } from "../lib/api";
import type { ProjectSummary } from "../lib/types";

function formatRelativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(iso));
}

function formatDuration(ms: number) {
  if (!ms) {
    return "--:--";
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusMeta(status: string) {
  switch (status) {
    case "ready":
      return { label: "已完成", variant: "secondary" as const };
    case "failed":
      return { label: "生成失败", variant: "destructive" as const };
    case "regenerating":
    case "regenerating_all":
      return { label: "更新中", variant: "default" as const };
    default:
      return { label: "生成中", variant: "default" as const };
  }
}

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
        return [project.title, project.project_id, statusMeta(project.status).label].join(" ").toLowerCase().includes(keyword);
      })
      .sort((left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime());
  }, [projects, query]);

  const completedCount = projects.filter((project) => project.status === "ready").length;

  return (
    <main className="min-h-screen px-4 py-5 md:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-8">
        <header className="workspace-shell flex flex-wrap items-center justify-between gap-4 rounded-[1.85rem] border border-white/[0.07] px-5 py-4 md:px-6">
          <div className="flex items-center gap-8">
            <div className="text-glow text-[1.9rem] font-semibold tracking-[-0.05em] text-[#d7bcff]">SpeakCut</div>
            <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
              <Link to="/" className="text-white/70 transition hover:text-white">
                首页
              </Link>
              <span className="font-medium text-white">项目</span>
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder="搜索项目名称或 ID..."
                className="w-72 border-white/[0.08] bg-white/[0.04] pl-10"
              />
            </div>
            <div className="grid size-10 place-items-center rounded-full border border-white/[0.08] bg-[radial-gradient(circle_at_top,#f5de96,#9b7b2d)] text-sm font-semibold text-[#2b1a00] shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              H
            </div>
          </div>
        </header>

        <section className="flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">我的项目</h1>
            <p className="text-sm text-muted md:text-base">所有项目以统一卡片展示，固定按更新时间倒序排列</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2">共 {projects.length} 个项目</div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2">已完成 {completedCount}</div>
          </div>
        </section>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading ? (
            <Card className="sm:col-span-2 xl:col-span-4">
              <CardContent className="flex min-h-[300px] items-center justify-center gap-3 p-8 text-muted">
                <Loader2 className="size-5 animate-spin" />
                正在加载项目列表...
              </CardContent>
            </Card>
          ) : null}

          {!isLoading && filteredProjects.length === 0 ? (
            <Card className="sm:col-span-2 xl:col-span-4">
              <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-3 p-8 text-center">
                <FolderOpenDot className="size-10 text-primary" />
                <p className="text-lg font-medium text-white">{query ? "没有匹配的项目" : "暂无项目"}</p>
                <p className="max-w-md text-sm leading-6 text-muted">
                  {query ? "请尝试更换搜索词。" : "当前还没有可展示的项目。"}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {!isLoading &&
            filteredProjects.map((project) => {
              const status = statusMeta(project.status);
              return (
                <Card
                  key={project.project_id}
                  className="group overflow-hidden rounded-[1.55rem] border-white/[0.06] bg-[linear-gradient(180deg,rgba(28,18,44,0.96),rgba(18,12,28,0.96))] transition duration-200 hover:-translate-y-1 hover:border-white/[0.12] hover:shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
                >
                  <CardContent className="flex h-full flex-col p-0">
                    <Link to={`/projects/${project.project_id}`} className="block">
                      <div className="relative aspect-[1.32/1] overflow-hidden bg-[linear-gradient(135deg,#2d1c4a,#0f1124)]">
                        {project.cover_image ? (
                          <img
                            src={project.cover_image}
                            alt={project.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-muted">暂无封面</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120a1f] via-transparent to-transparent" />
                        <div className="absolute left-3 top-3">
                          <Badge variant="outline" className="border-white/[0.08] bg-black/28 text-white/85">
                            {project.aspect_ratio === "9:16" ? "1080P" : "16:9"}
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 right-3 rounded-md bg-black/45 px-2 py-1 text-xs text-white">
                          {formatDuration(project.total_duration_ms)}
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            to={`/projects/${project.project_id}`}
                            className="line-clamp-2 text-[1.02rem] font-medium leading-6 text-white transition hover:text-[#d7bcff]"
                          >
                            {project.title}
                          </Link>
                        </div>
                        <button
                          type="button"
                          className="grid size-8 shrink-0 place-items-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted transition hover:text-white"
                          title="更多操作"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className="text-[11px] text-white/35">#{project.project_id.slice(-6)}</span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" />
                          {formatRelativeTime(project.updated_at)}
                        </span>
                        <span>{project.scene_count} 镜</span>
                      </div>

                      <div className="mt-auto flex items-center gap-2 border-t border-white/[0.06] pt-4">
                        <Button asChild size="sm" className="flex-1">
                          <Link to={`/projects/${project.project_id}`}>打开项目</Link>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-white/[0.08] bg-white/[0.03]"
                          onClick={() => void handleDeleteProject(project.project_id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </section>

        {error ? (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-red-400/25 bg-red-500/12 px-4 py-2 text-sm text-red-100 shadow-[0_20px_60px_rgba(30,0,0,0.3)]">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
