import DemoMapView from "@/components/DemoMapView";
import MapView from "@/components/MapView";
import { isDemoMode } from "@/lib/demo";

export default function MapPage() {
  return isDemoMode() ? <DemoMapView /> : <MapView />;
}
