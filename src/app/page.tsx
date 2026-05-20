import DemoDashboard from "@/components/DemoDashboard";
import RealDashboard from "@/components/RealDashboard";
import { isDemoMode } from "@/lib/demo";

export default function HomePage() {
  return isDemoMode() ? <DemoDashboard /> : <RealDashboard />;
}
