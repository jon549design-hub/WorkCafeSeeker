import CafeDetail from "@/components/CafeDetail";
import DemoCafeDetail from "@/components/DemoCafeDetail";
import { isDemoMode } from "@/lib/demo";

type Props = { params: Promise<{ placeId: string }> };

export default async function CafePage({ params }: Props) {
  const { placeId } = await params;
  return isDemoMode() ? (
    <DemoCafeDetail placeId={placeId} />
  ) : (
    <CafeDetail placeId={placeId} />
  );
}
