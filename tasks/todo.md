# Tasks

Active and upcoming work for the **Мој Прилеп** civic platform.

Format: top section is the active sprint. Done items move under "Recently
completed" and roll out after a week or two. Anything still being thought
about lives in "Backlog / ideas".

---

## Active

### Events: interest counter + pin + right-column spotlight
Counter model = **hybrid** (anyone clicks; logged-in deduped by user_id, anon by
a client-generated visitor_id). "Заинтересиран" was localStorage-only, so no
count existed — this adds the first *write* feature.

- [ ] `supabase/add_event_interest.sql` — `event_interest` table + partial unique
      indexes; RLS on, no public policies (only service-role routes touch it). **User runs.**
- [ ] `app/api/events/interest/route.ts` — GET counts (edge-cached, fail-soft),
      POST toggle (auth-aware, keyed by user_id or visitor_id).
- [ ] `sanity/schemas/cityEvent.ts` — add `pinned` boolean.
- [ ] `lib/sanity/queries.ts` — `pinned` on type+query; spotlight fetch
      (pinned desc, startDate asc, first upcoming).
- [ ] `app/api/events/spotlight/route.ts` — `{ event, count }`, cached.
- [ ] `components/ui/EventSpotlight.tsx` + wire into `RightPanel` under PromiseTracker.
- [ ] `components/events/EventsExplorer.tsx` + `EventDetailModal.tsx` — show count,
      optimistic toggle + POST.
- [ ] typecheck + lint; counter stays inert (no number) until the SQL is run.

**Status (built, verified typecheck+lint):** all code landed. Endpoints fail-soft,
so the app is safe to deploy before the migration. **Blocked on user:** run
`supabase/add_event_interest.sql` to activate the counter. Pin appears in Studio
immediately; spotlight shows next-upcoming until an event is pinned.

**Follow-up fixes/additions:**
- Counter bug: POST used `.upsert(onConflict)` against a *partial* unique index,
  which Postgres can't use as an ON CONFLICT arbiter → every insert threw →
  count stayed 0. Fixed to a plain `.insert()` that swallows 23505 (the partial
  index still dedupes). Counter now records once the SQL is applied.
- Per-event shareable URLs (`/events/[slug]`): `slug` field on cityEvent schema
  (Studio "Generate"); `fetchEventByKey` resolves slug OR _id; server page with
  `generateMetadata` (OG cover image) for rich Facebook/Viber/WhatsApp previews;
  `EventInterestButton` on the page; share buttons + spotlight now point at the
  canonical `/events/…` URL. Counter appears only when count > 0.

---

## Recently completed

- **Phase 1** — local Prilep street database + Fuse.js autocomplete.
- **Phase 2** — MapLibre + OpenFreeMap pin picker; Nominatim reverse-geocode
  normalized through local canonical street matcher.
- **Phase 3** — PostGIS-backed duplicate detection (`find_similar_issues`
  RPC) with hybrid street/proximity scoring; non-blocking alert card.
- **Nav restructure** — Platforma section expanded with Мој Прилеп / Наши
  Проекти / Партнери; Информации reduced to Позитива + Случувања;
  Претпријатие adds Градски превоз + Паркинзи.
- **Category cleanup** — `power` → "Осветлување"; added `negligent`
  (Несовесни граѓани) replacing `violation`; added `transport` + `parking`.
- **Security hardening** — function search_path locked, utility_posts
  admin-only writes, avatars bucket no longer listable.
- **Cloudflare CDN** — `cdn.mojprilep.mk` Worker proxying Supabase Storage;
  ~10× egress reduction.
- **Vertical column dividers removed** in Shell.
- **Communities page redesign** — softer banner (green gradient), full-width
  status pills grid, "show more categories" expand in-place, admin-only
  CSV export with pivot tables + per-issue detail rows (UTF-8 BOM, Cyrillic).
- **Градинки — Наша Иднина** — new `/kindergarten` page with tab UI
  (Мени/Програма/Идеи/Соопштенија); `kindergarten` added to `utility_posts`
  provider + `post_type` column; nav entry with `faChildren` icon.
