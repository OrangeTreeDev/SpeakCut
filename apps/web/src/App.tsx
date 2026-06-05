import { Route, Routes } from "react-router-dom";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { EditorPage } from "./pages/EditorPage";
import { ProjectLibraryPage } from "./pages/ProjectLibraryPage";
import { StaticPreviewPage } from "./pages/StaticPreviewPage";
import type { Project } from "./lib/types";

declare global {
  interface Window {
    __SPEAKCUT_PROJECT__?: Project;
  }
}

export function App() {
  const staticProject = window.__SPEAKCUT_PROJECT__;
  if (staticProject) {
    return <StaticPreviewPage project={staticProject} />;
  }

  return (
    <Routes>
      <Route path="/" element={<CreateProjectPage />} />
      <Route path="/projects" element={<ProjectLibraryPage />} />
      <Route path="/projects/:projectId" element={<EditorPage />} />
    </Routes>
  );
}
