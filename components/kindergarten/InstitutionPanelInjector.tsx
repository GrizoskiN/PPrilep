"use client";

import { useLayoutEffect } from "react";
import { useRightPanel } from "../../lib/context/RightPanelContext";
import KindergartenRightPanel from "./KindergartenRightPanel";
import type {
  KindergartenInstitution,
  MenuPost,
  ProgrammePost,
  KindergartenAnnouncement,
  SignupDocument,
} from "../../lib/sanity/kindergarten";

interface Props {
  slug: string;
  institution: KindergartenInstitution;
  allInstitutions: KindergartenInstitution[];
  todayMenu: MenuPost | null;
  currentProgramme: ProgrammePost | null;
  recentAnnouncements: KindergartenAnnouncement[];
  signupDocuments: SignupDocument[];
}

export default function InstitutionPanelInjector({
  slug, institution, allInstitutions,
  todayMenu, currentProgramme, recentAnnouncements, signupDocuments,
}: Props) {
  const { setOverridePanel } = useRightPanel();

  useLayoutEffect(() => {
    setOverridePanel(
      <KindergartenRightPanel
        institution={institution}
        todayMenu={todayMenu}
        currentProgramme={currentProgramme}
        recentAnnouncements={recentAnnouncements}
        signupDocuments={signupDocuments}
        allInstitutions={allInstitutions}
      />,
      `/kindergarten/${slug}`,
    );
    return () => setOverridePanel(null);
  }, [slug, institution, allInstitutions, todayMenu, currentProgramme,
      recentAnnouncements, signupDocuments, setOverridePanel]);

  return null;
}
