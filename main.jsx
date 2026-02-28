import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CostTracker from "./index.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CostTracker />
  </StrictMode>
);
