"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRightPanel } from "../../../../lib/context/RightPanelContext";
import KindergartenRightPanel from "../../../../components/kindergarten/KindergartenRightPanel";
import {
  fetchInstitutionBySlug,
  fetchAllInstitutions,
  fetchTodayMenu,
  fetchCurrentProgramme,
  fetchRecentAnnouncements,
  fetchSignupDocuments,
  type KindergartenInstitution,
  type MenuPost,
  type ProgrammePost,
  type KindergartenAnnouncement,
  type SignupDocument,
} from "../../../../lib/sanity/kindergarten";
import {
  INSTITUTION_FALLBACK,
  getFallbackBySlug,
} from "../../../../lib/kindergarten-fallback";

export default function InstitutionLayout({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { setOverridePanel } = useRightPanel();

  const [institution, setInstitution]           = useState<KindergartenInstitution | null>(null);
  const [allInstitutions, setAllInstitutions]   = useState<KindergartenInstitution[]>([]);
  const [todayMenu, setTodayMenu]               = useState<MenuPost | null>(null);
  const [currentProgramme, setCurrentProgramme] = useState<ProgrammePost | null>(null);
  const [recentNews, setRecentNews]             = useState<KindergartenAnnouncement[]>([]);
  const [signupDocs, setSignupDocs]             = useState<SignupDocument[]>([]);

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      fetchInstitutionBySlug(slug),
      fetchAllInstitutions(),
    ]).then(([sanityInst, sanityAll]) => {
      // Use fallback if Sanity not yet populated
      const fb = getFallbackBySlug(slug);
      const inst: KindergartenInstitution | null = sanityInst ?? (fb ? {
        _id: `fallback-${fb.slug}`, name: fb.name, slug: fb.slug,
        address: fb.address, phone: fb.phone, closingTime: fb.closingTime,
        district: fb.district, description: fb.description,
        coverImage: null, lat: null, lng: null,
      } : null);

      const allInsts: KindergartenInstitution[] = sanityAll.length > 0
        ? sanityAll
        : INSTITUTION_FALLBACK.map((f) => ({
            _id: `fallback-${f.slug}`, name: f.name, slug: f.slug,
            address: f.address, phone: f.phone, closingTime: f.closingTime,
            district: f.district, description: f.description,
            coverImage: null, lat: null, lng: null,
          }));

      setInstitution(inst);
      setAllInstitutions(allInsts);
      if (!inst) return;

      Promise.all([
        fetchTodayMenu(inst._id),
        fetchCurrentProgramme(inst._id),
        fetchRecentAnnouncements(inst._id),
        fetchSignupDocuments(inst._id),
      ]).then(([menu, programme, news, docs]) => {
        setTodayMenu(menu);
        setCurrentProgramme(programme);
        setRecentNews(news);
        setSignupDocs(docs);
      });
    });

    return () => setOverridePanel(null);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!institution) return;
    setOverridePanel(
      <KindergartenRightPanel
        institution={institution}
        todayMenu={todayMenu}
        currentProgramme={currentProgramme}
        recentAnnouncements={recentNews}
        signupDocuments={signupDocs}
        allInstitutions={allInstitutions}
      />,
    );
  }, [institution, todayMenu, currentProgramme, recentNews, signupDocs, allInstitutions, setOverridePanel]);

  return <>{children}</>;
}
