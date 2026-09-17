import TokenStatus from "@/components/TokenStatus";
export default async function TokenPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <main><TokenStatus publicId={publicId} /></main>;
}
