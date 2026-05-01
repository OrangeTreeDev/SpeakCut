import { Download, Plus, RefreshCw, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";

interface EditorTopBarProps {
  apiOrigin: string;
  exportUrl: string | null;
  isExporting: boolean;
  isGenerating: boolean;
  onExport: () => void;
}

export function EditorTopBar({ apiOrigin, exportUrl, isExporting, isGenerating, onExport }: EditorTopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.05] bg-[#121212] px-4 md:justify-end md:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="grid size-9 place-items-center rounded-full bg-[#1ed760] text-black">
          <Download className="size-4" />
        </div>
        <span className="text-xl font-bold text-white">SpeakCut</span>
      </div>

      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="h-11 rounded-full border-white/20 bg-transparent px-5 font-bold text-white hover:bg-white/[0.08]">
          <Link to="/">
            <Plus className="size-4" />
            新建
          </Link>
        </Button>

        {exportUrl ? (
          <Button asChild variant="outline" size="sm" className="hidden h-11 rounded-full border-white/20 bg-transparent px-5 font-bold text-white hover:bg-white/[0.08] md:inline-flex">
            <a href={`${apiOrigin}${exportUrl}`} target="_blank" rel="noreferrer">
              <Save className="size-4" />
              保存
            </a>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="hidden h-11 rounded-full border-white/20 bg-transparent px-5 font-bold text-white hover:bg-white/[0.08] md:inline-flex">
            <Save className="size-4" />
            保存
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          disabled={isGenerating || isExporting}
          className="h-11 min-w-[136px] rounded-full bg-[#1ed760] px-7 font-bold text-black shadow-[0_0_24px_rgba(30,215,96,0.18)] hover:bg-[#34e36a]"
          onClick={onExport}
        >
          {isExporting ? <RefreshCw className="size-4 animate-spin" /> : <Download className="size-4" />}
          {isExporting ? "导出中" : "导出"}
        </Button>
      </div>
    </header>
  );
}
