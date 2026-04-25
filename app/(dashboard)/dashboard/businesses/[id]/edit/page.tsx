import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { EditBusinessForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditBusinessPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await prisma.business.findFirst({
    where: { id: params.id, ownerId: user.id, archived: false }
  });
  if (!business) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Edit business</h1>
        <p className="text-sm text-muted-foreground">{business.name}</p>
      </div>
      <EditBusinessForm
        initial={{
          id: business.id,
          name: business.name,
          industry: business.industry || "",
          description: business.description || "",
          email: business.email || "",
          phone: business.phone || "",
          whatsappNumber: business.whatsappNumber || "",
          website: business.website || "",
          address: business.address || "",
          city: business.city || "",
          state: business.state || "",
          pincode: business.pincode || "",
          googleReviewUrl: business.googleReviewUrl || "",
          ratingThreshold: business.ratingThreshold,
          primaryColor: business.primaryColor,
          customThankYou: business.customThankYou || ""
        }}
      />
    </div>
  );
}
