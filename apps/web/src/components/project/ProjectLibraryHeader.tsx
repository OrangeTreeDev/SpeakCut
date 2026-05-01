import { Search } from "lucide-react";
import { Input } from "../ui/input";

interface ProjectLibraryHeaderProps {
  query: string;
  projectCount: number;
  completedCount: number;
  onQueryChange: (query: string) => void;
}

export function ProjectLibraryHeader({
  query,
  projectCount,
  completedCount,
  onQueryChange,
}: ProjectLibraryHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">项目库</h1>
        <p className="mt-2 text-sm text-zinc-500">
          共 {projectCount} 个项目 · {completedCount} 个已完成
        </p>
      </div>

      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="按标题、ID 或状态搜索项目"
          className="h-11 pl-10"
        />
      </div>
    </header>
  );
}
