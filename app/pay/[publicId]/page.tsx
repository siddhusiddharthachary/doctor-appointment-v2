import PaymentPage from "@/components/PaymentPage";
export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <PaymentPage publicId={publicId} />;
}
