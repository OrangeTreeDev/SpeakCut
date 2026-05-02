import type { Project, ProjectSummary, VideoAsset } from "./types";

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");
const API_BASE = `${API_ORIGIN}/api/v1`;

export interface ExportStatus {
  export_id: string;
  status: string;
  download_url?: string | null;
  error_message?: string | null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text();
    let errorMessage = message || response.statusText;
    try {
      const payload = JSON.parse(message) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        errorMessage = payload.detail;
      }
    } catch {
      // Keep the raw response body when the server does not return JSON.
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  createProject(payload: { text: string; aspect_ratio: "9:16" | "16:9"; voice_id: string }) {
    return request<{ project_id: string; status: string; estimated_time_sec: number }>("/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  listProjects() {
    return request<{ items: ProjectSummary[]; total: number }>("/projects");
  },
  getProject(projectId: string) {
    return request<Project>(`/projects/${projectId}`);
  },
  deleteProject(projectId: string) {
    return request<void>(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },
  regenerateProject(projectId: string) {
    return request<Project>(`/projects/${projectId}/regenerate`, {
      method: "POST",
    });
  },
  updateScene(projectId: string, sceneIndex: number, text: string) {
    return request<Project>(`/projects/${projectId}/scenes/${sceneIndex}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    });
  },
  updateSceneVideo(projectId: string, sceneIndex: number, videoId: number) {
    return request<Project>(`/projects/${projectId}/scenes/${sceneIndex}/video`, {
      method: "PUT",
      body: JSON.stringify({ video_id: videoId }),
    });
  },
  updateSceneVideoAsset(projectId: string, sceneIndex: number, video: VideoAsset) {
    return request<Project>(`/projects/${projectId}/scenes/${sceneIndex}/video-asset`, {
      method: "PUT",
      body: JSON.stringify({ video }),
    });
  },
  searchMaterials(query: string, orientation: "portrait" | "landscape", perPage = 8) {
    const params = new URLSearchParams({ q: query, orientation, per_page: String(perPage) });
    return request<{ videos: VideoAsset[] }>(`/materials/search?${params.toString()}`);
  },
  updateSubtitleStyle(projectId: string, style: Project["subtitle_style"]) {
    return request<Project>(`/projects/${projectId}/subtitle-style`, {
      method: "PATCH",
      body: JSON.stringify(style),
    });
  },
  updateVoice(projectId: string, voiceId: string) {
    return request<Project>(`/projects/${projectId}/voice`, {
      method: "PUT",
      body: JSON.stringify({ voice_id: voiceId }),
    });
  },
  exportProject(projectId: string) {
    return request<ExportStatus>(`/projects/${projectId}/export`, {
      method: "POST",
    });
  },
  getExport(exportId: string) {
    return request<ExportStatus>(`/exports/${exportId}`);
  },
};
