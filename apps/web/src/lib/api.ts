import type { Project, ProjectSummary } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000") + "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  createProject(payload: { text: string; aspect_ratio: "9:16" | "16:9"; voice_id: string }) {
    return request<{ project_id: string }>("/projects", {
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
    return request<{ export_id: string; status: string; download_url?: string }>(`/projects/${projectId}/export`, {
      method: "POST",
    });
  },
};
