import { CircleAlert, RefreshCw } from "lucide-react";

interface GenerationFailedStateProps {
  errorMessage: string | null;
  onRetry: () => void;
}

export function GenerationFailedState({ errorMessage, onRetry }: GenerationFailedStateProps) {
  return (
    <section className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-[#121212] p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,107,130,0.10),rgba(18,18,18,0)_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(30,215,96,0.05),rgba(0,0,0,0)_35%,rgba(0,0,0,0.32))]" />
      <div className="relative grid max-w-xl justify-items-center text-center">
        <div className="mb-9 grid size-28 place-items-center rounded-full border border-red-400/20 bg-red-500/10 text-red-100 shadow-[0_0_40px_rgba(255,107,130,0.18)]">
          <CircleAlert className="size-20" strokeWidth={1.8} />
        </div>
        <h2 className="text-3xl font-bold tracking-normal text-white">生成视频失败</h2>
        <p className="mt-5 max-w-lg text-base leading-8 text-zinc-300">
          {errorMessage || "AI分析脚本时遇到异常"}
        </p>
        <button
          type="button"
          className="mt-9 inline-flex h-12 items-center gap-3 rounded-full bg-[#1ed760] px-8 text-sm font-bold text-black shadow-[0_0_24px_rgba(30,215,96,0.22)] transition hover:bg-[#34e36a]"
          onClick={onRetry}
        >
          <RefreshCw className="size-4" />
          重新生成
        </button>
      </div>
    </section>
  );
}
