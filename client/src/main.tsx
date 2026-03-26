import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/reset.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div>
      <h1>Coffee Roast Tracker</h1>
      <p>Client shell — UI not yet implemented.</p>
    </div>
  </StrictMode>
);
