import { Route, Routes } from "react-router-dom";
import { CreateProjectPage } from "./pages/CreateProjectPage";
import { EditorPage } from "./pages/EditorPage";
import { ProjectLibraryPage } from "./pages/ProjectLibraryPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<CreateProjectPage />} />
      <Route path="/projects" element={<ProjectLibraryPage />} />
      <Route path="/projects/:projectId" element={<EditorPage />} />
    </Routes>
  );
}
