import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { RoastDetailPage } from "./features/roast-detail/RoastDetailPage";
import { BeanLibraryPage } from "./features/beans/BeanLibraryPage";
import { BeanDetailPage } from "./features/beans/BeanDetailPage";
import { ComparePage } from "./features/compare/ComparePage";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SharedRoastPage } from "./features/shared/SharedRoastPage";
import { SignInPage } from "./features/auth/SignInPage";
import { SignUpPage } from "./features/auth/SignUpPage";

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
      <Route path="sign-in/*" element={<SignInPage />} />
      <Route path="sign-up/*" element={<SignUpPage />} />
      <Route path="share/:token" element={<SharedRoastPage />} />
      <Route path="*" element={<div>404 — not found</div>} />
    </Routes>
  );
}
