import { LoaderCircle, Zap } from "lucide-react";

export function GenerationInProgressState() {
  return (
    <section className="relative grid min-h-full flex-1 place-items-center overflow-hidden bg-[#121212] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,215,96,0.10),rgba(18,18,18,0)_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,215,96,0.08),rgba(0,0,0,0)_34%,rgba(0,0,0,0.28))]" />
      <div className="relative grid max-w-xl justify-items-center text-center">
        <div className="relative mb-9 grid size-28 place-items-center">
          <div className="absolute inset-0 rounded-full border-[10px] border-white/[0.04]" />
          <LoaderCircle className="size-20 animate-spin text-[#1ed760]" strokeWidth={1.5} />
          <div className="absolute inset-9 rounded-full bg-white/[0.04]" />
        </div>
        <h2 className="text-3xl font-bold tracking-normal text-white">正在为您生成视频...</h2>
        <p className="mt-5 max-w-lg text-base leading-8 text-zinc-300">
          AI 正在分析脚本并匹配最佳素材，请稍候。
        </p>
      </div>
    </section>
  );
}
