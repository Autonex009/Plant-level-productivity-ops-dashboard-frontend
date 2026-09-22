import { Navigate, Route, Routes } from "react-router-dom";

import { PlantView } from "@/pages/PlantView";
import { StageSpecifics } from "@/pages/StageSpecifics";
import { StageView } from "@/pages/StageView";

/**
 * Navigation is strictly down-and-back: Level 1 is the landing screen, a stage
 * opens Level 2, and a KPI, chart element or alert opens Level 3. There are no
 * sideways tabs at the top level.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlantView />} />
      <Route path="/stage/:stage" element={<StageView />} />
      <Route path="/stage/:stage/specifics" element={<StageSpecifics />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
