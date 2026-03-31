import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { RoastDetailPage } from "./pages/RoastDetailPage";
import { BeanLibraryPage } from "./pages/BeanLibraryPage";
import { BeanDetailPage } from "./pages/BeanDetailPage";
import { ComparePage } from "./pages/ComparePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SharedRoastPage } from "./pages/SharedRoastPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="roasts/:id" element={<RoastDetailPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="beans" element={<BeanLibraryPage />} />
        <Route path="beans/:id" element={<BeanDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="sign-in" element={<SignInPage />} />
      <Route path="sign-up" element={<SignUpPage />} />
      <Route path="share/:token" element={<SharedRoastPage />} />
      <Route path="*" element={<div>404 — not found</div>} />
    </Routes>
  );
}
