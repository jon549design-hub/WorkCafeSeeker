import VisitForm from "@/components/VisitForm";
import DemoVisitForm from "@/components/DemoVisitForm";
import { isDemoMode } from "@/lib/demo";

type Props = { params: Promise<{ placeId: string }> };

export default async function VisitPage({ params }: Props) {
  const { placeId } = await params;
  return isDemoMode() ? (
    <DemoVisitForm placeId={placeId} />
  ) : (
    <VisitForm placeId={placeId} />
  );
}
