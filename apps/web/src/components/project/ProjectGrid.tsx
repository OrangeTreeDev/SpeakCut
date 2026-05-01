import type { ProjectSummary } from "../../lib/types";
import { ProjectCard } from "./ProjectCard";
import { ProjectCreateCard } from "./ProjectCreateCard";
import { ProjectLibraryEmpty, ProjectLibraryLoading } from "./ProjectLibraryStates";

interface ProjectGridProps {
  projects: ProjectSummary[];
  isLoading: boolean;
  hasQuery: boolean;
  onDeleteProject: (projectId: string) => void;
}

export function ProjectGrid({ projects, isLoading, hasQuery, onDeleteProject }: ProjectGridProps) {
  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {!isLoading && !hasQuery ? <ProjectCreateCard /> : null}

      {isLoading ? <ProjectLibraryLoading /> : null}

      {!isLoading && projects.length === 0 ? <ProjectLibraryEmpty hasQuery={hasQuery} /> : null}

      {!isLoading
        ? projects.map((project) => (
            <ProjectCard key={project.project_id} project={project} onDelete={onDeleteProject} />
          ))
        : null}
    </section>
  );
}
