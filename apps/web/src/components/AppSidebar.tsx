import { useState } from "react";
import { Home, PanelLeftClose, PanelLeftOpen, UserCircle, Video, VideoIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface AppSidebarProps {
  activeItem: "home" | "projects";
}

const navItems = [
  { key: "home", label: "首页", to: "/", icon: Home },
  { key: "projects", label: "项目", to: "/projects", icon: VideoIcon },
] as const;

export function AppSidebar({ activeItem }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(activeItem !== "home");

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/[0.05] bg-black px-4 py-6 shadow-[0_0_80px_rgba(0,0,0,0.35)] transition-[width] duration-200 md:flex",
        isCollapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("group/header mb-12 flex h-10 items-center", isCollapsed ? "justify-center" : "justify-between gap-3 px-2")}>
        <div className={cn("flex min-w-0 items-center gap-3", isCollapsed && "justify-center")}>
          {isCollapsed ? (
            <div className="grid size-10 place-items-center rounded-full bg-[#1f1f1f] text-[#1ed760] group-hover/header:hidden">
              <Video className="size-5" />
            </div>
          ) : null}
          <div className={cn("truncate text-2xl font-bold text-white", isCollapsed && "sr-only")}>SpeakCut</div>
        </div>

        <button
          type="button"
          className={cn(
            "grid size-10 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-900 hover:text-white",
            isCollapsed && "hidden group-hover/header:grid",
          )}
          onClick={() => setIsCollapsed((current) => !current)}
          title={isCollapsed ? "展开" : "折叠"}
          aria-label={isCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {isCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-4 rounded-full px-4 py-3 text-sm transition",
                isCollapsed && "justify-center px-0",
                isActive
                  ? "bg-[#2b2b2d] font-bold text-white"
                  : "font-medium text-zinc-400 hover:bg-zinc-900 hover:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className={cn(isCollapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        className={cn(
          "flex items-center gap-4 rounded-full px-4 py-3 text-left text-sm font-bold text-zinc-400 transition hover:bg-zinc-900 hover:text-white",
          isCollapsed && "justify-center px-0",
        )}
        title={isCollapsed ? "用户资料" : undefined}
      >
        <UserCircle className="size-5 shrink-0" />
        <span className={cn(isCollapsed && "sr-only")}>用户资料</span>
      </button>
    </aside>
  );
}
