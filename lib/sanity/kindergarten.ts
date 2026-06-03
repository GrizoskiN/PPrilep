/**
 * GROQ queries and fetchers for the Наша Иднина kindergarten section.
 */

import { sanityClient } from "./client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type KindergartenInstitution = {
  _id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  closingTime: string | null;
  district: string | null;
  description: string | null;
  coverImage: { asset: { _ref: string }; alt: string | null } | null;
  lat: number | null;
  lng: number | null;
};

export type StaffMember = {
  _id: string;
  name: string;
  role: string | null;
  photo: { asset: { _ref: string } } | null;
  order: number | null;
};

export type DayMenu = {
  breakfast: string | null;
  snack1:    string | null;
  lunch:     string | null;
  snack2:    string | null;
};

export type MenuPost = {
  _id:       string;
  weekStart: string;
  weekEnd:   string | null;
  title:     string | null;
  monday:    DayMenu | null;
  tuesday:   DayMenu | null;
  wednesday: DayMenu | null;
  thursday:  DayMenu | null;
  friday:    DayMenu | null;
};

export type ProgrammePost = {
  _id: string;
  weekStart: string;
  title: string | null;
  body: string | null;
};

export type SignupDocument = {
  _id: string;
  title: string;
  fileUrl: string;
  institutionId: string | null;
};

export type KindergartenAnnouncement = {
  _id: string;
  title: string;
  body: string | null;
  publishedAt: string;
  coverImage: { asset: { _ref: string } } | null;
  videoUrl:        string | null;
  videoFileUrl:    string | null;
  isGlobal:        boolean;
  institutionSlug: string | null;
  institutionName: string | null;
};

// ── GROQ queries ──────────────────────────────────────────────────────────────

const INSTITUTIONS_QUERY = `
  *[_type == "institution"] | order(name asc) {
    _id, name, "slug": slug.current,
    address, phone, closingTime, district, description,
    coverImage{ asset, alt }, lat, lng
  }
`;

const INSTITUTION_BY_SLUG_QUERY = `
  *[_type == "institution" && slug.current == $slug][0] {
    _id, name, "slug": slug.current,
    address, phone, closingTime, district, description,
    coverImage{ asset, alt }, lat, lng
  }
`;

const STAFF_BY_INSTITUTION_QUERY = `
  *[_type == "staffMember" && institution._ref == $institutionId]
  | order(coalesce(order, 99) asc) {
    _id, name, role, photo{ asset }, order
  }
`;

// Always returns the most recent menu — no institution filter since the
// kindergarten uses one shared menu across all 4 locations.
const CURRENT_WEEK_MENU_QUERY = `
  *[_type == "menuPost"] | order(weekStart desc)[0] {
    _id, weekStart, weekEnd, title,
    monday, tuesday, wednesday, thursday, friday
  }
`;

const CURRENT_PROGRAMME_QUERY = `
  *[_type == "programmePost" && institution._ref == $institutionId && weekStart <= $today]
  | order(weekStart desc)[0] {
    _id, weekStart, title, body
  }
`;

const ANNOUNCEMENT_FIELDS = `_id, title, body, publishedAt, coverImage{ asset }, videoUrl, "videoFileUrl": video.asset->url, "isGlobal": !defined(institution), "institutionSlug": institution->slug.current, "institutionName": institution->name`;

const ANNOUNCEMENTS_BY_INSTITUTION_QUERY = `
  *[_type == "kindergartenAnnouncement"
    && (!defined(institution) || institution._ref == $institutionId)
  ] | order(publishedAt desc)[0...10] { ${`${ANNOUNCEMENT_FIELDS}`} }
`;

const SIGNUP_DOCUMENTS_QUERY = `
  *[_type == "signupDocument" && (!defined(institution) || institution._ref == $institutionId)]
  | order(coalesce(order, 99) asc) {
    _id,
    title,
    "fileUrl": file.asset->url,
    "institutionId": institution._ref
  }
`;

const RECENT_ANNOUNCEMENTS_QUERY = `
  *[_type == "kindergartenAnnouncement"
    && (!defined(institution) || institution._ref == $institutionId)
  ] | order(publishedAt desc)[0...3] { ${`${ANNOUNCEMENT_FIELDS}`} }
`;

// ── Fetchers ──────────────────────────────────────────────────────────────────

export async function fetchAllInstitutions(): Promise<KindergartenInstitution[]> {
  return sanityClient.fetch(INSTITUTIONS_QUERY, {}, { next: { revalidate: 3600 } });
}

export async function fetchInstitutionBySlug(slug: string): Promise<KindergartenInstitution | null> {
  return sanityClient.fetch(INSTITUTION_BY_SLUG_QUERY, { slug }, { next: { revalidate: 3600 } });
}

export async function fetchStaffByInstitution(institutionId: string): Promise<StaffMember[]> {
  return sanityClient.fetch(STAFF_BY_INSTITUTION_QUERY, { institutionId }, { next: { revalidate: 3600 } });
}

export async function fetchTodayMenu(_institutionId: string): Promise<MenuPost | null> {
  // Shared menu across all institutions — no params needed
  return sanityClient.fetch(CURRENT_WEEK_MENU_QUERY, {}, { next: { revalidate: 0 } });
}

export async function fetchLatestGlobalMenu(): Promise<MenuPost | null> {
  return sanityClient.fetch(CURRENT_WEEK_MENU_QUERY, {}, { next: { revalidate: 0 } });
}

export async function fetchCurrentProgramme(institutionId: string): Promise<ProgrammePost | null> {
  const today = new Date().toISOString().split("T")[0];
  return sanityClient.fetch(CURRENT_PROGRAMME_QUERY, { institutionId, today }, { next: { revalidate: 3600 } });
}

export async function fetchAnnouncements(institutionId: string): Promise<KindergartenAnnouncement[]> {
  return sanityClient.fetch(
    ANNOUNCEMENTS_BY_INSTITUTION_QUERY,
    { institutionId },
    { next: { revalidate: 300 } },
  );
}

export async function fetchSignupDocuments(institutionId: string | null): Promise<SignupDocument[]> {
  return sanityClient.fetch(
    SIGNUP_DOCUMENTS_QUERY,
    { institutionId: institutionId ?? "" },
    { next: { revalidate: 3600 } },
  );
}

export async function fetchRecentAnnouncements(institutionId: string): Promise<KindergartenAnnouncement[]> {
  return sanityClient.fetch(
    RECENT_ANNOUNCEMENTS_QUERY,
    { institutionId },
    { next: { revalidate: 300 } },
  );
}

const ALL_ANNOUNCEMENTS_QUERY = `
  *[_type == "kindergartenAnnouncement"] | order(publishedAt desc)[0...30] {
    ${ANNOUNCEMENT_FIELDS}
  }
`;

export async function fetchAllAnnouncements(): Promise<KindergartenAnnouncement[]> {
  return sanityClient.fetch(ALL_ANNOUNCEMENTS_QUERY, {}, { next: { revalidate: 0 } });
}
