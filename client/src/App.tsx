import { Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<div>Dashboard — coming soon</div>} />
        <Route
          path="roasts/:id"
          element={<div>Roast detail — coming soon</div>}
        />
        <Route path="compare" element={<div>Compare roasts — coming soon</div>} />
        <Route path="beans" element={<div>Bean library — coming soon</div>} />
        <Route path="upload" element={<div>Upload — coming soon</div>} />
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
