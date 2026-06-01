import { notFound } from "next/navigation";
import {
  fetchInstitutionBySlug,
  fetchStaffByInstitution,
  type KindergartenInstitution,
} from "../../../../lib/sanity/kindergarten";
import { getFallbackBySlug } from "../../../../lib/kindergarten-fallback";
import InstitutionDetail from "../../../../components/kindergarten/InstitutionDetail";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function InstitutionPage({ params }: Props) {
  const { slug } = await params;

  // Try Sanity first; fall back to hardcoded data
  let institution = await fetchInstitutionBySlug(slug);

  if (!institution) {
    const fb = getFallbackBySlug(slug);
    if (!fb) notFound();
    // Shape the fallback into a KindergartenInstitution so InstitutionDetail works
    institution = {
      _id:         `fallback-${fb.slug}`,
      name:        fb.name,
      slug:        fb.slug,
      address:     fb.address,
      phone:       fb.phone,
      closingTime: fb.closingTime,
      district:    fb.district,
      description: fb.description,
      coverImage:  null,
      lat:         fb.lat ?? null,
      lng:         fb.lng ?? null,
    } satisfies KindergartenInstitution;
  }

  const staff = await fetchStaffByInstitution(institution._id);

  return (
    <InstitutionDetail
      institution={institution}
      staff={staff}
    />
  );
}
