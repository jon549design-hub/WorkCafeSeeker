import DemoDashboard from "@/components/DemoDashboard";
import MapView from "@/components/MapView";
import { isDemoMode } from "@/lib/demo";

export default function HomePage() {
  // In demo mode the home tab is a recommendations dashboard.
  // In real mode (with API keys) it falls through to the map for now —
  // a real-mode dashboard would mirror the demo one once data is wired up.
  return isDemoMode() ? <DemoDashboard /> : <MapView />;
}
