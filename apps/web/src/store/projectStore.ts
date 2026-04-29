import { create } from "zustand";
import { api } from "../lib/api";
import type { Project } from "../lib/types";

interface ProjectState {
  project: Project | null;
  activeSceneIndex: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  exportUrl: string | null;
  loadProject: (projectId: string, options?: { silent?: boolean }) => Promise<void>;
  setActiveSceneIndex: (index: number) => void;
  saveSceneText: (projectId: string, sceneIndex: number, text: string) => Promise<void>;
  switchVideo: (projectId: string, sceneIndex: number, videoId: number) => Promise<void>;
  updateSubtitleStyle: (projectId: string, style: Project["subtitle_style"]) => Promise<void>;
  switchVoice: (projectId: string, voiceId: string) => Promise<void>;
  exportProject: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: null,
  activeSceneIndex: 0,
  isLoading: false,
  isRefreshing: false,
  error: null,
  exportUrl: null,
  async loadProject(projectId, options) {
    const silent = options?.silent ?? false;
    set(silent ? { isRefreshing: true } : { isLoading: true, error: null });
    try {
      const project = await api.getProject(projectId);
      set((state) => {
        const sceneExists = project.scenes.some((scene) => scene.index === state.activeSceneIndex);
        return {
          project,
          isLoading: false,
          isRefreshing: false,
          activeSceneIndex: sceneExists ? state.activeSceneIndex : project.scenes[0]?.index ?? 0,
        };
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Load failed",
        isLoading: false,
        isRefreshing: false,
      });
    }
  },
  setActiveSceneIndex(index) {
    set({ activeSceneIndex: index });
  },
  async saveSceneText(projectId, sceneIndex, text) {
    const project = await api.updateScene(projectId, sceneIndex, text);
    set({ project });
  },
  async switchVideo(projectId, sceneIndex, videoId) {
    const project = await api.updateSceneVideo(projectId, sceneIndex, videoId);
    set({ project });
  },
  async updateSubtitleStyle(projectId, style) {
    const project = await api.updateSubtitleStyle(projectId, style);
    set({ project });
  },
  async switchVoice(projectId, voiceId) {
    const project = await api.updateVoice(projectId, voiceId);
    set({ project });
  },
  async exportProject(projectId) {
    const response = await api.exportProject(projectId);
    set({ exportUrl: response.download_url ?? null });
  },
}));
