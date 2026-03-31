import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { RoastDetailPage } from "./pages/RoastDetailPage";
import { BeanLibraryPage } from "./pages/BeanLibraryPage";
import { BeanDetailPage } from "./pages/BeanDetailPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="roasts/:id" element={<RoastDetailPage />} />
        <Route path="compare" element={<div>Compare roasts — coming soon</div>} />
        <Route path="beans" element={<BeanLibraryPage />} />
        <Route path="beans/:id" element={<BeanDetailPage />} />
        <Route path="settings" element={<div>Settings — coming soon</div>} />
      </Route>
      <Route
        path="share/:token"
        element={<div>Shared roast — coming soon</div>}
      />
      <Route path="*" element={<div>404 — not found</div>} />
    </Routes>
  );
}
