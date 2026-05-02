import { Loader2 } from "lucide-react";

export function ProjectLoadingState() {
  return (
    <section className="grid min-h-screen place-items-center bg-[#121212] p-6">
      <div className="flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="size-5 animate-spin text-[#1ed760]" />
        正在加载项目数据...
      </div>
    </section>
  );
}
