import { Navigate, Route, Routes } from "react-router-dom";

import { ChatWidget } from "@/components/ChatWidget";
import { MobileModuleTabs, Sidebar } from "@/components/Sidebar";
import { Analytics } from "@/pages/Analytics";
import { MachineMonitoring } from "@/pages/MachineMonitoring";
import { PlantView } from "@/pages/PlantView";
import { ProductionEfficiency } from "@/pages/ProductionEfficiency";
import { Settings } from "@/pages/Settings";
import { StageSpecifics } from "@/pages/StageSpecifics";
import { StageView } from "@/pages/StageView";

/**
 * Three modules sit above the down-and-back rule: Overview, Production
 * Efficiency, and Machine Monitoring answer different questions ("what's
 * happening" / "how efficient" / "what state is every machine in"), so a
 * persistent rail between them is not the same failure mode the stage view's
 * "no sideways tabs" rule guards against - that rule is about not splitting
 * one problem into hidden tabs. Within a module, navigation is still strictly
 * down-and-back: a stage opens Level 2, a KPI/chart/alert opens Level 3.
 */
export default function App() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <div className="px-4 pt-3 sm:px-6 lg:hidden">
          <MobileModuleTabs />
        </div>
        <Routes>
          <Route path="/" element={<PlantView />} />
          <Route path="/production-efficiency" element={<ProductionEfficiency />} />
          <Route path="/machine-monitoring" element={<MachineMonitoring />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/stage/:stage" element={<StageView />} />
          <Route path="/stage/:stage/specifics" element={<StageSpecifics />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <ChatWidget />
    </div>
  );
}
