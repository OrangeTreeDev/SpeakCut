import { FolderOpenDot, Loader2 } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface ProjectLibraryLoadingProps {
  message?: string;
}

export function ProjectLibraryLoading({ message = "正在加载项目列表..." }: ProjectLibraryLoadingProps) {
  return (
    <Card className="col-span-full rounded-lg bg-[#181818] shadow-none">
      <CardContent className="flex min-h-[320px] items-center justify-center gap-3 p-8 text-zinc-400">
        <Loader2 className="size-5 animate-spin text-[#1ed760]" />
        {message}
      </CardContent>
    </Card>
  );
}

interface ProjectLibraryEmptyProps {
  hasQuery: boolean;
}

export function ProjectLibraryEmpty({ hasQuery }: ProjectLibraryEmptyProps) {
  return (
    <Card className="col-span-full rounded-lg bg-[#181818] shadow-none">
      <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760]">
          <FolderOpenDot className="size-7" />
        </span>
        <p className="text-lg font-bold text-white">{hasQuery ? "没有匹配的项目" : "暂无项目"}</p>
        <p className="max-w-md text-sm leading-6 text-zinc-500">
          {hasQuery ? "请尝试更换搜索词。" : "当前还没有可展示的项目。"}
        </p>
      </CardContent>
    </Card>
  );
}
