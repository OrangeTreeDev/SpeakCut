import { Home, VideoIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface MobileBottomNavProps {
  activeItem: "home" | "projects";
}

const navItems = [
  { key: "home", label: "首页", to: "/", icon: Home },
  { key: "projects", label: "项目", to: "/projects", icon: VideoIcon },
] as const;

export function MobileBottomNav({ activeItem }: MobileBottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/[0.06] bg-black px-4 py-2 md:hidden">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeItem === item.key;
        return (
          <Link
            key={item.key}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-full px-3 py-2 text-xs transition",
              isActive ? "font-bold text-white" : "font-normal text-[#b3b3b3] hover:text-white",
            )}
          >
            <Icon className={cn("size-5", isActive ? "text-[#1ed760]" : "text-current")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