- **HelperModal redesign** — wider modal, date+time pickers (date stored as
  Postgres `date` = YYYY-MM-DD, time folded into note), "Предложени датуми"
  section always visible; "Идам и јас" joins+votes in one click.
- **IssueDetail overhaul**:
  - FB-style header (avatar + name + time, author on top)
  - Full-width district/category/status grid pills
  - `...` three-dot menu for all mod controls (status, edit, delete, photo)
  - Counts row: number = popup, icon+text = action (blue `#427FFF` when active)
  - Optimistic `isAffected` update (instant tap response on mobile)
  - helpPlanningSection inline = date hero cards only (no comments)
  - FB-style comment input (gray pill, emoji picker, image upload, send SVG icon)
  - Empty comment state with our KomentariIcon
- **DateOffersPanel** — dedicated side panel for date coordination:
  - Desktop: slides in as `w-80` between photo and detail, photo shrinks
  - Mobile: second bottom sheet at `z-59` with slide-up animation
  - Full interaction: propose date, "Идам и јас" vote, per-date comments,
    participant count, slot counter (X/3)
- **help_offer trigger** — updated to allow 3 date offers per issue
  (was restricted to first helper only); Macedonian error message.
- **issue_comments photo_url** — `ALTER TABLE issue_comments ADD COLUMN photo_url text`
  added; image upload + lightbox display in comments.
- **Shared issue URL** (`/issues/[slug]-[id]`) — now renders the same
  modal-style layout (dark bg + photo left + detail right on desktop,
  clean white page on mobile) instead of the Shell page. OG metadata added.
- **`profiles(...)` join bug** — fixed `loadHelpOffers` and `loadComments`
  to use `profiles:user_id(...)` syntax; was silently returning empty arrays.

---

## Pending migrations (run in Supabase SQL editor)

```sql
-- 1. Kindergarten provider + post_type
-- File: supabase/add_kindergarten.sql

-- 2. Allow 3 date offers per issue (was 1)
-- File: supabase/update_help_offer_limit.sql

-- 3. Comment photos
ALTER TABLE issue_comments ADD COLUMN IF NOT EXISTS photo_url text;
NOTIFY pgrst, 'reload schema';
```

---

## Backlog / ideas

### Mobile app
- Expo / React Native project once web has stabilized.
- Push notifications via FCM (Edge Function → FCM HTTP v1 API).
- Deep links for `/issues/<slug>-<id>` to open the app.

### Content / CMS
- `news_posts` table + simple admin form with TipTap rich text editor.
- Categories matching the sidebar (`positive`, `projects`, `info`,
  `sponsors`, `events`) so each page just queries the table.

### Maps
- Optional Google Maps satellite layer behind the $200 nonprofit credit.
- Street-level lat/lng index for the local DB (so we don't depend on
  Nominatim's lookup for autocomplete-only flows).

### Email
- Resend custom SMTP wired into Supabase Auth.
- Google Workspace for Nonprofits — verify domain, add MX + DKIM.

### Duplicate detection v2
- Show distance with a small inline map preview in the alert card.
- "Поддржи го постоечкиот" auto-marks user as affected on click.

### Admin
- `/admin` dashboard for moderation actions (pending change requests,
  flag reports, etc.).
- Audit log for admin actions on issues.

### Comments
- GIF support via GIPHY free API (~2–3h work, free tier).
- `service_time time` column on `issue_help_offers` (currently time
  is stored as text in note field).

### Polish
- Move PostGIS extension out of `public` schema.
- Migrate avatars upload paths to `userId/avatar.jpg` consistently.
- The `... menu` in IssueDetail engagement variant (side panel) is a
  separate instance from the full variant — keep in sync.

---

## Review log

**Sprint — May 2026**: Major UX overhaul of the issue detail flow.
Highlights: modal-style layout on shared URLs, DateOffersPanel side panel,
FB-style comment input with emoji+image, three-dot mod menu, full-width
status pills, blue active-state buttons throughout.
