import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

export function ProjectCreateCard() {
  return (
    <Link
      to="/"
      className="group flex h-64 flex-col items-center justify-center rounded-lg bg-[#181818] text-center shadow-[inset_0_0_0_1px_#4d4d4d] transition duration-300 hover:bg-[#272727] hover:shadow-[inset_0_0_0_1px_#1ed760]"
    >
      <span className="mb-4 grid size-16 place-items-center rounded-full border border-[#7c7c7c] bg-[#1f1f1f] text-zinc-400 transition group-hover:border-[#1ed760] group-hover:bg-[#1ed760] group-hover:text-black">
        <Plus className="size-8" />
      </span>
      <span className="px-4 text-base font-bold text-zinc-400 transition group-hover:text-white">创建新项目</span>
    </Link>
  );
}
