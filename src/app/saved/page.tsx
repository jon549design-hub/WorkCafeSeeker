import SavedList from "@/components/SavedList";
import DemoSavedList from "@/components/DemoSavedList";
import { isDemoMode } from "@/lib/demo";

export default function SavedPage() {
  return isDemoMode() ? <DemoSavedList /> : <SavedList />;
}
