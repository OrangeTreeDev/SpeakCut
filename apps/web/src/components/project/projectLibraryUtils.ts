export function formatRelativeTime(iso: string) {
  const timestamp = new Date(iso).getTime();
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} 小时前`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} 天前`;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatProjectDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDuration(ms: number) {
  if (!ms) {
    return "--:--";
  }
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function statusMeta(status: string) {
  switch (status) {
    case "ready":
      return {
        label: "已完成",
        searchLabel: "已完成",
        textClass: "text-white",
        dotClass: "bg-[#1ed760]",
      };
    case "failed":
      return {
        label: "失败",
        searchLabel: "生成失败",
        textClass: "text-[#ff8a96]",
        dotClass: "bg-[#ff6b82]",
      };
    case "regenerating":
    case "regenerating_all":
      return {
        label: "进行中",
        searchLabel: "更新中",
        textClass: "text-[#ffa42b]",
        dotClass: "bg-[#ffa42b]",
      };
    default:
      return {
        label: "进行中",
        searchLabel: "生成中",
        textClass: "text-[#ffa42b]",
        dotClass: "bg-[#ffa42b]",
      };
  }
}
